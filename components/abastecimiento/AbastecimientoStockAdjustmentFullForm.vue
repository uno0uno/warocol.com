<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      :label="t('abastecimiento.stock.registering')"
      :hint="t('abastecimiento.stock.adjustingHint')"
      variant="glass"
      indicator="matrix"
    />

    <!-- Loading State -->
    <div v-if="isLoadingData || ingredientsLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <form v-else @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
      <!-- Left Column: Form Content -->
      <div class="xl:col-span-2 space-y-6">
        <div class="bg-surface border-2 border-border rounded-xl p-6 md:p-8 shadow-sm">
          <!-- Información del artículo de bodega -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-6">{{ WAREHOUSE_COPY.stockAdjustmentSectionTitle }}</h3>

            <div class="space-y-6">
              <!-- Ingredient Selection -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ WAREHOUSE_COPY.warehouseItemColumn }} <span class="text-destructive">*</span>
                </label>
                <!-- If ingredient is pre-selected from URL, show it as read-only -->
                <div v-if="route.query.ingredientId && selectedIngredient" class="w-full px-4 py-3 border-2 border-border rounded-lg bg-surface-secondary text-text-primary">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold">{{ selectedIngredient.name }}</span>
                    <span class="text-xs text-text-secondary bg-background px-2 py-1 rounded">{{ selectedIngredient.unit }}</span>
                  </div>
                </div>
                <!-- Otherwise allow selection -->
                <select
                  v-else
                  v-model="form.ingredientId"
                  @change="handleIngredientChange"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <option value="">{{ WAREHOUSE_COPY.selectWarehouseItemOption }}</option>
                  <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
                    {{ ingredient.name }} ({{ ingredient.unit }})
                  </option>
                </select>
              </div>

              <!-- Current Stock Display -->
              <div v-if="selectedIngredient" class="bg-background border-2 border-border rounded-lg p-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">{{ t('abastecimiento.stock.currentStock') }}</p>
                    <div v-if="isLoadingStock || !stockLoaded" class="mt-1 h-7 w-24 bg-surface-secondary rounded animate-pulse" :aria-label="t('common.loading')" />
                    <template v-else>
                      <p class="text-2xl font-bold text-text-primary">
                        {{ formatNumber(currentStock) }} <span class="text-sm text-text-secondary">{{ selectedIngredient.unit }}</span>
                      </p>
                      <p
                        v-if="currentStockInFormUnit !== null"
                        class="text-xs text-text-secondary mt-0.5"
                      >
                        ≈ {{ formatNumber(currentStockInFormUnit) }} {{ form.unit }}
                      </p>
                    </template>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">{{ t('abastecimiento.stock.minimum') }}</p>
                    <p class="text-lg font-semibold text-text-primary">
                      {{ formatNumber(selectedIngredient.minimum_stock || 0) }} <span class="text-sm text-text-secondary">{{ selectedIngredient.unit }}</span>
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">{{ t('abastecimiento.stock.maximum') }}</p>
                    <p class="text-lg font-semibold text-text-primary">
                      {{ selectedIngredient.maximum_stock ? formatNumber(selectedIngredient.maximum_stock) : '-' }}
                      <span v-if="selectedIngredient.maximum_stock" class="text-sm text-text-secondary">{{ selectedIngredient.unit }}</span>
                    </p>
                  </div>
                </div>
              </div>

              <!-- Stock-load error banner -->
              <div
                v-if="selectedIngredient && !isLoadingStock && !stockLoaded && errorMessage"
                class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive"
                role="alert"
              >
                <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
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
            </div>
          </div>

          <!-- Configuración del Ajuste -->
          <div v-if="selectedIngredient && stockLoaded" class="mt-8">
            <h3 class="text-lg font-semibold text-text-primary mb-6">{{ t('abastecimiento.stock.adjustmentConfig') }}</h3>

            <div class="space-y-6">
              <!-- Adjustment Type -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-3">
                  {{ t('abastecimiento.stock.adjustmentType') }} <span class="text-destructive">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    @click="form.adjustmentType = 'increment'"
                    class="p-4 border-2 rounded-lg transition-all hover:shadow-md"
                    :class="form.adjustmentType === 'increment'
                      ? 'border-state-success-border bg-state-success-bg'
                      : 'border-border hover:border-state-success-border'"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <Icon name="heroicons:arrow-up-circle" class="w-6 h-6 text-state-success-icon" />
                      <span class="font-semibold" :class="form.adjustmentType === 'increment' ? 'text-state-success-text' : 'text-text-primary'">
                        {{ t('abastecimiento.stock.increment') }}
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary mt-1">{{ t('abastecimiento.stock.incrementHelp') }}</p>
                  </button>

                  <button
                    type="button"
                    @click="form.adjustmentType = 'decrement'"
                    class="p-4 border-2 rounded-lg transition-all hover:shadow-md"
                    :class="form.adjustmentType === 'decrement'
                      ? 'border-state-danger-border bg-state-danger-bg'
                      : 'border-border hover:border-state-danger-border'"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <Icon name="heroicons:arrow-down-circle" class="w-6 h-6 text-state-danger-icon" />
                      <span class="font-semibold" :class="form.adjustmentType === 'decrement' ? 'text-state-danger-text' : 'text-text-primary'">
                        {{ t('abastecimiento.stock.decrement') }}
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary mt-1">{{ t('abastecimiento.stock.decrementHelp') }}</p>
                  </button>

                  <button
                    type="button"
                    @click="form.adjustmentType = 'set'"
                    class="p-4 border-2 rounded-lg transition-all hover:shadow-md"
                    :class="form.adjustmentType === 'set'
                      ? 'border-state-info-border bg-state-info-bg'
                      : 'border-border hover:border-state-info-border'"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <Icon name="heroicons:arrows-right-left" class="w-6 h-6 text-state-info-icon" />
                      <span class="font-semibold" :class="form.adjustmentType === 'set' ? 'text-state-info-text' : 'text-text-primary'">
                        {{ t('abastecimiento.stock.set') }}
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary mt-1">{{ t('abastecimiento.stock.setHelp') }}</p>
                  </button>
                </div>
              </div>

              <!-- Quantity and Unit Input -->
              <div v-if="form.adjustmentType" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Quantity -->
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    {{ form.adjustmentType === 'set' ? t('abastecimiento.stock.newStock') : t('abastecimiento.stock.quantity') }} <span class="text-destructive">*</span>
                  </label>
                  <UiDecimalInput
                    v-model="form.quantity"
                    :min="0"
                    :precision="INVENTORY_QUANTITY_PRECISION"
                    required
                    class="w-full px-4 py-2"
                    :placeholder="form.adjustmentType === 'set' ? t('abastecimiento.stock.targetStock') : t('abastecimiento.stock.quantityPlaceholder')"
                  />
                </div>

                <!-- Unit Selection -->
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    {{ t('abastecimiento.common.unidad') }} <span class="text-destructive">*</span>
                  </label>
                  <select
                    v-model="form.unit"
                    required
                    class="input-base w-full px-4 py-2"
                  >
                    <!-- Base unit (always available) -->
                    <option :value="selectedIngredient?.unit">
                      {{ selectedIngredient?.unit }} ({{ t('abastecimiento.stock.baseUnit') }})
                    </option>
                    <!-- Purchase units -->
                    <option
                      v-for="u in purchaseUnitOptions"
                      :key="u.value + '-' + u.conversion_factor"
                      :value="u.value"
                    >
                      {{ u.label }}
                      <template v-if="u.conversion_factor !== 1">
                        (1 {{ u.value }} = {{ u.conversion_factor }} {{ selectedIngredient?.unit }})
                      </template>
                    </option>
                  </select>
                </div>
              </div>

              <!-- Cost per Unit (only for increments) -->
              <div v-if="form.adjustmentType === 'increment'">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('abastecimiento.stock.costPerUnit', { unit: form.unit }) }}
                  <span class="text-xs text-text-secondary font-normal">({{ t('abastecimiento.stock.optional') }} - {{ t('abastecimiento.stock.costHelp') }})</span>
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary">$</span>
                  <UiDecimalInput
                    v-model="form.cost_per_unit"
                    :min="0"
                    :precision="TECHNICAL_UNIT_COST_PRECISION"
                    class="w-full px-4 py-2 pl-8"
                    :placeholder="t('abastecimiento.stock.costPlaceholder')"
                  />
                </div>
                <p class="text-xs text-text-secondary mt-1">
                  {{ WAREHOUSE_COPY.stockAdjustmentWeightedCostHint }}
                </p>
              </div>

              <!-- Preview of new stock -->
              <div v-if="hasValidQuantity" class="mt-2 p-3 bg-state-info-bg border border-state-info-border rounded-lg">
                <p class="text-sm text-state-info-text">
                  <span class="font-semibold">{{ t('abastecimiento.stock.result') }}:</span>
                  {{ t('abastecimiento.stock.resultStock', { verb: form.adjustmentType === 'increment' ? t('abastecimiento.stock.resultIncrease') : form.adjustmentType === 'decrement' ? t('abastecimiento.stock.resultDecrease') : t('abastecimiento.stock.resultSetShort') }) }}
                  <span class="font-bold">{{ formatNumber(newStockInBase) }} {{ selectedIngredient?.unit }}</span>
                </p>
                <p v-if="form.cost_per_unit && form.adjustmentType === 'increment'" class="text-xs text-state-info-text mt-1">
                  {{ t('abastecimiento.stock.unitCostSummary', { value: formatTechnicalUnitCost(form.cost_per_unit), unit: form.unit }) }}
                </p>
              </div>

              <!-- Reason Selection -->
              <div v-if="form.adjustmentType">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('abastecimiento.stock.reason') }} <span class="text-destructive">*</span>
                </label>
                <select
                  v-model="form.reason"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <option value="">{{ t('abastecimiento.stock.selectReason') }}</option>
                  <option v-for="r in localizedReasons" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </div>

              <!-- Notes -->
              <div v-if="form.reason">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('abastecimiento.stock.notes') }} <span v-if="form.reason === 'other'" class="text-destructive">*</span>
                  <span v-else class="text-xs text-text-secondary font-normal">({{ t('abastecimiento.stock.notesOptional') }})</span>
                </label>
                <textarea
                  v-model="form.notes"
                  :required="form.reason === 'other'"
                  rows="4"
                  class="input-base w-full px-4 py-2 resize-none"
                  :placeholder="t('abastecimiento.stock.notesPlaceholder')"
                ></textarea>
              </div>

              <!-- Warning Message -->
              <div v-if="showLargeWarning" class="bg-state-warning-bg border-l-4 border-state-warning-border p-4 rounded">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-state-warning-icon" />
                  </div>
                  <div class="ml-3">
                    <p class="text-sm text-state-warning-text">
                      <span class="font-semibold">{{ t('abastecimiento.stock.warning') }}</span> {{ t('abastecimiento.stock.largeAdjustmentWarning') }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Submit-error banner -->
              <div
                v-if="errorMessage && stockLoaded"
                class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive"
                role="alert"
              >
                <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p class="text-xs leading-snug break-words">{{ errorMessage }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Summary & Actions -->
      <div class="xl:col-span-1">
        <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
          <h3 class="text-lg font-semibold text-text-primary mb-4">{{ t('abastecimiento.stock.adjustmentSummary') }}</h3>

          <div class="bg-background rounded-lg p-4 border border-border mb-6">
            <div class="space-y-3">
              <div>
                <p class="text-sm text-text-secondary mb-1">{{ WAREHOUSE_COPY.warehouseItemColumn }}</p>
                <p class="font-medium text-text-primary">{{ selectedIngredient?.name || t('abastecimiento.stock.notSelected') }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">{{ t('abastecimiento.stock.currentStock') }}</p>
                <p class="font-medium text-text-primary">{{ formatNumber(currentStock) }} {{ selectedIngredient?.unit || '' }}</p>
              </div>
              <div v-if="form.adjustmentType">
                <p class="text-sm text-text-secondary mb-1">{{ t('abastecimiento.stock.adjustmentType') }}</p>
                <span
                  class="px-2 py-1 rounded text-xs font-medium"
                  :class="{
                    'bg-state-success-bg text-state-success-text': form.adjustmentType === 'increment',
                    'bg-state-danger-bg text-state-danger-text': form.adjustmentType === 'decrement',
                    'bg-state-info-bg text-state-info-text': form.adjustmentType === 'set'
                  }"
                >
                  {{ form.adjustmentType === 'increment' ? t('abastecimiento.stock.increment') : form.adjustmentType === 'decrement' ? t('abastecimiento.stock.decrement') : t('abastecimiento.stock.set') }}
                </span>
              </div>
              <div v-if="hasValidQuantity">
                <p class="text-sm text-text-secondary mb-1">{{ t('abastecimiento.stock.newStock') }}</p>
                <p class="text-lg font-bold text-text-primary">
                  {{ formatNumber(newStockInBase) }} {{ selectedIngredient?.unit || '' }}
                </p>
              </div>
              <div v-if="form.reason">
                <p class="text-sm text-text-secondary mb-1">{{ t('abastecimiento.stock.reason') }}</p>
                <p class="text-sm text-text-primary">{{ reasonLabel(form.reason) }}</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <button
              type="submit"
              :disabled="!isFormValid || isSubmitting"
              class="w-full py-3 bg-shell-cta-bg text-shell-cta-text rounded-lg hover:bg-shell-cta-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold"
            >
              <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
              <span v-else>
                <Icon name="heroicons:check-circle" class="w-5 h-5 inline mr-2" />
                {{ isSubmitting ? t('abastecimiento.stock.registering') : t('abastecimiento.stock.registerAdjustment') }}
              </span>
            </button>

            <NuxtLink
              :to="cancelRedirectUrl"
              class="w-full py-3 rounded-lg bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring font-medium block text-center"
            >
              {{ t('abastecimiento.stock.cancel') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'
import { useIngredientPurchaseUnits } from '~/composables/useIngredientPurchaseUnits'
import {
  ADJUSTMENT_REASONS,
  INVENTORY_QUANTITY_PRECISION,
  TECHNICAL_UNIT_COST_PRECISION,
  useInventoryAdjustment,
} from '~/composables/useInventoryAdjustment'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'

const { t, locale } = useI18n({ useScope: 'global' })
const WAREHOUSE_COPY = useWarehouseCopy()

interface Props {
  cancelRedirectUrl: string
  successRedirectUrl: string
}

const props = defineProps<Props>()

const route = useRoute()
const isLoadingData = ref(true)

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
} = useInventoryAdjustment()

// Ingredient list (full-page form uses a <select>, not a search input)
const { data: ingredientsData, pending: ingredientsLoading } = useFetch<{
  data: Array<{ id: string; name: string; unit: string; minimum_stock?: number | null; maximum_stock?: number | null }>
}>('/api/suppliers/ingredients', {
  params: { limit: INGREDIENTS_FETCH_LIMIT },
  server: false,
})

const ingredients = computed(() => {
  const list = ingredientsData.value?.data ?? []
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
})

const localizedReasons = computed(() => ADJUSTMENT_REASONS.map(r => ({
  ...r,
  label: t(`abastecimiento.stock.reasonLabels.${r.value}`),
})))
const REASON_LABELS = computed(() => ADJUSTMENT_REASONS.reduce((acc, r) => {
  acc[r.value] = t(`abastecimiento.stock.reasonLabels.${r.value}`)
  return acc
}, {} as Record<string, string>))
const reasonLabel = (value: string) => REASON_LABELS.value[value] || value

const formatNumber = (value: number | null | undefined) => {
  return formatDomainQuantity(value, INVENTORY_QUANTITY_PRECISION, locale.value === 'en' ? 'en-US' : 'es-CO')
}

const formatTechnicalUnitCost = (value: number | null | undefined) => {
  return formatDomainQuantity(value, TECHNICAL_UNIT_COST_PRECISION, locale.value === 'en' ? 'en-US' : 'es-CO')
}

const purchaseUnitOptions = computed(() =>
  form.ingredientId ? purchaseUnitsApi.options(form.ingredientId) : [],
)

const convertToBase = (qty: number, unit: string) =>
  purchaseUnitsApi.convertToBase(form.ingredientId, qty, unit)

const newStockInBase = computed(() => calculateNewStockInBase(convertToBase))
const showLargeWarning = computed(() => largeAdjustmentWarning(convertToBase))

const currentStockInFormUnit = computed<number | null>(() => {
  if (!selectedIngredient.value || !form.unit) return null
  if (form.unit === selectedIngredient.value.unit) return null
  const factor = convertToBase(1, form.unit)
  if (!factor || factor === 1) return null
  return currentStock.value / factor
})

const pageTitle = computed(() =>
  selectedIngredient.value
    ? `${t('abastecimiento.stock.adjustmentTitle')} — ${selectedIngredient.value.name}`
    : t('abastecimiento.stock.newAdjustment'),
)
const pageDescription = computed(() => {
  if (selectedIngredient.value && stockLoaded.value) {
    return t('abastecimiento.stock.currentStockSummary', {
      value: formatNumber(currentStock.value),
      unit: selectedIngredient.value.unit,
    })
  }
  return WAREHOUSE_COPY.stockAdjustmentStartPrompt
})

useHead({
  title: pageTitle,
  meta: [{ name: 'description', content: pageDescription }],
})

const selectIngredientById = async (ingredientId: string) => {
  const ing = ingredients.value.find((i) => i.id === ingredientId)
  if (!ing) {
    selectedIngredient.value = null
    return
  }
  selectedIngredient.value = {
    id: ing.id,
    name: ing.name,
    unit: ing.unit,
    minimum_stock: ing.minimum_stock ?? null,
    maximum_stock: ing.maximum_stock ?? null,
  }
  form.adjustmentType = ''
  form.quantity = null
  form.cost_per_unit = null
  errorMessage.value = ''

  await Promise.allSettled([
    purchaseUnitsApi.fetch(ingredientId),
    loadCurrentStock(ingredientId),
  ])

  const def = purchaseUnitsApi.defaultFor(ingredientId)
  form.unit = def ? def.value : ing.unit
}

const handleIngredientChange = async () => {
  if (!form.ingredientId) {
    selectedIngredient.value = null
    return
  }
  await selectIngredientById(form.ingredientId)
}

const retryStockFetch = async () => {
  if (!form.ingredientId) return
  try {
    await loadCurrentStock(form.ingredientId)
  } catch {
    /* errorMessage already set by composable */
  }
}

const handleSubmit = async () => {
  if (!isFormValid.value) return
  try {
    await submit(convertToBase)
    useToast().success(
      t('abastecimiento.stock.inventoryAdjusted', { name: selectedIngredient.value?.name }),
      { title: t('abastecimiento.stock.adjustmentRecorded') },
    )
    navigateTo(props.successRedirectUrl)
  } catch {
    // errorMessage already set inside submit()
    useToast().error(
      errorMessage.value || t('abastecimiento.stock.registerError'),
      { title: t('common.error') },
    )
  }
}

onMounted(async () => {
  const ingredientId = route.query.ingredientId as string | undefined
  if (!ingredientId) {
    navigateTo(props.cancelRedirectUrl)
    return
  }

  while (ingredientsLoading.value) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  isLoadingData.value = false

  form.ingredientId = ingredientId
  await selectIngredientById(ingredientId)
})
</script>
