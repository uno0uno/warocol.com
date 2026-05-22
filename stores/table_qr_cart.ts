/**
 * Client-only cart for Table QR ordering (warocol.com#713).
 * Does not sync to /api/online/cart — items are submitted via POST /public/table-qr/{token}/requests.
 */
import { defineStore } from 'pinia'
import type { OnlineCartItem, CartModifier } from '~/stores/online_cart'

function modifiersKey(mods: CartModifier[]): string {
  return JSON.stringify([...mods].sort((a, b) => a.id.localeCompare(b.id)))
}

function newItemId(): string {
  return `tqr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const useTableQrCartStore = defineStore('tableQrCart', () => {
  const token = ref<string | null>(null)
  const items = ref<OnlineCartItem[]>([])
  const isLoading = ref(false)

  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.total, 0))
  const isEmpty = computed(() => items.value.length === 0)
  const formattedSubtotal = computed(() =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(subtotal.value),
  )

  function setToken(value: string) {
    if (token.value && token.value !== value) {
      items.value = []
    }
    token.value = value
  }

  function addItem(
    product: { id: string; name: string; price: number; has_modifiers?: boolean },
    quantity: number,
    modifiers: CartModifier[] = [],
    notes?: string,
  ) {
    const sortedModifiers = [...modifiers].sort((a, b) => a.id.localeCompare(b.id))
    const modifiersTotal = modifiers.reduce((sum, mod) => sum + mod.price, 0)
    const existingIndex = items.value.findIndex(
      item => item.product_id === product.id && modifiersKey(item.modifiers) === modifiersKey(modifiers),
    )
    if (existingIndex >= 0) {
      items.value[existingIndex].quantity += quantity
      items.value[existingIndex].total =
        (product.price + modifiersTotal) * items.value[existingIndex].quantity
    } else {
      items.value.push({
        id: newItemId(),
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: product.price,
        modifiers: sortedModifiers,
        notes,
        total: (product.price + modifiersTotal) * quantity,
        has_modifiers: product.has_modifiers ?? false,
      })
    }
  }

  function addItemsBatch(
    product: { id: string; name: string; price: number; has_modifiers?: boolean },
    units: Array<{ modifiers: CartModifier[]; notes?: string }>,
  ) {
    for (const unit of units) {
      addItem(product, 1, unit.modifiers, unit.notes)
    }
  }

  function updateItemQuantity(itemId: string, quantity: number) {
    const index = items.value.findIndex(item => item.id === itemId)
    if (index < 0) return
    if (quantity <= 0) {
      items.value.splice(index, 1)
      return
    }
    const item = items.value[index]
    const modifiersTotal = item.modifiers.reduce((sum, mod) => sum + mod.price, 0)
    item.quantity = quantity
    item.total = (item.unit_price + modifiersTotal) * quantity
  }

  function removeItem(itemId: string) {
    items.value = items.value.filter(item => item.id !== itemId)
  }

  function clearCart() {
    items.value = []
  }

  function buildSubmitItems() {
    return items.value.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      modifiers: item.modifiers.map(mod => ({ id: mod.id })),
      notes: item.notes || undefined,
    }))
  }

  return {
    token,
    items,
    isLoading,
    itemCount,
    subtotal,
    isEmpty,
    formattedSubtotal,
    setToken,
    addItem,
    addItemsBatch,
    updateItemQuantity,
    removeItem,
    clearCart,
    buildSubmitItems,
  }
})
