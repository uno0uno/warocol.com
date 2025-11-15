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
          <!-- Purchase Information -->
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
                    Cantidad: {{ item.quantity }} {{ item.unit }}
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

        <!-- Footer Actions -->
        <div class="border-t-2 border-border p-6">
          <div class="flex justify-between items-center">
            <button
              @click="closeModal"
              class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Cerrar
            </button>
            <div class="flex space-x-3">
              <button
                v-if="purchase?.status === 'quotation'"
                @click="handleCompletePrices"
                class="px-6 py-2 border-2 border-green-500 text-green-500 rounded-lg hover:bg-green-500/10 transition-colors flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Completar Precios</span>
              </button>
              <button
                v-if="purchase?.status === 'confirmed' || purchase?.status === 'preparing'"
                @click="handleInvoicePurchase"
                class="px-6 py-2 border-2 border-orange-500 text-orange-500 rounded-lg hover:bg-orange-500/10 transition-colors flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Registrar Factura</span>
              </button>
              <button
                v-if="purchase?.status === 'invoiced'"
                @click="handleShipPurchase"
                class="px-6 py-2 border-2 border-blue-500 text-blue-500 rounded-lg hover:bg-blue-500/10 transition-colors flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Marcar como Enviado</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
