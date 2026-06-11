/**
 * Cart Store - Online Ordering
 * Pinia Colada migration (Phase 3b) — useMutation with onMutate/onError rollback
 *
 * All 6 async mutations have:
 * - onMutate: optimistic local update + snapshot for rollback
 * - onError:  restore snapshot on API failure
 * - onSuccess: reconcile backend UUIDs via syncItemIds (batch mutations)
 *
 * Session state and pure helpers stay outside Pinia Colada.
 */
import { defineStore } from 'pinia'
import { modifiersCartTotal } from '~/utils/saleModifierOption'

// Module-level lock: mutations await this before proceeding so they never
// race with hydrateFromBackend() during the initial session recovery.
let _recoveryPromise: Promise<void> | null = null

// Order-insensitive modifier comparison key.
// JSON.stringify is order-sensitive; sorting by id first ensures
// [A, B] and [B, A] produce the same key and deduplicate correctly.
function modifiersKey(mods: CartModifier[]): string {
  return JSON.stringify(
    [...mods]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(m => ({ id: m.id, q: m.quantity ?? 1 }))
  )
}

export interface CartModifier {
  id: string
  name: string
  price: number
  quantity?: number
}

export interface OnlineCartItem {
  id: string
  backendId?: string        // UUID assigned by backend after sync
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  modifiers: CartModifier[]
  notes?: string
  total: number
  has_modifiers?: boolean   // true = cart + button should open ingredient selector
}

export interface DeliveryInfo {
  order_type: 'delivery' | 'pickup' | 'dine-in'
  delivery_address_id?: string
  scheduled_time?: string
  delivery_instructions?: string
}

interface BackendCartItemModifier {
  id: string           // junction row UUID (not the modifier UUID)
  modifier_id: string  // the actual modifier UUID used in requests
  modifier_name: string
  price: number | string
  quantity?: number | string
}

interface BackendCartItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  modifiers: BackendCartItemModifier[]
  notes?: string
  subtotal: number | string  // API returns Decimal as string
}

interface BackendCart {
  id: string
  session_id: string
  order_type: 'delivery' | 'pickup' | 'dine-in'
  items: BackendCartItem[]
}

interface AddItemVars {
  product: { id: string; name: string; price: number; has_modifiers?: boolean }
  quantity: number
  modifiers: CartModifier[]
  notes?: string
}

interface AddItemsBatchVars {
  product: { id: string; name: string; price: number; has_modifiers?: boolean }
  units: Array<{ modifiers: CartModifier[]; notes?: string }>
}

export const useOnlineCartStore = defineStore('onlineCart', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const sessionId = ref<string | null>(null)
  const cartId = ref<string | null>(null)
  const items = ref<OnlineCartItem[]>([])
  const orderType = ref<'delivery' | 'pickup' | 'dine-in'>('delivery')
  const deliveryInfo = ref<DeliveryInfo | null>(null)
  const tenantId = ref<string | null>(null)
  const tenantName = ref<string | null>(null)

  // ── Getters ────────────────────────────────────────────────────────────────
  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.total, 0))
  const isEmpty = computed(() => items.value.length === 0)
  const formattedSubtotal = computed(() =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(subtotal.value)
  )

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Serialize current items for batch POST body.
   * Prices are NOT sent — backend always looks them up from DB. */
  function buildCartBody() {
    return {
      tenant_id: tenantId.value,
      order_type: orderType.value,
      items: items.value.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        modifiers: item.modifiers.map(mod => ({
          id: mod.id,
          quantity: mod.quantity ?? 1,
        })),
        notes: item.notes,
      })),
    }
  }

  function modifiersIdKey(mods: CartModifier[]): string {
    return JSON.stringify([...mods].sort((a, b) => a.id.localeCompare(b.id)).map(m => m.id))
  }

  function backendModifiersKey(mods: BackendCartItemModifier[]): string {
    return JSON.stringify(
      [...mods]
        .sort((a, b) => a.modifier_id.localeCompare(b.modifier_id))
        .map(m => ({ id: m.modifier_id, q: Number(m.quantity) || 1 }))
    )
  }

  function backendModifiersIdKey(mods: BackendCartItemModifier[]): string {
    return JSON.stringify([...mods].sort((a, b) => a.modifier_id.localeCompare(b.modifier_id)).map(m => m.modifier_id))
  }

  /** Map backend item UUIDs onto local lines after batch (always overwrite — batch creates a new cart). */
  function syncItemIds(backendItems: BackendCartItem[]) {
    const matchedLocalIds = new Set<string>()
    for (const backendItem of backendItems) {
      const backendHasQuantities = backendItem.modifiers.some(mod => mod.quantity != null)
      const localItem = items.value.find(
        item =>
          !matchedLocalIds.has(item.id) &&
          String(item.product_id) === String(backendItem.product_id) &&
          (
            backendHasQuantities
              ? modifiersKey(item.modifiers) === backendModifiersKey(backendItem.modifiers)
              : modifiersIdKey(item.modifiers) === backendModifiersIdKey(backendItem.modifiers)
          )
      )
      if (localItem) {
        localItem.backendId = backendItem.id
        matchedLocalIds.add(localItem.id)
      }
    }
  }

  function applyBatchResponse(data: { data: BackendCart }) {
    cartId.value = data.data.id
    if (data.data.session_id) {
      sessionId.value = data.data.session_id
      if (process.client) {
        localStorage.setItem('waro_session_id', data.data.session_id)
      }
    }
    syncItemIds(data.data.items)
  }

  function isNotFoundError(error: unknown): boolean {
    const e = error as { statusCode?: number; status?: number; response?: { status?: number } }
    const status = e?.statusCode ?? e?.status ?? e?.response?.status
    return status === 404
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  // addItem: push/merge optimistic, POST batch, rollback on error
  const addMutation = useMutation({
    onMutate({ product, quantity, modifiers = [], notes }: AddItemVars) {
      const snapshot = [...items.value]
      const sortedModifiers = [...modifiers].sort((a, b) => a.id.localeCompare(b.id))
      const modifiersTotal = modifiersCartTotal(modifiers)
      const existingIndex = items.value.findIndex(
        item => item.product_id === product.id && modifiersKey(item.modifiers) === modifiersKey(modifiers)
      )
      if (existingIndex >= 0) {
        items.value[existingIndex].quantity += quantity
        items.value[existingIndex].total =
          (product.price + modifiersTotal) * items.value[existingIndex].quantity
      } else {
        items.value.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      return { snapshot }
    },
    mutation: async (_vars: AddItemVars) => {
      // Await session recovery before syncing — prevents race with hydrateFromBackend()
      if (_recoveryPromise) {
        await _recoveryPromise
        _recoveryPromise = null
      }
      return $fetch<{ data: BackendCart }>('/api/online/cart/batch', {
        method: 'POST',
        body: buildCartBody(),
      })
    },
    onError(_error, _vars, context) {
      items.value = context.snapshot
    },
    onSuccess(data) {
      applyBatchResponse(data)
    },
  })

  // addItemsBatch: loop all units optimistically, POST batch, rollback on error
  const batchMutation = useMutation({
    onMutate({ product, units }: AddItemsBatchVars) {
      const snapshot = [...items.value]
      for (const unit of units) {
        const sortedModifiers = [...unit.modifiers].sort((a, b) => a.id.localeCompare(b.id))
        const modifiersTotal = modifiersCartTotal(unit.modifiers)
        const existingIndex = items.value.findIndex(
          item => item.product_id === product.id && modifiersKey(item.modifiers) === modifiersKey(unit.modifiers)
        )
        if (existingIndex >= 0) {
          items.value[existingIndex].quantity += 1
          items.value[existingIndex].total =
            (product.price + modifiersTotal) * items.value[existingIndex].quantity
        } else {
          items.value.push({
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            unit_price: product.price,
            modifiers: sortedModifiers,
            notes: unit.notes,
            total: product.price + modifiersTotal,
            has_modifiers: product.has_modifiers ?? false,
          })
        }
      }
      return { snapshot }
    },
    mutation: async (_vars: AddItemsBatchVars) => {
      // Fix: await recovery before batch add — prevents race with hydrateFromBackend()
      // (was missing from the original addItemsBatch, only addItem had this guard)
      if (_recoveryPromise) {
        await _recoveryPromise
        _recoveryPromise = null
      }
      return $fetch<{ data: BackendCart }>('/api/online/cart/batch', {
        method: 'POST',
        body: buildCartBody(),
      })
    },
    onError(_error, _vars, context) {
      items.value = context.snapshot
    },
    onSuccess(data) {
      applyBatchResponse(data)
    },
  })

  // updateItemQuantity: optimistic qty/total update, POST batch, rollback on error
  const updateMutation = useMutation({
    onMutate({ itemId, quantity }: { itemId: string; quantity: number }) {
      const item = items.value.find(i => i.id === itemId)
      if (!item) throw new Error('Item not found')
      const modifiersTotal = modifiersCartTotal(item.modifiers)
      const prevQty = item.quantity
      const prevTotal = item.total
      item.quantity = quantity
      item.total = (item.unit_price + modifiersTotal) * quantity
      return { itemId, prevQty, prevTotal }
    },
    mutation: async (_vars: { itemId: string; quantity: number }) => {
      return $fetch<{ data: BackendCart }>('/api/online/cart/batch', {
        method: 'POST',
        body: buildCartBody(),
      })
    },
    onError(_error, _vars, context) {
      const item = items.value.find(i => i.id === context.itemId)
      if (item) {
        item.quantity = context.prevQty
        item.total = context.prevTotal
      }
    },
    onSuccess(data) {
      applyBatchResponse(data)
    },
  })

  // removeItem: optimistic splice, DELETE per-item endpoint, rollback on error
  const removeMutation = useMutation({
    onMutate(itemId: string) {
      const index = items.value.findIndex(i => i.id === itemId)
      if (index < 0) {
        return { snapshot: null as OnlineCartItem | null, index: -1, backendId: null as string | null, snapshotCartId: null as string | null }
      }
      const snapshot = items.value[index]
      const backendId = snapshot.backendId ?? null
      const snapshotCartId = cartId.value
      items.value.splice(index, 1)
      return { snapshot, index, backendId, snapshotCartId }
    },
    mutation: async (_itemId: string, context) => {
      // Only call DELETE if the item was synced to backend
      if (context.backendId && context.snapshotCartId) {
        try {
          await $fetch(`/api/online/cart/${context.snapshotCartId}/items/${context.backendId}`, {
            method: 'DELETE',
          })
        } catch (error) {
          if (!isNotFoundError(error)) throw error
          // Stale cart/item ids after a prior batch recreate — resync remaining lines
          if (items.value.length > 0) {
            const data = await $fetch<{ data: BackendCart }>('/api/online/cart/batch', {
              method: 'POST',
              body: buildCartBody(),
            })
            applyBatchResponse(data)
          } else {
            try {
              await $fetch(`/api/online/cart/${context.snapshotCartId}`, { method: 'DELETE' })
            } catch {
              // Cart may already be gone
            }
            cartId.value = null
          }
        }
      }
      // No backendId = item was never synced; local removal is sufficient
    },
    onError(error, _vars, context) {
      if (isNotFoundError(error)) return
      // Restore the removed item at its original position
      if (context.snapshot && context.index >= 0) {
        items.value.splice(context.index, 0, context.snapshot)
      }
    },
  })

  // clearCart: non-optimistic DELETE, clear local state only on success
  const clearMutation = useMutation({
    mutation: async () => {
      if (cartId.value) {
        await $fetch(`/api/online/cart/${cartId.value}`, { method: 'DELETE' })
      }
    },
    onSuccess() {
      items.value = []
      cartId.value = null
      deliveryInfo.value = null
    },
  })

  // updateDeliveryInfo: optimistic local update, PUT, rollback on error
  const deliveryMutation = useMutation({
    onMutate(info: DeliveryInfo) {
      const prevDeliveryInfo = deliveryInfo.value
      const prevOrderType = orderType.value
      const snapshotCartId = cartId.value
      deliveryInfo.value = info
      orderType.value = info.order_type
      return { prevDeliveryInfo, prevOrderType, snapshotCartId }
    },
    mutation: async (info: DeliveryInfo, context) => {
      if (context.snapshotCartId) {
        await $fetch(`/api/online/cart/${context.snapshotCartId}/delivery`, {
          method: 'PUT',
          body: info,
        })
      }
    },
    onError(_error, _vars, context) {
      deliveryInfo.value = context.prevDeliveryInfo
      orderType.value = context.prevOrderType
    },
  })

  // ── Derived loading state ──────────────────────────────────────────────────
  // Backward compat: consumers read cartStore.isLoading to disable buttons.
  // After migration each mutation has its own .isLoading; this derived computed
  // keeps all consumer components working without changes.
  const isLoading = computed(() =>
    addMutation.isLoading.value ||
    batchMutation.isLoading.value ||
    updateMutation.isLoading.value ||
    removeMutation.isLoading.value ||
    clearMutation.isLoading.value ||
    deliveryMutation.isLoading.value
  )

  // ── Session / init actions ─────────────────────────────────────────────────

  /** Initialize session ID from localStorage or create new one */
  function initSession(sessionIdParam?: string | null) {
    // session_id is now generated by the backend on first POST /cart/batch.
    // If a stored session exists (page reload), restore it so recovery works.
    if (sessionIdParam) {
      sessionId.value = sessionIdParam
    }
    // If no stored session, leave as null — backend will assign one on first batch call.
  }

  /** Set tenant ID (and optional display name) for the cart */
  function setTenant(id: string, name?: string) {
    tenantId.value = id
    tenantName.value = name ?? null
  }

  /**
   * Register the session-recovery promise so mutations can await it.
   * Called from the page before the recovery fetch starts.
   */
  function setRecoveryPromise(p: Promise<void>) {
    _recoveryPromise = p
  }

  /** Hydrate local state from a backend cart response (session recovery) */
  function hydrateFromBackend(cartData: BackendCart) {
    cartId.value = cartData.id
    orderType.value = cartData.order_type
    // Capture session_id from backend and persist for page-reload recovery
    if (cartData.session_id) {
      sessionId.value = cartData.session_id
      if (process.client) {
        localStorage.setItem('waro_session_id', cartData.session_id)
      }
    }
    items.value = cartData.items.map(item => ({
      id: `item_${item.id}`,
      backendId: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      modifiers: (item.modifiers || []).map(mod => ({
        id: mod.modifier_id,
        name: mod.modifier_name,
        price: Number(mod.price),
        quantity: Number(mod.quantity) || 1,
      })),
      notes: item.notes,
      total: Number(item.subtotal),
      has_modifiers: false, // not stored in backend — safe default after page refresh
    }))
  }

  /** Set order type (delivery/pickup/dine-in) */
  function setOrderType(type: 'delivery' | 'pickup' | 'dine-in') {
    orderType.value = type
  }

  /** Reset cart to initial state */
  function reset() {
    sessionId.value = null
    cartId.value = null
    items.value = []
    orderType.value = 'delivery'
    deliveryInfo.value = null
    tenantId.value = null
    tenantName.value = null
    if (process.client) {
      localStorage.removeItem('waro_session_id')
    }
  }

  // ── Public mutation wrappers ───────────────────────────────────────────────
  // Preserve the existing calling contract: async functions that throw on error.

  /** Add item to cart with modifiers — POST /api/online/cart/batch */
  const addItem = async (
    product: AddItemVars['product'],
    quantity: number,
    modifiers: CartModifier[] = [],
    notes?: string
  ) => {
    try {
      await addMutation.mutateAsync({ product, quantity, modifiers, notes })
    } catch (error: any) {
      throw new Error(error.data?.detail || 'Error al agregar producto al carrito')
    }
  }

  /**
   * Add multiple units with independent modifiers in one batch POST.
   * Used by the per-item wizard when qty > 1 with individual customization.
   */
  const addItemsBatch = async (
    product: AddItemsBatchVars['product'],
    units: AddItemsBatchVars['units']
  ) => {
    try {
      await batchMutation.mutateAsync({ product, units })
    } catch (error: any) {
      throw new Error(error.data?.detail || 'Error al agregar productos al carrito')
    }
  }

  /** Update item quantity — delegates to removeItem if quantity ≤ 0 */
  const updateItemQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      return removeItem(itemId)
    }
    try {
      await updateMutation.mutateAsync({ itemId, quantity })
    } catch (error: any) {
      throw new Error(error.data?.detail || 'Error al actualizar la cantidad')
    }
  }

  /** Remove item from cart — DELETE /api/online/cart/{cartId}/items/{backendId} */
  const removeItem = async (itemId: string) => {
    try {
      await removeMutation.mutateAsync(itemId)
    } catch (error: any) {
      throw new Error(error.data?.detail || 'Error al eliminar el producto')
    }
  }

  /** Clear entire cart — DELETE /api/online/cart/{cartId} */
  const clearCart = async () => {
    try {
      await clearMutation.mutateAsync()
    } catch (error: any) {
      throw new Error(error.data?.detail || 'Error al vaciar el carrito')
    }
  }

  /** Update delivery info — PUT /api/online/cart/{cartId}/delivery (if cart exists) */
  const updateDeliveryInfo = async (info: DeliveryInfo) => {
    try {
      await deliveryMutation.mutateAsync(info)
    } catch (error: any) {
      throw new Error(error.data?.detail || 'Error al actualizar la entrega')
    }
  }

  // ── Return ─────────────────────────────────────────────────────────────────
  return {
    // State
    sessionId,
    cartId,
    items,
    orderType,
    deliveryInfo,
    tenantId,
    tenantName,
    isLoading,

    // Getters
    itemCount,
    subtotal,
    isEmpty,
    formattedSubtotal,

    // Session / init
    initSession,
    setTenant,
    setRecoveryPromise,
    hydrateFromBackend,
    setOrderType,
    reset,

    // Mutations
    addItem,
    addItemsBatch,
    updateItemQuantity,
    removeItem,
    clearCart,
    updateDeliveryInfo,
  }
})
