<template>
  <div>
    <!-- Loading overlay during submit/delete (always on top) -->
    <div v-if="isSubmitting || isDeleting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">
          {{ isSubmitting ? 'Guardando cambios...' : 'Eliminando orden...' }}
        </p>
      </div>
    </div>

    <!-- Loading State for initial data -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <div class="text-xl font-semibold text-text-primary mb-2">Error cargando orden</div>
        <div class="text-sm text-text-secondary">{{ error }}</div>
        <button @click="refresh" class="mt-4 btn-primary px-4 py-2 rounded-lg">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Edit Form -->
    <div v-else class="page-layout">
      <!-- Header -->
      <div class="bg-surface border-border border rounded-lg">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-text-primary">Editar Orden de Compra</h2>
              <p class="text-sm text-text-secondary mt-1">
                Modificar orden: <span class="font-medium">{{ form.purchase_number }}</span>
              </p>
            </div>
            <div class="flex space-x-2">
              <UiStatusBadge
                :value="getStatusText(form.status)"
                format="text"
                :variant="getStatusVariant(form.status)"
                size="lg"
              />
              <NuxtLink
                to="/abastecimiento/compras"
                class="btn-secondary px-4 py-2 rounded-lg text-sm">
                Volver
              </NuxtLink>
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
                    Número de Orden *
                  </label>
                  <input
                    v-model="form.purchase_number"
                    type="text"
                    required
                    readonly
                    class="input-base w-full px-4 py-2 bg-surface-secondary"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    Proveedor *
                  </label>
                  <select
                    v-model="form.supplier_id"
                    required
                    class="input-base w-full px-4 py-2"
                  >
                    <option value="">Seleccionar proveedor</option>
                    <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                      {{ supplier.name }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    Fecha de Orden *
                  </label>
                  <input
                    v-model="form.purchase_date"
                    type="datetime-local"
                    required
                    class="input-base w-full px-4 py-2"
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
                    placeholder="Ej: FAC-001234"
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
                      <select
                        v-model="item.ingredient_id"
                        required
                        class="input-base w-full px-4 py-2"
                        @change="onIngredientChange(index)"
                      >
                        <option value="">Seleccionar</option>
                        <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
                          {{ ingredient.name }}
                        </option>
                      </select>
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
                        Unidad *
                      </label>
                      <input
                        v-model="item.unit"
                        type="text"
                        required
                        class="input-base w-full px-4 py-2"
                        placeholder="kg, gr, unidad"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-text-primary mb-2">
                        Precio Unitario *
                      </label>
                      <input
                        v-model.number="item.unit_cost"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        class="input-base w-full px-4 py-2"
                        placeholder="0.00"
                        @input="updateItemTotal(index)"
                      />
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
            <div class="flex justify-between pt-6 border-t border-border">
              <button
                type="button"
                @click="handleDelete"
                :disabled="isDeleting"
                class="btn-destructive px-6 py-2 rounded-lg disabled:opacity-50">
                {{ isDeleting ? 'Eliminando...' : 'Eliminar Orden' }}
              </button>

              <div class="flex space-x-4">
                <NuxtLink
                  to="/abastecimiento/compras"
                  class="btn-secondary px-6 py-2 rounded-lg">
                  Cancelar
                </NuxtLink>
                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="btn-primary px-6 py-2 rounded-lg disabled:opacity-50">
                  {{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}
                </button>
              </div>
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

// Get order ID from route
const route = useRoute()
const purchaseId = route.params.id

useHead({
  title: `Editar Orden ${purchaseId} - Abastecimiento`
})

// Fetch suppliers (NO await to show loading)
const { data: suppliersData, pending: loadingSuppliers } = useFetch('/api/suppliers/providers', {
  server: false,
  query: { limit: 250 }
})

const suppliers = computed(() => suppliersData.value?.data || [])

// Fetch ingredients (NO await to show loading)
const { data: ingredientsData, pending: loadingIngredients } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: 250 }
})

const ingredients = computed(() => ingredientsData.value?.data || [])

// Form state
const form = ref({
  supplier_id: '',
  purchase_number: '',
  purchase_date: '',
  delivery_date: '',
  status: 'pending',
  invoice_number: '',
  tax_amount: 0,
  total_amount: 0,
  notes: '',
  items: []
})

const isSubmitting = ref(false)
const isDeleting = ref(false)

// Fetch purchase data
const { data: purchaseData, pending: loadingPurchase, error, refresh } = useAsyncData(
  `purchase-${purchaseId}`,
  () => $fetch(`/api/suppliers/purchases/${purchaseId}`),
  {
    server: false,
    transform: (response) => {
      if (response?.success && response.data) {
        const purchase = response.data

        // Populate form with existing data
        form.value = {
          supplier_id: purchase.supplier_id || '',
          purchase_number: purchase.purchase_number || '',
          purchase_date: purchase.purchase_date ? new Date(purchase.purchase_date).toISOString().slice(0, 16) : '',
          delivery_date: purchase.delivery_date ? new Date(purchase.delivery_date).toISOString().slice(0, 16) : '',
          status: purchase.status || 'pending',
          invoice_number: purchase.invoice_number || '',
          tax_amount: parseFloat(purchase.tax_amount) || 0,
          total_amount: parseFloat(purchase.total_amount) || 0,
          notes: purchase.notes || '',
          items: purchase.items?.map(item => ({
            ingredient_id: item.ingredient_id,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            unit_cost: parseFloat(item.unit_cost),
            total_cost: parseFloat(item.total_cost),
            expiry_date: item.expiry_date || null,
            batch_number: item.batch_number || '',
            notes: item.notes || ''
          })) || []
        }

        return purchase
      }
      throw new Error('Error loading purchase data')
    }
  }
)

// Combined loading state
const isLoading = computed(() => loadingPurchase.value || loadingSuppliers.value || loadingIngredients.value)

// Computed totals
const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0)
})

const totalAmount = computed(() => {
  return subtotal.value + (parseFloat(form.value.tax_amount) || 0)
})

// Helper functions for status
function getStatusVariant(status) {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'sent':
      return 'info'
    case 'received':
      return 'success'
    case 'invoiced':
      return 'secondary'
    case 'overdue':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function getStatusText(status) {
  const texts = {
    pending: 'Pendiente',
    sent: 'Enviada',
    received: 'Recibida',
    invoiced: 'Facturada',
    overdue: 'Vencida'
  }
  return texts[status] || 'Desconocido'
}

// Methods
const onIngredientChange = (index) => {
  const selectedIngredient = ingredients.value.find(
    ing => ing.id === form.value.items[index].ingredient_id
  )
  if (selectedIngredient) {
    form.value.items[index].unit = selectedIngredient.unit
    if (selectedIngredient.price) {
      form.value.items[index].unit_cost = parseFloat(selectedIngredient.price)
      updateItemTotal(index)
    }
  }
}

const updateItemTotal = (index) => {
  const item = form.value.items[index]
  item.total_cost = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)
  updateTotal()
}

const updateTotal = () => {
  form.value.total_amount = totalAmount.value
}

const addItem = () => {
  form.value.items.push({
    ingredient_id: '',
    quantity: 1,
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

    // Update total before submit
    form.value.total_amount = totalAmount.value

    await $fetch(`/api/suppliers/purchases/${purchaseId}`, {
      method: 'PUT',
      body: form.value
    })

    // Redirect back to orders list
    await navigateTo('/abastecimiento/compras')

  } catch (error) {
    console.error('Error updating purchase:', error)
    alert('Error al actualizar la orden. Por favor intente nuevamente.')
  } finally {
    isSubmitting.value = false
  }
}

// Handle order deletion
const handleDelete = async () => {
  if (!confirm('¿Está seguro de que desea eliminar esta orden? Esta acción no se puede deshacer.')) {
    return
  }

  try {
    isDeleting.value = true

    await $fetch(`/api/suppliers/purchases/${purchaseId}`, {
      method: 'DELETE'
    })

    // Redirect back to orders list
    await navigateTo('/abastecimiento/compras')

  } catch (error) {
    console.error('Error deleting purchase:', error)
    alert('Error al eliminar la orden. Por favor intente nuevamente.')
  } finally {
    isDeleting.value = false
  }
}
</script>
