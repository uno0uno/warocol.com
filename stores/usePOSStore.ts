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

// Producto cacheado con modificadores completos
export interface CachedProduct {
    id: string
    name: string
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

    // Actions — local-only cart operations (no backend sync per item)

    const addToCart = async (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        const quantity = item.quantity || 1
        cart.value.push({ ...item, quantity })
    }

    const removeFromCart = async (index: number) => {
        if (index >= 0 && index < cart.value.length) {
            cart.value.splice(index, 1)
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
        }
    }

    const getCartItem = (index: number): CartItem | undefined => {
        return cart.value[index]
    }

    // ── syncCartBatch mutation ─────────────────────────────────────────────────
    // Called at checkout entry — always creates a fresh cart with current items.
    // useMutation replaces the manual isSyncing flag with .isPending.

    const syncMutation = useMutation({
        mutation: async () => {
            // Delete old cart if exists, then create new one from current items
            if (cartId.value) {
                try {
                    await $fetch(`/api/pos/cart/${cartId.value}`, { method: 'DELETE' })
                } catch {
                    // Ignore — proceed to create new cart
                }
                cartId.value = null
            }

            const batchItems = cart.value.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
                modifiers: item.modifiers.map(mod => ({ id: mod.id, name: mod.name, price: mod.price })),
                notes: item.notes || null
            }))

            return $fetch('/api/pos/cart/batch', {
                method: 'POST',
                body: { items: batchItems }
            }) as Promise<{
                success: boolean
                data: {
                    cart_id: string
                    item_ids: string[]
                    total_amount: number
                    items_count: number
                }
            }>
        },
        onSuccess(response) {
            if (response.success) {
                cartId.value = response.data.cart_id
                response.data.item_ids.forEach((itemId, index) => {
                    if (cart.value[index]) cart.value[index].id = itemId
                })
            }
        },
    })

    /** Sync local cart to backend in one batch POST. Returns true on success. */
    const syncCartBatch = async (): Promise<boolean> => {
        if (cart.value.length === 0) return false
        if (syncMutation.isPending.value) return false
        try {
            const response = await syncMutation.mutateAsync()
            return response.success
        } catch {
            return false
        }
    }

    // ── Backend cart operations ────────────────────────────────────────────────

    const clearCart = async () => {
        const oldCartId = cartId.value
        cart.value = []
        cartId.value = null
        if (oldCartId && !syncMutation.isPending.value) {
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
        if (syncMutation.isPending.value) return

        try {
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
        }
    }

    const clearCustomer = () => {
        currentCustomer.value = null
        cartId.value = null
    }

    const clearAll = () => {
        cart.value = []
        currentCustomer.value = null
        cartId.value = null
        // NO limpiar cachedProducts - se mantienen entre ventas
    }

    // Funciones para cache de productos
    const setProducts = (products: CachedProduct[]) => {
        cachedProducts.value = products
    }

    const getProduct = (productId: string): CachedProduct | undefined => {
        return cachedProducts.value.find(p => p.id === productId)
    }

    const hasProducts = computed(() => cachedProducts.value.length > 0)

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
        cachedProducts,

        // Getters
        cartItemsCount,
        cartTotal,
        isEmpty,
        hasProducts,

        // Actions
        addToCart,
        removeFromCart,
        updateQuantity,
        updateCartItem,
        clearCart,
        getCartItem,
        setCustomer,
        clearCustomer,
        clearAll,
        duplicateCartItem,
        waitForPendingOperations,
        setProducts,
        getProduct,
        syncCartBatch
    }
})
