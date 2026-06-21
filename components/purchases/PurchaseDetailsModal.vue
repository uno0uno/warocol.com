<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="closeModal"
    ></div>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-4xl bg-surface rounded-xl shadow-2xl border-2 border-border">
        <!-- Header -->
        <div class="border-b-2 border-border p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-accent/10 p-3 rounded-lg">
                <svg class="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">{{ purchase?.purchase_number }}</h2>
                <span :class="getStatusBadgeClass(purchase?.status || '')">
                  {{ getStatusText(purchase?.status || '') }}
                </span>
              </div>
            </div>
            <button
              @click="closeModal"
              class="text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6">
          <!-- Wizard / Stepper -->
          <div class="p-6 bg-background border-2 border-border rounded-lg">
            <h3 class="text-lg font-semibold text-text-primary mb-6">Progreso de la Orden</h3>

            <!-- Stepper -->
            <div class="relative">
              <!-- Progress Line -->
              <div class="absolute top-5 left-0 right-0 h-1 bg-border" style="z-index: 0;"></div>
              <div
                class="absolute top-5 left-0 h-1 bg-primary transition-all duration-500"
                :style="{ width: getProgressWidth() + '%', zIndex: 0 }"
              ></div>

              <!-- Steps -->
              <div class="relative flex justify-between" style="z-index: 1;">
                <!-- Step 1: Cotización -->
                <div class="flex flex-col items-center" style="width: 12.5%;">
                  <div
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      getStepIndex('quotation') <= currentStepIndex
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface border-border text-text-secondary'
                    ]"
                  >
                    <svg v-if="getStepIndex('quotation') < currentStepIndex" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span v-else class="text-sm font-bold">1</span>
                  </div>
                  <p class="text-xs text-center mt-2 text-text-secondary">Cotización</p>
                </div>

                <!-- Step 2: Pendiente -->
                <div class="flex flex-col items-center" style="width: 12.5%;">
                  <div
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      getStepIndex('pending') <= currentStepIndex
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface border-border text-text-secondary'
                    ]"
                  >
                    <svg v-if="getStepIndex('pending') < currentStepIndex" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span v-else class="text-sm font-bold">2</span>
                  </div>
                  <p class="text-xs text-center mt-2 text-text-secondary">Pendiente</p>
                </div>

                <!-- Step 3: Confirmado -->
                <div class="flex flex-col items-center" style="width: 12.5%;">
                  <div
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      getStepIndex('confirmed') <= currentStepIndex
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface border-border text-text-secondary'
                    ]"
                  >
                    <svg v-if="getStepIndex('confirmed') < currentStepIndex" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span v-else class="text-sm font-bold">3</span>
                  </div>
                  <p class="text-xs text-center mt-2 text-text-secondary">Confirmado</p>
                </div>

                <!-- Step 4: Facturado -->
                <div class="flex flex-col items-center" style="width: 12.5%;">
                  <div
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      getStepIndex('invoiced') <= currentStepIndex
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface border-border text-text-secondary'
                    ]"
                  >
                    <svg v-if="getStepIndex('invoiced') < currentStepIndex" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span v-else class="text-sm font-bold">4</span>
                  </div>
                  <p class="text-xs text-center mt-2 text-text-secondary">Facturado</p>
                </div>

                <!-- Step 5: Enviado -->
                <div class="flex flex-col items-center" style="width: 12.5%;">
                  <div
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      getStepIndex('shipped') <= currentStepIndex
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface border-border text-text-secondary'
                    ]"
                  >
                    <svg v-if="getStepIndex('shipped') < currentStepIndex" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span v-else class="text-sm font-bold">5</span>
                  </div>
                  <p class="text-xs text-center mt-2 text-text-secondary">Enviado</p>
                </div>

                <!-- Step 6: Recibido -->
                <div class="flex flex-col items-center" style="width: 12.5%;">
                  <div
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      getStepIndex('received') <= currentStepIndex
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface border-border text-text-secondary'
                    ]"
                  >
                    <svg v-if="getStepIndex('received') < currentStepIndex" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span v-else class="text-sm font-bold">6</span>
                  </div>
                  <p class="text-xs text-center mt-2 text-text-secondary">Recibido</p>
                </div>

                <!-- Step 7: Verificado -->
                <div class="flex flex-col items-center" style="width: 12.5%;">
                  <div
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      getStepIndex('verified') <= currentStepIndex
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface border-border text-text-secondary'
                    ]"
                  >
                    <svg v-if="getStepIndex('verified') < currentStepIndex" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span v-else class="text-sm font-bold">7</span>
                  </div>
                  <p class="text-xs text-center mt-2 text-text-secondary">Verificado</p>
                </div>

                <!-- Step 8: Pagado -->
                <div class="flex flex-col items-center" style="width: 12.5%;">
                  <div
                    :class="[
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                      getStepIndex('paid') <= currentStepIndex
                        ? 'bg-success border-success text-white'
                        : 'bg-surface border-border text-text-secondary'
                    ]"
                  >
                    <svg v-if="getStepIndex('paid') <= currentStepIndex" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span v-else class="text-sm font-bold">8</span>
                  </div>
                  <p class="text-xs text-center mt-2 text-text-secondary">Pagado</p>
                </div>
              </div>
            </div>

            <!-- Current Step Details -->
            <div class="mt-8 p-4 bg-surface rounded-lg border-2 border-border">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-text-secondary mb-1">Estado Actual</p>
                  <p class="text-lg font-bold text-text-primary">{{ getStatusText(purchase?.status || '') }}</p>
                  <p class="text-sm text-text-secondary mt-2">{{ getStepDescription(purchase?.status || '') }}</p>
                </div>

                <!-- Action Button (only for supplier steps) -->
                <div v-if="isSupplierStep(purchase?.status || '')">
                  <button
                    v-if="purchase?.status === 'quotation'"
                    @click="handleCompletePrices"
                    class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Completar Precios
                  </button>
                  <button
                    v-else-if="purchase?.status === 'confirmed' || purchase?.status === 'preparing'"
                    @click="handleInvoicePurchase"
                    class="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Registrar Factura
                  </button>
                  <button
                    v-else-if="purchase?.status === 'invoiced'"
                    @click="handleShipPurchase"
                    class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Marcar como Enviado
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Purchase Summary -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-background border-2 border-border rounded-lg">
            <div>
              <p class="text-sm text-text-secondary">Fecha de Orden</p>
              <p class="text-base font-medium text-text-primary">{{ formatDate(purchase?.purchase_date) }}</p>
            </div>
            <div>
              <p class="text-sm text-text-secondary">Fecha de Entrega</p>
              <p class="text-base font-medium text-text-primary">{{ formatDate(purchase?.delivery_date) }}</p>
            </div>
            <div>
              <p class="text-sm text-text-secondary">Número de Items</p>
              <p class="text-base font-medium text-text-primary">{{ purchase?.items?.length || 0 }} producto(s)</p>
            </div>
            <div v-if="purchase?.status !== 'quotation'">
              <p class="text-sm text-text-secondary">Total</p>
              <p class="text-lg font-bold text-text-primary">
                {{ formatCurrency((purchase?.total_amount || 0) + (purchase?.tax_amount || 0)) }}
              </p>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="purchase?.notes" class="p-4 bg-surface-secondary rounded-lg">
            <p class="text-sm font-medium text-text-secondary mb-2">Notas de la Orden:</p>
            <p class="text-base text-text-primary">{{ purchase.notes }}</p>
          </div>

          <!-- Items List -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-3">Productos Solicitados</h3>
            <div class="space-y-2">
              <div
                v-for="item in purchase?.items"
                :key="item.id"
                class="flex items-center justify-between p-4 bg-surface-secondary rounded-lg"
              >
                <div class="flex-1">
                  <p class="font-medium text-text-primary">{{ item.ingredient_name }}</p>
                  <p class="text-sm text-text-secondary">
                    Cantidad: {{ formatQuantity(item.quantity) }} {{ item.unit }}
                  </p>
                  <p v-if="item.notes" class="text-xs text-text-secondary mt-1">
                    Nota: {{ item.notes }}
                  </p>
                </div>
                <div v-if="purchase?.status !== 'quotation'" class="text-right">
                  <p class="font-semibold text-text-primary">{{ formatCurrency(item.total_cost) }}</p>
                  <p class="text-xs text-text-secondary">{{ formatCurrency(item.unit_cost) }} / {{ item.unit }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Totals (if not quotation) -->
          <div v-if="purchase?.status !== 'quotation'" class="border-t-2 border-border pt-4">
            <div class="flex justify-end">
              <div class="w-full md:w-1/2 space-y-2">
                <div class="flex justify-between text-text-primary">
                  <span>Subtotal:</span>
                  <span class="font-medium">{{ formatCurrency(purchase?.total_amount || 0) }}</span>
                </div>
                <div class="flex justify-between text-text-primary">
                  <span>IVA:</span>
                  <span class="font-medium">{{ formatCurrency(purchase?.tax_amount || 0) }}</span>
                </div>
                <div class="flex justify-between text-lg font-bold text-text-primary border-t-2 border-border pt-2">
                  <span>Total:</span>
                  <span>{{ formatCurrency((purchase?.total_amount || 0) + (purchase?.tax_amount || 0)) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t-2 border-border p-6">
          <div class="flex justify-end">
            <button
              @click="closeModal"
              class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'

const props = defineProps<{
  isOpen: boolean
  purchase: any
}>()

const emit = defineEmits<{
  close: []
  completePrices: [purchase: any]
  invoicePurchase: [purchase: any]
  shipPurchase: [purchase: any]
}>()

// Wizard step mapping
const stepOrder = ['quotation', 'pending', 'confirmed', 'invoiced', 'shipped', 'received', 'verified', 'paid']

function getStepIndex(status: string): number {
  // Handle 'preparing' as same as 'confirmed'
  if (status === 'preparing') return stepOrder.indexOf('confirmed')
  return stepOrder.indexOf(status)
}

const currentStepIndex = computed(() => {
  return getStepIndex(props.purchase?.status || 'quotation')
})

function getProgressWidth(): number {
  const totalSteps = stepOrder.length
  const currentStep = currentStepIndex.value
  return (currentStep / (totalSteps - 1)) * 100
}

function isSupplierStep(status: string): boolean {
  // Supplier is responsible for: quotation, confirmed/preparing, invoiced
  return ['quotation', 'confirmed', 'preparing', 'invoiced'].includes(status)
}

function getStepDescription(status: string): string {
  const descriptions: Record<string, string> = {
    quotation: 'Completa los precios de los productos solicitados',
    pending: 'Esperando aprobación interna de la orden',
    confirmed: 'Registra la factura o remisión para continuar',
    preparing: 'Registra la factura o remisión para continuar',
    invoiced: 'Marca la orden como enviada con número de tracking',
    shipped: 'Esperando confirmación de recepción por parte del cliente',
    received: 'Esperando verificación de calidad por parte del cliente',
    verified: 'Esperando pago por parte del cliente',
    paid: '¡Orden completada exitosamente!'
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
    // 📋 Pre-compra (Gris - Neutral)
    quotation: 'border-muted-foreground text-muted-foreground',
    // ⏳ Requiere acción (Amarillo/Naranja - Atención)
    pending: 'border-warning text-warning',
    // ✅ Confirmada (Primario - Importante pero en proceso)
    confirmed: 'border-primary text-primary',
    // 🔄 En preparación/tránsito (Azul - Informativo)
    preparing: 'border-info text-info',
    shipped: 'border-info text-info',
    // 📦 Recibida/Verificada (Verde - Éxito)
    received: 'border-success text-success',
    verified: 'border-success text-success',
    // 📄 Facturada (Gris - Neutral, esperando pago)
    invoiced: 'border-muted-foreground text-muted-foreground',
    // 💰 Pagada (Verde - Completado)
    paid: 'border-success text-success',
    // ❌ Problemas (Rojo - Destructivo)
    cancelled: 'border-destructive text-destructive',
    overdue: 'border-destructive text-destructive'
  }
  return `${baseClasses} ${statusClasses[status] || 'border-border text-text-secondary'}`
}

const { formatDate } = useFormatters()

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '$0'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

function formatQuantity(value: number | string | null | undefined): string {
  return formatDomainQuantity(value, 6)
}

const closeModal = () => {
  emit('close')
}

const handleCompletePrices = () => {
  emit('completePrices', props.purchase)
  emit('close')
}

const handleInvoicePurchase = () => {
  emit('invoicePurchase', props.purchase)
  emit('close')
}

const handleShipPurchase = () => {
  emit('shipPurchase', props.purchase)
  emit('close')
}
</script>
