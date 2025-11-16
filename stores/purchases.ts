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
}

export const usePurchasesStore = defineStore('purchases', () => {
  // State
  const purchases = ref<Map<string, Purchase>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Current purchase context (for action bar)
  const currentPurchaseId = ref<string | null>(null)
  const showActionBar = ref(false)

  // Getters
  const getPurchaseById = computed(() => {
    return (id: string) => purchases.value.get(id)
  })

  const currentPurchase = computed(() => {
    if (!currentPurchaseId.value) return null
    return purchases.value.get(currentPurchaseId.value)
  })

  // Actions
  const fetchPurchase = async (id: string, forceRefresh = false) => {
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && purchases.value.has(id)) {
      return purchases.value.get(id)
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch(`/api/suppliers/purchases/${id}`)

      if (response?.success && response.data) {
        const purchase = response.data

        // Transform and store in cache
        const transformedPurchase: Purchase = {
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
            notes: item.notes || ''
          })) || [],
          confirmation_number: purchase.confirmation_number || null,
          tracking_number: purchase.tracking_number || null,
          carrier: purchase.carrier || null,
          estimated_delivery_date: purchase.estimated_delivery_date || null,
          package_count: purchase.package_count || null
        }

        // Update the Map and trigger reactivity by creating a new Map
        const newMap = new Map(purchases.value)
        newMap.set(id, transformedPurchase)
        purchases.value = newMap
        return transformedPurchase
      } else {
        throw new Error('Error loading purchase data')
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch purchase'
      console.error('Error fetching purchase:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updatePurchaseStatus = (id: string, status: string) => {
    const purchase = purchases.value.get(id)
    if (purchase) {
      purchase.status = status
      const newMap = new Map(purchases.value)
      newMap.set(id, { ...purchase })
      purchases.value = newMap
    }
  }

  const updatePurchase = (id: string, updates: Partial<Purchase>) => {
    const purchase = purchases.value.get(id)
    if (purchase) {
      const updatedPurchase = { ...purchase, ...updates }
      const newMap = new Map(purchases.value)
      newMap.set(id, updatedPurchase)
      purchases.value = newMap
    }
  }

  const clearPurchase = (id: string) => {
    const newMap = new Map(purchases.value)
    newMap.delete(id)
    purchases.value = newMap
  }

  const clearAllPurchases = () => {
    purchases.value = new Map()
  }

  const setCurrentPurchase = (id: string | null) => {
    currentPurchaseId.value = id
    showActionBar.value = !!id
  }

  const hideActionBar = () => {
    showActionBar.value = false
  }

  return {
    // State
    purchases,
    isLoading,
    error,
    currentPurchaseId,
    showActionBar,

    // Getters
    getPurchaseById,
    currentPurchase,

    // Actions
    fetchPurchase,
    updatePurchaseStatus,
    updatePurchase,
    clearPurchase,
    clearAllPurchases,
    setCurrentPurchase,
    hideActionBar
  }
})
