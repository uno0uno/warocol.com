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
        :aria-label="t('abastecimiento.stock.adjustmentTitle')"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
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
                <h2 class="text-base font-bold text-text-primary leading-tight">{{ t('abastecimiento.stock.adjustmentTitle') }}</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ selectedIngredient ? selectedIngredient.name : WAREHOUSE_COPY.stockAdjustmentSelectPrompt }}
                </p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="t('abastecimiento.stock.closePanel')"
              :disabled="isSubmitting"
              class="flex-shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 disabled:opacity-50 transition-colors"
              @click="close"
            >
              <XMarkIcon class="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <!-- ─── Success state ─────────────────────────────────────────────── -->
        <div v-if="state === 'success'" class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div class="flex items-start gap-3 rounded-xl border border-state-success-border bg-state-success-bg p-4">
            <CheckCircleIcon class="w-5 h-5 text-state-success-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-state-success-text">{{ t('abastecimiento.stock.adjustmentRecorded') }}</p>
              <p class="text-xs text-state-success-text mt-0.5 leading-snug break-words">
                {{ successMessage }}
              </p>
            </div>
          </div>
        </div>

        <!-- ─── Form (idle / sending / error) ─────────────────────────────── -->
        <div v-else class="flex-1 overflow-y-auto px-6 py-5">
          <!-- Matrix load (same pattern as AsientoDetailPanel / ComandasEstadoPanel) -->
          <div
            v-if="showMatrixLoading"
            class="flex items-center justify-center py-12"
            role="status"
            :aria-label="t('common.loading')"
          >
            <CommonsTheCustomLoader size="medium" />
          </div>

          <!-- Stock fetch failed -->
          <div
            v-else-if="selectedIngredient && !stockLoaded && errorMessage"
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
                {{ t('common.retry') }}
              </button>
            </div>
          </div>

          <!-- Full form only after stock is ready (row open locks the article — no Cambiar) -->
          <div v-else-if="selectedIngredient && stockLoaded" class="space-y-5">
            <!-- Artículo + stock en una sola franja (aprovecha ancho del panel) -->
            <div class="rounded-xl border border-border bg-surface-secondary/30 px-3 py-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-text-primary leading-snug truncate" :title="selectedIngredient.name">
                    {{ selectedIngredient.name }}
                  </p>
                  <p class="text-xs text-text-secondary mt-0.5">{{ selectedIngredient.unit }}</p>
                </div>
                <div class="shrink-0 text-end max-w-[55%]">
                  <p class="text-[11px] font-medium text-text-secondary leading-none">
                    {{ t('abastecimiento.stock.currentStock') }}
                  </p>
                  <p class="mt-1 text-lg font-bold tabular-nums text-text-primary leading-tight tracking-tight">
                    {{ formatNumber(currentStock) }}
                    <span class="text-xs font-medium text-text-secondary">{{ selectedIngredient.unit }}</span>
                  </p>
                  <p
                    v-if="currentStockInFormUnit !== null"
                    class="text-[11px] text-text-secondary leading-snug mt-0.5"
                  >
                    ≈ {{ formatNumber(currentStockInFormUnit) }} {{ form.unit }}
                  </p>
                </div>
              </div>
              <div class="mt-2.5 pt-2.5 border-t border-border/70 flex items-baseline justify-between gap-3 text-xs">
                <p class="min-w-0">
                  <span class="text-text-secondary">{{ t('abastecimiento.stock.minimum') }}</span>
                  <span class="ms-1.5 font-semibold tabular-nums text-text-primary">
                    {{ formatNumber(selectedIngredient.minimum_stock || 0) }}
                    <span class="font-normal text-text-secondary">{{ selectedIngredient.unit }}</span>
                  </span>
                </p>
                <p class="shrink-0 text-end">
                  <span class="text-text-secondary">{{ t('abastecimiento.stock.maximum') }}</span>
                  <span class="ms-1.5 font-semibold tabular-nums text-text-primary">
                    <template v-if="selectedIngredient.maximum_stock">
                      {{ formatNumber(selectedIngredient.maximum_stock) }}
                      <span class="font-normal text-text-secondary">{{ selectedIngredient.unit }}</span>
                    </template>
                    <span v-else class="text-text-tertiary font-medium">{{ t('abastecimiento.stock.sinMax') }}</span>
                  </span>
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <span class="text-sm font-medium text-text-primary">
                {{ t('abastecimiento.stock.adjustmentType') }} <span class="text-destructive">*</span>
              </span>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="option in TYPE_OPTIONS"
                  :key="option.value"
                  type="button"
                  :aria-pressed="form.adjustmentType === option.value"
                  class="min-h-[52px] flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  :class="form.adjustmentType === option.value
                    ? option.activeClass + ' border-2'
                    : 'border border-border bg-surface hover:border-primary/40 hover:bg-surface-secondary/50'"
                  @click="form.adjustmentType = option.value"
                >
                  <component
                    :is="option.icon"
                    :class="['w-5 h-5', form.adjustmentType === option.value ? option.iconClass : 'text-text-tertiary']"
                    aria-hidden="true"
                  />
                  <span
                    class="text-[11px] font-semibold leading-tight"
                    :class="form.adjustmentType === option.value ? option.labelClass : 'text-text-secondary'"
                  >
                    {{ option.label }}
                  </span>
                </button>
              </div>
            </div>

            <div v-if="form.adjustmentType" class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label :for="qtyId" class="text-sm font-medium text-text-primary">
                  {{ form.adjustmentType === 'set' ? t('abastecimiento.stock.newStock') : t('abastecimiento.stock.quantity') }}
                  <span class="text-destructive">*</span>
                </label>
                <UiDecimalInput
                  :id="qtyId"
                  v-model="form.quantity"
                  :min="0"
                  :precision="INVENTORY_QUANTITY_PRECISION"
                  class="w-full px-3 py-2 min-h-[44px]"
                  :placeholder="form.adjustmentType === 'set' ? t('abastecimiento.stock.targetStock') : t('abastecimiento.stock.quantityPlaceholder')"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label :for="unitId" class="text-sm font-medium text-text-primary">
                  {{ t('abastecimiento.common.unidad') }} <span class="text-destructive">*</span>
                </label>
                <div class="relative">
                  <select
                    :id="unitId"
                    v-model="form.unit"
                    :disabled="purchaseUnitOptions.length === 0 || purchaseUnitsApi.isLoading(form.ingredientId)"
                    class="input-base w-full px-3 py-2 min-h-[44px] disabled:bg-surface-secondary disabled:cursor-not-allowed"
                  >
                    <option :value="selectedIngredient.unit">
                      {{ selectedIngredient.unit }} ({{ t('abastecimiento.stock.baseUnit') }})
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
                    class="absolute end-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary"
                    aria-hidden="true"
                  >
                    <ArrowPathIcon class="w-4 h-4 animate-spin" />
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

            <div
              v-if="!purchaseUnitsApi.isLoading(form.ingredientId) && purchaseUnitOptions.length === 0"
              class="flex items-start gap-2 rounded-xl border border-state-warning-border bg-state-warning-bg p-3"
            >
              <ExclamationTriangleIcon class="w-4 h-4 text-state-warning-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p class="text-xs text-state-warning-text leading-snug">
                {{ t('abastecimiento.stock.noPurchaseUnits', { unit: selectedIngredient.unit }).replace(` ${t('abastecimiento.stock.configureUnits')}.`, '') }}
                <a :href="`/abastecimiento/ingredientes-propios?highlight=${selectedIngredient.id}`" class="underline font-medium">{{ t('abastecimiento.stock.configureUnits') }}</a>.
              </p>
            </div>

            <div v-if="form.adjustmentType === 'increment'" class="flex flex-col gap-1.5">
              <label :for="costId" class="text-sm font-medium text-text-primary">
                {{ t('abastecimiento.stock.costPerUnit', { unit: form.unit || t('abastecimiento.common.unidad') }) }}
                <span class="text-xs text-text-secondary font-normal">({{ t('abastecimiento.stock.optional') }})</span>
              </label>
              <div class="relative">
                <span class="absolute start-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-text-secondary pointer-events-none">{{ currencyCode }}</span>
                <UiDecimalInput
                  :id="costId"
                  v-model="form.cost_per_unit"
                  :min="0"
                  :precision="TECHNICAL_UNIT_COST_PRECISION"
                  class="w-full ps-12 pe-3 py-2 min-h-[44px]"
                  placeholder="0"
                />
              </div>
              <p class="text-[11px] text-text-secondary leading-snug">
                {{ WAREHOUSE_COPY.stockAdjustmentWeightedCostHint }}
              </p>
            </div>

            <div
              v-if="form.adjustmentType && hasValidQuantity"
              class="rounded-xl border border-primary/20 bg-primary/5 p-3"
            >
              <p class="text-xs text-text-secondary leading-snug">{{ t('abastecimiento.stock.result') }}</p>
              <p class="text-sm font-semibold text-text-primary mt-0.5">
                Stock {{ resultVerb }}
                <span class="text-text-primary tabular-nums">{{ formatNumber(newStockInBase) }} {{ selectedIngredient.unit }}</span>
              </p>
            </div>

            <div v-if="form.adjustmentType" class="flex flex-col gap-1.5">
              <label :for="reasonId" class="text-sm font-medium text-text-primary">
                {{ t('abastecimiento.stock.reason') }} <span class="text-destructive">*</span>
              </label>
              <select
                :id="reasonId"
                v-model="form.reason"
                class="input-base w-full px-3 py-2 min-h-[44px]"
              >
                <option value="">{{ t('abastecimiento.stock.selectReason') }}</option>
                <option v-for="r in REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>

            <div v-if="form.reason" class="flex flex-col gap-1.5">
              <label :for="notesId" class="text-sm font-medium text-text-primary">
                {{ t('abastecimiento.stock.notes') }}
                <span v-if="form.reason === 'other'" class="text-destructive">*</span>
                <span v-else class="text-xs text-text-secondary font-normal">({{ t('abastecimiento.stock.notesOptional') }})</span>
              </label>
              <textarea
                :id="notesId"
                v-model="form.notes"
                rows="3"
                class="input-base w-full px-3 py-2 resize-none"
                :placeholder="t('abastecimiento.stock.notesPlaceholder')"
              />
            </div>

            <div
              v-if="showLargeWarning"
              class="flex items-start gap-2 rounded-xl border border-state-warning-border bg-state-warning-bg p-3"
            >
              <ExclamationTriangleIcon class="w-4 h-4 text-state-warning-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p class="text-xs text-state-warning-text leading-snug">
                <strong>{{ t('abastecimiento.stock.warning') }}</strong> {{ t('abastecimiento.stock.largeAdjustmentWarning') }}
              </p>
            </div>

            <div
              v-if="errorMessage"
              class="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-destructive"
              role="alert"
            >
              <ExclamationTriangleIcon class="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p class="text-xs leading-snug break-words">{{ errorMessage }}</p>
            </div>
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
              {{ t('abastecimiento.stock.close') }}
            </button>
            <button
              type="button"
              class="flex-1 min-h-[44px] py-3 px-4 bg-action-primary-bg text-action-primary-text rounded-xl font-semibold hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-95 transition-all"
              @click="resetForAnother"
            >
              {{ t('abastecimiento.stock.anotherAdjustment') }}
            </button>
          </div>
          <div v-else class="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              :disabled="isSubmitting"
              class="flex-1 min-h-[44px] py-3 px-4 border-2 border-border rounded-xl text-text-primary font-medium hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
              @click="close"
            >
              {{ t('abastecimiento.stock.cancel') }}
            </button>
            <button
              type="button"
              :disabled="!isFormValid || isSubmitting"
              class="flex-1 min-h-[44px] py-3 px-4 bg-action-primary-bg text-action-primary-text rounded-xl font-semibold hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all inline-flex items-center justify-center gap-2"
              @click="onSubmit"
            >
              <UiLoadingDots v-if="isSubmitting" size="8px" color="currentColor" />
              <span>{{ isSubmitting ? t('abastecimiento.stock.registering') : t('abastecimiento.stock.registerAdjustment') }}</span>
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
  ArrowPathIcon,
  ArrowUpCircleIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import {
  useIngredientPurchaseUnits,
} from '~/composables/useIngredientPurchaseUnits'
import {
  useInventoryAdjustment,
  ADJUSTMENT_REASONS,
  INVENTORY_QUANTITY_PRECISION,
  TECHNICAL_UNIT_COST_PRECISION,
} from '~/composables/useInventoryAdjustment'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'

const { t, locale } = useI18n({ useScope: 'global' })
const WAREHOUSE_COPY = useWarehouseCopy()
const { currencyCode } = useFormatters()

export interface StockAdjustmentPreselect {
  id: string
  name: string
  unit: string
  minimum_stock?: number | null
  maximum_stock?: number | null
}

interface Props {
  modelValue: boolean
  /** When set, opens with this ingredient already selected (row adjust). */
  preselect?: StockAdjustmentPreselect | null
}

const props = withDefaults(defineProps<Props>(), {
  preselect: null,
})
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
  (e: 'closed'): void
}>()

const uid = useId()
const qtyId = `stock-adj-qty-${uid}`
const unitId = `stock-adj-unit-${uid}`
const costId = `stock-adj-cost-${uid}`
const reasonId = `stock-adj-reason-${uid}`
const notesId = `stock-adj-notes-${uid}`

const REASONS = computed(() => ADJUSTMENT_REASONS.map(reason => ({
  ...reason,
  label: t(`abastecimiento.stock.reasonLabels.${reason.value}`),
})))

const TYPE_OPTIONS = computed(() => [
  { value: 'increment' as const, label: t('abastecimiento.stock.increment'), icon: ArrowUpCircleIcon,    activeClass: 'border-state-success-border bg-state-success-bg', iconClass: 'text-state-success-icon', labelClass: 'text-state-success-text' },
  { value: 'decrement' as const, label: t('abastecimiento.stock.decrement'), icon: ArrowDownCircleIcon,  activeClass: 'border-state-danger-border bg-state-danger-bg',   iconClass: 'text-state-danger-icon',  labelClass: 'text-state-danger-text' },
  { value: 'set'       as const, label: t('abastecimiento.stock.set'),  icon: ArrowsRightLeftIcon,  activeClass: 'border-state-info-border bg-state-info-bg',       iconClass: 'text-state-info-icon',    labelClass: 'text-state-info-text' },
])

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
let openGeneration = 0

/** Gate body like AsientoDetailPanel / ComandasEstadoPanel until stock is ready. */
const showMatrixLoading = computed(() => {
  if (!selectedIngredient.value) {
    return Boolean(props.preselect?.id)
  }
  return isLoadingStock.value || (!stockLoaded.value && !errorMessage.value)
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
    case 'increment': return t('abastecimiento.stock.resultIncrement')
    case 'decrement': return t('abastecimiento.stock.resultDecrement')
    case 'set':       return t('abastecimiento.stock.resultSet')
    default:          return t('abastecimiento.stock.resultSet')
  }
})

const applyIngredient = async (ingredient: StockAdjustmentPreselect) => {
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

watch(() => props.modelValue, async (open) => {
  if (!open) {
    openGeneration += 1
    return
  }
  const generation = ++openGeneration
  state.value = 'idle'
  successMessage.value = ''
  reset()
  // Row-open only: ingredient is fixed from the stock row (no Cambiar / search).
  if (!props.preselect?.id) return
  await applyIngredient(props.preselect)
  if (generation !== openGeneration) {
    reset()
  }
})

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
    successMessage.value = t('abastecimiento.stock.adjustmentSuccess', {
      name: selectedIngredient.value?.name,
      sign,
      quantity: formatNumber(qty),
      unit: form.unit,
    })
    state.value = 'success'
    emit('saved')
  } catch {
    // errorMessage already set inside submit()
  }
}

const resetForAnother = async () => {
  // Keep the same locked ingredient; refetch stock so Stock Actual matches the last submit.
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
      loadCurrentStock(keepId),
    ])
    const def = purchaseUnitsApi.defaultFor(keepId)
    form.unit = def ? def.value : keepIngredient.unit
  }
}

const close = () => {
  if (isSubmitting.value) return
  emit('update:modelValue', false)
  emit('closed')
}

const formatNumber = (value: number | null | undefined) => {
  return formatDomainQuantity(value, INVENTORY_QUANTITY_PRECISION, normalizeUiLocale(locale.value))
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
