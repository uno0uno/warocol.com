import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartModifier } from '~/stores/online_cart'

const modifierLineTotal = (mod: CartModifier) => Number(mod.price) * (mod.quantity ?? 1)

const modifiersSignature = (mods: CartModifier[]) =>
    JSON.stringify(
        [...mods]
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(m => ({ id: m.id, q: m.quantity ?? 1 }))
    )

export interface PosCartItem {
    id?: string // ID del item en la BD (para poder eliminarlo/actualizarlo)
    product: {
        id: string
        name: string
        price: number
        image: string
        category: string
    }
    quantity: number
    modifiers: CartModifier[]
    notes?: string
    is_resale?: boolean // Productos de reventa no permiten modificadores
    /** Venta libre (#796): custom unit price; do not merge with catalog lines */
    is_open_sale?: boolean
    /** warocol.com#1003 — cashier opted out of automatic promotion for this line */
    promo_opt_out?: boolean
}

export interface Customer {
    id: string
    phone_number: string
    name: string | null
    email: string | null
}

export interface ActiveTableSession {
    tableId: string
    sessionId: string
    tableName: string
    runningTotal: number
    openedAt: string
    isBar: boolean
    // Waiter attribution (warocol.com#574) — optional for backward compat.
    // `effectiveWaiter*` is the resolver result (session override > table default).
    attendedByMemberId?: string | null
    attendedByMemberName?: string | null
    effectiveWaiterMemberId?: string | null
    effectiveWaiterMemberName?: string | null
}

export interface TabItemModifier {
    id: string
    name: string
    price: number
    quantity?: number
}

export interface TabItem {
    orderItemId: string
    productId: string
    categoryId?: string | null
    productName: string
    quantity: number
    unitPrice: number
    subtotal: number
    modifiers: TabItemModifier[]
    notes?: string | null
    fulfillmentStatus: 'new' | 'sent' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
    sentAt: string | null
    promotionName?: string | null
    promoType?: string | null
    promoSavings?: number
    promoOptOut?: boolean
}

// Producto cacheado con modificadores completos
export interface CachedProduct {
    id: string
    name: string
    description: string
    price: number
    image: string
    image_url?: string | null  // Issue #465: real image when uploaded; emoji fallback otherwise
    category: string
    category_id?: string | null
    is_available: boolean
    is_resale: boolean
    modifier_groups: any[] // Grupos de modificadores con todas sus opciones
}

export const usePOSStore = defineStore('pos', () => {
    // State
    const cart = ref<PosCartItem[]>([])
    const currentCustomer = ref<Customer | null>(null)
    const cartId = ref<string | null>(null) // ID del carrito en la BD
    const isSyncing = ref(false) // Flag para evitar loops de sincronización
    const isDeleting = ref(false) // Flag para bloquear acciones mientras se elimina
    const isCancellingMesa = ref(false) // Flag while close-table API call is in flight

    // Mesa context — set when entering POS from a table session
    const activeTableSession = ref<ActiveTableSession | null>(null)

    // Issue #575 — per-order waiter attribution (bar + counter modes)
    // Tracks the "served_by" choice for the cart in flight. Sent in the
    // body of POST /pos-cart/{id}/complete. Resets between sales.
    const cartServedByMemberId = ref<string | null>(null)

    // Tenant feature flags — persists across navigation
    const tablesEnabled = ref<boolean | null>(null)

    // Items already committed to the tab (sent to the table, cleared from cart)
    const tabItems = ref<TabItem[]>([])

    // Cache de productos (con modificadores) - persiste entre ventas
    const cachedProducts = ref<CachedProduct[]>([])

    // Getters
    const cartItemsCount = computed(() => {
        return cart.value.reduce((sum, item) => sum + item.quantity, 0)
    })

    const cartTotal = computed(() => {
        return cart.value.reduce((sum, item) => {
            const productTotal = Number(item.product.price) * Number(item.quantity)
            const modifiersTotal = item.modifiers.reduce((modSum, mod) => modSum + modifierLineTotal(mod), 0) * Number(item.quantity)
            return sum + productTotal + modifiersTotal
        }, 0)
    })

    const isEmpty = computed(() => cart.value.length === 0)

    const invalidateSyncedCart = () => {
        if (isSyncing.value) return
        cartId.value = null
        cart.value.forEach(item => {
            delete item.id
        })
    }

    /** Bitácora channel for pos_cart audit (#784). */
    const resolveCartChannel = (): 'mostrador' | 'barra' =>
        activeTableSession.value?.isBar ? 'barra' : 'mostrador'

    const buildCartAuditQuery = (): string => {
        const params = new URLSearchParams({ channel: resolveCartChannel() })
        if (cartServedByMemberId.value) {
            params.set('actor_member_id', cartServedByMemberId.value)
        }
        return `?${params.toString()}`
    }

    const deleteSyncedCartLine = async (item: PosCartItem, reason?: string): Promise<boolean> => {
        if (!cartId.value || !item.id || isSyncing.value) return false
        const qs = buildCartAuditQuery()
        await $fetch(`/api/pos/cart/${cartId.value}/items/${item.id}${qs}`, {
            method: 'DELETE',
            body: { reason: reason?.trim() || null },
        })
        return true
    }

    // Actions — local-only cart operations (no backend sync per item)

    const addToCart = async (item: Omit<PosCartItem, 'quantity'> & { quantity?: number }) => {
        const quantity = item.quantity || 1
        const existingIndex = cart.value.findIndex((c) => {
            if (item.is_open_sale || c.is_open_sale) {
                return (
                    !!item.is_open_sale &&
                    !!c.is_open_sale &&
                    c.product.id === item.product.id &&
                    Number(c.product.price) === Number(item.product.price) &&
                    c.notes === (item.notes ?? undefined)
                )
            }
            return (
                c.product.id === item.product.id &&
                c.notes === (item.notes ?? undefined) &&
                modifiersSignature(c.modifiers) === modifiersSignature(item.modifiers ?? [])
            )
        })
        if (existingIndex !== -1) {
            cart.value[existingIndex].quantity += quantity
        } else {
            cart.value.push({ ...item, quantity })
        }
        invalidateSyncedCart()
    }

    const removeFromCart = async (index: number, reason?: string) => {
        isDeleting.value = true
        try {
            if (index < 0 || index >= cart.value.length) return
            const item = cart.value[index]
            const isSynced = Boolean(cartId.value && item.id && !isSyncing.value)
            if (isSynced) {
                await deleteSyncedCartLine(item, reason)
                cart.value.splice(index, 1)
            } else {
                cart.value.splice(index, 1)
                invalidateSyncedCart()
            }
        } finally {
            isDeleting.value = false
        }
    }

    const updateQuantity = async (index: number, delta: number) => {
        if (index >= 0 && index < cart.value.length) {
            const item = cart.value[index]
            const newQuantity = item.quantity + delta
            if (newQuantity <= 0) {
                await removeFromCart(index)
            } else {
                item.quantity = newQuantity
                invalidateSyncedCart()
            }
        }
    }

    const duplicateCartItem = async (index: number) => {
        if (index >= 0 && index < cart.value.length) {
            const originalItem = cart.value[index]
            await addToCart({
                product: { ...originalItem.product },
                modifiers: [...originalItem.modifiers],
                notes: originalItem.notes,
                is_resale: originalItem.is_resale,
                is_open_sale: originalItem.is_open_sale,
            })
        }
    }

    const updateCartItem = async (index: number, updatedItem: Omit<PosCartItem, 'quantity'> & { quantity?: number }) => {
        if (index >= 0 && index < cart.value.length) {
            cart.value[index] = { ...updatedItem, quantity: updatedItem.quantity || 1 }
            invalidateSyncedCart()
        }
    }

    const getCartItem = (index: number): PosCartItem | undefined => {
        return cart.value[index]
    }

    // ── Backend cart operations ────────────────────────────────────────────────

    const clearCart = async (reason?: string) => {
        const oldCartId = cartId.value
        const previousCart = [...cart.value]
        cart.value = []
        cartId.value = null
        if (oldCartId && !isSyncing.value) {
            try {
                await $fetch(`/api/pos/cart/${oldCartId}${buildCartAuditQuery()}`, {
                    method: 'DELETE',
                    body: { reason: reason?.trim() || null },
                })
            } catch {
                cart.value = previousCart
                cartId.value = oldCartId
                throw new Error('Error al limpiar el carrito')
            }
        }
    }

    // Sincronizar items locales al backend cuando se identifica cliente
    const syncLocalCartToBackend = async (customerId: string) => {
        if (cart.value.length === 0) return

        try {
            isSyncing.value = true

            const response = await $fetch(`/api/pos/cart/${customerId}`) as {
                success: boolean
                data: { id: string }
            }

            if (response.success) {
                cartId.value = response.data.id
                for (const item of cart.value) {
                    const itemResponse = await $fetch(`/api/pos/cart/${cartId.value}/items`, {
                        method: 'POST',
                        body: {
                            product_id: item.product.id,
                            quantity: item.quantity,
                            unit_price: item.product.price,
                            modifiers: item.modifiers || [],
                            notes: item.notes || null
                        }
                    }) as { success: boolean; data: { item_id: string } }

                    if (itemResponse.success) {
                        item.id = itemResponse.data.item_id
                    }
                }
            }
        } finally {
            isSyncing.value = false
        }
    }

    const setCustomer = async (customer: Customer) => {
        currentCustomer.value = customer
        if (cart.value.length > 0 && !cartId.value) {
            await syncLocalCartToBackend(customer.id)
        } else {
            await loadCartFromBackend(customer.id)
        }
    }

    // Cargar carrito desde el backend
    const loadCartFromBackend = async (customerId: string) => {
        if (isSyncing.value) return

        try {
            isSyncing.value = true
            const response = await $fetch(`/api/pos/cart/${customerId}`) as {
                success: boolean
                data: {
                    id: string
                    total_amount: number
                    items: any[]
                }
            }

            if (response.success) {
                cartId.value = response.data.id
                cart.value = response.data.items.map((item: any) => ({
                    id: item.id,
                    product: {
                        id: item.product.id,
                        name: item.product.name,
                        price: Number(item.product.price) || 0,
                        image: item.product.image || '🍽️',
                        category: ''
                    },
                    quantity: Number(item.quantity) || 1,
                    modifiers: (item.modifiers || []).map((mod: any) => ({
                        id: mod.id,
                        name: mod.name,
                        price: Number(mod.price) || 0,
                        quantity: Number(mod.quantity) || 1,
                    })),
                    notes: item.notes,
                    is_resale: item.is_resale || false,
                    promo_opt_out: Boolean(item.promo_opt_out),
                }))
            }
        } catch {
            cart.value = []
        } finally {
            isSyncing.value = false
        }
    }

    const clearCustomer = () => {
        currentCustomer.value = null
        cartId.value = null
    }

    const setTableSession = (session: ActiveTableSession | null) => {
        activeTableSession.value = session
    }

    const setTabItems = (items: TabItem[]) => {
        tabItems.value = items
    }

    const tabTotal = computed(() =>
        tabItems.value.reduce((sum, item) => sum + item.subtotal, 0)
    )

    const clearAll = () => {
        cart.value = []
        currentCustomer.value = null
        cartId.value = null
        tabItems.value = []
        // #575 — reset served_by between sales
        cartServedByMemberId.value = null
        // Keep bar session alive — bar is a permanent fixture, not a per-order session
        if (!activeTableSession.value?.isBar) {
            activeTableSession.value = null
        }
        // NO limpiar cachedProducts - se mantienen entre ventas
    }

    // #575 — setter exposed for the chip in cart panel
    const setCartServedBy = (memberId: string | null) => {
        cartServedByMemberId.value = memberId
    }

    // Explicit exit — always clears session including bar
    const exitSession = () => {
        cart.value = []
        currentCustomer.value = null
        cartId.value = null
        tabItems.value = []
        activeTableSession.value = null
    }

    // Funciones para cache de productos
    const setProducts = (products: CachedProduct[]) => {
        cachedProducts.value = products
    }

    const getProduct = (productId: string): CachedProduct | undefined => {
        return cachedProducts.value.find(p => p.id === productId)
    }

    const hasProducts = computed(() => cachedProducts.value.length > 0)

    // Sincronizar carrito local al backend en batch (sin cliente)
    // Se usa al entrar a checkout - siempre crea un nuevo carrito con los items actuales
    const syncCartBatch = async (): Promise<boolean> => {
        if (cart.value.length === 0) return false
        if (isSyncing.value) return false

        try {
            isSyncing.value = true

            if (cartId.value) {
                try {
                    await $fetch(`/api/pos/cart/${cartId.value}${buildCartAuditQuery()}`, {
                        method: 'DELETE',
                    })
                } catch {
                    // Ignore delete failures for stale carts
                }
                cartId.value = null
            }

            const batchItems = cart.value.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
                modifiers: item.modifiers.map(mod => ({
                    id: mod.id,
                    name: mod.name,
                    price: mod.price,
                    quantity: mod.quantity ?? 1,
                })),
                notes: item.notes || null
            }))

            const response = await $fetch('/api/pos/cart/batch', {
                method: 'POST',
                body: { items: batchItems }
            }) as {
                success: boolean
                data: {
                    cart_id: string
                    item_ids: string[]
                    total_amount: number
                    items_count: number
                }
            }

            if (!response.success) return false

            cartId.value = response.data.cart_id
            response.data.item_ids.forEach((itemId, index) => {
                if (cart.value[index]) {
                    cart.value[index].id = itemId
                }
            })

            return true
        } catch {
            return false
        } finally {
            isSyncing.value = false
        }
    }

    /**
     * No-op stub — kept for backward compat with pos/index.vue:147.
     * The pendingAdds mechanism was removed (it was never populated);
     * all cart operations are now synchronous local mutations.
     */
    const waitForPendingOperations = async () => {}

    return {
        // State
        cart,
        currentCustomer,
        cartId,
        isSyncing,
        isDeleting,
        isCancellingMesa,
        cachedProducts,
        activeTableSession,
        tabItems,
        tablesEnabled,
        cartServedByMemberId,  // #575

        // Getters
        cartItemsCount,
        cartTotal,
        tabTotal,
        isEmpty,
        hasProducts,

        // Actions
        setTableSession,
        setTabItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateCartItem,
        clearCart,
        getCartItem,
        setCustomer,
        setCartServedBy,  // #575
        clearCustomer,
        clearAll,
        exitSession,
        duplicateCartItem,
        waitForPendingOperations,
        setProducts,
        getProduct,
        syncCartBatch
    }
})
