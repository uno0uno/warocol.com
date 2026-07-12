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

export const INVENTORY_QUANTITY_PRECISION = 6
export const TECHNICAL_UNIT_COST_PRECISION = 6

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
  const { t } = useI18n({ useScope: 'global' })
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
  const isLoadingStock = ref(false)
  const stockLoaded = ref(false)
  const isSubmitting = ref(false)
  const errorMessage = ref('')

  const hasValidQuantity = computed(() => {
    const qty = form.quantity
    if (qty === null || qty === undefined || Number.isNaN(qty)) return false
    // "Ajustar a" allows 0 (physical count with no stock). Increment/decrement stay > 0.
    if (form.adjustmentType === 'set') return qty >= 0
    return qty > 0
  })

  const isFormValid = computed(() => {
    // Block submit until the current stock has been confirmed by the
    // backend — otherwise an operator could increment against a stale 0
    // and silently distort inventory (caught in #608 follow-up).
    if (!stockLoaded.value || isLoadingStock.value) return false
    if (!form.ingredientId || !form.adjustmentType || !form.unit) return false
    if (!hasValidQuantity.value) return false
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
    if (form.adjustmentType !== 'set' && qty <= 0) return currentStock.value
    if (form.adjustmentType === 'set' && qty < 0) return currentStock.value
    const qtyInBase = convertToBase(qty, form.unit)
    switch (form.adjustmentType) {
      case 'increment': return currentStock.value + qtyInBase
      case 'decrement': return Math.max(0, currentStock.value - qtyInBase)
      case 'set':       return Math.max(0, qtyInBase)
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
    stockLoaded.value = false
    isLoadingStock.value = false
    isSubmitting.value = false
    errorMessage.value = ''
  }

  /**
   * Loads the current stock for an ingredient. Throws on failure so the
   * caller (panel) can show an error banner and gate the submit — we do
   * NOT silently fall back to 0 because doing so misled the operator in
   * a prior incident (a +2 libras "Incremento" was applied against an
   * unknown real stock).
   */
  const loadCurrentStock = async (ingredientId: string): Promise<number> => {
    isLoadingStock.value = true
    stockLoaded.value = false
    errorMessage.value = ''
    try {
      const res = await $fetch<{ current_stock?: number | null }>(
        `/api/inventory/stock/${ingredientId}`,
      )
      const v = res?.current_stock
      const num = typeof v === 'number' ? v : Number(v ?? 0)
      currentStock.value = isFinite(num) ? num : 0
      stockLoaded.value = true
      return currentStock.value
    } catch (e: any) {
      currentStock.value = 0
      stockLoaded.value = false
      errorMessage.value =
        e?.data?.detail ||
        e?.message ||
        t('abastecimiento.stock.stockLoadError')
      throw e
    } finally {
      isLoadingStock.value = false
    }
  }

  /**
   * Submits the adjustment. Converts `qty` to base unit via `convertToBase`,
   * builds a signed `quantity_change` in base unit, and sends `unit = base`.
   * The backend then treats the delta as a base-unit value (factor = 1),
   * which removes the mixed-unit class of bugs that previously zeroed stock
   * on "set" with non-1 conversion factors (warocol.com#616).
   *
   * `cost_per_unit` is divided by the same factor before sending so the
   * recorded base-unit cost matches the operator's intent (the backend used
   * to do this division itself — it becomes a no-op now that we send base
   * unit, so the frontend owns the conversion).
   */
  const submit = async (
    convertToBase: (qty: number, unit: string) => number,
  ): Promise<unknown> => {
    if (!isFormValid.value) {
      throw new Error('Formulario inválido')
    }
    if (!selectedIngredient.value) {
      throw new Error('Ingrediente no seleccionado')
    }
    isSubmitting.value = true
    errorMessage.value = ''
    try {
      const qty = form.quantity as number
      const baseUnit = selectedIngredient.value.unit
      const qtyInBase = convertToBase(qty, form.unit)
      let quantityChange = 0
      if (form.adjustmentType === 'increment') {
        quantityChange = qtyInBase
      } else if (form.adjustmentType === 'decrement') {
        quantityChange = -qtyInBase
      } else if (form.adjustmentType === 'set') {
        quantityChange = qtyInBase - currentStock.value
      }

      const payload: Record<string, unknown> = {
        ingredient_id: form.ingredientId,
        quantity_change: quantityChange,
        unit: baseUnit,
        reason: `${REASON_LABELS[form.reason] || form.reason}${form.notes ? ': ' + form.notes : ''}`,
        source: 'manual_adjustment',
      }
      if (form.adjustmentType === 'increment' && form.cost_per_unit) {
        // Backend stores cost_per_base_unit. Convert the operator-entered
        // cost_per_form_unit using the same factor we used for qty.
        const factorForFormUnit = convertToBase(1, form.unit)
        payload.cost_per_unit =
          factorForFormUnit > 0
            ? form.cost_per_unit / factorForFormUnit
            : form.cost_per_unit
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
        errorMessage.value = e?.message || t('abastecimiento.stock.registerError')
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
    isLoadingStock,
    stockLoaded,
    isSubmitting,
    errorMessage,
    isFormValid,
    hasValidQuantity,
    calculateNewStockInBase,
    largeAdjustmentWarning,
    loadCurrentStock,
    submit,
    reset,
  }
}
