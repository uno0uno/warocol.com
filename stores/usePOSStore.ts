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
}

export interface Customer {
    id: string
    phone_number: string
    name: string | null
    email: string | null
}

export const usePOSStore = defineStore('pos', () => {
    // State
    const cart = ref<CartItem[]>([])
    const currentCustomer = ref<Customer | null>(null)
    const cartId = ref<string | null>(null) // ID del carrito en la BD
    const isSyncing = ref(false) // Flag para evitar loops de sincronización

    // Getters
    const cartItemsCount = computed(() => {
        return cart.value.reduce((sum, item) => sum + item.quantity, 0)
    })

    const cartTotal = computed(() => {
        return cart.value.reduce((sum, item) => {
            const productTotal = item.product.price * item.quantity
            const modifiersTotal = item.modifiers.reduce((modSum, mod) => modSum + mod.price, 0) * item.quantity
            return sum + productTotal + modifiersTotal
        }, 0)
    })

    const isEmpty = computed(() => cart.value.length === 0)

    // Actions
    const addToCart = async (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        const quantity = item.quantity || 1

        // Agregar localmente primero para feedback inmediato
        cart.value.push({
            ...item,
            quantity
        })

        // Sincronizar con backend si hay cliente y cartId
        if (currentCustomer.value && cartId.value && !isSyncing.value) {
            try {
                await $fetch(`/api/pos/cart/${cartId.value}/items`, {
                    method: 'POST',
                    body: {
                        product_id: item.product.id,
                        quantity,
                        unit_price: item.product.price,
                        modifiers: item.modifiers || [],
                        notes: item.notes || null
                    }
                })
                console.log('✅ Item sincronizado con BD')
            } catch (error) {
                console.error('❌ Error sincronizando item:', error)
                // Mantener el item localmente aunque falle la sincronización
            }
        }
    }

    const removeFromCart = async (index: number) => {
        if (index >= 0 && index < cart.value.length) {
            const item = cart.value[index]
            const itemId = item.id

            // Eliminar localmente primero (optimistic update)
            cart.value.splice(index, 1)

            // Sincronizar con backend si hay cartId y itemId
            if (cartId.value && itemId && !isSyncing.value) {
                try {
                    await $fetch(`/api/pos/cart/${cartId.value}/items/${itemId}`, {
                        method: 'DELETE'
                    })
                    console.log('✅ Item eliminado de BD')
                } catch (error) {
                    console.error('❌ Error eliminando item:', error)
                    // Si falla, podríamos recargar el carrito para mantener sincronía
                }
            }
        }
    }

    const updateQuantity = async (index: number, delta: number) => {
        if (index >= 0 && index < cart.value.length) {
            const item = cart.value[index]
            item.quantity += delta

            if (item.quantity <= 0) {
                await removeFromCart(index)
            } else {
                // TODO: Sincronizar cambios de cantidad con backend
                // Necesitamos endpoint PATCH /pos/cart/{cart_id}/items/{item_id}
                // Por ahora, los cambios de cantidad solo persisten en la sesión actual
                console.log('⚠️ Cambio de cantidad (solo local por ahora)')
            }
        }
    }

    const updateCartItem = async (index: number, updatedItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        if (index >= 0 && index < cart.value.length) {
            const quantity = updatedItem.quantity || 1
            const oldItemId = cart.value[index].id

            // Actualizar localmente
            cart.value[index] = {
                ...updatedItem,
                quantity,
                id: oldItemId // Mantener el ID del item original
            }

            // TODO: Sincronizar cambios con backend
            // Necesitamos endpoint PATCH /pos/cart/{cart_id}/items/{item_id}
            // Por ahora, los cambios solo persisten en la sesión actual
            console.log('⚠️ Item actualizado (solo local por ahora)')
        }
    }

    const clearCart = async () => {
        cart.value = []

        // Sincronizar con backend si hay cartId
        if (cartId.value && !isSyncing.value) {
            try {
                await $fetch(`/api/pos/cart/${cartId.value}`, {
                    method: 'DELETE'
                })
                console.log('✅ Carrito limpiado en BD')
            } catch (error) {
                console.error('❌ Error limpiando carrito:', error)
            }
        }
    }

    const getCartItem = (index: number): CartItem | undefined => {
        return cart.value[index]
    }

    const setCustomer = async (customer: Customer) => {
        currentCustomer.value = customer

        // Cargar carrito del backend para este cliente
        await loadCartFromBackend(customer.id)
    }

    const clearCustomer = () => {
        currentCustomer.value = null
        cartId.value = null
    }

    const clearAll = () => {
        cart.value = []
        currentCustomer.value = null
        cartId.value = null
    }

    // Cargar carrito desde el backend
    const loadCartFromBackend = async (customerId: string) => {
        if (isSyncing.value) return

        try {
            isSyncing.value = true
            console.log('📥 Cargando carrito desde BD...')

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

                // Mapear items del backend al formato del store
                cart.value = response.data.items.map((item: any) => ({
                    id: item.id, // ID del item en la BD
                    product: {
                        id: item.product.id,
                        name: item.product.name,
                        price: item.product.price,
                        image: item.product.image || '🍽️',
                        category: ''
                    },
                    quantity: item.quantity,
                    modifiers: item.modifiers || [],
                    notes: item.notes
                }))

                console.log(`✅ Carrito cargado: ${cart.value.length} items`)
            }
        } catch (error) {
            console.error('❌ Error cargando carrito:', error)
            // Si falla, crear carrito nuevo vacío
            cart.value = []
        } finally {
            isSyncing.value = false
        }
    }

    return {
        // State
        cart,
        currentCustomer,
        cartId,

        // Getters
        cartItemsCount,
        cartTotal,
        isEmpty,

        // Actions
        addToCart,
        removeFromCart,
        updateQuantity,
        updateCartItem,
        clearCart,
        getCartItem,
        setCustomer,
        clearCustomer,
        clearAll
    }
})
