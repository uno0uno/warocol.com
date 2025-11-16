<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[60vh]">
      <div class="max-w-md p-6 bg-surface border border-border rounded-lg text-center">
        <svg class="w-16 h-16 mx-auto text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="mt-4 text-xl font-bold text-text-primary">Error</h2>
        <p class="mt-2 text-text-secondary">{{ error }}</p>
        <button
          @click="navigateTo(`/proveedor/${token}`)"
          class="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Volver al listado
        </button>
      </div>
    </div>

    <!-- Purchase Details with Wizard -->
    <div v-else class="container mx-auto px-4 py-8 max-w-6xl">
      <!-- Back Button -->
      <button
        @click="navigateTo(`/proveedor/${token}`)"
        class="mb-6 flex items-center space-x-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Volver al listado</span>
      </button>

      <!-- Header -->
      <div class="bg-surface border-2 border-border rounded-lg p-6 mb-6">
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
          <!-- Purchase Number with Date -->
          <div class="flex items-start space-x-3">
            <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
              <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                {{ formatDate(purchase?.purchase_date) }}
              </p>
              <p class="text-lg font-semibold text-text-primary">
                {{ purchase?.purchase_number }}
              </p>
            </div>
          </div>

          <!-- Items Count -->
          <div class="flex items-start space-x-3">
            <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
              <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Items
              </p>
              <p class="text-lg font-semibold text-text-primary">
                {{ purchase?.items?.length || 0 }} producto(s)
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
                <span :class="getStatusBadgeClass(purchase?.status || '')">
                  {{ getStatusText(purchase?.status || '') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Conditions -->
      <div v-if="purchase?.payment_type" class="bg-surface border-2 border-border rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
          <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Condiciones de Pago</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Payment Type -->
          <div class="p-4 bg-background rounded-lg border border-border">
            <p class="text-xs text-text-secondary mb-1">Tipo de Pago</p>
            <p class="text-base font-semibold text-text-primary">
              {{ getPaymentTypeText(purchase.payment_type) }}
            </p>
          </div>

          <!-- Credit Days (if applicable) -->
          <div v-if="purchase.credit_days" class="p-4 bg-background rounded-lg border border-border">
            <p class="text-xs text-text-secondary mb-1">Plazo de Crédito</p>
            <p class="text-base font-semibold text-text-primary">
              {{ purchase.credit_days }} días
            </p>
          </div>

          <!-- Payment Due Date (if available) -->
          <div v-if="purchase.payment_due_date" class="p-4 bg-background rounded-lg border border-border">
            <p class="text-xs text-text-secondary mb-1">Fecha de Vencimiento</p>
            <p class="text-base font-semibold text-text-primary">
              {{ formatDate(purchase.payment_due_date) }}
            </p>
          </div>

          <!-- Consolidation Group (if applicable) -->
          <div v-if="purchase.consolidation_group" class="p-4 bg-background rounded-lg border border-border">
            <p class="text-xs text-text-secondary mb-1">Grupo de Consolidación</p>
            <p class="text-base font-semibold text-text-primary">
              {{ purchase.consolidation_group }}
            </p>
          </div>

          <!-- Payment Balance (if status is invoiced or later) -->
          <div v-if="purchase.payment_balance !== null && purchase.payment_balance !== undefined && ['invoiced', 'shipped', 'received', 'verified', 'paid'].includes(purchase.status)" class="p-4 bg-background rounded-lg border border-border">
            <p class="text-xs text-text-secondary mb-1">Saldo Pendiente</p>
            <p class="text-base font-semibold" :class="purchase.payment_balance > 0 ? 'text-warning' : 'text-success'">
              {{ formatCurrency(purchase.payment_balance) }}
            </p>
          </div>
        </div>

        <!-- Payment Terms (if available) -->
        <div v-if="purchase.payment_terms" class="mt-4 p-4 bg-background rounded-lg border border-border">
          <p class="text-xs text-text-secondary mb-2">Términos de Pago</p>
          <p class="text-sm text-text-primary">{{ purchase.payment_terms }}</p>
        </div>

        <!-- Advance Payment Notice -->
        <div v-if="purchase.requires_advance_payment" class="mt-4 p-4 bg-warning/10 rounded-lg border border-warning">
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-sm font-medium text-warning">
              Esta orden requiere anticipo antes del envío
            </p>
          </div>
        </div>
      </div>

      <!-- Wizard / Stepper -->
      <div class="p-6 bg-surface border-2 border-border rounded-lg mb-6">
        <h3 class="text-lg font-semibold text-text-primary mb-6 flex items-center space-x-2">
          <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Progreso de la Orden</span>
        </h3>

        <!-- Stepper - Dynamic based on payment type -->
        <div class="flex items-center justify-between">
          <template v-for="(step, index) in stepOrder" :key="step">
            <!-- Step -->
            <div class="flex items-center" :class="index < stepOrder.length - 1 ? 'flex-1' : ''">
              <div class="flex flex-col items-center">
                <div
                  :class="[
                    'flex items-center justify-center w-10 h-10 rounded-full transition-colors border-2',
                    getStepIndex(step) === currentStepIndex
                      ? 'bg-primary text-primary-foreground border-primary'
                      : getStepIndex(step) < currentStepIndex
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'border-border text-text-secondary bg-surface'
                  ]"
                >
                  <svg v-if="getStepIndex(step) < currentStepIndex" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span v-else class="text-xs font-semibold">{{ index + 1 }}</span>
                </div>
                <p class="text-xs font-medium mt-2" :class="getStepIndex(step) <= currentStepIndex ? 'text-text-primary' : 'text-text-secondary'">
                  {{ stepLabels[step] }}
                </p>
              </div>
              <!-- Connector line (not for last step) -->
              <div v-if="index < stepOrder.length - 1" class="flex-1 h-1 mx-4" :class="getStepIndex(stepOrder[index + 1]) <= currentStepIndex ? 'bg-secondary' : 'bg-border'"></div>
            </div>
          </template>
        </div>

        <!-- Current Step Details -->
        <div class="mt-8 p-6 bg-background rounded-lg border-2 border-border">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <p class="text-sm text-text-secondary mb-1">Estado Actual</p>
              <p class="text-xl font-bold text-text-primary">{{ getStatusText(purchase?.status || '') }}</p>
              <p class="text-sm text-text-secondary mt-2">{{ getStepDescription(purchase?.status || '') }}</p>
            </div>

            <!-- Action Button (only for supplier steps) -->
            <div v-if="isSupplierStep(purchase?.status || '')">
              <button
                v-if="purchase?.status === 'quotation'"
                @click="showCompletePricesModal = true"
                class="btn-primary px-6 py-3 rounded-lg text-base font-semibold flex items-center space-x-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Completar Precios</span>
              </button>
              <button
                v-else-if="canShowInvoiceButton"
                @click="showInvoiceModal = true"
                class="btn-secondary px-6 py-3 rounded-lg text-base font-semibold flex items-center space-x-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Registrar Factura</span>
              </button>
              <button
                v-else-if="purchase?.status === 'invoiced'"
                @click="showShipModal = true"
                class="btn-secondary px-6 py-3 rounded-lg text-base font-semibold flex items-center space-x-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Marcar como Enviado</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Purchase Summary -->
      <div class="bg-surface border-2 border-border rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-text-primary mb-6 flex items-center space-x-2">
          <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
                  <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                    Ingrediente
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                    Cantidad
                  </th>
                  <th v-if="purchase?.status !== 'quotation'" class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                    Precio Unitario
                  </th>
                  <th v-if="purchase?.status !== 'quotation'" class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody class="bg-surface divide-y divide-border">
                <tr
                  v-for="item in purchase?.items"
                  :key="item.id"
                  class="hover:bg-surface-secondary/50 transition-colors"
                >
                  <td class="px-4 py-3 text-sm text-text-primary">
                    <div>
                      <p class="font-medium">{{ item.ingredient_name }}</p>
                      <p v-if="item.notes" class="text-xs text-text-secondary mt-1">{{ item.notes }}</p>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm text-text-primary text-right font-medium whitespace-nowrap">
                    {{ item.quantity }} {{ item.unit }}
                  </td>
                  <td v-if="purchase?.status !== 'quotation'" class="px-4 py-3 text-sm text-text-primary text-right whitespace-nowrap">
                    {{ formatCurrency(item.unit_cost) }}
                  </td>
                  <td v-if="purchase?.status !== 'quotation'" class="px-4 py-3 text-sm font-bold text-text-primary text-right whitespace-nowrap">
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
    </div>

    <!-- Modals -->
    <CompletePricesModalSupplier
      :is-open="showCompletePricesModal"
      :purchase="purchase"
      :token="token"
      @close="showCompletePricesModal = false"
      @completed="handleActionCompleted"
    />

    <InvoicePurchaseModalSupplier
      :is-open="showInvoiceModal"
      :purchase="purchase"
      :token="token"
      @close="showInvoiceModal = false"
      @invoiced="handleActionCompleted"
    />

    <ShipPurchaseModalSupplier
      :is-open="showShipModal"
      :purchase="purchase"
      :token="token"
      @close="showShipModal = false"
      @shipped="handleActionCompleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CompletePricesModalSupplier from '~/components/purchases/CompletePricesModalSupplier.vue'
import InvoicePurchaseModalSupplier from '~/components/purchases/InvoicePurchaseModalSupplier.vue'
import ShipPurchaseModalSupplier from '~/components/purchases/ShipPurchaseModalSupplier.vue'

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
const showCompletePricesModal = ref(false)
const showInvoiceModal = ref(false)
const showShipModal = ref(false)

// Step labels for wizard
const stepLabels: Record<string, string> = {
  quotation: 'Cotización',
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  paid: 'Pagado',
  invoiced: 'Facturado',
  shipped: 'Enviado',
  received: 'Recibido',
  verified: 'Verificado'
}

// Wizard step mapping - order changes based on payment type
const stepOrder = computed(() => {
  const paymentType = purchase.value?.payment_type

  // For "contado" payment type, payment comes before invoicing
  if (paymentType === 'contado') {
    return ['quotation', 'pending', 'confirmed', 'paid', 'invoiced', 'shipped', 'received', 'verified']
  }

  // For credit and other payment types, payment comes at the end
  return ['quotation', 'pending', 'confirmed', 'invoiced', 'shipped', 'received', 'verified', 'paid']
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
    shipped: 'Orden enviada. Esperando confirmación de recepción por parte del cliente',
    received: 'Orden recibida. Esperando verificación de calidad por parte del cliente',
    verified: 'Orden verificada y aprobada. Esperando pago por parte del cliente'
  }
  return descriptions[status] || ''
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    quotation: 'Cotización',
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    preparing: 'En Preparación',
    shipped: 'Enviado',
    received: 'Recibido',
    verified: 'Verificado',
    invoiced: 'Facturado',
    paid: 'Pagado',
    cancelled: 'Cancelado'
  }
  return statusMap[status] || status
}

function getStatusBadgeClass(status: string): string {
  const baseClasses = 'px-3 py-1 text-sm font-medium rounded border-2'
  const statusClasses: Record<string, string> = {
    quotation: 'border-accent text-accent',
    pending: 'border-warning text-warning',
    confirmed: 'border-success text-success',
    preparing: 'border-blue-500 text-blue-500',
    shipped: 'border-blue-600 text-blue-600',
    received: 'border-purple-500 text-purple-500',
    verified: 'border-indigo-500 text-indigo-500',
    invoiced: 'border-orange-500 text-orange-500',
    paid: 'border-success text-success',
    cancelled: 'border-destructive text-destructive'
  }
  return `${baseClasses} ${statusClasses[status] || 'border-border text-text-secondary'}`
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'No especificada'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '$0'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

function getPaymentTypeText(paymentType: string | null): string {
  if (!paymentType) return 'No especificado'

  const types: Record<string, string> = {
    'contado': 'Contado',
    'credito': 'Crédito',
    'contraentrega': 'Contraentrega',
    'credito_consolidado': 'Crédito Consolidado'
  }
  return types[paymentType] || paymentType
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

async function handleActionCompleted() {
  showCompletePricesModal.value = false
  showInvoiceModal.value = false
  showShipModal.value = false

  // Reload purchase to get updated status
  await loadPurchase()
}

onMounted(async () => {
  console.log('[PurchaseDetail] Component mounted')
  console.log('[PurchaseDetail] Token:', token.value)
  console.log('[PurchaseDetail] Purchase ID:', purchaseId.value)

  try {
    console.log('[PurchaseDetail] Verifying token...')
    const verifyResponse = await $fetch(`/api/supplier-portal/${token.value}/verify`)
    console.log('[PurchaseDetail] Token verified:', verifyResponse)

    console.log('[PurchaseDetail] Loading purchases...')
    await loadPurchase()
    console.log('[PurchaseDetail] Purchase loaded:', purchase.value)

    loading.value = false
  } catch (err: any) {
    console.error('[PurchaseDetail] Error:', err)
    error.value = err.data?.detail || err.message || 'No se pudo verificar el acceso'
    loading.value = false
  }
})
</script>
