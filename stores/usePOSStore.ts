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
    const isDeleting = ref(false) // Flag para bloquear acciones mientras se elimina

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

    // Track pending add operations to prevent race conditions
    const pendingAdds = ref<Map<number, Promise<void>>>(new Map())

    // Actions
    const addToCart = async (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        const quantity = item.quantity || 1

        // Agregar localmente primero para feedback inmediato
        const newItem: CartItem = {
            ...item,
            quantity
        }
        cart.value.push(newItem)
        const newItemIndex = cart.value.length - 1

        // Sincronizar con backend si hay cliente y cartId
        if (currentCustomer.value && cartId.value && !isSyncing.value) {
            const addPromise = (async () => {
                try {
                    const response = await $fetch(`/api/pos/cart/${cartId.value}/items`, {
                        method: 'POST',
                        body: {
                            product_id: item.product.id,
                            quantity,
                            unit_price: item.product.price,
                            modifiers: item.modifiers || [],
                            notes: item.notes || null
                        }
                    }) as { success: boolean; data: { item_id: string } }

                    // IMPORTANTE: Actualizar el item local con el ID del backend
                    if (response.success && response.data?.item_id) {
                        // Encontrar el item por índice o por referencia
                        const currentItem = cart.value[newItemIndex]
                        if (currentItem && currentItem.product.id === item.product.id) {
                            currentItem.id = response.data.item_id
                        }
                    }
                } catch (error) {
                    console.error('Error syncing cart item to backend:', error)
                    // Si falla, remover el item local ya que no se guardó en backend
                    const idx = cart.value.findIndex(i => i === newItem)
                    if (idx >= 0) {
                        cart.value.splice(idx, 1)
                    }
                }
            })()

            // Track this pending operation
            pendingAdds.value.set(newItemIndex, addPromise)
            await addPromise
            pendingAdds.value.delete(newItemIndex)
        }
    }

    const removeFromCart = async (index: number) => {
        isDeleting.value = true

        try {
            if (index >= 0 && index < cart.value.length) {
                const item = cart.value[index]

                // Esperar a que cualquier operación de add pendiente termine
                const pendingAdd = pendingAdds.value.get(index)
                if (pendingAdd) {
                    await pendingAdd
                }

                const itemId = item.id

                // Eliminar localmente primero (optimistic update)
                cart.value.splice(index, 1)

                // Actualizar índices en pendingAdds después de splice
                const newPendingAdds = new Map<number, Promise<void>>()
                pendingAdds.value.forEach((promise, idx) => {
                    if (idx > index) {
                        newPendingAdds.set(idx - 1, promise)
                    } else if (idx < index) {
                        newPendingAdds.set(idx, promise)
                    }
                })
                pendingAdds.value = newPendingAdds

                // Sincronizar con backend si hay cartId y itemId
                if (cartId.value && itemId && !isSyncing.value) {
                    try {
                        await $fetch(`/api/pos/cart/${cartId.value}/items/${itemId}`, {
                            method: 'DELETE'
                        })
                    } catch (error) {
                        // Si falla la eliminación, recargar el carrito para mantener sincronía
                        if (currentCustomer.value) {
                            await loadCartFromBackend(currentCustomer.value.id)
                        }
                    }
                } else if (cartId.value && !itemId) {
                    // El item no tiene ID del backend - recargar carrito para sincronía
                    if (currentCustomer.value) {
                        await loadCartFromBackend(currentCustomer.value.id)
                    }
                }
            }
        } finally {
            isDeleting.value = false
        }
    }

    const updateQuantity = async (index: number, delta: number) => {
        if (index >= 0 && index < cart.value.length) {
            const item = cart.value[index]
            item.quantity += delta

            if (item.quantity <= 0) {
                await removeFromCart(index)
            }
        }
    }

    const updateCartItem = async (index: number, updatedItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        if (index >= 0 && index < cart.value.length) {
            const quantity = updatedItem.quantity || 1
            const oldItemId = cart.value[index].id

            // Actualizar localmente primero
            cart.value[index] = {
                ...updatedItem,
                quantity,
                id: oldItemId
            }

            // Sincronizar con backend si hay cartId y itemId
            if (cartId.value && oldItemId && !isSyncing.value) {
                try {
                    await $fetch(`/api/pos/cart/${cartId.value}/items/${oldItemId}`, {
                        method: 'PUT',
                        body: {
                            quantity,
                            unit_price: updatedItem.product.price,
                            modifiers: updatedItem.modifiers || [],
                            notes: updatedItem.notes || null
                        }
                    })
                } catch (error) {
                    console.error('Error syncing cart item update to backend:', error)
                    // Si falla, recargar el carrito para mantener sincronía
                    if (currentCustomer.value) {
                        await loadCartFromBackend(currentCustomer.value.id)
                    }
                }
            }
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
            } catch (error) {
                // Error limpiando carrito
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
                    notes: item.notes
                }))
            }
        } catch (error) {
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
        isDeleting,

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
