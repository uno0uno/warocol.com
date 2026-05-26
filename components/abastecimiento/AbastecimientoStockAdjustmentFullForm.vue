<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      label="Registrando ajuste..."
      hint="Estamos guardando el ajuste y actualizando el inventario."
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
          <!-- Información del Ingrediente -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-6">Información del Ingrediente</h3>

            <div class="space-y-6">
              <!-- Ingredient Selection -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Ingrediente <span class="text-red-500">*</span>
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
                  <option value="">Seleccionar ingrediente...</option>
                  <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
                    {{ ingredient.name }} ({{ ingredient.unit }})
                  </option>
                </select>
              </div>

              <!-- Current Stock Display -->
              <div v-if="selectedIngredient" class="bg-background border-2 border-border rounded-lg p-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Stock Actual</p>
                    <div v-if="isLoadingStock || !stockLoaded" class="mt-1 h-7 w-24 bg-surface-secondary rounded animate-pulse" aria-label="Cargando stock actual" />
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
                    <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Stock Mínimo</p>
                    <p class="text-lg font-semibold text-text-primary">
                      {{ formatNumber(selectedIngredient.minimum_stock || 0) }} <span class="text-sm text-text-secondary">{{ selectedIngredient.unit }}</span>
                    </p>
                  </div>
                  <div>
                    <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Stock Máximo</p>
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
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuración del Ajuste -->
          <div v-if="selectedIngredient && stockLoaded" class="mt-8">
            <h3 class="text-lg font-semibold text-text-primary mb-6">Configuración del Ajuste</h3>

            <div class="space-y-6">
              <!-- Adjustment Type -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-3">
                  Tipo de Ajuste <span class="text-red-500">*</span>
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    @click="form.adjustmentType = 'increment'"
                    class="p-4 border-2 rounded-lg transition-all hover:shadow-md"
                    :class="form.adjustmentType === 'increment'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-border hover:border-green-300'"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <Icon name="heroicons:arrow-up-circle" class="w-6 h-6 text-green-600" />
                      <span class="font-semibold" :class="form.adjustmentType === 'increment' ? 'text-green-700 dark:text-green-400' : 'text-text-primary'">
                        Incremento
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary mt-1">Agregar inventario</p>
                  </button>

                  <button
                    type="button"
                    @click="form.adjustmentType = 'decrement'"
                    class="p-4 border-2 rounded-lg transition-all hover:shadow-md"
                    :class="form.adjustmentType === 'decrement'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-border hover:border-red-300'"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <Icon name="heroicons:arrow-down-circle" class="w-6 h-6 text-red-600" />
                      <span class="font-semibold" :class="form.adjustmentType === 'decrement' ? 'text-red-700 dark:text-red-400' : 'text-text-primary'">
                        Decremento
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary mt-1">Reducir inventario</p>
                  </button>

                  <button
                    type="button"
                    @click="form.adjustmentType = 'set'"
                    class="p-4 border-2 rounded-lg transition-all hover:shadow-md"
                    :class="form.adjustmentType === 'set'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border hover:border-blue-300'"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <Icon name="heroicons:arrows-right-left" class="w-6 h-6 text-blue-600" />
                      <span class="font-semibold" :class="form.adjustmentType === 'set' ? 'text-blue-700 dark:text-blue-400' : 'text-text-primary'">
                        Ajustar a
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary mt-1">Establecer stock exacto</p>
                  </button>
                </div>
              </div>

              <!-- Quantity and Unit Input -->
              <div v-if="form.adjustmentType" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Quantity -->
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    {{ form.adjustmentType === 'set' ? 'Nuevo Stock' : 'Cantidad' }} <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model.number="form.quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    class="input-base w-full px-4 py-2"
                    :placeholder="form.adjustmentType === 'set' ? 'Ingrese el stock correcto' : 'Ingrese la cantidad'"
                  />
                </div>

                <!-- Unit Selection -->
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    Unidad <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="form.unit"
                    required
                    class="input-base w-full px-4 py-2"
                  >
                    <!-- Base unit (always available) -->
                    <option :value="selectedIngredient?.unit">
                      {{ selectedIngredient?.unit }} (unidad base)
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
                  Costo por {{ form.unit }}
                  <span class="text-xs text-text-secondary font-normal">(opcional - para actualizar costo promedio)</span>
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary">$</span>
                  <input
                    v-model.number="form.cost_per_unit"
                    type="number"
                    step="0.01"
                    min="0"
                    class="input-base w-full px-4 py-2 pl-8"
                    placeholder="Ingrese el costo unitario (opcional)"
                  />
                </div>
                <p class="text-xs text-text-secondary mt-1">
                  Si especificas un costo, se actualizará el costo promedio ponderado del ingrediente.
                </p>
              </div>

              <!-- Preview of new stock -->
              <div v-if="form.quantity && form.quantity > 0" class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p class="text-sm text-blue-900 dark:text-blue-300">
                  <span class="font-semibold">Resultado:</span>
                  Stock {{ form.adjustmentType === 'increment' ? 'aumentará' : form.adjustmentType === 'decrement' ? 'disminuirá' : 'se establecerá' }} a
                  <span class="font-bold">{{ formatNumber(newStockInBase) }} {{ selectedIngredient?.unit }}</span>
                </p>
                <p v-if="form.cost_per_unit && form.adjustmentType === 'increment'" class="text-xs text-blue-800 dark:text-blue-400 mt-1">
                  Costo unitario: ${{ form.cost_per_unit.toLocaleString('es-CO') }} por {{ form.unit }}
                </p>
              </div>

              <!-- Reason Selection -->
              <div v-if="form.adjustmentType">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Motivo del Ajuste <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="form.reason"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <option value="">Seleccionar motivo...</option>
                  <option v-for="r in ADJUSTMENT_REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </div>

              <!-- Notes -->
              <div v-if="form.reason">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Notas <span v-if="form.reason === 'other'" class="text-red-500">*</span>
                  <span v-else class="text-xs text-text-secondary font-normal">(opcional)</span>
                </label>
                <textarea
                  v-model="form.notes"
                  :required="form.reason === 'other'"
                  rows="4"
                  class="input-base w-full px-4 py-2 resize-none"
                  placeholder="Agrega detalles adicionales sobre el ajuste..."
                ></textarea>
              </div>

              <!-- Warning Message -->
              <div v-if="showLargeWarning" class="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-yellow-400" />
                  </div>
                  <div class="ml-3">
                    <p class="text-sm text-yellow-700 dark:text-yellow-300">
                      <span class="font-semibold">Advertencia:</span> Este ajuste representa un cambio mayor al 50% del stock actual. Por favor, verifica los datos antes de continuar.
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
          <h3 class="text-lg font-semibold text-text-primary mb-4">Resumen del Ajuste</h3>

          <div class="bg-background rounded-lg p-4 border border-border mb-6">
            <div class="space-y-3">
              <div>
                <p class="text-sm text-text-secondary mb-1">Ingrediente</p>
                <p class="font-medium text-text-primary">{{ selectedIngredient?.name || 'Sin seleccionar' }}</p>
              </div>
              <div>
                <p class="text-sm text-text-secondary mb-1">Stock Actual</p>
                <p class="font-medium text-text-primary">{{ formatNumber(currentStock) }} {{ selectedIngredient?.unit || '' }}</p>
              </div>
              <div v-if="form.adjustmentType">
                <p class="text-sm text-text-secondary mb-1">Tipo de Ajuste</p>
                <span
                  class="px-2 py-1 rounded text-xs font-medium"
                  :class="{
                    'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400': form.adjustmentType === 'increment',
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400': form.adjustmentType === 'decrement',
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400': form.adjustmentType === 'set'
                  }"
                >
                  {{ form.adjustmentType === 'increment' ? 'Incremento' : form.adjustmentType === 'decrement' ? 'Decremento' : 'Ajustar a' }}
                </span>
              </div>
              <div v-if="form.quantity && form.quantity > 0">
                <p class="text-sm text-text-secondary mb-1">Nuevo Stock</p>
                <p class="text-lg font-bold text-text-primary">
                  {{ formatNumber(newStockInBase) }} {{ selectedIngredient?.unit || '' }}
                </p>
              </div>
              <div v-if="form.reason">
                <p class="text-sm text-text-secondary mb-1">Motivo</p>
                <p class="text-sm text-text-primary">{{ reasonLabel(form.reason) }}</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <button
              type="submit"
              :disabled="!isFormValid || isSubmitting"
              class="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-emerald-500/20"
            >
              <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
              <span v-else>
                <Icon name="heroicons:check-circle" class="w-5 h-5 inline mr-2" />
                {{ isSubmitting ? 'Registrando...' : 'Registrar Ajuste' }}
              </span>
            </button>

            <NuxtLink
              :to="cancelRedirectUrl"
              class="w-full py-3 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-colors font-medium block text-center"
            >
              Cancelar
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
  useInventoryAdjustment,
} from '~/composables/useInventoryAdjustment'

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

const REASON_LABELS = ADJUSTMENT_REASONS.reduce((acc, r) => {
  acc[r.value] = r.label
  return acc
}, {} as Record<string, string>)
const reasonLabel = (value: string) => REASON_LABELS[value] || value

const formatNumber = (value: number | null | undefined) => {
  const v = Number(value ?? 0)
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v)
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
  selectedIngredient.value ? `Ajuste de ${selectedIngredient.value.name}` : 'Nuevo Ajuste de Inventario',
)
const pageDescription = computed(() => {
  if (selectedIngredient.value && stockLoaded.value) {
    return `Stock actual: ${formatNumber(currentStock.value)} ${selectedIngredient.value.unit}`
  }
  return 'Selecciona un ingrediente para comenzar'
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
      `El inventario de ${selectedIngredient.value?.name} ha sido ajustado exitosamente.`,
      { title: 'Ajuste registrado' },
    )
    navigateTo(props.successRedirectUrl)
  } catch {
    // errorMessage already set inside submit()
    useToast().error(
      errorMessage.value || 'No se pudo registrar el ajuste. Por favor, inténtalo de nuevo.',
      { title: 'Error' },
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
