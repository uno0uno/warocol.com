import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CartModifier {
    id: string
    name: string
    price: number
}

export interface CartItem {
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
}

export interface TabItem {
    orderItemId: string
    productName: string
    quantity: number
    unitPrice: number
    subtotal: number
    fulfillmentStatus: 'new' | 'sent' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
    sentAt: string | null
}

// Producto cacheado con modificadores completos
export interface CachedProduct {
    id: string
    name: string
    description: string
    price: number
    image: string
    category: string
    is_available: boolean
    is_resale: boolean
    modifier_groups: any[] // Grupos de modificadores con todas sus opciones
}

export const usePOSStore = defineStore('pos', () => {
    // State
    const cart = ref<CartItem[]>([])
    const currentCustomer = ref<Customer | null>(null)
    const cartId = ref<string | null>(null) // ID del carrito en la BD
    const isSyncing = ref(false) // Flag para evitar loops de sincronización
    const isDeleting = ref(false) // Flag para bloquear acciones mientras se elimina
    const isCancellingMesa = ref(false) // Flag while close-table API call is in flight

    // Mesa context — set when entering POS from a table session
    const activeTableSession = ref<ActiveTableSession | null>(null)

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
            const modifiersTotal = item.modifiers.reduce((modSum, mod) => modSum + Number(mod.price), 0) * Number(item.quantity)
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

    // Actions — local-only cart operations (no backend sync per item)

    const addToCart = async (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        const quantity = item.quantity || 1
        // Merge with existing item if same product + same modifiers + same notes
        const existingIndex = cart.value.findIndex(c =>
            c.product.id === item.product.id &&
            c.notes === (item.notes ?? undefined) &&
            c.modifiers.length === (item.modifiers?.length ?? 0) &&
            c.modifiers.every((m, i) => m.id === item.modifiers?.[i]?.id)
        )
        if (existingIndex !== -1) {
            cart.value[existingIndex].quantity += quantity
        } else {
            cart.value.push({ ...item, quantity })
        }
        invalidateSyncedCart()
    }

    const removeFromCart = async (index: number) => {
        isDeleting.value = true
        try {
            if (index >= 0 && index < cart.value.length) {
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
                is_resale: originalItem.is_resale
            })
        }
    }

    const updateCartItem = async (index: number, updatedItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        if (index >= 0 && index < cart.value.length) {
            cart.value[index] = { ...updatedItem, quantity: updatedItem.quantity || 1 }
            invalidateSyncedCart()
        }
    }

    const getCartItem = (index: number): CartItem | undefined => {
        return cart.value[index]
    }

    // ── Backend cart operations ────────────────────────────────────────────────

    const clearCart = async () => {
        const oldCartId = cartId.value
        cart.value = []
        cartId.value = null
        if (oldCartId && !isSyncing.value) {
            try {
                await $fetch(`/api/pos/cart/${oldCartId}`, { method: 'DELETE' })
            } catch {
                // Non-critical — local state already cleared
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
                        price: Number(mod.price) || 0
                    })),
                    notes: item.notes,
                    is_resale: item.is_resale || false
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
        // Keep bar session alive — bar is a permanent fixture, not a per-order session
        if (!activeTableSession.value?.isBar) {
            activeTableSession.value = null
        }
        // NO limpiar cachedProducts - se mantienen entre ventas
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
                    await $fetch(`/api/pos/cart/${cartId.value}`, { method: 'DELETE' })
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
                    price: mod.price
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
