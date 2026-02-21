/**
 * Cart Store - Online Ordering
 * Manages shopping cart state, synced with backend via $fetch
 */
import { defineStore } from 'pinia'

export interface CartModifier {
  id: string
  name: string
  price: number
}

export interface CartItem {
  id: string
  backendId?: string        // UUID assigned by backend after sync
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

interface BackendCartItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  modifiers: CartModifier[]
  notes?: string
  total: number
}

interface BackendCart {
  id: string
  order_type: 'delivery' | 'pickup' | 'dine-in'
  items: BackendCartItem[]
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
    initSession(sessionId?: string | null) {
      if (sessionId) {
        this.sessionId = sessionId
      } else {
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        if (process.client) {
          localStorage.setItem('waro_session_id', this.sessionId)
        }
      }
    },

    /**
     * Set tenant ID for the cart
     */
    setTenant(tenantId: string) {
      this.tenantId = tenantId
    },

    /**
     * Hydrate local state from a backend cart response (session recovery)
     */
    hydrateFromBackend(cartData: BackendCart) {
      this.cartId = cartData.id
      this.orderType = cartData.order_type
      this.items = cartData.items.map(item => ({
        id: `item_${item.id}`,
        backendId: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        modifiers: item.modifiers || [],
        notes: item.notes,
        total: item.total,
      }))
    },

    /**
     * Map backend item UUIDs back onto local CartItems after a batch sync
     */
    syncItemIds(backendItems: BackendCartItem[]) {
      for (const backendItem of backendItems) {
        const localItem = this.items.find(
          item =>
            item.product_id === backendItem.product_id &&
            JSON.stringify(item.modifiers) === JSON.stringify(backendItem.modifiers)
        )
        if (localItem) {
          localItem.backendId = backendItem.id
        }
      }
    },

    /**
     * Add item to cart with modifiers — POST /api/online/cart/batch
     */
    async addItem(
      product: { id: string; name: string; price: number },
      quantity: number,
      modifiers: CartModifier[] = [],
      notes?: string
    ) {
      this.isLoading = true

      try {
        const modifiersTotal = modifiers.reduce((sum, mod) => sum + mod.price, 0)
        const itemTotal = (product.price + modifiersTotal) * quantity

        const existingIndex = this.items.findIndex(
          item =>
            item.product_id === product.id &&
            JSON.stringify(item.modifiers) === JSON.stringify(modifiers)
        )

        if (existingIndex >= 0) {
          this.items[existingIndex].quantity += quantity
          this.items[existingIndex].total =
            (product.price + modifiersTotal) * this.items[existingIndex].quantity
        } else {
          this.items.push({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            product_id: product.id,
            product_name: product.name,
            quantity,
            unit_price: product.price,
            modifiers,
            notes,
            total: itemTotal,
          })
        }

        const data = await $fetch<{ data: BackendCart }>('/api/online/cart/batch', {
          method: 'POST',
          body: {
            tenant_id: this.tenantId,
            session_id: this.sessionId,
            order_type: this.orderType,
            items: this.items.map(item => ({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              modifiers: item.modifiers,
              notes: item.notes,
            })),
          },
        })

        this.cartId = data.data.id
        this.syncItemIds(data.data.items)
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al agregar producto al carrito')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Add multiple units with independent modifiers in one batch POST.
     * Used by the per-item wizard when qty > 1 with individual customization.
     */
    async addItemsBatch(
      product: { id: string; name: string; price: number },
      units: Array<{ modifiers: CartModifier[]; notes?: string }>
    ) {
      this.isLoading = true
      try {
        for (const unit of units) {
          const modifiersTotal = unit.modifiers.reduce((sum, mod) => sum + mod.price, 0)
          const existingIndex = this.items.findIndex(
            item =>
              item.product_id === product.id &&
              JSON.stringify(item.modifiers) === JSON.stringify(unit.modifiers)
          )
          if (existingIndex >= 0) {
            this.items[existingIndex].quantity += 1
            this.items[existingIndex].total =
              (product.price + modifiersTotal) * this.items[existingIndex].quantity
          } else {
            this.items.push({
              id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              product_id: product.id,
              product_name: product.name,
              quantity: 1,
              unit_price: product.price,
              modifiers: unit.modifiers,
              notes: unit.notes,
              total: product.price + modifiersTotal,
            })
          }
        }

        const data = await $fetch<{ data: BackendCart }>('/api/online/cart/batch', {
          method: 'POST',
          body: {
            tenant_id: this.tenantId,
            session_id: this.sessionId,
            order_type: this.orderType,
            items: this.items.map(item => ({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              modifiers: item.modifiers,
              notes: item.notes,
            })),
          },
        })

        this.cartId = data.data.id
        this.syncItemIds(data.data.items)
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al agregar productos al carrito')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Update item quantity — local only (no dedicated endpoint); calls removeItem if quantity ≤ 0
     */
    async updateItemQuantity(itemId: string, quantity: number) {
      if (quantity <= 0) {
        return await this.removeItem(itemId)
      }

      const item = this.items.find(i => i.id === itemId)
      if (!item) throw new Error('Item not found')

      const modifiersTotal = item.modifiers.reduce((sum, mod) => sum + mod.price, 0)
      item.quantity = quantity
      item.total = (item.unit_price + modifiersTotal) * quantity
    },

    /**
     * Remove item from cart — DELETE /api/online/cart/{cartId}/items/{backendId}
     */
    async removeItem(itemId: string) {
      this.isLoading = true

      try {
        const index = this.items.findIndex(i => i.id === itemId)
        if (index < 0) return

        const item = this.items[index]
        this.items.splice(index, 1)

        if (item.backendId && this.cartId) {
          await $fetch(`/api/online/cart/${this.cartId}/items/${item.backendId}`, {
            method: 'DELETE',
          })
        }
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al eliminar el producto')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Clear entire cart — DELETE /api/online/cart/{cartId}
     */
    async clearCart() {
      this.isLoading = true

      try {
        if (this.cartId) {
          await $fetch(`/api/online/cart/${this.cartId}`, { method: 'DELETE' })
        }

        this.items = []
        this.cartId = null
        this.deliveryInfo = null
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al vaciar el carrito')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Set order type (delivery/pickup/dine-in)
     */
    setOrderType(type: 'delivery' | 'pickup' | 'dine-in') {
      this.orderType = type
    },

    /**
     * Update delivery info — PUT /api/online/cart/{cartId}/delivery (if cart exists)
     */
    async updateDeliveryInfo(info: DeliveryInfo) {
      this.isLoading = true

      try {
        this.deliveryInfo = info
        this.orderType = info.order_type

        if (this.cartId) {
          await $fetch(`/api/online/cart/${this.cartId}/delivery`, {
            method: 'PUT',
            body: info,
          })
        }
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al actualizar la entrega')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Reset cart to initial state
     */
    reset() {
      this.$reset()
    },
  },
})
