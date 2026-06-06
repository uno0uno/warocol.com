<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[60vh]">
      <div class="max-w-md p-6 bg-surface border border-border rounded-lg text-center">
        <svg class="w-16 h-16 mx-auto text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="mt-4 text-xl font-bold text-text-primary">Error</h2>
        <p class="mt-2 text-text-secondary">{{ error }}</p>
        <button @click="loadPurchase"
          class="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Actions Content with Split Layout -->
    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
      <!-- Left Column: Form Content -->
      <div class="xl:col-span-2">
        <div class="bg-surface border-2 border-border rounded-xl overflow-hidden shadow-sm">
          <!-- Header based on action -->
          <div class="p-6 border-b-2 border-border" :class="headerClass">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-lg" :class="iconBgClass">
                <component :is="headerIcon" class="w-8 h-8" :class="iconColorClass" />
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">{{ headerTitle }}</h2>
                <p class="text-sm text-text-secondary">{{ headerDescription }}</p>
              </div>
            </div>
          </div>

          <!-- Form Body -->
          <div class="p-6 md:p-8 form-without-buttons">
            <!-- Complete Prices Form -->
            <PurchasesCompletePricesForm
              v-if="purchase?.status === 'quotation'"
              ref="completePricesFormRef"
              :purchase="purchase"
              :token="token"
              @cancel="navigateTo(`/proveedor/${token}/${purchaseId}`)"
              @completed="handleActionCompleted"
              @loading="isFormSubmitting = $event"
            />

            <!-- Invoice Form -->
            <PurchasesInvoiceForm
              v-else-if="canShowInvoiceForm"
              ref="invoiceFormRef"
              :purchase="purchase"
              :token="token"
              @cancel="navigateTo(`/proveedor/${token}/${purchaseId}`)"
              @invoiced="handleActionCompleted"
              @loading="isFormSubmitting = $event"
            />

            <!-- Ship Form -->
            <PurchasesShipForm
              v-else-if="purchase?.status === 'invoiced'"
              ref="shipFormRef"
              :purchase="purchase"
              :token="token"
              @cancel="navigateTo(`/proveedor/${token}/${purchaseId}`)"
              @shipped="handleActionCompleted"
            />

            <!-- No Action Available -->
            <div v-else class="text-center py-12">
              <svg class="w-16 h-16 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 class="text-lg font-semibold text-text-primary">No hay acciones pendientes</h3>
              <p class="text-text-secondary mt-2">Esta orden no requiere ninguna acción de tu parte en este momento.</p>
              <button @click="navigateTo(`/proveedor/${token}/${purchaseId}`)"
                class="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                Volver al detalle
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Purchase Summary & Info -->
      <div class="xl:col-span-1">
        <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Detalles de la Orden</h3>

          <div class="bg-background rounded-lg p-4 border border-border space-y-3">
            <div>
              <p class="text-sm text-text-secondary mb-1">Número de Orden</p>
              <p class="font-medium text-text-primary">{{ purchase?.purchase_number || 'N/A' }}</p>
            </div>
            <div v-if="purchase?.supplier_name">
              <p class="text-sm text-text-secondary mb-1">Cliente</p>
              <p class="font-medium text-text-primary">{{ purchase.supplier_name }}</p>
            </div>
            <div v-if="purchase?.purchase_date">
              <p class="text-sm text-text-secondary mb-1">Fecha de Orden</p>
              <p class="font-medium text-text-primary">{{ formatDate(purchase.purchase_date) }}</p>
            </div>
            <div v-if="purchase?.total_amount">
              <p class="text-sm text-text-secondary mb-1">Monto Total</p>
              <p class="font-medium text-text-primary text-lg">
                {{ (purchase.total_amount + (purchase.tax_amount || 0)).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
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
          <div class="mt-6 space-y-3">
            <!-- Complete Prices Actions -->
            <template v-if="purchase?.status === 'quotation'">
              <button 
                type="button"
                @click="handleFormSubmit('completePrices')"
                :disabled="isFormSubmitting"
                class="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-green-500/20">
                <CommonsTheCustomLoader v-if="isFormSubmitting" size="small" />
                <span>{{ isFormSubmitting ? 'Enviando...' : 'Enviar Cotización' }}</span>
              </button>
            </template>

            <!-- Invoice Actions -->
            <template v-else-if="canShowInvoiceForm">
              <button 
                type="button"
                @click="handleFormSubmit('invoice')"
                :disabled="isFormSubmitting"
                class="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-orange-500/20">
                <CommonsTheCustomLoader v-if="isFormSubmitting" size="small" />
                <span>{{ isFormSubmitting ? 'Registrando...' : 'Registrar Factura' }}</span>
              </button>
            </template>

            <!-- Ship Actions -->
            <template v-else-if="purchase?.status === 'invoiced'">
              <button 
                type="button"
                @click="handleFormSubmit('ship')"
                :disabled="isFormSubmitting"
                class="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-blue-500/20">
                <CommonsTheCustomLoader v-if="isFormSubmitting" size="small" />
                <span>{{ isFormSubmitting ? 'Registrando...' : 'Marcar como Enviado' }}</span>
              </button>
            </template>

            <!-- Cancel Button (always show if there's an active form) -->
            <button 
              v-if="purchase?.status === 'quotation' || canShowInvoiceForm || purchase?.status === 'invoiced'"
              type="button"
              @click="navigateTo(`/proveedor/${token}/${purchaseId}`)"
              class="w-full py-3 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-colors font-medium">
              Cancelar
            </button>
          </div>
          <!-- Action Help Text -->
          <div class="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div class="flex gap-3">
              <div class="flex-shrink-0">
                <svg class="w-5 h-5 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="text-sm text-text-secondary">
                <p class="font-medium text-text-primary mb-1">Información</p>
                <p>{{ getActionHelpText(purchase?.status) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, h } from 'vue'
import { useRoute, navigateTo } from '#app'

definePageMeta({
  layout: 'supplier-portal'
})

useHead({ title: 'Acciones de Compra' })

const route = useRoute()
const token = computed(() => route.params.token as string)
const purchaseId = computed(() => route.params.purchaseId as string)

const loading = ref(true)
const error = ref<string | null>(null)
const purchase = ref<any>(null)

// Form refs for programmatic submission
const completePricesFormRef = ref<any>(null)
const invoiceFormRef = ref<any>(null)
const shipFormRef = ref<any>(null)
const isFormSubmitting = ref(false)

// Handle form submission from summary card buttons
const handleFormSubmit = (formType: 'completePrices' | 'invoice' | 'ship') => {
  const formRefs = {
    completePrices: completePricesFormRef,
    invoice: invoiceFormRef,
    ship: shipFormRef
  }
  
  const formRef = formRefs[formType]
  if (formRef.value) {
    // Find the form element directly
    const formElement = formRef.value.$el?.tagName === 'FORM' 
      ? formRef.value.$el 
      : formRef.value.$el?.querySelector('form')
    
    if (formElement) {
      // Dispatch submit event to trigger Vue's @submit handler
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
      formElement.dispatchEvent(submitEvent)
    }
  }
}

// Icons as render functions or components
const QuotationIcon = h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
])

const InvoiceIcon = h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
])

const ShipIcon = h('svg', { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' })
])

const canShowInvoiceForm = computed(() => {
  const status = purchase.value?.status
  const paymentType = purchase.value?.payment_type

  if (paymentType === 'contado') {
    return status === 'paid'
  }
  return status === 'confirmed' || status === 'preparing'
})

// Dynamic Header Content
const headerTitle = computed(() => {
  if (purchase.value?.status === 'quotation') return 'Completar Cotización'
  if (canShowInvoiceForm.value) return 'Registrar Factura'
  if (purchase.value?.status === 'invoiced') return 'Marcar como Enviado'
  return 'Detalles de la Orden'
})

const headerDescription = computed(() => {
  if (purchase.value?.status === 'quotation') return 'Ingresa los precios unitarios para cada item'
  if (canShowInvoiceForm.value) return 'Registra la factura o remisión para esta orden'
  if (purchase.value?.status === 'invoiced') return 'Ingresa los datos de envío y tracking'
  return ''
})

const headerIcon = computed(() => {
  if (purchase.value?.status === 'quotation') return QuotationIcon
  if (canShowInvoiceForm.value) return InvoiceIcon
  if (purchase.value?.status === 'invoiced') return ShipIcon
  return null
})

const headerClass = computed(() => {
  if (purchase.value?.status === 'quotation') return 'bg-green-500/5 border-green-500/20'
  if (canShowInvoiceForm.value) return 'bg-orange-500/5 border-orange-500/20'
  if (purchase.value?.status === 'invoiced') return 'bg-blue-500/5 border-blue-500/20'
  return 'bg-surface'
})

const iconBgClass = computed(() => {
  if (purchase.value?.status === 'quotation') return 'bg-green-500/10'
  if (canShowInvoiceForm.value) return 'bg-orange-500/10'
  if (purchase.value?.status === 'invoiced') return 'bg-blue-500/10'
  return 'bg-surface-secondary'
})

const iconColorClass = computed(() => {
  if (purchase.value?.status === 'quotation') return 'text-green-500'
  if (canShowInvoiceForm.value) return 'text-orange-500'
  if (purchase.value?.status === 'invoiced') return 'text-blue-500'
  return 'text-text-secondary'
})

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    'quotation': 'bg-yellow-500/10 text-yellow-600',
    'pending': 'bg-blue-500/10 text-blue-600',
    'confirmed': 'bg-green-500/10 text-green-600',
    'preparing': 'bg-state-warning-bg text-state-warning-text',
    'invoiced': 'bg-orange-500/10 text-orange-600',
    'shipped': 'bg-cyan-500/10 text-cyan-600',
    'received': 'bg-emerald-500/10 text-emerald-600',
    'paid': 'bg-green-600/10 text-green-700'
  }
  return classes[status] || 'bg-surface-secondary text-text-secondary'
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    'quotation': 'Cotización',
    'pending': 'Pendiente',
    'confirmed': 'Confirmada',
    'preparing': 'En Preparación',
    'invoiced': 'Facturada',
    'shipped': 'Enviada',
    'received': 'Recibida',
    'paid': 'Pagada'
  }
  return texts[status] || status
}

function getActionHelpText(status: string): string {
  const texts: Record<string, string> = {
    'quotation': 'Completa los precios unitarios para cada producto y envía la cotización.',
    'confirmed': 'Registra la factura o remisión con los datos del documento fiscal.',
    'preparing': 'Una vez hayas generado la factura, regístrala aquí con los datos correspondientes.',
    'paid': 'Registra la factura o remisión ahora que el pago ha sido procesado.',
    'invoiced': 'Ingresa la información de envío y número de tracking para que el cliente pueda rastrear el pedido.'
  }
  return texts[status] || 'Completa la acción requerida para continuar con el proceso de la orden.'
}

async function loadPurchase() {
  loading.value = true
  error.value = null
  try {
    const response = await $fetch(`/api/supplier-portal/${token.value}/purchases`)
    const allPurchases = response.data
    purchase.value = allPurchases.find((p: any) => p.id === purchaseId.value)

    if (!purchase.value) {
      error.value = 'Orden de compra no encontrada'
    }
  } catch (err: any) {
    console.error('Error loading purchase:', err)
    error.value = err.data?.detail || err.message || 'Error al cargar la orden de compra'
  } finally {
    loading.value = false
  }
}

async function handleActionCompleted() {
  await navigateTo(`/proveedor/${token.value}/${purchaseId.value}?refresh=true`)
}

// Inject refresh handler setter from layout
const { setRefreshHandler } = useLayoutActions()

onMounted(() => {
  setRefreshHandler(loadPurchase)
  loadPurchase()
})
</script>

<style scoped>
/* Hide the form buttons since they're now in the summary card */
.form-without-buttons :deep(form > div:last-child) {
  display: none;
}
</style>
