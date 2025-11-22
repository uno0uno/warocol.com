<template>
  <div>
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <div class="text-xl font-semibold text-text-primary mb-2">Error cargando orden</div>
        <div class="text-sm text-text-secondary">{{ error }}</div>
        <button @click="loadPurchase(true)" class="mt-4 btn-primary px-4 py-2 rounded-lg">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Actions Page -->
    <div v-else class="page-layout">

      <!-- Available Actions -->
      <div class="space-y-4 mb-20">
        <!-- APPROVE ACTION (Pending status) -->
        <div v-if="purchase?.status === 'pending'" class="border-2 border-success rounded-xl overflow-hidden">
          <!-- Header -->
          <div class="p-4 sm:p-5 border-b-2 border-success/20" style="background-color: hsl(var(--success) / 0.05);">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="font-semibold text-text-primary text-base sm:text-lg">Aprobar Orden</p>
                <p class="text-sm text-text-secondary">Confirmar la orden de compra</p>
              </div>
            </div>
          </div>

          <!-- Approve Form -->
          <div class="p-4 sm:p-6 bg-surface space-y-4">
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

            <div class="flex flex-col sm:flex-row gap-3 pt-2">
              <NuxtLink :to="`/abastecimiento/compra/${purchaseId}`"
                class="flex-1 px-6 py-3 border-2 border-border rounded-lg text-text-primary hover:bg-surface transition-colors text-center">
                Cancelar
              </NuxtLink>
              <button @click="handleApprove" :disabled="isSubmitting"
                class="flex-1 px-6 py-3 bg-success text-white rounded-lg hover:bg-success/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
                <span>{{ isSubmitting ? 'Aprobando...' : 'Aprobar Orden' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- RECEIVE ACTION (Shipped/Partially Received status) -->
        <div v-if="purchase?.status === 'shipped' || purchase?.status === 'partially_received'"
          class="border-2 border-primary rounded-xl overflow-hidden">
          <!-- Header -->
          <div class="p-4 sm:p-5 border-b-2 border-primary/20" style="background-color: hsl(var(--primary) / 0.05);">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p class="font-semibold text-text-primary text-base sm:text-lg">Recibir Orden</p>
                <p class="text-sm text-text-secondary">Registra cantidades y verifica calidad</p>
              </div>
            </div>
          </div>

          <!-- Receive Form -->
          <div class="p-4 sm:p-6 bg-surface">
            <PurchasesReceiveForm :purchase-id="purchaseId" :purchase-items="purchase?.items || []"
              :ingredients="ingredients" @cancel="navigateTo(`/abastecimiento/compra/${purchaseId}`)"
              @received="handleActionCompleted" />
          </div>
        </div>

        <!-- No actions available message -->
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePurchasesStore } from '~/stores/purchases'

definePageMeta({
  layout: 'dashboard'
})

// Get order ID from route
const route = useRoute()
const purchaseId = route.params.id as string

useHead({
  title: `Acciones - Orden ${purchaseId}`
})

// Use Pinia store
const purchasesStore = usePurchasesStore()

// Fetch ingredients
const { data: ingredientsData, pending: loadingIngredients } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: 250 }
})

const ingredients = computed(() => ingredientsData.value?.data || [])

const isSubmitting = ref(false)
const error = ref<string | null>(null)

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

// Load on mount
onMounted(async () => {
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
  return texts[status] || 'Desconocido'
}

// Generate confirmation number
const confirmationNumber = computed(() => {
  if (!purchase.value?.purchase_number) return ''
  return purchase.value.purchase_number.replace('WR-', 'CONF-')
})

// Action handlers
const handleApprove = async () => {
  isSubmitting.value = true

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
    useToast().add({
      title: 'Error',
      description: error.data?.detail || 'No se pudo confirmar la orden',
      color: 'red'
    })
  } finally {
    isSubmitting.value = false
  }
}

const handleActionCompleted = async () => {
  // Redirect back to purchase detail page after receiving with refresh flag
  await navigateTo(`/abastecimiento/compra/${purchaseId}?refresh=true`)
}
</script>
