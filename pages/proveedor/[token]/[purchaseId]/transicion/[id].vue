<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="max-w-md p-6 bg-surface border border-border rounded-lg text-center">
        <svg class="w-16 h-16 mx-auto text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="mt-4 text-xl font-bold text-text-primary">Error</h2>
        <p class="mt-2 text-text-secondary">{{ error }}</p>
        <button
          @click="navigateTo(`/proveedor/${token}/${purchaseId}`)"
          class="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Volver al detalle de la orden
        </button>
      </div>
    </div>

    <!-- Transition Detail -->
    <div v-else-if="transition" class="space-y-6">
      <!-- Purchase Details Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-6">
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Purchase Number with Date -->
            <div class="flex items-start space-x-3">
              <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {{ formatDateShort(purchaseData.purchase_date) }}
                </p>
                <p class="text-lg font-semibold text-text-primary">
                  {{ purchaseData.purchase_number }}
                </p>
                <p v-if="purchaseData.payment_type" class="text-sm text-text-secondary">
                  Pago: {{ getPaymentTypeText(purchaseData.payment_type) }}
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
                  {{ purchaseData.items_count || 0 }} producto(s)
                </p>
              </div>
            </div>

            <!-- Status Badge -->
            <div class="flex items-start space-x-3">
              <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Estado Actual
                </p>
                <div class="pt-1">
                  <span :class="getStatusBadgeClass(purchaseData.status)">
                    {{ getStatusText(purchaseData.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transition Information -->
      <div class="bg-surface border-2 border-border rounded-lg p-5">
        <div class="flex items-center space-x-2 mb-5">
          <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-semibold text-text-primary">Información de la Transición</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <tbody class="divide-y divide-border">
              <!-- Transition -->
              <tr class="hover:bg-surface-secondary/50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-text-secondary uppercase tracking-wide w-1/3">
                  Transición
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center space-x-2">
                    <span
                      v-if="transition.from_status"
                      :class="getStatusBadgeClass(transition.from_status)"
                    >
                      {{ getStatusText(transition.from_status) }}
                    </span>
                    <svg class="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span :class="getStatusBadgeClass(transition.to_status)">
                      {{ getStatusText(transition.to_status) }}
                    </span>
                  </div>
                </td>
              </tr>

              <!-- Date Time -->
              <tr class="hover:bg-surface-secondary/50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-text-secondary uppercase tracking-wide">
                  Fecha y Hora
                </td>
                <td class="py-3 px-4 text-sm text-text-primary">
                  {{ formatDateTime(transition.changed_at) }}
                </td>
              </tr>

              <!-- Changed By -->
              <tr v-if="transition.changed_by" class="hover:bg-surface-secondary/50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-text-secondary uppercase tracking-wide">
                  Realizado Por
                </td>
                <td class="py-3 px-4">
                  <div>
                    <p class="text-sm font-semibold text-text-primary">
                      {{ transition.user_name || 'Usuario Desconocido' }}
                    </p>
                    <p v-if="transition.user_email" class="text-sm text-text-secondary mt-0.5">
                      {{ transition.user_email }}
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Notes -->
              <tr v-if="transition.notes" class="hover:bg-surface-secondary/50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-text-secondary uppercase tracking-wide align-top">
                  Notas
                </td>
                <td class="py-3 px-4">
                  <p class="text-sm text-text-primary bg-background p-3 rounded-lg border border-border">
                    {{ transition.notes }}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Metadata -->
      <div v-if="transition.metadata && Object.keys(transition.metadata).length > 0"
        class="bg-surface border-2 border-border rounded-lg p-5">
        <div class="flex items-center space-x-2 mb-5">
          <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="text-lg font-semibold text-text-primary">Datos Adicionales</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <tbody class="divide-y divide-border">
              <tr v-for="(value, key) in transition.metadata" :key="key" class="hover:bg-surface-secondary/50 transition-colors">
                <td class="py-3 px-4 text-sm font-medium text-text-secondary uppercase tracking-wide w-1/3">
                  {{ formatMetadataKey(key) }}
                </td>
                <td class="py-3 px-4 text-sm font-semibold text-text-primary">
                  {{ formatMetadataValue(key, value) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Attachments -->
      <div v-if="attachments.length > 0" class="bg-surface border-2 border-border rounded-lg p-6">
        <h3 class="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
          <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span>Archivos Adjuntos</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="attachment in attachments" :key="attachment.id"
            class="border border-border rounded-lg overflow-hidden bg-background hover:shadow-md transition-shadow">
            <!-- Image Preview (clickable) -->
            <a v-if="isImageFile(attachment.file_name)" :href="attachment.s3_url" target="_blank"
              rel="noopener noreferrer"
              class="relative aspect-video bg-gray-100 block cursor-pointer hover:opacity-90 transition-opacity">
              <img :src="attachment.s3_url" :alt="attachment.file_name" class="w-full h-full object-contain"
                loading="lazy" />
            </a>
            <!-- PDF Preview (clickable) -->
            <a v-else-if="isPdfFile(attachment.file_name)" :href="attachment.s3_url" target="_blank"
              rel="noopener noreferrer"
              class="relative aspect-video bg-gray-100 block cursor-pointer hover:opacity-90 transition-opacity overflow-hidden">
              <embed :src="`${attachment.s3_url}#toolbar=0&navpanes=0&scrollbar=0`" type="application/pdf"
                class="w-full h-full pointer-events-none" />
              <div class="absolute inset-0 bg-transparent"></div>
            </a>
            <!-- File Icon for other files (clickable) -->
            <a v-else :href="attachment.s3_url" target="_blank" rel="noopener noreferrer"
              class="relative aspect-video bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
              <svg class="w-20 h-20 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  :d="getFileIcon(attachment.file_name)" />
              </svg>
            </a>

            <!-- File Info -->
            <div class="p-4">
              <p class="text-sm font-medium text-text-primary truncate mb-1" :title="attachment.file_name">
                {{ attachment.file_name }}
              </p>
              <p class="text-xs text-text-secondary mb-2">
                {{ attachment.attachment_type }}
              </p>
              <p v-if="attachment.description" class="text-xs text-text-secondary mb-3">
                {{ attachment.description }}
              </p>
              <a :href="attachment.s3_url" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center text-sm text-primary hover:underline">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Ver / Descargar
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'supplier-portal'
})

const route = useRoute()
const token = computed(() => route.params.token as string)
const purchaseId = computed(() => route.params.purchaseId as string)
const transitionId = computed(() => route.params.id as string)

const loading = ref(true)
const error = ref<string | null>(null)
const transition = ref<any>(null)

// Use global state for supplier (shared with layout)
const supplier = useState<any>('supplier-portal-supplier', () => null)
const purchaseData = ref<any>({
  purchase_number: '',
  purchase_date: null,
  payment_type: null,
  status: '',
  items_count: 0
})
const attachments = ref<any[]>([])

// Fetch transition detail
async function loadTransitionDetail() {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch(`/api/suppliers/purchases/${purchaseId.value}/transitions/${transitionId.value}`)

    if (response.success && response.data) {
      transition.value = response.data.transition
      purchaseData.value = response.data.purchase || purchaseData.value
      attachments.value = response.data.attachments || []
    } else {
      error.value = 'No se pudo cargar la transición'
    }
  } catch (err: any) {
    console.error('Error loading transition:', err)
    error.value = err.data?.detail || 'Error al cargar la transición'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Supplier is loaded by middleware
  loadTransitionDetail()
})

// Helper functions
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

function isPdfFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf')
}

function getFileIcon(filename: string): string {
  if (isImageFile(filename)) {
    return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
  } else if (filename.toLowerCase().endsWith('.pdf')) {
    return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
  } else {
    return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  }
}

function getStatusText(status: string): string {
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

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDateShort(dateString: string | null): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getPaymentTypeText(type: string): string {
  const types: Record<string, string> = {
    'contado': 'Contado',
    'credito': 'Crédito',
    'contraentrega': 'Contraentrega'
  }
  return types[type] || type
}

function formatMetadataKey(key: string): string {
  const keyMap: Record<string, string> = {
    confirmation_number: 'Número de Confirmación',
    estimated_delivery_date: 'Fecha Estimada de Entrega',
    tracking_number: 'Número de Guía',
    carrier: 'Transportadora',
    package_count: 'Número de Paquetes',
    package_condition: 'Condición del Paquete',
    partial_reception: 'Recepción Parcial',
    received_items: 'Items Recibidos',
    discrepancies: 'Discrepancias',
    quality_status: 'Estado de Calidad',
    defects_found: 'Defectos Encontrados',
    all_items_approved: 'Todos los Items Aprobados',
    invoice_number: 'Número de Factura',
    invoice_date: 'Fecha de Factura',
    invoice_amount: 'Monto de Factura',
    document_type: 'Tipo de Documento',
    credit_days: 'Días de Crédito',
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

  // Boolean fields
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No'
  }

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

useHead({
  title: computed(() => `Detalle de Transición - ${purchaseData.value.purchase_number || 'Orden'}`)
})
</script>
