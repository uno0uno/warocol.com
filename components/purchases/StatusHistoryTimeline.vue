<template>
  <div class="bg-surface border-2 border-border rounded-lg p-6">
    <h3 class="text-lg font-semibold text-text-primary mb-6 flex items-center space-x-2">
      <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Historial</span>
    </h3>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <CommonsTheCustomLoader size="medium" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <p class="text-sm text-red-500">{{ error }}</p>
      <button @click="fetchHistory" class="mt-4 text-sm text-primary hover:underline">
        Reintentar
      </button>
    </div>

    <!-- Timeline -->
    <div v-else-if="history.length > 0" class="space-y-6">
      <div
        v-for="(entry, index) in history"
        :key="entry.id"
        class="relative"
      >
        <!-- Timeline line -->
        <div
          v-if="index !== history.length - 1"
          class="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border"
        ></div>

        <!-- Timeline entry -->
        <div class="flex space-x-4">
          <!-- Icon -->
          <div
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 z-10"
            :class="index === 0 ? getStatusIconClasses(entry.to_status) : 'bg-gray-500/10 border-gray-500 text-gray-500'"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                :d="getStatusIcon(entry.to_status)"
              />
            </svg>
          </div>

          <!-- Content -->
          <div class="flex-1 pb-8">
            <div
              class="bg-background border border-border rounded-lg p-4 transition-colors"
              :class="props.baseTransitionUrl ? 'cursor-pointer hover:bg-surface-secondary/50' : ''"
              @click="navigateToTransitionDetail(entry)"
            >
              <!-- Status and Date -->
              <div class="mb-2">
                <h4 class="font-semibold text-text-primary">
                  {{ getStatusText(entry.to_status) }}
                </h4>
                <p v-if="entry.from_status" class="text-xs text-text-secondary">
                  Desde: {{ getStatusText(entry.from_status) }}
                </p>
              </div>

              <!-- Timestamp -->
              <p class="text-sm text-text-secondary mb-3">
                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ formatDateTime(entry.changed_at) }}
              </p>

              <!-- Metadata -->
              <div v-if="entry.metadata && Object.keys(entry.metadata).length > 0" class="space-y-2">
                <div
                  v-for="(value, key) in entry.metadata"
                  :key="key"
                  class="text-sm"
                >
                  <span class="font-medium text-text-primary">{{ formatMetadataKey(key) }}:</span>
                  <span class="text-text-secondary ml-2">{{ formatMetadataValue(key, value) }}</span>
                </div>
              </div>

              <!-- Notes -->
              <div v-if="entry.notes" class="mt-3 pt-3 border-t border-border">
                <p class="text-sm text-text-secondary">
                  <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  {{ entry.notes }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <svg class="w-12 h-12 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm text-text-secondary">No hay historial de cambios de estado disponible</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
  purchaseId: string
  currentStatus?: string
  baseTransitionUrl?: string // Optional base URL for transition detail navigation
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const history = ref<any[]>([])

const fetchHistory = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch(`/api/suppliers/purchases/${props.purchaseId}/history`)
    if (response.success && response.data) {
      history.value = response.data
    }
  } catch (err: any) {
    console.error('Error fetching history:', err)
    error.value = err.data?.detail || 'Error al cargar el historial'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchHistory()
})

// Watch for status changes to refresh history
watch(() => props.currentStatus, (newStatus, oldStatus) => {
  if (newStatus && newStatus !== oldStatus) {
    fetchHistory()
  }
})

// Helper functions
function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    shipped: 'Enviado',
    partially_received: 'Parcialmente Recibido',
    received: 'Recibido y Verificado',
    verified: 'Verificado', // Legacy status for old records
    invoiced: 'Facturado',
    paid: 'Pagado',
    cancelled: 'Cancelado',
    overdue: 'Vencido'
  }
  return texts[status] || status
}

function getStatusVariant(status: string): string {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'confirmed':
    case 'preparing':
    case 'shipped':
      return 'info'
    case 'partially_received':
      return 'warning'
    case 'received':
    case 'verified':
    case 'paid':
      return 'success'
    case 'invoiced':
      return 'secondary'
    case 'cancelled':
    case 'overdue':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function getStatusIconClasses(status: string): string {
  const variant = getStatusVariant(status)
  const colorMap: Record<string, string> = {
    success: 'bg-green-500/10 border-green-500 text-green-500',
    info: 'bg-blue-500/10 border-blue-500 text-blue-500',
    warning: 'bg-yellow-500/10 border-yellow-500 text-yellow-500',
    destructive: 'bg-red-500/10 border-red-500 text-red-500',
    secondary: 'bg-gray-500/10 border-gray-500 text-gray-500'
  }
  return colorMap[variant] || colorMap.secondary
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    confirmed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    preparing: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    shipped: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
    partially_received: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    received: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    verified: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    invoiced: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    paid: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    cancelled: 'M6 18L18 6M6 6l12 12',
    overdue: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  }
  return icons[status] || icons.pending
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatMetadataKey(key: string): string {
  const keyMap: Record<string, string> = {
    confirmation_number: 'Número de Confirmación',
    estimated_delivery_date: 'Fecha Estimada de Entrega',
    tracking_number: 'Número de Guía',
    carrier: 'Transportadora',
    package_count: 'Número de Paquetes',
    received_items: 'Items Recibidos',
    discrepancies: 'Discrepancias',
    quality_status: 'Estado de Calidad',
    defects_found: 'Defectos Encontrados',
    invoice_number: 'Número de Factura',
    invoice_date: 'Fecha de Factura',
    invoice_amount: 'Monto de Factura',
    payment_method: 'Método de Pago',
    payment_reference: 'Referencia de Pago',
    payment_amount: 'Monto Pagado',
    payment_date: 'Fecha de Pago',
    cancellation_reason: 'Razón de Cancelación'
  }
  return keyMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatMetadataValue(key: string, value: any): string {
  if (value === null || value === undefined) return 'N/A'

  // Date fields
  if (key.includes('date') || key.includes('_at')) {
    try {
      return new Date(value).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return value
    }
  }

  // Money fields
  if (key.includes('amount') || key.includes('price') || key.includes('cost')) {
    try {
      return parseFloat(value).toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP'
      })
    } catch {
      return value
    }
  }

  // Array or object
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function navigateToTransitionDetail(entry: any) {
  // Only navigate if baseTransitionUrl is provided
  if (!props.baseTransitionUrl) {
    return
  }

  // Navigate to transition detail page using the provided base URL
  navigateTo(`${props.baseTransitionUrl}/${entry.id}`)
}
</script>
