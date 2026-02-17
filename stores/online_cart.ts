/**
 * Cart Store - Online Ordering
 * Manages shopping cart state with MOCK data (no backend yet)
 */
import { defineStore } from 'pinia'

export interface CartModifier {
  id: string
  name: string
  price: number
}

export interface CartItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  modifiers: CartModifier[]
  notes?: string
  total: number
}

export interface DeliveryInfo {
  order_type: 'delivery' | 'pickup' | 'dine-in'
  delivery_address_id?: string
  scheduled_time?: string
  delivery_instructions?: string
}

export const useOnlineCartStore = defineStore('onlineCart', {
  state: () => ({
    sessionId: null as string | null,
    cartId: null as string | null,
    items: [] as CartItem[],
    orderType: 'delivery' as 'delivery' | 'pickup' | 'dine-in',
    deliveryInfo: null as DeliveryInfo | null,
    isLoading: false,
    tenantId: null as string | null,
  }),

  getters: {
    itemCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),

    subtotal: (state) => state.items.reduce((sum, item) => sum + item.total, 0),

    isEmpty: (state) => state.items.length === 0,

    // Formatted subtotal in COP
    formattedSubtotal(): string {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(this.subtotal)
    },
  },

  actions: {
    /**
     * Initialize session ID from localStorage or create new one
     */
    initSession(sessionId?: string) {
      if (sessionId) {
        this.sessionId = sessionId
      } else {
        // Generate new session ID
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Save to localStorage
        if (process.client) {
          localStorage.setItem('waro_session_id', this.sessionId)
        }
      }

      console.log('[MOCK] Session initialized:', this.sessionId)
    },

    /**
     * Set tenant ID for the cart
     */
    setTenant(tenantId: string) {
      this.tenantId = tenantId
      console.log('[MOCK] Tenant set:', tenantId)
    },

    /**
     * Add item to cart with modifiers
     */
    async addItem(
      product: { id: string; name: string; price: number },
      quantity: number,
      modifiers: CartModifier[] = [],
      notes?: string
    ) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300))

        // Calculate item total
        const modifiersTotal = modifiers.reduce((sum, mod) => sum + mod.price, 0)
        const itemTotal = (product.price + modifiersTotal) * quantity

        // Check if item with same product and modifiers exists
        const existingItemIndex = this.items.findIndex(
          item =>
            item.product_id === product.id &&
            JSON.stringify(item.modifiers) === JSON.stringify(modifiers)
        )

        if (existingItemIndex >= 0) {
          // Update existing item quantity
          this.items[existingItemIndex].quantity += quantity
          this.items[existingItemIndex].total =
            (product.price + modifiersTotal) * this.items[existingItemIndex].quantity
        } else {
          // Add new item
          const newItem: CartItem = {
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            product_id: product.id,
            product_name: product.name,
            quantity,
            unit_price: product.price,
            modifiers,
            notes,
            total: itemTotal,
          }

          this.items.push(newItem)
        }

        // Generate cart ID if not exists
        if (!this.cartId) {
          this.cartId = `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        console.log('[MOCK] Item added to cart:', product.name)
      } catch (error) {
        console.error('[MOCK] Error adding item:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Update item quantity
     */
    async updateItemQuantity(itemId: string, quantity: number) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200))

        const item = this.items.find(i => i.id === itemId)
        if (!item) {
          throw new Error('Item not found')
        }

        if (quantity <= 0) {
          // Remove item if quantity is 0
          await this.removeItem(itemId)
        } else {
          item.quantity = quantity
          const modifiersTotal = item.modifiers.reduce((sum, mod) => sum + mod.price, 0)
          item.total = (item.unit_price + modifiersTotal) * quantity
        }

        console.log('[MOCK] Item quantity updated:', itemId, quantity)
      } catch (error) {
        console.error('[MOCK] Error updating quantity:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Remove item from cart
     */
    async removeItem(itemId: string) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200))

        const index = this.items.findIndex(i => i.id === itemId)
        if (index >= 0) {
          this.items.splice(index, 1)
        }

        console.log('[MOCK] Item removed from cart:', itemId)
      } catch (error) {
        console.error('[MOCK] Error removing item:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Clear entire cart
     */
    async clearCart() {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200))

        this.items = []
        this.cartId = null
        this.deliveryInfo = null

        console.log('[MOCK] Cart cleared')
      } catch (error) {
        console.error('[MOCK] Error clearing cart:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Set order type (delivery/pickup/dine-in)
     */
    setOrderType(type: 'delivery' | 'pickup' | 'dine-in') {
      this.orderType = type
      console.log('[MOCK] Order type set:', type)
    },

    /**
     * Update delivery info
     */
    async updateDeliveryInfo(info: DeliveryInfo) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300))

        this.deliveryInfo = info
        this.orderType = info.order_type

        console.log('[MOCK] Delivery info updated:', info)
      } catch (error) {
        console.error('[MOCK] Error updating delivery info:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Reset cart to initial state
     */
    reset() {
      this.$reset()
      console.log('[MOCK] Cart store reset')
    },
  },
})
