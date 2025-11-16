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
      <!-- Order Information Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-6">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-xl font-bold text-text-primary">Detalles de la Orden</h2>
            <button
              @click="refresh"
              class="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              title="Refrescar orden"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Purchase Number with Date and Payment Type -->
            <div class="flex items-start space-x-3">
              <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {{ formatDate(form.purchase_date) }}
                </p>
                <p class="text-lg font-semibold text-text-primary">
                  {{ form.purchase_number }}
                </p>
                <p v-if="form.payment_type" class="text-sm text-text-secondary">
                  Pago: {{ getPaymentTypeText(form.payment_type) }}
                </p>
              </div>
            </div>

            <!-- Supplier -->
            <div class="flex items-start space-x-3">
              <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Proveedor
                </p>
                <p class="text-lg font-semibold text-text-primary">
                  {{ getSupplierName(form.supplier_id) }}
                </p>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="flex items-start space-x-3">
              <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Estado Actual
                </p>
                <div class="pt-1">
                  <UiStatusBadge
                    :value="getStatusText(form.status)"
                    format="text"
                    :variant="getStatusVariant(form.status)"
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Read-only Summary + Status History (All states) -->
      <div class="space-y-6">
        <!-- Order Summary (Read-only) -->
        <div class="bg-surface border-2 border-border rounded-lg p-6">
          <h3 class="text-lg font-semibold text-text-primary mb-6 flex items-center space-x-2">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Resumen de la Orden</span>
          </h3>

          <!-- Items Table -->
          <div class="mb-4">
            <h4 class="font-medium text-text-primary mb-4">Items</h4>
            <div class="overflow-x-auto">
              <table class="w-full border-2 border-border rounded-lg">
                <thead class="bg-surface-secondary">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Ingrediente
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Cantidad
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Precio Unitario
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Total
                    </th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Lote
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-surface divide-y divide-border">
                  <tr
                    v-for="(item, index) in form.items"
                    :key="index"
                    class="hover:bg-surface-secondary/50 transition-colors"
                  >
                    <td class="px-4 py-3 text-sm text-text-primary">
                      <div>
                        <p class="font-medium">{{ getIngredientName(item.ingredient_id) }}</p>
                        <p v-if="item.notes" class="text-xs text-text-secondary mt-1">{{ item.notes }}</p>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary text-right font-medium whitespace-nowrap">
                      {{ item.quantity }} {{ item.unit }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary text-right whitespace-nowrap">
                      {{ parseFloat(item.unit_cost).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
                    </td>
                    <td class="px-4 py-3 text-sm font-bold text-text-primary text-right whitespace-nowrap">
                      {{ parseFloat(item.total_cost).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-secondary text-center">
                      {{ item.batch_number || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Totals Summary -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <!-- Subtotal Card -->
            <div class="border-2 border-border rounded-lg p-4 bg-surface">
              <p class="text-sm text-text-secondary mb-2">Subtotal</p>
              <p class="text-xl font-semibold text-text-primary">
                {{ subtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
              </p>
            </div>

            <!-- IVA Card -->
            <div class="border-2 border-border rounded-lg p-4 bg-surface">
              <p class="text-sm text-text-secondary mb-2">IVA</p>
              <p class="text-xl font-semibold text-text-primary">
                {{ parseFloat(form.tax_amount).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
              </p>
            </div>

            <!-- Total Card -->
            <div class="border-2 border-border rounded-lg p-4 bg-surface">
              <p class="text-sm text-text-secondary mb-2">Total</p>
              <p class="text-2xl font-bold text-primary">
                {{ totalAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
              </p>
            </div>
          </div>

          <!-- Observaciones -->
          <div v-if="form.notes" class="mt-6">
            <h4 class="font-medium text-text-primary mb-2">Observaciones</h4>
            <p class="text-sm text-text-secondary bg-background p-4 rounded-lg border border-border">
              {{ form.notes }}
            </p>
          </div>
        </div>

        <!-- Status History Timeline -->
        <PurchasesStatusHistoryTimeline
          :purchase-id="purchaseId"
          :current-status="purchase?.status"
        />
      </div>

      <!-- Spacer for global action bar -->
      <div class="h-24"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePurchasesStore } from '~/stores/purchases'
import { storeToRefs } from 'pinia'

definePageMeta({
  layout: 'dashboard'
})

// Get order ID from route
const route = useRoute()
const purchaseId = route.params.id as string

useHead({
  title: `Editar Orden ${purchaseId} - Abastecimiento`
})

// Use Pinia store
const purchasesStore = usePurchasesStore()
const { currentPurchase } = storeToRefs(purchasesStore)

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

const isSubmitting = ref(false)
const isDeleting = ref(false)
const error = ref<string | null>(null)

// Load purchase from store
const loadingPurchase = ref(false)
const loadPurchase = async (forceRefresh = false) => {
  loadingPurchase.value = true
  error.value = null
  try {
    await purchasesStore.fetchPurchase(purchaseId, forceRefresh)
  } catch (err: any) {
    error.value = err.message || 'Error loading purchase'
  } finally {
    loadingPurchase.value = false
  }
}

// Get purchase from store (reactive) - using currentPurchase which is already set
const purchase = currentPurchase

// Form state derived from store
const form = computed(() => {
  if (!purchase.value) {
    return {
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
    }
  }

  return {
    supplier_id: purchase.value.supplier_id,
    purchase_number: purchase.value.purchase_number,
    purchase_date: purchase.value.purchase_date ? new Date(purchase.value.purchase_date).toISOString().slice(0, 16) : '',
    delivery_date: purchase.value.delivery_date ? new Date(purchase.value.delivery_date).toISOString().slice(0, 16) : '',
    status: purchase.value.status,
    payment_type: purchase.value.payment_type,
    credit_days: purchase.value.credit_days,
    payment_due_date: purchase.value.payment_due_date,
    payment_terms: purchase.value.payment_terms,
    consolidation_group: purchase.value.consolidation_group,
    requires_advance_payment: purchase.value.requires_advance_payment,
    invoice_number: purchase.value.invoice_number || '',
    tax_amount: purchase.value.tax_amount,
    total_amount: purchase.value.total_amount,
    notes: purchase.value.notes || '',
    items: purchase.value.items
  }
})

// Refresh function
const refresh = async () => {
  await loadPurchase(true)
}

// Load on mount and set as current purchase
onMounted(async () => {
  // First set the current purchase ID (this will show the bar but wait for data)
  purchasesStore.setCurrentPurchase(purchaseId)

  // Then load the purchase data
  await loadPurchase()
})

// Clean up on unmount
onUnmounted(() => {
  purchasesStore.setCurrentPurchase(null)
})

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
    case 'quotation':
      return 'info'
    case 'pending':
      return 'warning'
    case 'confirmed':
      return 'info'
    case 'preparing':
      return 'info'
    case 'shipped':
      return 'info'
    case 'partially_received':
      return 'warning'
    case 'received':
      return 'success'
    case 'verified':
      return 'success'
    case 'invoiced':
      return 'secondary'
    case 'paid':
      return 'success'
    case 'cancelled':
      return 'destructive'
    case 'overdue':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function getStatusText(status) {
  const texts = {
    quotation: 'Cotización',
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    shipped: 'Enviado',
    partially_received: 'Parcialmente Recibido',
    received: 'Recibido',
    verified: 'Verificado',
    invoiced: 'Facturado',
    paid: 'Pagado',
    cancelled: 'Cancelado',
    overdue: 'Vencido'
  }
  return texts[status] || 'Desconocido'
}

function getSupplierName(supplierId) {
  if (!supplierId) return 'No especificado'
  const supplier = suppliers.value.find(sup => sup.id === supplierId)
  return supplier?.name || 'Proveedor desconocido'
}

function getIngredientName(ingredientId) {
  if (!ingredientId) return 'No especificado'
  const ingredient = ingredients.value.find(ing => ing.id === ingredientId)
  return ingredient?.name || 'Ingrediente desconocido'
}

function formatDate(dateString) {
  if (!dateString) return 'No especificada'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getPaymentTypeText(paymentType) {
  const types = {
    'contado': 'Contado',
    'credito': 'Crédito',
    'contraentrega': 'Contraentrega',
    'credito_consolidado': 'Crédito Consolidado'
  }
  return types[paymentType] || 'No especificado'
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

// Handle state change after successful transition
const handleStateChanged = async () => {
  // Refresh purchase data to get updated status
  await refresh()
}
</script>
