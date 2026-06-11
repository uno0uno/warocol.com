<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-40 bg-overlay-backdrop/40"
        @click="close"
        aria-hidden="true"
      />
    </Transition>

    <!-- Panel: bottom sheet on mobile, slide-over on desktop -->
    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        aria-label="Ajustar stock"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
        @keydown.esc="close"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-sheet-border" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <AdjustmentsHorizontalIcon class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">Ajustar stock</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ selectedIngredient ? selectedIngredient.name : WAREHOUSE_COPY.stockAdjustmentSelectPrompt }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar panel"
              :disabled="isSubmitting"
              class="flex-shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 disabled:opacity-50 transition-colors"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- ─── Success state ─────────────────────────────────────────────── -->
        <div v-if="state === 'success'" class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div class="flex items-start gap-3 rounded-xl border border-state-success-border bg-state-success-bg p-4">
            <CheckCircleIcon class="w-5 h-5 text-state-success-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-state-success-text">Ajuste registrado</p>
              <p class="text-xs text-state-success-text mt-0.5 leading-snug break-words">
                {{ successMessage }}
              </p>
            </div>
          </div>
        </div>

        <!-- ─── Form (idle / sending / error) ─────────────────────────────── -->
        <div v-else class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <!-- 1. Ingredient picker -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">
              {{ WAREHOUSE_COPY.warehouseItemColumn }} <span class="text-destructive">*</span>
            </label>
            <UiIngredientSearchInput
              :allow-create="false"
              :placeholder="WAREHOUSE_COPY.purchaseSearchPlaceholder"
              @select="onIngredientSelect"
            />
          </div>

          <!-- 2. Selected ingredient summary (3 cards) — skeleton while loading -->
          <div
            v-if="selectedIngredient"
            class="rounded-xl border border-border bg-background p-4 grid grid-cols-3 gap-3"
          >
            <div>
              <p class="text-[10px] font-medium text-text-secondary uppercase tracking-wide">Stock Actual</p>
              <div v-if="isLoadingStock || !stockLoaded" class="mt-1 h-6 w-20 bg-surface-secondary rounded animate-pulse" aria-label="Cargando stock actual" />
              <template v-else>
                <p class="text-lg font-bold text-text-primary mt-0.5 leading-tight">
                  {{ formatNumber(currentStock) }}
                  <span class="text-xs text-text-secondary font-normal">{{ selectedIngredient.unit }}</span>
                </p>
                <p
                  v-if="currentStockInFormUnit !== null"
                  class="text-[10px] text-text-secondary leading-snug mt-0.5"
                >
                  ≈ {{ formatNumber(currentStockInFormUnit) }} {{ form.unit }}
                </p>
              </template>
            </div>
            <div>
              <p class="text-[10px] font-medium text-text-secondary uppercase tracking-wide">Mínimo</p>
              <div v-if="isLoadingStock || !stockLoaded" class="mt-1 h-5 w-16 bg-surface-secondary rounded animate-pulse" aria-label="Cargando mínimo" />
              <p v-else class="text-sm font-semibold text-text-primary mt-0.5 leading-tight">
                {{ formatNumber(selectedIngredient.minimum_stock || 0) }}
                <span class="text-xs text-text-secondary font-normal">{{ selectedIngredient.unit }}</span>
              </p>
            </div>
            <div>
              <p class="text-[10px] font-medium text-text-secondary uppercase tracking-wide">Máximo</p>
              <div v-if="isLoadingStock || !stockLoaded" class="mt-1 h-5 w-12 bg-surface-secondary rounded animate-pulse" aria-label="Cargando máximo" />
              <p v-else class="text-sm font-semibold text-text-primary mt-0.5 leading-tight">
                {{ selectedIngredient.maximum_stock ? formatNumber(selectedIngredient.maximum_stock) : '-' }}
                <span v-if="selectedIngredient.maximum_stock" class="text-xs text-text-secondary font-normal">{{ selectedIngredient.unit }}</span>
              </p>
            </div>
          </div>

          <!-- 2b. Stock-load error: refetch action so operator can recover -->
          <div
            v-if="selectedIngredient && !isLoadingStock && !stockLoaded && errorMessage"
            class="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-destructive"
            role="alert"
          >
            <ExclamationTriangleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div class="flex-1 min-w-0 flex items-start justify-between gap-2">
              <p class="text-xs leading-snug break-words">{{ errorMessage }}</p>
              <button
                type="button"
                class="text-xs font-semibold underline hover:no-underline flex-shrink-0"
                @click="retryStockFetch"
              >
                Reintentar
              </button>
            </div>
          </div>

          <!-- 3. Type cards (only after stock confirmed) -->
          <div v-if="selectedIngredient && stockLoaded" class="flex flex-col gap-2">
            <span class="text-sm font-medium text-text-primary">
              Tipo de Ajuste <span class="text-destructive">*</span>
            </span>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="t in TYPE_OPTIONS"
                :key="t.value"
                type="button"
                :aria-pressed="form.adjustmentType === t.value"
                class="min-h-[44px] flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                :class="form.adjustmentType === t.value ? t.activeClass : 'border-border bg-background hover:border-primary/30 hover:bg-surface-secondary/60'"
                @click="form.adjustmentType = t.value"
              >
                <component
                  :is="t.icon"
                  :class="['w-5 h-5', form.adjustmentType === t.value ? t.iconClass : 'text-text-secondary']"
                  aria-hidden="true"
                />
                <span class="text-xs font-semibold leading-tight" :class="form.adjustmentType === t.value ? t.labelClass : 'text-text-primary'">
                  {{ t.label }}
                </span>
              </button>
            </div>
          </div>

          <!-- 4. Quantity + unit selector with conversion preview -->
          <div v-if="selectedIngredient && form.adjustmentType" class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label :for="qtyId" class="text-sm font-medium text-text-primary">
                {{ form.adjustmentType === 'set' ? 'Nuevo stock' : 'Cantidad' }}
                <span class="text-destructive">*</span>
              </label>
              <UiDecimalInput
                :id="qtyId"
                v-model="form.quantity"
                :min="0"
                :precision="2"
                class="w-full px-3 py-2 min-h-[44px]"
                :placeholder="form.adjustmentType === 'set' ? 'Stock objetivo' : 'Cantidad'"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label :for="unitId" class="text-sm font-medium text-text-primary">
                Unidad <span class="text-destructive">*</span>
              </label>
              <div class="relative">
                <select
                  :id="unitId"
                  v-model="form.unit"
                  :disabled="purchaseUnitOptions.length === 0 || purchaseUnitsApi.isLoading(form.ingredientId)"
                  class="input-base w-full px-3 py-2 min-h-[44px] disabled:bg-surface-secondary disabled:cursor-not-allowed"
                >
                  <!-- Always offer the base unit -->
                  <option :value="selectedIngredient.unit">
                    {{ selectedIngredient.unit }} (base)
                  </option>
                  <option
                    v-for="u in purchaseUnitOptions"
                    :key="u.value + '-' + u.conversion_factor"
                    :value="u.value"
                  >
                    {{ u.label }}<template v-if="u.conversion_factor !== 1"> · 1 = {{ formatNumber(u.conversion_factor) }} {{ selectedIngredient.unit }}</template>
                  </option>
                </select>
                <span
                  v-if="purchaseUnitsApi.isLoading(form.ingredientId)"
                  class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary"
                  aria-hidden="true"
                >
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </span>
              </div>
              <p
                v-if="hasValidQuantity && form.unit !== selectedIngredient.unit"
                class="text-[11px] text-text-secondary leading-snug"
              >
                = {{ formatNumber(convertedQuantity) }} {{ selectedIngredient.unit }}
              </p>
            </div>
          </div>

          <!-- 4b. Amber empty-state for ingredients without purchase units -->
          <div
            v-if="selectedIngredient && !purchaseUnitsApi.isLoading(form.ingredientId) && purchaseUnitOptions.length === 0"
            class="flex items-start gap-2 rounded-xl border border-state-warning-border bg-state-warning-bg p-3"
          >
            <ExclamationTriangleIcon class="w-4 h-4 text-state-warning-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p class="text-xs text-state-warning-text leading-snug">
              Sin unidades de compra configuradas. Podés ajustar usando la unidad base ({{ selectedIngredient.unit }}) o
              <a :href="`/abastecimiento/ingredientes-propios?highlight=${selectedIngredient.id}`" class="underline font-medium">configurar unidades</a>.
            </p>
          </div>

          <!-- 5. Cost per unit (increment only) -->
          <div v-if="selectedIngredient && form.adjustmentType === 'increment'" class="flex flex-col gap-1.5">
            <label :for="costId" class="text-sm font-medium text-text-primary">
              Costo por {{ form.unit || 'unidad' }}
              <span class="text-xs text-text-secondary font-normal">(opcional)</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">$</span>
              <UiDecimalInput
                :id="costId"
                v-model="form.cost_per_unit"
                :min="0"
                :precision="2"
                class="w-full pl-7 pr-3 py-2 min-h-[44px]"
                placeholder="0"
              />
            </div>
            <p class="text-[11px] text-text-secondary leading-snug">
              {{ WAREHOUSE_COPY.stockAdjustmentWeightedCostHint }}
            </p>
          </div>

          <!-- 6. Result preview -->
          <div
            v-if="selectedIngredient && form.adjustmentType && hasValidQuantity"
            class="rounded-xl border border-primary/20 bg-primary/5 p-3"
          >
            <p class="text-xs text-text-secondary leading-snug">Resultado</p>
            <p class="text-sm font-semibold text-text-primary mt-0.5">
              Stock {{ resultVerb }}
              <span class="text-text-primary">{{ formatNumber(newStockInBase) }} {{ selectedIngredient.unit }}</span>
            </p>
          </div>

          <!-- 7. Reason -->
          <div v-if="selectedIngredient && form.adjustmentType" class="flex flex-col gap-1.5">
            <label :for="reasonId" class="text-sm font-medium text-text-primary">
              Motivo del ajuste <span class="text-destructive">*</span>
            </label>
            <select
              :id="reasonId"
              v-model="form.reason"
              class="input-base w-full px-3 py-2 min-h-[44px]"
            >
              <option value="">Seleccionar motivo...</option>
              <option v-for="r in REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>

          <!-- 8. Notes -->
          <div v-if="form.reason" class="flex flex-col gap-1.5">
            <label :for="notesId" class="text-sm font-medium text-text-primary">
              Notas
              <span v-if="form.reason === 'other'" class="text-destructive">*</span>
              <span v-else class="text-xs text-text-secondary font-normal">(opcional)</span>
            </label>
            <textarea
              :id="notesId"
              v-model="form.notes"
              rows="3"
              class="input-base w-full px-3 py-2 resize-none"
              placeholder="Detalles del ajuste..."
            />
          </div>

          <!-- 9. Large adjustment warning -->
          <div
            v-if="showLargeWarning"
            class="flex items-start gap-2 rounded-xl border border-state-warning-border bg-state-warning-bg p-3"
          >
            <ExclamationTriangleIcon class="w-4 h-4 text-state-warning-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p class="text-xs text-state-warning-text leading-snug">
              <strong>Advertencia:</strong> este ajuste representa un cambio mayor al 50% del stock actual. Verificá los datos antes de registrar.
            </p>
          </div>

          <!-- Error banner -->
          <div
            v-if="errorMessage"
            class="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-destructive"
            role="alert"
          >
            <ExclamationTriangleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p class="text-xs leading-snug break-words">{{ errorMessage }}</p>
          </div>
        </div>

        <!-- ─── Sticky footer ─────────────────────────────────────────────── -->
        <div class="flex-shrink-0 border-t border-border bg-surface px-6 py-4">
          <div v-if="state === 'success'" class="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              class="flex-1 min-h-[44px] py-3 px-4 border-2 border-border rounded-xl text-text-primary font-medium hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-95 transition-all"
              @click="close"
            >
              Cerrar
            </button>
            <button
              type="button"
              class="flex-1 min-h-[44px] py-3 px-4 bg-action-primary-bg text-action-primary-text rounded-xl font-semibold hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-95 transition-all"
              @click="resetForAnother"
            >
              Hacer otro ajuste
            </button>
          </div>
          <div v-else class="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              :disabled="isSubmitting"
              class="flex-1 min-h-[44px] py-3 px-4 border-2 border-border rounded-xl text-text-primary font-medium hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="!isFormValid || isSubmitting"
              class="flex-1 min-h-[44px] py-3 px-4 bg-action-primary-bg text-action-primary-text rounded-xl font-semibold hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all inline-flex items-center justify-center gap-2"
              @click="onSubmit"
            >
              <UiLoadingDots v-if="isSubmitting" size="8px" color="currentColor" />
              <span>{{ isSubmitting ? 'Registrando...' : 'Registrar ajuste' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AdjustmentsHorizontalIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import {
  useIngredientPurchaseUnits,
} from '~/composables/useIngredientPurchaseUnits'
import { WAREHOUSE_COPY } from '~/constants/warehouseCopy'
import {
  useInventoryAdjustment,
  ADJUSTMENT_REASONS,
  type SelectedIngredient,
} from '~/composables/useInventoryAdjustment'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const uid = useId()
const qtyId = `stock-adj-qty-${uid}`
const unitId = `stock-adj-unit-${uid}`
const costId = `stock-adj-cost-${uid}`
const reasonId = `stock-adj-reason-${uid}`
const notesId = `stock-adj-notes-${uid}`

const REASONS = ADJUSTMENT_REASONS

const TYPE_OPTIONS = [
  { value: 'increment' as const, label: 'Incremento', icon: ArrowUpCircleIcon,    activeClass: 'border-state-success-border bg-state-success-bg', iconClass: 'text-state-success-icon', labelClass: 'text-state-success-text' },
  { value: 'decrement' as const, label: 'Decremento', icon: ArrowDownCircleIcon,  activeClass: 'border-state-danger-border bg-state-danger-bg',   iconClass: 'text-state-danger-icon',  labelClass: 'text-state-danger-text' },
  { value: 'set'       as const, label: 'Ajustar a',  icon: ArrowsRightLeftIcon,  activeClass: 'border-state-info-border bg-state-info-bg',       iconClass: 'text-state-info-icon',    labelClass: 'text-state-info-text' },
]

const purchaseUnitsApi = useIngredientPurchaseUnits()

const {
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
} = useInventoryAdjustment()

type State = 'idle' | 'success'
const state = ref<State>('idle')
const successMessage = ref('')

watch(() => props.modelValue, (open) => {
  if (open) {
    state.value = 'idle'
    successMessage.value = ''
    reset()
  }
})

const purchaseUnitOptions = computed(() =>
  form.ingredientId ? purchaseUnitsApi.options(form.ingredientId) : [],
)

const convertedQuantity = computed(() => {
  if (!hasValidQuantity.value || !form.unit) return 0
  return purchaseUnitsApi.convertToBase(form.ingredientId, form.quantity as number, form.unit)
})

// Stock Actual rendered in the operator-selected unit, when it differs from
// the base unit. Returns null when no conversion is needed so the template
// can hide the secondary line.
const currentStockInFormUnit = computed<number | null>(() => {
  if (!selectedIngredient.value || !form.unit) return null
  if (form.unit === selectedIngredient.value.unit) return null
  const factor = purchaseUnitsApi.convertToBase(form.ingredientId, 1, form.unit)
  if (!factor || factor === 1) return null
  return currentStock.value / factor
})

const newStockInBase = computed(() =>
  calculateNewStockInBase((qty, unit) =>
    purchaseUnitsApi.convertToBase(form.ingredientId, qty, unit),
  ),
)

const showLargeWarning = computed(() =>
  largeAdjustmentWarning((qty, unit) =>
    purchaseUnitsApi.convertToBase(form.ingredientId, qty, unit),
  ),
)

const resultVerb = computed(() => {
  switch (form.adjustmentType) {
    case 'increment': return 'aumentará a'
    case 'decrement': return 'disminuirá a'
    case 'set':       return 'se establecerá en'
    default:          return 'se establecerá en'
  }
})

const onIngredientSelect = async (ingredient: { id: string; name: string; unit: string; minimum_stock?: number | null; maximum_stock?: number | null }) => {
  selectedIngredient.value = {
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    minimum_stock: ingredient.minimum_stock ?? null,
    maximum_stock: ingredient.maximum_stock ?? null,
  }
  form.ingredientId = ingredient.id
  form.adjustmentType = ''
  form.quantity = null
  form.cost_per_unit = null
  errorMessage.value = ''

  // Fire both fetches in parallel but tolerate either failing individually.
  // Stock-load failure shows the "Reintentar" banner via the composable
  // (loadCurrentStock now throws on failure instead of falling back to 0).
  // Purchase-units failure is already swallowed inside the composable.
  await Promise.allSettled([
    purchaseUnitsApi.fetch(ingredient.id),
    loadCurrentStock(ingredient.id),
  ])

  // Default unit selection: is_default → first → base.
  const def = purchaseUnitsApi.defaultFor(ingredient.id)
  form.unit = def ? def.value : ingredient.unit
}

const retryStockFetch = async () => {
  if (!form.ingredientId) return
  try {
    await loadCurrentStock(form.ingredientId)
  } catch {
    /* errorMessage already set by composable */
  }
}

const onSubmit = async () => {
  try {
    await submit((qty, unit) => purchaseUnitsApi.convertToBase(form.ingredientId, qty, unit))
    const sign = form.adjustmentType === 'decrement' ? '-' : (form.adjustmentType === 'set' ? '→ ' : '+')
    const qty = form.quantity ?? 0
    successMessage.value = `Se registró el ajuste de ${selectedIngredient.value?.name}: ${sign}${formatNumber(qty)} ${form.unit}.`
    state.value = 'success'
    emit('saved')
  } catch {
    // errorMessage already set inside submit()
  }
}

const resetForAnother = async () => {
  // Preserve the selected ingredient so the operator can chain another
  // adjustment without re-typing the search. Refetch its stock so the
  // "Stock Actual" reflects what the previous submit just changed.
  const keepId = form.ingredientId
  const keepIngredient = selectedIngredient.value
  state.value = 'idle'
  successMessage.value = ''
  reset()
  if (keepId && keepIngredient) {
    selectedIngredient.value = keepIngredient
    form.ingredientId = keepId
    await Promise.allSettled([
      purchaseUnitsApi.fetch(keepId),
      loadCurrentStock(keepId),  // ← refetch fresh stock for the new attempt
    ])
    const def = purchaseUnitsApi.defaultFor(keepId)
    form.unit = def ? def.value : keepIngredient.unit
  }
}

const close = () => {
  if (isSubmitting.value) return
  emit('update:modelValue', false)
}

const formatNumber = (value: number | null | undefined) => {
  const v = Number(value ?? 0)
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v)
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 250ms ease;
}

/* Mobile: slide up from bottom. */
.panel-enter-from,
.panel-leave-to {
  transform: translateY(100%);
}

/* Desktop: slide in from right. */
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
