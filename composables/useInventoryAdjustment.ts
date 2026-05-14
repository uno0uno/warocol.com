/**
 * useInventoryAdjustment — state + handlers for a single stock adjustment.
 *
 * Lifts the form logic from `pages/abastecimiento/ajustes/crear.vue` so the
 * new slide-over (warocol.com#608) and the standalone page can share one
 * code path. The standalone page is not migrated in this PR — to keep the
 * diff focused — but the composable is shaped to be a drop-in for it later.
 *
 * Submits to: POST /api/inventory/adjustments
 *   body: { ingredient_id, quantity_change (signed), unit, cost_per_unit?, reason, source }
 */
import { computed, reactive, ref } from 'vue'

export type AdjustmentType = 'increment' | 'decrement' | 'set'

export interface AdjustmentReason {
  value: string
  label: string
}

export const ADJUSTMENT_REASONS: AdjustmentReason[] = [
  { value: 'inventory_count', label: 'Conteo físico de inventario' },
  { value: 'expired',         label: 'Producto vencido' },
  { value: 'damaged',         label: 'Producto dañado' },
  { value: 'spoilage',        label: 'Merma o desperdicio' },
  { value: 'theft',           label: 'Robo o pérdida' },
  { value: 'correction',      label: 'Corrección de error de registro' },
  { value: 'initial_stock',   label: 'Inventario inicial' },
  { value: 'transfer',        label: 'Transferencia interna' },
  { value: 'supplier_return', label: 'Devolución a proveedor' },
  { value: 'other',           label: 'Otro' },
]

const REASON_LABELS: Record<string, string> = ADJUSTMENT_REASONS.reduce(
  (acc, r) => { acc[r.value] = r.label; return acc },
  {} as Record<string, string>,
)

export interface SelectedIngredient {
  id: string
  name: string
  unit: string          // base unit
  minimum_stock?: number | null
  maximum_stock?: number | null
}

interface FormState {
  ingredientId: string
  adjustmentType: AdjustmentType | ''
  quantity: number | null
  unit: string                // purchase unit code (or base unit if no purchase units)
  cost_per_unit: number | null  // only meaningful when type=increment
  reason: string
  notes: string
}

export function useInventoryAdjustment() {
  const form = reactive<FormState>({
    ingredientId: '',
    adjustmentType: '',
    quantity: null,
    unit: '',
    cost_per_unit: null,
    reason: '',
    notes: '',
  })

  const selectedIngredient = ref<SelectedIngredient | null>(null)
  const currentStock = ref<number>(0)
  const isSubmitting = ref(false)
  const errorMessage = ref('')

  const isFormValid = computed(() => {
    if (!form.ingredientId || !form.adjustmentType || !form.unit) return false
    if (!form.quantity || form.quantity <= 0) return false
    if (!form.reason) return false
    if (form.reason === 'other' && !form.notes.trim()) return false
    return true
  })

  /**
   * Computes the new stock value after the adjustment, expressed in the
   * ingredient's BASE unit. Mirrors the preview shown to the operator.
   * `quantity` is in the chosen purchase unit; `convertToBase` returns the
   * value translated to base unit.
   */
  const calculateNewStockInBase = (convertToBase: (qty: number, unit: string) => number): number => {
    const qty = form.quantity ?? 0
    if (qty <= 0) return currentStock.value
    const qtyInBase = convertToBase(qty, form.unit)
    switch (form.adjustmentType) {
      case 'increment': return currentStock.value + qtyInBase
      case 'decrement': return Math.max(0, currentStock.value - qtyInBase)
      case 'set':       return qtyInBase
      default:          return currentStock.value
    }
  }

  /**
   * Fires the yellow "large adjustment" warning when the change is >50%
   * of current stock. `set` never triggers (it's an absolute value, not a delta).
   */
  const largeAdjustmentWarning = (convertToBase: (qty: number, unit: string) => number): boolean => {
    if (!form.quantity || form.quantity <= 0) return false
    if (form.adjustmentType === 'set') return false
    if (!currentStock.value || currentStock.value <= 0) return false
    const qtyInBase = convertToBase(form.quantity, form.unit)
    const pct = (qtyInBase / currentStock.value) * 100
    return pct > 50
  }

  const reset = () => {
    form.ingredientId = ''
    form.adjustmentType = ''
    form.quantity = null
    form.unit = ''
    form.cost_per_unit = null
    form.reason = ''
    form.notes = ''
    selectedIngredient.value = null
    currentStock.value = 0
    isSubmitting.value = false
    errorMessage.value = ''
  }

  /**
   * Loads the current stock for an ingredient.
   * Returns the numeric value (0 if not found / null).
   */
  const loadCurrentStock = async (ingredientId: string): Promise<number> => {
    try {
      const res = await $fetch<{ current_stock?: number | null }>(
        `/api/inventory/stock/${ingredientId}`,
      )
      const v = res?.current_stock
      const num = typeof v === 'number' ? v : Number(v ?? 0)
      currentStock.value = isFinite(num) ? num : 0
    } catch {
      currentStock.value = 0
    }
    return currentStock.value
  }

  /**
   * Submits the adjustment. Translates the chosen adjustment type into a
   * signed `quantity_change` value in the PURCHASE unit (backend converts
   * to base). On success returns the API response payload; on failure
   * throws — caller surfaces `errorMessage`.
   */
  const submit = async (): Promise<unknown> => {
    if (!isFormValid.value) {
      throw new Error('Formulario inválido')
    }
    isSubmitting.value = true
    errorMessage.value = ''
    try {
      const qty = form.quantity as number
      let quantityChange = 0
      if (form.adjustmentType === 'increment') {
        quantityChange = qty
      } else if (form.adjustmentType === 'decrement') {
        quantityChange = -qty
      } else if (form.adjustmentType === 'set') {
        // Backend interprets quantity_change as a DELTA. For "set", the
        // delta is `target - current` — both in the SAME unit. We send the
        // PURCHASE unit, so we must express current_stock in that unit too.
        // Simplest path: send the target as-is and let the cashier verify;
        // matches the standalone page behaviour at ajustes/crear.vue:533.
        // (`quantity` is the target value in the chosen unit.)
        quantityChange = qty - currentStock.value
      }

      const payload: Record<string, unknown> = {
        ingredient_id: form.ingredientId,
        quantity_change: quantityChange,
        unit: form.unit,
        reason: `${REASON_LABELS[form.reason] || form.reason}${form.notes ? ': ' + form.notes : ''}`,
        source: 'manual_adjustment',
      }
      if (form.adjustmentType === 'increment' && form.cost_per_unit) {
        payload.cost_per_unit = form.cost_per_unit
      }

      const res = await $fetch('/api/inventory/adjustments', {
        method: 'POST',
        body: payload,
      })
      return res
    } catch (e: any) {
      const detail = e?.data?.detail
      if (Array.isArray(detail)) {
        errorMessage.value = detail
          .map((d: any) => d?.msg || JSON.stringify(d))
          .join(', ')
      } else if (typeof detail === 'string') {
        errorMessage.value = detail
      } else {
        errorMessage.value = e?.message || 'No se pudo registrar el ajuste.'
      }
      throw e
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    form,
    selectedIngredient,
    currentStock,
    isSubmitting,
    errorMessage,
    isFormValid,
    calculateNewStockInBase,
    largeAdjustmentWarning,
    loadCurrentStock,
    submit,
    reset,
  }
}
