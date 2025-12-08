import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CartModifier {
    id: string
    name: string
    price: number
}

export interface CartItem {
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
    const addToCart = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        const quantity = item.quantity || 1

        // Siempre agregar como nuevo item para permitir personalizaciones individuales
        // Cada producto agregado se mantiene como una línea separada en el carrito
        cart.value.push({
            ...item,
            quantity
        })
    }

    const removeFromCart = (index: number) => {
        if (index >= 0 && index < cart.value.length) {
            cart.value.splice(index, 1)
        }
    }

    const updateQuantity = (index: number, delta: number) => {
        if (index >= 0 && index < cart.value.length) {
            const item = cart.value[index]
            item.quantity += delta

            if (item.quantity <= 0) {
                removeFromCart(index)
            }
        }
    }

    const updateCartItem = (index: number, updatedItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        if (index >= 0 && index < cart.value.length) {
            const quantity = updatedItem.quantity || 1
            cart.value[index] = {
                ...updatedItem,
                quantity
            }
        }
    }

    const clearCart = () => {
        cart.value = []
    }

    const getCartItem = (index: number): CartItem | undefined => {
        return cart.value[index]
    }

    const setCustomer = (customer: Customer) => {
        currentCustomer.value = customer
    }

    const clearCustomer = () => {
        currentCustomer.value = null
    }

    const clearAll = () => {
        cart.value = []
        currentCustomer.value = null
    }

    return {
        // State
        cart,
        currentCustomer,

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
