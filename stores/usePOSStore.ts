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
    const isSyncing = ref(false) // Flag para evitar loops de sincronización
    const isDeleting = ref(false) // Flag para bloquear acciones mientras se elimina

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

    // Track pending add operations to prevent race conditions
    const pendingAdds = ref<Map<number, Promise<void>>>(new Map())

    // Esperar a que todas las operaciones pendientes terminen
    const waitForPendingOperations = async () => {
        const pending = Array.from(pendingAdds.value.values())
        if (pending.length > 0) {
            await Promise.all(pending)
        }
    }

    // Actions
    const addToCart = async (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        const quantity = item.quantity || 1

        // Agregar localmente (sin backend)
        const newItem: CartItem = {
            ...item,
            quantity
        }
        cart.value.push(newItem)
    }

    const removeFromCart = async (index: number) => {
        isDeleting.value = true

        try {
            if (index >= 0 && index < cart.value.length) {
                // Esperar a que cualquier operación de add pendiente termine
                const pendingAdd = pendingAdds.value.get(index)
                if (pendingAdd) {
                    await pendingAdd
                }

                // Eliminar localmente
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
                // Actualizar localmente
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
            const quantity = updatedItem.quantity || 1

            // Actualizar localmente (sin ID del backend)
            cart.value[index] = {
                ...updatedItem,
                quantity
            }
        }
    }

    const clearCart = async () => {
        // Guardar cartId antes de limpiar
        const oldCartId = cartId.value

        // Limpiar estado local primero
        cart.value = []
        cartId.value = null  // Limpiar cartId para que sea local de nuevo

        // Eliminar carrito del backend si existía
        if (oldCartId && !isSyncing.value) {
            try {
                await $fetch(`/api/pos/cart/${oldCartId}`, {
                    method: 'DELETE'
                })
            } catch (error) {
                // Error limpiando carrito - no importa, ya limpiamos local
            }
        }
    }

    const getCartItem = (index: number): CartItem | undefined => {
        return cart.value[index]
    }

    // Sincronizar items locales al backend cuando se identifica cliente
    const syncLocalCartToBackend = async (customerId: string) => {
        if (cart.value.length === 0) return

        try {
            isSyncing.value = true

            // Crear carrito en backend
            const response = await $fetch(`/api/pos/cart/${customerId}`) as {
                success: boolean
                data: { id: string }
            }

            if (response.success) {
                cartId.value = response.data.id

                // Sincronizar cada item local al backend
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

        // Si hay items locales sin sincronizar, transferirlos al backend
        if (cart.value.length > 0 && !cartId.value) {
            await syncLocalCartToBackend(customer.id)
        } else {
            // Si no hay items locales, cargar carrito existente del cliente
            await loadCartFromBackend(customer.id)
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

    // Sincronizar carrito local al backend en batch (sin cliente)
    // Se usa al entrar a checkout - SIEMPRE crea un nuevo carrito con los items actuales
    const syncCartBatch = async (): Promise<boolean> => {
        if (cart.value.length === 0) return false
        if (isSyncing.value) return false

        try {
            isSyncing.value = true

            // Si ya había un carrito, eliminarlo primero
            if (cartId.value) {
                try {
                    await $fetch(`/api/pos/cart/${cartId.value}`, {
                        method: 'DELETE'
                    })
                } catch (e) {
                    // Ignorar error al eliminar carrito viejo
                }
                cartId.value = null
            }

            // Preparar items para el batch
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
                body: {
                    items: batchItems
                    // No customer_id - carrito anónimo
                }
            }) as {
                success: boolean
                data: {
                    cart_id: string
                    item_ids: string[]
                    total_amount: number
                    items_count: number
                }
            }

            if (response.success) {
                cartId.value = response.data.cart_id

                // Actualizar IDs de items locales
                response.data.item_ids.forEach((itemId, index) => {
                    if (cart.value[index]) {
                        cart.value[index].id = itemId
                    }
                })

                return true
            }

            return false
        } catch (error) {
            console.error('Error syncing cart batch:', error)
            return false
        } finally {
            isSyncing.value = false
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
                    notes: item.notes,
                    is_resale: item.is_resale || false
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
