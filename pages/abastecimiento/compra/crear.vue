<template>
  <div class="page-layout">
    <!-- Loading overlay during submit (always on top) -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Creando orden de compra...</p>
      </div>
    </div>

    <!-- Loading State for initial data -->
    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else>
    <!-- Header -->
    <div class="bg-surface border-border border rounded-lg">
      <div class="p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-text-primary">Crear Nueva Orden de Compra</h2>
            <p class="text-sm text-text-secondary mt-1">Complete la información de la orden</p>
          </div>
          <NuxtLink
            to="/abastecimiento/compras"
            class="btn-secondary px-4 py-2 rounded-lg text-sm">
            Volver
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Resumen -->
    <div class="bg-surface border-border border rounded-lg">
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="flex items-center space-x-4">
            <div class="bg-primary-100 p-3 rounded-lg">
              <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-text-secondary">Número de Orden</p>
              <p class="text-lg font-semibold text-text-primary">{{ nextPurchaseNumber }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="bg-green-100 p-3 rounded-lg">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-text-secondary">Fecha de Orden</p>
              <p class="text-lg font-semibold text-text-primary">Al momento de crear</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form -->
    <div class="bg-surface border-border border rounded-lg">
      <div class="p-6">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Información General -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-4">Información General</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Proveedor *
                </label>
                <UiSearchableSelect
                  v-model="form.supplier_id"
                  :options="supplierOptions"
                  placeholder="Buscar proveedor..."
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Fecha de Entrega
                </label>
                <input
                  v-model="form.delivery_date"
                  type="datetime-local"
                  class="input-base w-full px-4 py-2"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Estado
                </label>
                <select
                  v-model="form.status"
                  class="input-base w-full px-4 py-2"
                >
                  <option value="pending">Pendiente</option>
                  <option value="sent">Enviada</option>
                  <option value="received">Recibida</option>
                  <option value="invoiced">Facturada</option>
                  <option value="overdue">Vencida</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Número de Factura
                </label>
                <input
                  v-model="form.invoice_number"
                  type="text"
                  class="input-base w-full px-4 py-2"
                  placeholder="Ej: FAC-001234 (opcional)"
                />
              </div>
            </div>
          </div>

          <!-- Items de la Orden -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-4">Items de la Orden</h3>

            <div class="space-y-4">
              <div
                v-for="(item, index) in form.items"
                :key="index"
                class="p-4 border border-border rounded-lg"
              >
                <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Ingrediente *
                    </label>
                    <UiSearchableSelect
                      v-model="item.ingredient_id"
                      :options="ingredientOptions"
                      placeholder="Buscar ingrediente..."
                      required
                      @update:model-value="onIngredientChange(index)"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Cantidad *
                    </label>
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      class="input-base w-full px-4 py-2"
                      placeholder="0"
                      @input="updateItemTotal(index)"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Unidad de Compra *
                    </label>
                    <select
                      v-model="item.purchase_unit"
                      required
                      :disabled="!item.ingredient_id"
                      class="input-base w-full px-4 py-2"
                      :class="{ 'bg-surface-secondary cursor-not-allowed': !item.ingredient_id }"
                      @change="onPurchaseUnitChange(index)"
                    >
                      <option value="">{{ item.ingredient_id ? 'Seleccionar unidad' : 'Seleccione ingrediente primero' }}</option>
                      <option
                        v-for="option in getUnitOptionsForIngredient(item.ingredient_id)"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                    <p v-if="item.ingredient_id && item.purchase_unit" class="text-xs text-text-secondary mt-1">
                      Se convertirá a: {{ getIngredientUnit(item.ingredient_id) }}
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Precio por {{ item.purchase_unit || 'unidad' }} *
                    </label>
                    <input
                      v-model.number="item.purchase_price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      class="input-base w-full px-4 py-2"
                      placeholder="0.00"
                      @input="onPurchasePriceChange(index)"
                    />
                    <p v-if="item.unit_cost && item.purchase_unit" class="text-xs text-titan-500 mt-1">
                      ≈ ${{ formatPrice(item.unit_cost) }} por {{ getIngredientUnit(item.ingredient_id) }}
                    </p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Total
                    </label>
                    <input
                      :value="item.total_cost?.toLocaleString() || '0'"
                      type="text"
                      readonly
                      class="input-base w-full px-4 py-2 bg-surface-secondary"
                    />
                    <p v-if="item.quantity && item.purchase_unit" class="text-xs text-titan-500 mt-1">
                      {{ getConvertedQuantity(index) }} {{ getIngredientUnit(item.ingredient_id) }}
                    </p>
                  </div>

                  <div class="flex items-end">
                    <button
                      type="button"
                      @click="removeItem(index)"
                      :disabled="form.items.length === 1"
                      class="btn-destructive px-4 py-2 rounded-lg text-sm disabled:opacity-50 w-full"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <!-- Additional fields -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Fecha de Vencimiento
                    </label>
                    <input
                      v-model="item.expiry_date"
                      type="date"
                      class="input-base w-full px-4 py-2"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Número de Lote
                    </label>
                    <input
                      v-model="item.batch_number"
                      type="text"
                      class="input-base w-full px-4 py-2"
                      placeholder="Ej: LOTE-2025-001"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Notas del Item
                    </label>
                    <input
                      v-model="item.notes"
                      type="text"
                      class="input-base w-full px-4 py-2"
                      placeholder="Observaciones"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              @click="addItem"
              class="btn-secondary px-4 py-2 rounded-lg text-sm mt-4"
            >
              + Agregar Item
            </button>
          </div>

          <!-- Totals -->
          <div class="bg-surface-secondary p-4 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Subtotal
                </label>
                <input
                  :value="subtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })"
                  type="text"
                  readonly
                  class="input-base w-full px-4 py-2 bg-white font-semibold"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  IVA
                </label>
                <input
                  v-model.number="form.tax_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  class="input-base w-full px-4 py-2"
                  placeholder="0.00"
                  @input="updateTotal"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Total
                </label>
                <input
                  :value="totalAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })"
                  type="text"
                  readonly
                  class="input-base w-full px-4 py-2 bg-white font-bold text-lg"
                />
              </div>
            </div>
          </div>

          <!-- Observaciones -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-4">Observaciones</h3>
            <textarea
              v-model="form.notes"
              class="input-base w-full px-4 py-2"
              rows="3"
              placeholder="Observaciones adicionales sobre la orden..."
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex justify-end space-x-4 pt-6 border-t border-border">
            <NuxtLink
              to="/abastecimiento/compras"
              class="btn-secondary px-6 py-2 rounded-lg">
              Cancelar
            </NuxtLink>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="btn-primary px-6 py-2 rounded-lg disabled:opacity-50">
              {{ isSubmitting ? 'Creando...' : 'Crear Orden' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'Crear Orden de Compra - Abastecimiento'
})

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Fetch suppliers (NO await to show loading)
const { data: suppliersData, pending: loadingSuppliers } = useFetch('/api/suppliers/providers', {
  server: false,
  query: { limit: 250 }
})

const suppliers = computed(() => suppliersData.value?.data || [])

// Transform suppliers for SearchableSelect
const supplierOptions = computed(() =>
  suppliers.value.map(supplier => ({
    value: supplier.id,
    label: supplier.name
  }))
)

// Fetch ingredients (NO await to show loading)
const { data: ingredientsData, pending: loadingIngredients } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: 250 }
})

const ingredients = computed(() => ingredientsData.value?.data || [])

// Transform ingredients for SearchableSelect
const ingredientOptions = computed(() =>
  ingredients.value.map(ingredient => ({
    value: ingredient.id,
    label: ingredient.name
  }))
)

// Fetch next purchase number
const { data: nextNumberData, pending: loadingNextNumber } = useFetch('/api/suppliers/purchases/next-number', {
  server: false
})

const nextPurchaseNumber = computed(() => nextNumberData.value?.next_number || 'WR-2025-XXXX')

// Loading state for initial data
const isLoadingData = computed(() => loadingSuppliers.value || loadingIngredients.value || loadingNextNumber.value)

// Get current date and time in local timezone for datetime-local input
const getCurrentDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Unit conversion factors (to convert to base unit)
const unitConversions = {
  // Peso (base: gr)
  'gr-gr': 1,
  'kg-gr': 1000,
  'lb-gr': 453.592,
  'oz-gr': 28.3495,

  // Volumen (base: ml)
  'ml-ml': 1,
  'lt-ml': 1000,
  'gal-ml': 3785.41,

  // Unidades discretas
  'und-und': 1
}

// Get conversion factor
const getConversionFactor = (fromUnit, toUnit) => {
  const key = `${fromUnit}-${toUnit}`
  return unitConversions[key] || 1
}

// Form state
const form = ref({
  supplier_id: '',
  // purchase_number is auto-generated by backend
  // purchase_date will be set when creating
  delivery_date: '',
  status: 'pending',
  invoice_number: '',
  tax_amount: 0,
  total_amount: 0,
  notes: '',
  items: [
    {
      ingredient_id: '',
      quantity: 1,
      purchase_unit: '',     // Unidad en la que se compra
      purchase_price: 0,      // Precio en la unidad de compra
      unit: '',               // Unidad base del ingrediente (para BD)
      unit_cost: 0,           // Precio convertido a unidad base
      total_cost: 0,
      expiry_date: null,
      batch_number: '',
      notes: ''
    }
  ]
})

const isSubmitting = ref(false)

// Computed totals
const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0)
})

const totalAmount = computed(() => {
  return subtotal.value + (parseFloat(form.value.tax_amount) || 0)
})

// Helper functions
const formatPrice = (price) => {
  if (!price) return '0.00'
  return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const getIngredientUnit = (ingredientId) => {
  if (!ingredientId) return ''
  const ingredient = ingredients.value.find(ing => ing.id === ingredientId)
  return ingredient?.unit || ''
}

const getUnitOptionsForIngredient = (ingredientId) => {
  if (!ingredientId) return []

  const baseUnit = getIngredientUnit(ingredientId)

  // Retornar opciones según el tipo de unidad base
  if (baseUnit === 'gr') {
    return [
      { value: 'gr', label: 'Gramos (gr)' },
      { value: 'kg', label: 'Kilogramos (kg)' },
      { value: 'lb', label: 'Libras (lb)' },
      { value: 'oz', label: 'Onzas (oz)' }
    ]
  } else if (baseUnit === 'ml') {
    return [
      { value: 'ml', label: 'Mililitros (ml)' },
      { value: 'lt', label: 'Litros (lt)' },
      { value: 'gal', label: 'Galones (gal)' }
    ]
  } else if (baseUnit === 'und') {
    return [
      { value: 'und', label: 'Unidad' }
    ]
  }

  return []
}

const getConvertedQuantity = (index) => {
  const item = form.value.items[index]
  if (!item.quantity || !item.purchase_unit || !item.ingredient_id) return '0'

  const baseUnit = getIngredientUnit(item.ingredient_id)
  const factor = getConversionFactor(item.purchase_unit, baseUnit)
  const converted = item.quantity * factor

  return converted.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Methods
const onIngredientChange = (index) => {
  const selectedIngredient = ingredients.value.find(
    ing => ing.id === form.value.items[index].ingredient_id
  )
  if (selectedIngredient) {
    // Set base unit
    form.value.items[index].unit = selectedIngredient.unit
    // Set default purchase unit to base unit
    form.value.items[index].purchase_unit = selectedIngredient.unit
  }
}

const onPurchaseUnitChange = (index) => {
  // Recalculate when unit changes
  onPurchasePriceChange(index)
}

const onPurchasePriceChange = (index) => {
  const item = form.value.items[index]
  if (!item.purchase_unit || !item.ingredient_id) return

  const baseUnit = getIngredientUnit(item.ingredient_id)
  const factor = getConversionFactor(item.purchase_unit, baseUnit)

  // Convert price to base unit
  // Ejemplo: $10,000/lb → $22.05/gr (10000 / 453.592)
  item.unit_cost = (item.purchase_price || 0) / factor

  updateItemTotal(index)
}

const updateItemTotal = (index) => {
  const item = form.value.items[index]

  if (!item.purchase_unit || !item.ingredient_id) {
    item.total_cost = 0
    updateTotal()
    return
  }

  // Calculate total with original purchase values (simpler and more intuitive)
  // Total = quantity purchased × price per unit purchased
  item.total_cost = (parseFloat(item.quantity) || 0) * (parseFloat(item.purchase_price) || 0)
  updateTotal()
}

const updateTotal = () => {
  form.value.total_amount = totalAmount.value
}

const addItem = () => {
  form.value.items.push({
    ingredient_id: '',
    quantity: 1,
    purchase_unit: '',
    purchase_price: 0,
    unit: '',
    unit_cost: 0,
    total_cost: 0,
    expiry_date: null,
    batch_number: '',
    notes: ''
  })
}

const removeItem = (index) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
    updateTotal()
  }
}

// Handle form submission
const handleSubmit = async () => {
  try {
    isSubmitting.value = true

    // Convert items to base units for database
    const convertedItems = form.value.items.map(item => {
      const baseUnit = getIngredientUnit(item.ingredient_id)
      const factor = getConversionFactor(item.purchase_unit, baseUnit)
      const convertedQuantity = item.quantity * factor

      return {
        ingredient_id: item.ingredient_id,
        quantity: convertedQuantity,      // Cantidad convertida a unidad base
        unit: baseUnit,                   // Unidad base del ingrediente
        unit_cost: item.unit_cost,        // Precio ya convertido a unidad base
        total_cost: item.total_cost,      // Total calculado
        expiry_date: item.expiry_date,
        batch_number: item.batch_number,
        notes: item.notes
      }
    })

    // Set purchase_date to current date and time at the moment of submission
    const purchaseData = {
      supplier_id: form.value.supplier_id,
      purchase_date: getCurrentDateTime(),
      delivery_date: form.value.delivery_date,
      status: form.value.status,
      invoice_number: form.value.invoice_number,
      tax_amount: form.value.tax_amount,
      total_amount: totalAmount.value,
      notes: form.value.notes,
      items: convertedItems
    }

    await $fetch('/api/suppliers/purchases', {
      method: 'POST',
      body: purchaseData
    })

    // Redirect back to orders list
    await navigateTo('/abastecimiento/compras')

  } catch (error) {
    console.error('Error creating order:', error)
    alert('Error al crear la orden. Por favor intente nuevamente.')
  } finally {
    isSubmitting.value = false
  }
}
</script>
