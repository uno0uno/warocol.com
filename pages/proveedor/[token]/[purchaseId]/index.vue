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
        <button @click="navigateTo(`/proveedor/${token}`)"
          class="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
          Volver al listado
        </button>
      </div>
    </div>

    <!-- Purchase Details with Wizard -->
    <div v-else class="w-full">

      <!-- Header -->
      <PurchasesPurchaseOrderHeader>
        <!-- Purchase Number with Date -->
        <PurchasesPurchaseInfoCard :label="formatDate(purchase?.purchase_date)" :value="purchase?.purchase_number"
          :subtitle="purchase?.payment_type ? `Pago: ${getPaymentTypeText(purchase.payment_type)}` : undefined"
          icon-path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

        <!-- Items Count -->
        <PurchasesPurchaseInfoCard label="Items" :value="`${purchase?.items?.length || 0} producto(s)`"
          icon-path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />

        <!-- Status Badge -->
        <PurchasesPurchaseInfoCard label="Estado Actual" icon-path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">
          <span :class="getStatusBadgeClass(purchase?.status || '')">
            {{ getStatusText(purchase?.status || '') }}
          </span>
        </PurchasesPurchaseInfoCard>
      </PurchasesPurchaseOrderHeader>

      <!-- Wizard / Stepper -->
      <div class="p-6 bg-surface border-2 border-border rounded-lg mb-6">
        <h3 class="text-lg font-semibold text-text-primary mb-6 flex items-center space-x-2">
          <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Progreso de la Orden</span>
        </h3>

        <!-- Stepper - Dynamic based on payment type -->
        <div class="flex items-center justify-between overflow-x-auto pb-4 sm:pb-0 min-w-full">
          <template v-for="(step, index) in stepOrder" :key="step">
            <!-- Step -->
            <div class="flex items-center min-w-[100px] sm:min-w-0" :class="index < stepOrder.length - 1 ? 'flex-1' : ''">
              <div class="flex flex-col items-center">
                <div :class="[
                  'flex items-center justify-center w-10 h-10 rounded-full transition-colors border-2',
                  getStepIndex(step) === currentStepIndex
                    ? 'bg-primary text-primary-foreground border-primary'
                    : getStepIndex(step) < currentStepIndex
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'border-border text-text-secondary bg-surface'
                ]">
                  <svg v-if="getStepIndex(step) < currentStepIndex" class="w-6 h-6" fill="currentColor"
                    viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd" />
                  </svg>
                  <span v-else class="text-xs font-semibold">{{ index + 1 }}</span>
                </div>
                <p class="text-xs font-medium mt-2"
                  :class="getStepIndex(step) <= currentStepIndex ? 'text-text-primary' : 'text-text-secondary'">
                  {{ stepLabels[step] }}
                </p>
              </div>
              <!-- Connector line (not for last step) -->
              <div v-if="index < stepOrder.length - 1" class="flex-1 h-1 mx-4"
                :class="getStepIndex(stepOrder[index + 1]) <= currentStepIndex ? 'bg-secondary' : 'bg-border'"></div>
            </div>
          </template>
        </div>

        <!-- Current Step Details -->
        <div class="mt-8 p-6 bg-background rounded-lg border-2 border-border">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div class="flex-1">
              <p class="text-sm text-text-secondary mb-1">Estado Actual</p>
              <p class="text-xl font-bold text-text-primary">{{ getStatusText(purchase?.status || '') }}</p>
              <p class="text-sm text-text-secondary mt-2">{{ getStepDescription(purchase?.status || '') }}</p>
            </div>

            <!-- Action Button (only for supplier steps) -->
            <div v-if="isSupplierStep(purchase?.status || '')" class="w-full sm:w-auto">
              <!-- Complete Prices (quotation) -->
              <!-- Complete Prices (quotation) -->
              <NuxtLink v-if="purchase?.status === 'quotation'" 
                :to="`/proveedor/${token}/${purchaseId}/acciones`"
                class="btn-primary px-6 py-3 rounded-lg text-base font-semibold flex items-center justify-center space-x-2 w-full sm:w-auto">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Completar Precios</span>
              </NuxtLink>

              <!-- Register Invoice (confirmed/preparing/paid) -->
              <NuxtLink v-else-if="canShowInvoiceButton" 
                :to="`/proveedor/${token}/${purchaseId}/acciones`"
                class="btn-secondary px-6 py-3 rounded-lg text-base font-semibold flex items-center justify-center space-x-2 w-full sm:w-auto">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Registrar Factura</span>
              </NuxtLink>

              <!-- Mark as Shipped (only when invoiced, not shipped/received) -->
              <NuxtLink v-else-if="purchase?.status === 'invoiced'" 
                :to="`/proveedor/${token}/${purchaseId}/acciones`"
                class="btn-secondary px-6 py-3 rounded-lg text-base font-semibold flex items-center justify-center space-x-2 w-full sm:w-auto">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Marcar como Enviado</span>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Purchase Summary -->
      <div class="bg-surface border-2 border-border rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-text-primary mb-6 flex items-center space-x-2">
          <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Resumen de la Orden</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p class="text-sm text-text-secondary mb-1">Fecha de Orden</p>
            <p class="text-base font-medium text-text-primary">{{ formatDate(purchase?.purchase_date) }}</p>
          </div>
          <div>
            <p class="text-sm text-text-secondary mb-1">Fecha de Entrega</p>
            <p class="text-base font-medium text-text-primary">{{ formatDate(purchase?.delivery_date) }}</p>
          </div>
        </div>

        <!-- Observaciones -->
        <div v-if="purchase?.notes" class="mt-6">
          <h4 class="font-medium text-text-primary mb-2">Observaciones</h4>
          <p class="text-sm text-text-secondary bg-background p-4 rounded-lg border border-border">
            {{ purchase.notes }}
          </p>
        </div>

        <!-- Items Table -->
        <div class="mt-6">
          <h4 class="font-medium text-text-primary mb-4">Items</h4>
          <div class="overflow-x-auto">
            <table class="w-full border-2 border-border rounded-lg">
              <thead class="bg-surface-secondary">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                    Ingrediente
                  </th>
                  <th
                    class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                    Cantidad
                  </th>
                  <th v-if="purchase?.status !== 'quotation'"
                    class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                    Precio Unitario
                  </th>
                  <th v-if="purchase?.status !== 'quotation'"
                    class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody class="bg-surface divide-y divide-border">
                <tr v-for="item in purchase?.items" :key="item.id"
                  class="hover:bg-surface-secondary/50 transition-colors">
                  <td class="px-4 py-3 text-sm text-text-primary">
                    <div>
                      <p class="font-medium">{{ item.ingredient_name }}</p>
                      <p v-if="item.notes" class="text-xs text-text-secondary mt-1">{{ item.notes }}</p>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm text-text-primary text-right font-medium whitespace-nowrap">
                    {{ item.quantity }} {{ item.unit }}
                  </td>
                  <td v-if="purchase?.status !== 'quotation'"
                    class="px-4 py-3 text-sm text-text-primary text-right whitespace-nowrap">
                    {{ formatCurrency(item.unit_cost) }}
                  </td>
                  <td v-if="purchase?.status !== 'quotation'"
                    class="px-4 py-3 text-sm font-bold text-text-primary text-right whitespace-nowrap">
                    {{ formatCurrency(item.total_cost) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totals Summary -->
        <div v-if="purchase?.status !== 'quotation'" class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <!-- Subtotal Card -->
          <div class="border-2 border-border rounded-lg p-4 bg-surface">
            <p class="text-sm text-text-secondary mb-2">Subtotal</p>
            <p class="text-xl font-semibold text-text-primary">
              {{ formatCurrency(purchase?.total_amount || 0) }}
            </p>
          </div>

          <!-- IVA Card -->
          <div class="border-2 border-border rounded-lg p-4 bg-surface">
            <p class="text-sm text-text-secondary mb-2">IVA</p>
            <p class="text-xl font-semibold text-text-primary">
              {{ formatCurrency(purchase?.tax_amount || 0) }}
            </p>
          </div>

          <!-- Total Card -->
          <div class="border-2 border-border rounded-lg p-4 bg-surface">
            <p class="text-sm text-text-secondary mb-2">Total</p>
            <p class="text-2xl font-bold text-primary">
              {{ formatCurrency((purchase?.total_amount || 0) + (purchase?.tax_amount || 0)) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Status History Timeline -->
      <PurchasesStatusHistoryTimeline :purchase-id="purchaseId" :current-status="purchase?.status"
        :base-transition-url="`/proveedor/${token}/${purchaseId}/transicion`" />
    </div>

    <!-- Modals -->
    <!-- Modals removed in favor of actions page -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'supplier-portal'
})

const route = useRoute()
const token = computed(() => route.params.token as string)
const purchaseId = computed(() => route.params.purchaseId as string)

console.log('Purchase page loaded:', { token: token.value, purchaseId: purchaseId.value })

const loading = ref(true)
const error = ref<string | null>(null)
const purchase = ref<any>(null)

// Use global state for supplier (shared with layout)
const supplier = useState<any>('supplier-portal-supplier', () => null)

// Step labels for wizard
const stepLabels: Record<string, string> = {
  quotation: 'Cotización',
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  paid: 'Pagado',
  invoiced: 'Facturado',
  shipped: 'Enviado',
  received: 'Recibido y Verificado'
}

// Wizard step mapping - order changes based on payment type
const stepOrder = computed(() => {
  const paymentType = purchase.value?.payment_type

  // For "contado" payment type, payment comes before invoicing
  if (paymentType === 'contado') {
    return ['quotation', 'pending', 'confirmed', 'paid', 'invoiced', 'shipped', 'received']
  }

  // For credit and other payment types, payment comes after reception
  return ['quotation', 'pending', 'confirmed', 'invoiced', 'shipped', 'received', 'paid']
})

function getStepIndex(status: string): number {
  if (status === 'preparing') return stepOrder.value.indexOf('confirmed')
  return stepOrder.value.indexOf(status)
}

const currentStepIndex = computed(() => {
  return getStepIndex(purchase.value?.status || 'quotation')
})

// Control when the invoice button should be shown
// For "contado" payment type, payment must be made before invoicing
const canShowInvoiceButton = computed(() => {
  const status = purchase.value?.status
  const paymentType = purchase.value?.payment_type

  // For "contado" payment type, require payment first
  if (paymentType === 'contado') {
    return status === 'paid'
  }

  // For other payment types (credito, contraentrega, etc.), allow invoicing after confirmation
  return status === 'confirmed' || status === 'preparing'
})

function getProgressWidth(): number {
  const totalSteps = stepOrder.value.length
  const currentStep = currentStepIndex.value
  return (currentStep / (totalSteps - 1)) * 100
}

function isSupplierStep(status: string): boolean {
  const paymentType = purchase.value?.payment_type
  const baseSupplierSteps = ['quotation', 'confirmed', 'preparing', 'invoiced']

  // For "contado" payment type, also include 'paid' status as a supplier step
  // because they need to invoice after payment
  if (paymentType === 'contado' && status === 'paid') {
    return true
  }

  return baseSupplierSteps.includes(status)
}

function getStepDescription(status: string): string {
  const paymentType = purchase.value?.payment_type

  const descriptions: Record<string, string> = {
    quotation: 'Completa los precios de los productos solicitados para enviar la cotización',
    pending: 'Esperando que el cliente apruebe tu cotización',
    confirmed: paymentType === 'contado'
      ? 'Cotización aprobada. Esperando pago del cliente antes de poder facturar'
      : 'Cotización aprobada. Registra la factura o remisión para continuar con el envío',
    preparing: paymentType === 'contado'
      ? 'Cotización aprobada. Esperando pago del cliente antes de poder facturar'
      : 'Cotización aprobada. Registra la factura o remisión para continuar con el envío',
    paid: paymentType === 'contado'
      ? 'Pago recibido. Ahora puedes registrar la factura o remisión'
      : '¡Orden completada exitosamente! El pago ha sido procesado',
    invoiced: 'Factura registrada. Marca la orden como enviada con el número de tracking',
    shipped: 'Orden enviada. Esperando confirmación de recepción y verificación por parte del cliente',
    partially_received: 'Orden parcialmente recibida. Esperando recepción completa por parte del cliente',
    received: paymentType === 'contado'
      ? '¡Orden completada! Producto recibido, verificado y pagado exitosamente'
      : 'Orden recibida y verificada. Esperando pago por parte del cliente'
  }
  return descriptions[status] || ''
}

// Use composables for formatters and status
const { formatDate, formatCurrency } = useFormatters()
const { getStatusText, getPaymentTypeText } = usePurchaseStatus()

function getStatusBadgeClass(status: string): string {
  const baseClasses = 'px-3 py-1 text-sm font-medium rounded border-2'
  const statusClasses: Record<string, string> = {
    quotation: 'border-accent text-accent',
    pending: 'border-warning text-warning',
    confirmed: 'border-success text-success',
    preparing: 'border-blue-500 text-blue-500',
    shipped: 'border-blue-600 text-blue-600',
    received: 'border-success text-success',
    invoiced: 'border-orange-500 text-orange-500',
    paid: 'border-success text-success',
    cancelled: 'border-destructive text-destructive'
  }
  return `${baseClasses} ${statusClasses[status] || 'border-border text-text-secondary'}`
}

async function loadPurchase() {
  try {
    console.log('[PurchaseDetail] Fetching purchases from API...')
    const response = await $fetch(`/api/supplier-portal/${token.value}/purchases`)
    console.log('[PurchaseDetail] API Response:', response)

    const allPurchases = response.data
    console.log('[PurchaseDetail] All purchases:', allPurchases)
    console.log('[PurchaseDetail] Looking for purchase ID:', purchaseId.value)

    purchase.value = allPurchases.find((p: any) => p.id === purchaseId.value)
    console.log('[PurchaseDetail] Found purchase:', purchase.value)

    if (!purchase.value) {
      console.error('[PurchaseDetail] Purchase not found in list')
      error.value = 'Orden de compra no encontrada'
    }
  } catch (err: any) {
    console.error('[PurchaseDetail] Error loading purchase:', err)
    error.value = err.data?.detail || err.message || 'Error al cargar la orden de compra'
  }
}

// Refresh function
const refresh = async () => {
  loading.value = true
  await loadPurchase()
  loading.value = false
}

// Inject refresh handler setter from layout
const setRefreshHandler = inject('setRefreshHandler', () => { })



onMounted(async () => {
  // Register refresh handler for header and mobile bottom nav
  setRefreshHandler(refresh)

  console.log('[PurchaseDetail] Component mounted')
  console.log('[PurchaseDetail] Token:', token.value)
  console.log('[PurchaseDetail] Purchase ID:', purchaseId.value)

  try {
    // Supplier is loaded by middleware
    // Check if supplier is available (middleware might have failed)
    if (!supplier.value) {
      error.value = 'No se pudo verificar el acceso'
      loading.value = false
      return
    }

    console.log('[PurchaseDetail] Loading purchase...')
    await loadPurchase()
    console.log('[PurchaseDetail] Purchase loaded:', purchase.value)

    loading.value = false
  } catch (err: any) {
    console.error('[PurchaseDetail] Error:', err)
    error.value = err.data?.detail || err.message || 'Error al cargar la orden'
    loading.value = false
  }
})
</script>
