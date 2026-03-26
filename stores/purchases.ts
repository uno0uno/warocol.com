/**
 * Purchases Store
 * Migrated to Pinia Colada useQuery — replaces Map<string, Purchase> manual cache
 * with Pinia Colada's built-in per-key caching (staleTime: 60s).
 *
 * Must stay as a Pinia store (not a composable) because currentPurchaseId,
 * currentPurchase, and showActionBar are shared state between the detail page
 * (pages/abastecimiento/compra/[id]/index.vue) and GlobalPurchaseActionBar.
 *
 * Dead code removed: updatePurchaseStatus, updatePurchase, getPurchaseById,
 * clearPurchase, clearAllPurchases — none had active callers.
 */
import { defineStore } from 'pinia'

export interface PurchaseItem {
  ingredient_id: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  expiry_date: string | null
  batch_number: string
  notes: string
  purchase_quantity?: number
  purchase_unit?: string
}

export interface StatusHistoryEntry {
  id: string
  from_status: string | null
  to_status: string
  changed_at: string
  metadata?: Record<string, any>
  notes?: string | null
}

export interface Purchase {
  id: string
  supplier_id: string
  purchase_number: string
  purchase_date: string
  delivery_date: string | null
  status: string
  payment_type?: string | null
  credit_days?: number | null
  payment_due_date?: string | null
  payment_terms?: string | null
  consolidation_group?: string | null
  requires_advance_payment?: boolean | null
  invoice_number: string | null
  tax_amount: number
  total_amount: number
  notes: string | null
  items: PurchaseItem[]
  confirmation_number?: string | null
  tracking_number?: string | null
  carrier?: string | null
  estimated_delivery_date?: string | null
  package_count?: number | null
  status_history?: StatusHistoryEntry[]
}

// ── Pure transform (extracted from old fetchPurchase) ─────────────────────────
function transformPurchase(purchase: any): Purchase {
  return {
    id: purchase.id,
    supplier_id: purchase.supplier_id || '',
    purchase_number: purchase.purchase_number || '',
    purchase_date: purchase.purchase_date || '',
    delivery_date: purchase.delivery_date || null,
    status: purchase.status || 'pending',
    payment_type: purchase.payment_type || null,
    credit_days: purchase.credit_days || null,
    payment_due_date: purchase.payment_due_date || null,
    payment_terms: purchase.payment_terms || null,
    consolidation_group: purchase.consolidation_group || null,
    requires_advance_payment: purchase.requires_advance_payment || null,
    invoice_number: purchase.invoice_number || null,
    tax_amount: parseFloat(purchase.tax_amount) || 0,
    total_amount: parseFloat(purchase.total_amount) || 0,
    notes: purchase.notes || null,
    items: purchase.items?.map((item: any) => ({
      ingredient_id: item.ingredient_id,
      quantity: parseFloat(item.quantity),
      unit: item.unit,
      unit_cost: parseFloat(item.unit_cost),
      total_cost: parseFloat(item.total_cost),
      expiry_date: item.expiry_date || null,
      batch_number: item.batch_number || '',
      notes: item.notes || '',
      purchase_quantity:
        item.purchase_quantity !== null && item.purchase_quantity !== undefined
          ? parseFloat(String(item.purchase_quantity))
          : undefined,
      purchase_unit: item.purchase_unit || undefined,
    })) || [],
    confirmation_number: purchase.confirmation_number || null,
    tracking_number: purchase.tracking_number || null,
    carrier: purchase.carrier || null,
    estimated_delivery_date: purchase.estimated_delivery_date || null,
    package_count: purchase.package_count || null,
    status_history: purchase.status_history || [],
  }
}

export const usePurchasesStore = defineStore('purchases', () => {
  const cache = useQueryCache()

  // ── UI state (shared between detail page and GlobalPurchaseActionBar) ─────────
  const currentPurchaseId = ref<string | null>(null)
  const showActionBar = ref(false)
  const error = ref<string | null>(null)

  // ── Query reactive on currentPurchaseId ───────────────────────────────────────
  const { data: currentPurchase, status } = useQuery({
    key: () => ['purchases', currentPurchaseId.value],
    query: async () => {
      const response = await $fetch<any>(`/api/suppliers/purchases/${currentPurchaseId.value}`)
      if (!response?.success || !response.data) throw new Error('Error loading purchase data')
      return transformPurchase(response.data)
    },
    enabled: () => !!currentPurchaseId.value,
    staleTime: 60_000, // 1 minute — same behavior as old Map cache
  })

  const isLoading = computed(() => status.value === 'loading')

  // ── fetchPurchase: set current ID + optional force-refresh ────────────────────
  const fetchPurchase = async (id: string, forceRefresh = false) => {
    currentPurchaseId.value = id
    if (forceRefresh) {
      await cache.invalidateQueries({ key: ['purchases', id] })
    }
  }

  // ── UI actions (preserved — callers depend on these) ──────────────────────────
  const setCurrentPurchase = (id: string | null) => {
    currentPurchaseId.value = id
    showActionBar.value = !!id
  }

  const hideActionBar = () => {
    showActionBar.value = false
  }

  return {
    // State
    isLoading,
    error,
    currentPurchaseId,
    showActionBar,

    // Data (reactive computed from query)
    currentPurchase,

    // Actions
    fetchPurchase,
    setCurrentPurchase,
    hideActionBar,
  }
})
