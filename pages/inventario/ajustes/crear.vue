<template>
  <div class="page-layout">
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-surface rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Registrando ajuste...</p>
      </div>
    </div>

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
                  v-model="formData.ingredientId"
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
                    <p class="text-2xl font-bold text-text-primary">
                      {{ formatNumber(currentStock) }} <span class="text-sm text-text-secondary">{{ selectedIngredient.unit }}</span>
                    </p>
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
            </div>
          </div>

          <!-- Configuración del Ajuste -->
          <div v-if="selectedIngredient" class="mt-8">
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
                    @click="formData.adjustmentType = 'increment'"
                    class="p-4 border-2 rounded-lg transition-all hover:shadow-md"
                    :class="formData.adjustmentType === 'increment'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-border hover:border-green-300'"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <Icon name="heroicons:arrow-up-circle" class="w-6 h-6 text-green-600" />
                      <span class="font-semibold" :class="formData.adjustmentType === 'increment' ? 'text-green-700 dark:text-green-400' : 'text-text-primary'">
                        Incremento
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary mt-1">Agregar inventario</p>
                  </button>

                  <button
                    type="button"
                    @click="formData.adjustmentType = 'decrement'"
                    class="p-4 border-2 rounded-lg transition-all hover:shadow-md"
                    :class="formData.adjustmentType === 'decrement'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-border hover:border-red-300'"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <Icon name="heroicons:arrow-down-circle" class="w-6 h-6 text-red-600" />
                      <span class="font-semibold" :class="formData.adjustmentType === 'decrement' ? 'text-red-700 dark:text-red-400' : 'text-text-primary'">
                        Decremento
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary mt-1">Reducir inventario</p>
                  </button>

                  <button
                    type="button"
                    @click="formData.adjustmentType = 'set'"
                    class="p-4 border-2 rounded-lg transition-all hover:shadow-md"
                    :class="formData.adjustmentType === 'set'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border hover:border-blue-300'"
                  >
                    <div class="flex items-center justify-center gap-2">
                      <Icon name="heroicons:arrows-right-left" class="w-6 h-6 text-blue-600" />
                      <span class="font-semibold" :class="formData.adjustmentType === 'set' ? 'text-blue-700 dark:text-blue-400' : 'text-text-primary'">
                        Ajustar a
                      </span>
                    </div>
                    <p class="text-xs text-text-secondary mt-1">Establecer stock exacto</p>
                  </button>
                </div>
              </div>

              <!-- Quantity and Unit Input -->
              <div v-if="formData.adjustmentType" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Quantity -->
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    {{ formData.adjustmentType === 'set' ? 'Nuevo Stock' : 'Cantidad' }} <span class="text-red-500">*</span>
                  </label>
                  <input
                    v-model.number="formData.quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    class="input-base w-full px-4 py-2"
                    :placeholder="formData.adjustmentType === 'set' ? 'Ingrese el stock correcto' : 'Ingrese la cantidad'"
                  />
                </div>

                <!-- Unit Selection -->
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    Unidad <span class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="formData.unit"
                    required
                    class="input-base w-full px-4 py-2"
                  >
                    <!-- Base unit (always available) -->
                    <option :value="selectedIngredient?.unit">
                      {{ selectedIngredient?.unit }} (unidad base)
                    </option>
                    <!-- Purchase units -->
                    <option v-for="unit in purchaseUnits" :key="unit.id" :value="unit.purchase_unit">
                      {{ unit.purchase_unit_label || unit.purchase_unit }}
                      <template v-if="unit.conversion_factor !== 1">
                        (1 {{ unit.purchase_unit }} = {{ unit.conversion_factor }} {{ selectedIngredient?.unit }})
                      </template>
                    </option>
                  </select>
                </div>
              </div>

              <!-- Cost per Unit (only for increments) -->
              <div v-if="formData.adjustmentType === 'increment'">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Costo por {{ formData.unit }}
                  <span class="text-xs text-text-secondary font-normal">(opcional - para actualizar costo promedio)</span>
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary">$</span>
                  <input
                    v-model.number="formData.cost_per_unit"
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
              <div v-if="formData.quantity && formData.quantity > 0" class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p class="text-sm text-blue-900 dark:text-blue-300">
                  <span class="font-semibold">Resultado:</span>
                  Stock {{ formData.adjustmentType === 'increment' ? 'aumentará' : formData.adjustmentType === 'decrement' ? 'disminuirá' : 'se establecerá' }} a
                  <span class="font-bold">{{ formatNumber(calculateNewStock()) }} {{ selectedIngredient?.unit }}</span>
                </p>
                <p v-if="formData.cost_per_unit && formData.adjustmentType === 'increment'" class="text-xs text-blue-800 dark:text-blue-400 mt-1">
                  💰 Costo unitario: ${{ formData.cost_per_unit.toLocaleString('es-CO') }} por {{ formData.unit }}
                </p>
              </div>

              <!-- Reason Selection -->
              <div v-if="formData.adjustmentType">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Motivo del Ajuste <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="formData.reason"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <option value="">Seleccionar motivo...</option>
                  <option value="inventory_count">Conteo físico de inventario</option>
                  <option value="expired">Producto vencido</option>
                  <option value="damaged">Producto dañado</option>
                  <option value="spoilage">Merma o desperdicio</option>
                  <option value="theft">Robo o pérdida</option>
                  <option value="correction">Corrección de error de registro</option>
                  <option value="initial_stock">Inventario inicial</option>
                  <option value="transfer">Transferencia interna</option>
                  <option value="supplier_return">Devolución a proveedor</option>
                  <option value="other">Otro (especificar en notas)</option>
                </select>
              </div>

              <!-- Notes -->
              <div v-if="formData.reason">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Notas <span v-if="formData.reason === 'other'" class="text-red-500">*</span>
                  <span v-else class="text-xs text-text-secondary font-normal">(opcional)</span>
                </label>
                <textarea
                  v-model="formData.notes"
                  :required="formData.reason === 'other'"
                  rows="4"
                  class="input-base w-full px-4 py-2 resize-none"
                  placeholder="Agrega detalles adicionales sobre el ajuste..."
                ></textarea>
              </div>

              <!-- Warning Message -->
              <div v-if="showLargeAdjustmentWarning" class="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
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
              <div v-if="formData.adjustmentType">
                <p class="text-sm text-text-secondary mb-1">Tipo de Ajuste</p>
                <span
                  class="px-2 py-1 rounded text-xs font-medium"
                  :class="{
                    'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400': formData.adjustmentType === 'increment',
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400': formData.adjustmentType === 'decrement',
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400': formData.adjustmentType === 'set'
                  }"
                >
                  {{ formData.adjustmentType === 'increment' ? 'Incremento' : formData.adjustmentType === 'decrement' ? 'Decremento' : 'Ajustar a' }}
                </span>
              </div>
              <div v-if="formData.quantity && formData.quantity > 0">
                <p class="text-sm text-text-secondary mb-1">Nuevo Stock</p>
                <p class="text-lg font-bold text-text-primary">
                  {{ formatNumber(calculateNewStock()) }} {{ selectedIngredient?.unit || '' }}
                </p>
              </div>
              <div v-if="formData.reason">
                <p class="text-sm text-text-secondary mb-1">Motivo</p>
                <p class="text-sm text-text-primary">{{ reasonLabels[formData.reason] }}</p>
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
              to="/inventario/stock"
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
import { ref, computed, onMounted } from 'vue'

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// Get route for query params
const route = useRoute()

// State
const isLoadingData = ref(true)
const isSubmitting = ref(false)

// Form data
const formData = ref({
  ingredientId: '',
  adjustmentType: '', // 'increment', 'decrement', 'set'
  quantity: null,
  unit: '', // Selected purchase unit
  cost_per_unit: null, // Optional cost per unit (only for increments)
  reason: '',
  notes: ''
})

// Available purchase units for selected ingredient
const purchaseUnits = ref([])

// Load ingredients
const { data: ingredientsData, pending: ingredientsLoading } = useFetch('/api/suppliers/ingredients', {
  params: { limit: 10000 },
  server: false
})

const ingredients = computed(() => {
  if (!ingredientsData.value?.data) return []
  // TODO: Filter by controla_inventario when API returns this field
  return ingredientsData.value.data.sort((a, b) => a.name.localeCompare(b.name))
})

// Selected ingredient and its current stock
const selectedIngredient = ref(null)
const currentStock = ref(0)

// Formatting helpers (needed for computed below)
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

// Dynamic page title based on selected ingredient
const pageTitle = computed(() => {
  if (selectedIngredient.value) {
    return `Ajuste de ${selectedIngredient.value.name}`
  }
  return 'Nuevo Ajuste de Inventario'
})

const pageDescription = computed(() => {
  if (selectedIngredient.value && currentStock.value !== null) {
    return `Stock actual: ${formatNumber(currentStock.value)} ${selectedIngredient.value.unit}`
  }
  return 'Selecciona un ingrediente para comenzar'
})

// Update page head dynamically
useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: pageDescription }
  ]
})

// Load current stock when ingredient is selected
const handleIngredientChange = async () => {
  if (!formData.value.ingredientId) {
    selectedIngredient.value = null
    currentStock.value = 0
    purchaseUnits.value = []
    return
  }

  selectedIngredient.value = ingredients.value.find(i => i.id === formData.value.ingredientId)

  // Fetch current stock from inventory
  try {
    const response = await $fetch(`/api/inventory/stock/${formData.value.ingredientId}`)
    currentStock.value = response.current_stock || 0
  } catch (error) {
    console.error('Error loading stock:', error)
    currentStock.value = 0
  }

  // Fetch available purchase units for this ingredient
  try {
    const unitsResponse = await $fetch(`/api/suppliers/ingredient-purchase-units/ingredient/${formData.value.ingredientId}`)
    purchaseUnits.value = unitsResponse.data || []
    // Set default unit to base unit or first purchase unit
    if (purchaseUnits.value.length > 0) {
      const defaultUnit = purchaseUnits.value.find(u => u.is_default)
      formData.value.unit = defaultUnit ? defaultUnit.purchase_unit : purchaseUnits.value[0].purchase_unit
    } else {
      // If no purchase units, use base unit
      formData.value.unit = selectedIngredient.value.unit
    }
  } catch (error) {
    console.error('Error loading purchase units:', error)
    purchaseUnits.value = []
    // Fallback to base unit
    formData.value.unit = selectedIngredient.value.unit
  }

  // Reset other fields when changing ingredient
  formData.value.adjustmentType = ''
  formData.value.quantity = null
  formData.value.cost_per_unit = null
}

// Calculate new stock based on adjustment type
const calculateNewStock = () => {
  if (!formData.value.quantity || formData.value.quantity <= 0) return currentStock.value

  switch (formData.value.adjustmentType) {
    case 'increment':
      return currentStock.value + formData.value.quantity
    case 'decrement':
      return Math.max(0, currentStock.value - formData.value.quantity)
    case 'set':
      return formData.value.quantity
    default:
      return currentStock.value
  }
}

// Warning for large adjustments
const showLargeAdjustmentWarning = computed(() => {
  if (!formData.value.quantity || !currentStock.value || formData.value.adjustmentType === 'set') return false

  const change = Math.abs(formData.value.quantity)
  const percentageChange = (change / currentStock.value) * 100

  return percentageChange > 50
})

// Form validation
const isFormValid = computed(() => {
  return formData.value.ingredientId &&
         formData.value.adjustmentType &&
         formData.value.quantity > 0 &&
         formData.value.reason &&
         (formData.value.reason !== 'other' || formData.value.notes.trim())
})

// Reason labels for display
const reasonLabels = {
  'inventory_count': 'Conteo físico de inventario',
  'expired': 'Producto vencido',
  'damaged': 'Producto dañado',
  'spoilage': 'Merma o desperdicio',
  'theft': 'Robo o pérdida',
  'correction': 'Corrección de error de registro',
  'initial_stock': 'Inventario inicial',
  'transfer': 'Transferencia interna',
  'supplier_return': 'Devolución a proveedor',
  'other': 'Otro'
}

// Submit form
const handleSubmit = async () => {
  if (!isFormValid.value) return

  isSubmitting.value = true

  try {
    // Calculate quantity change based on adjustment type
    let quantityChange = 0

    switch (formData.value.adjustmentType) {
      case 'increment':
        quantityChange = formData.value.quantity
        break
      case 'decrement':
        quantityChange = -formData.value.quantity
        break
      case 'set':
        quantityChange = formData.value.quantity - currentStock.value
        break
    }

    // Prepare the adjustment data
    const adjustmentData = {
      ingredient_id: formData.value.ingredientId,
      quantity_change: quantityChange,
      unit: formData.value.unit, // Send selected unit
      cost_per_unit: formData.value.adjustmentType === 'increment' && formData.value.cost_per_unit ? formData.value.cost_per_unit : null, // Only send cost for increments
      reason: `${reasonLabels[formData.value.reason]}${formData.value.notes ? ': ' + formData.value.notes : ''}`,
      source: 'manual_adjustment'
    }

    // Submit to backend
    await $fetch('/api/inventory/adjustments', {
      method: 'POST',
      body: adjustmentData
    })

    // Show success message
    useToast().success(
      `El inventario de ${selectedIngredient.value.name} ha sido ajustado exitosamente.`,
      { title: 'Ajuste registrado' }
    )

    // Navigate to adjustments history
    navigateTo('/inventario/ajustes')
  } catch (error) {
    console.error('Error creating adjustment:', error)
    useToast().error(
      error.data?.message || 'No se pudo registrar el ajuste. Por favor, inténtalo de nuevo.',
      { title: 'Error' }
    )
  } finally {
    isSubmitting.value = false
  }
}

// Initialize
onMounted(async () => {
  // Check if ingredientId is provided, otherwise redirect to stock
  const ingredientId = route.query.ingredientId as string
  if (!ingredientId) {
    navigateTo('/inventario/stock')
    return
  }

  // Wait for ingredients to load
  while (ingredientsLoading.value) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  isLoadingData.value = false

  // Pre-select ingredient from query param
  formData.value.ingredientId = ingredientId
  await handleIngredientChange()
})
</script>
