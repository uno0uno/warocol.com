<template>
  <div>
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting || isApproving" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">
          Procesando acción...
        </p>
      </div>
    </div>

    <!-- Loading State for initial data -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="error" />

    <!-- Actions Page with Split Layout -->
    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
      <!-- Left Column: Form Content -->
      <div class="xl:col-span-2">
        <!-- APPROVE FORM -->
        <div v-if="purchase?.status === 'pending'" class="bg-surface border-2 border-success rounded-xl overflow-hidden shadow-sm">
          <div class="p-6 border-b-2 border-success/20" style="background-color: hsl(var(--success) / 0.05);">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-lg bg-success/10">
                <svg class="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">Aprobar Orden</h2>
                <p class="text-sm text-text-secondary">Confirmar la orden de compra</p>
              </div>
            </div>
          </div>

          <div class="p-6 md:p-8">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">Número de Confirmación</label>
                <input :value="confirmationNumber" type="text" readonly
                  class="w-full px-4 py-3 bg-surface border-2 border-border rounded-lg text-text-primary font-semibold cursor-not-allowed" />
                <p class="mt-1 text-xs text-text-secondary">Generado automáticamente</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">Notas (Opcional)</label>
                <textarea v-model="approveFormData.notes" rows="3"
                  class="w-full px-4 py-3 bg-surface border-2 border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-success focus:ring-2 focus:ring-success/20 transition-all resize-none"
                  placeholder="Agrega notas sobre la confirmación..."></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- RECEIVE FORM -->
        <div v-if="purchase?.status === 'shipped' || purchase?.status === 'partially_received'"
          class="bg-surface border-2 border-primary rounded-xl overflow-hidden shadow-sm">
          <div class="p-6 border-b-2 border-primary/20" style="background-color: hsl(var(--primary) / 0.05);">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-lg bg-primary/10">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">Recibir Orden</h2>
                <p class="text-sm text-text-secondary">Registra cantidades y verifica calidad</p>
              </div>
            </div>
          </div>

          <div class="p-6 md:p-8 form-without-buttons">
            <PurchasesReceiveForm
              ref="receiveFormRef"
              :purchase-id="purchaseId"
              :purchase-items="purchase?.items || []"
              :ingredients="ingredients"
              @cancel="navigateTo(`/abastecimiento/compra/${purchaseId}`)"
              @received="handleActionCompleted" />
          </div>
        </div>

        <!-- No actions available -->
        <div v-if="!hasAvailableActions" class="bg-surface border-2 border-border rounded-xl p-6 text-center">
          <svg class="w-12 h-12 text-text-secondary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-lg font-semibold text-text-primary mb-2">No hay acciones disponibles</p>
          <p class="text-sm text-text-secondary mb-4">
            Esta orden no tiene acciones que puedas realizar en este momento
          </p>
          <NuxtLink :to="`/abastecimiento/compra/${purchaseId}`"
            class="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a la orden
          </NuxtLink>
        </div>
      </div>

      <!-- Right Column: Summary & Actions -->
      <div class="xl:col-span-1">
        <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Detalles de la Orden</h3>

          <div class="bg-background rounded-lg p-4 border border-border mb-6 space-y-3">
            <div>
              <p class="text-sm text-text-secondary mb-1">Número de Orden</p>
              <p class="font-medium text-text-primary">{{ purchase?.purchase_number || 'N/A' }}</p>
            </div>
            <div v-if="purchase?.supplier_name">
              <p class="text-sm text-text-secondary mb-1">Proveedor</p>
              <p class="font-medium text-text-primary">{{ purchase.supplier_name }}</p>
            </div>
            <div v-if="purchase?.total_amount">
              <p class="text-sm text-text-secondary mb-1">Monto Total</p>
              <p class="font-medium text-text-primary text-lg">
                {{ ((parseFloat(purchase.total_amount) || 0) + (parseFloat(purchase.tax_amount) || 0)).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
              </p>
            </div>
            <div>
              <p class="text-sm text-text-secondary mb-1">Estado</p>
              <span class="px-2 py-1 rounded text-xs font-medium" :class="getStatusBadgeClass(purchase?.status)">
                {{ getStatusText(purchase?.status) }}
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-3">
            <!-- Approve Action -->
            <template v-if="purchase?.status === 'pending'">
              <button 
                @click="handleApprove"
                :disabled="isApproving"
                class="w-full py-3 bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-success/20">
                <CommonsTheCustomLoader v-if="isApproving" size="small" />
                <span>{{ isApproving ? 'Aprobando...' : 'Aprobar Orden' }}</span>
              </button>
            </template>

            <!-- Receive Action -->
            <template v-else-if="purchase?.status === 'shipped' || purchase?.status === 'partially_received'">
              <button 
                @click="handleReceiveSubmit"
                :disabled="isSubmitting"
                class="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-primary/20">
                <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
                <span>{{ isSubmitting ? 'Procesando...' : 'Registrar Recepción' }}</span>
              </button>
            </template>

            <!-- Cancel Button -->
            <NuxtLink 
              v-if="hasAvailableActions"
              :to="`/abastecimiento/compra/${purchaseId}`"
              class="w-full py-3 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-colors font-medium block text-center">
              Cancelar
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { usePurchasesStore } from '~/stores/purchases'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'

// Get order ID from route
const route = useRoute()
const purchaseId = route.params.id as string

useHead({
  title: `Acciones - Orden ${purchaseId}`
})

// Handle receive form submission from button
const handleReceiveSubmit = () => {
  isSubmitting.value = true
  const formRef = receiveFormRef
  if (formRef.value) {
    const formElement = formRef.value.$el?.tagName === 'FORM'
      ? formRef.value.$el
      : formRef.value.$el?.querySelector('form')

    if (formElement) {
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
      formElement.dispatchEvent(submitEvent)
    }
  }
}

// Use Pinia store
const purchasesStore = usePurchasesStore()

// Fetch ingredients
const { data: ingredientsData, pending: loadingIngredients } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: INGREDIENTS_FETCH_LIMIT }
})

const ingredients = computed(() => ingredientsData.value?.data || [])

const isSubmitting = ref(false)
const isApproving = ref(false)
const error = ref<string | null>(null)

// Form refs
const receiveFormRef = ref<any>(null)

// Form data
const approveFormData = ref({
  notes: ''
})

// Load purchase
const loadingPurchase = ref(false)
const purchase = ref<any>(null)

const loadPurchase = async (forceRefresh = false) => {
  loadingPurchase.value = true
  error.value = null
  try {
    const data = await $fetch(`/api/suppliers/purchases/${purchaseId}`)
    purchase.value = data.data
  } catch (err: any) {
    error.value = err.message || 'Error loading purchase'
  } finally {
    loadingPurchase.value = false
  }
}

// Inject refresh handler setter from layout
const { setRefreshHandler } = useLayoutActions()

// Load on mount
onMounted(async () => {
  setRefreshHandler(loadPurchase)
  await loadPurchase()
})

// Combined loading state
const isLoading = computed(() => loadingPurchase.value || loadingIngredients.value)

// Check if there are available actions
const hasAvailableActions = computed(() => {
  if (!purchase.value) return false

  const status = purchase.value.status
  const canApprove = status === 'pending'
  const canReceive = status === 'shipped' || status === 'partially_received'

  return canApprove || canReceive
})

// Status helpers
function getStatusVariant(status: string) {
  const variants: Record<string, string> = {
    quotation: 'info',
    pending: 'warning',
    confirmed: 'info',
    preparing: 'info',
    shipped: 'info',
    partially_received: 'warning',
    received: 'success',
    verified: 'success',
    invoiced: 'secondary',
    paid: 'success',
    cancelled: 'destructive',
    overdue: 'destructive'
  }
  return variants[status] || 'secondary'
}

function getStatusText(status: string) {
  const texts: Record<string, string> = {
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
  return texts[status] || status
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    quotation: 'bg-yellow-500/10 text-yellow-600',
    pending: 'bg-blue-500/10 text-blue-600',
    confirmed: 'bg-green-500/10 text-green-600',
    preparing: 'bg-purple-500/10 text-purple-600',
    shipped: 'bg-cyan-500/10 text-cyan-600',
    partially_received: 'bg-orange-500/10 text-orange-600',
    received: 'bg-emerald-500/10 text-emerald-600',
    verified: 'bg-green-600/10 text-green-700',
    invoiced: 'bg-indigo-500/10 text-indigo-600',
    paid: 'bg-green-600/10 text-green-700',
    cancelled: 'bg-destructive/10 text-destructive',
    overdue: 'bg-destructive/10 text-destructive'
  }
  return classes[status] || 'bg-surface-secondary text-text-secondary'
}

// Generate confirmation number
const confirmationNumber = computed(() => {
  if (!purchase.value?.purchase_number) return ''
  return purchase.value.purchase_number.replace('WR-', 'CONF-')
})

// Action handlers
const handleApprove = async () => {
  isApproving.value = true

  try {
    const response = await $fetch(`/api/suppliers/purchases/${purchaseId}/confirm`, {
      method: 'POST',
      body: {
        confirmation_number: confirmationNumber.value,
        notes: approveFormData.value.notes || null
      }
    })

    if (response.success) {
      // Redirect back to purchase detail page with refresh flag
      await navigateTo(`/abastecimiento/compra/${purchaseId}?refresh=true`)
    }
  } catch (error: any) {
    console.error('Error confirming purchase:', error)
    useToast().error(error.data?.detail || 'No se pudo confirmar la orden', { title: 'Error' })
  } finally {
    isApproving.value = false
  }
}

const handleActionCompleted = async () => {
  // Redirect back to purchase detail page after receiving with refresh flag
  await navigateTo(`/abastecimiento/compra/${purchaseId}?refresh=true`)
}
</script>

<style scoped>
/* Hide the form buttons since they're now in the summary card */
.form-without-buttons :deep(form > div:last-child) {
  display: none;
}
</style>
```
