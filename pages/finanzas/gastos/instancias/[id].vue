<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else-if="instance && expense">
      <!-- Navigation Header -->
      <div class="flex items-center gap-3 mb-6">
        <button
          @click="goBack"
          class="flex items-center gap-2 px-4 py-2 bg-surface border-2 border-border text-text-primary rounded-lg hover:border-primary transition-colors text-sm font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver al Gasto</span>
        </button>
      </div>

      <!-- Header Card -->
      <div class="bg-surface border-2 border-border rounded-xl p-6 mb-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl font-bold text-text-primary mb-2">
              Instancia de Pago
            </h1>
            <p class="text-text-secondary">
              {{ expense.description }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span
              :class="{
                'bg-state-success-bg text-state-success-text': instance.status === 'paid',
                'bg-state-warning-bg text-state-warning-text': instance.status === 'pending',
                'bg-status-chip-bg text-status-chip-text': instance.status === 'skipped',
                'bg-state-danger-bg text-state-danger-text': instance.status === 'cancelled'
              }"
              class="px-4 py-2 rounded-full text-sm font-semibold"
            >
              {{ getStatusLabel(instance.status) }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <!-- Period -->
          <div class="flex items-start space-x-3">
            <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
              <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Período</p>
              <p class="text-lg font-semibold text-text-primary">{{ formatPeriodLabel(instance.periodMonth) }}</p>
            </div>
          </div>

          <!-- Scheduled Date -->
          <div class="flex items-start space-x-3">
            <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
              <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Fecha Programada</p>
              <p class="text-lg font-semibold text-text-primary">{{ formatCalendarDate(instance.scheduledDate) }}</p>
            </div>
          </div>

          <!-- Payment Date -->
          <div class="flex items-start space-x-3">
            <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
              <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Fecha de Pago</p>
              <p class="text-lg font-semibold text-text-primary">
                {{ instance.paymentDate ? formatDate(instance.paymentDate) : 'Sin pagar' }}
              </p>
            </div>
          </div>

          <!-- Amount -->
          <div class="flex items-start space-x-3">
            <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
              <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Monto</p>
              <p class="text-lg font-semibold text-primary">{{ formatCurrency(instance.amount) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Details -->
      <div v-if="instance.status === 'paid'" class="bg-surface border-2 border-border rounded-xl p-6 mb-6">
        <h3 class="text-lg font-bold text-text-primary mb-4">Detalles del Pago</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-if="instance.paymentMethod">
            <p class="text-sm text-text-secondary mb-1">Método de Pago</p>
            <p class="font-medium text-text-primary">{{ instance.paymentMethod }}</p>
          </div>
          <div v-if="instance.paymentReference">
            <p class="text-sm text-text-secondary mb-1">Referencia</p>
            <p class="font-medium text-text-primary">{{ instance.paymentReference }}</p>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="instance.notes" class="bg-surface border-2 border-border rounded-xl p-6 mb-6">
        <h3 class="text-lg font-bold text-text-primary mb-4">Notas</h3>
        <p class="text-text-secondary whitespace-pre-wrap">{{ instance.notes }}</p>
      </div>

      <!-- Attachments Section -->
      <div class="bg-surface border-2 border-border rounded-xl p-6 mb-6">
        <h3 class="text-lg font-bold text-text-primary mb-4">Comprobantes de Pago</h3>

        <!-- Existing Attachments -->
        <div v-if="instance.attachments && instance.attachments.length > 0" class="mb-6">
          <p class="text-sm text-text-secondary mb-3">Archivos adjuntos ({{ instance.attachments.length }})</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="attachment in instance.attachments"
              :key="attachment.id"
              class="flex items-center space-x-3 bg-background border border-border rounded-lg p-3"
            >
              <a
                :href="attachment.s3_url"
                target="_blank"
                class="flex items-center space-x-3 flex-1 min-w-0 hover:text-primary transition-colors"
              >
                <svg class="w-8 h-8 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-text-primary truncate">{{ attachment.file_name }}</p>
                  <p class="text-xs text-text-secondary">{{ formatFileSize(attachment.file_size) }}</p>
                </div>
              </a>
              <button
                @click="deleteAttachment(attachment.id)"
                class="text-destructive hover:text-destructive/80 flex-shrink-0"
                title="Eliminar archivo"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="mb-6">
          <p class="text-sm text-text-secondary text-center py-8 border-2 border-dashed border-border rounded-lg">
            No hay archivos adjuntos
          </p>
        </div>

        <!-- Upload New Files -->
        <div>
          <p class="text-sm font-medium text-text-primary mb-3">Agregar nuevos archivos</p>
          <div class="border-2 border-dashed border-border rounded-lg p-6">
            <input
              ref="fileInput"
              type="file"
              @change="handleFileSelect"
              accept="image/*,application/pdf"
              multiple
              class="hidden"
            />

            <div v-if="selectedFiles.length === 0">
              <div class="text-center">
                <svg class="mx-auto h-12 w-12 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="mt-2 text-sm text-text-secondary">Arrastra archivos aquí o</p>
                <button
                  type="button"
                  @click="$refs.fileInput.click()"
                  class="mt-2 px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  Seleccionar archivos
                </button>
              </div>
            </div>

            <div v-else class="space-y-2">
              <div v-for="(file, index) in selectedFiles" :key="index"
                class="flex items-center justify-between bg-background p-3 rounded-lg">
                <div class="flex items-center space-x-3">
                  <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p class="text-sm font-medium text-text-primary">{{ file.name }}</p>
                    <p class="text-xs text-text-secondary">{{ formatFileSize(file.size) }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeFile(index)"
                  class="text-destructive hover:text-destructive/80"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                @click="uploadFiles"
                :disabled="isUploading"
                class="w-full px-4 py-2 bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg disabled:opacity-50 text-sm font-medium"
              >
                {{ isUploading ? 'Subiendo...' : `Subir ${selectedFiles.length} archivo(s)` }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="instance.status === 'pending'" class="bg-surface border-2 border-border rounded-xl p-6">
        <h3 class="text-lg font-bold text-text-primary mb-4">Acciones</h3>
        <div class="flex gap-3">
          <button
            @click="markAsPaid"
            :disabled="isSubmitting"
            class="px-6 py-3 bg-action-success-bg text-action-success-text rounded-lg hover:bg-action-success-hover-bg transition-colors disabled:opacity-50 font-semibold flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isSubmitting ? 'Marcando...' : 'Marcar como Pagado' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFormatters } from '~/composables/useFormatters'
definePageMeta({ layout: 'dashboard', module: 'finanzas' })

const route = useRoute()
const router = useRouter()
const instanceId = route.params.id as string

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// State
const isSubmitting = ref(false)
const isUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])

// Fetch instance data (removed await to show loading immediately)
const { data: instanceData, error, refresh, pending } = useAsyncData(
  `instance-${instanceId}`,
  () => $fetch(`/api/finance/expenses/instances/${instanceId}`),
  {
    server: false,
    watch: [currentTenant]
  }
)

// Use pending from useAsyncData for loading state
const isLoading = computed(() => pending.value)
const fetchError = computed(() => error.value)

// Format functions (defined before use)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const { formatDate, formatCalendarDate } = useFormatters()

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatPeriodLabel = (periodMonth: string) => {
  if (!periodMonth) return ''
  const [year, month] = periodMonth.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric'
  })
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'pending': 'Pendiente',
    'paid': 'Pagado',
    'skipped': 'Omitido',
    'cancelled': 'Cancelado'
  }
  return labels[status] || status
}

const instance = computed(() => instanceData.value)
const expense = computed(() => instanceData.value?.expense)

useHead({
  title: instance.value ? `Instancia - ${formatPeriodLabel(instance.value.periodMonth)}` : 'Instancia de Pago'
})

// Navigation
const goBack = () => {
  if (expense.value) {
    router.push(`/finanzas/gastos/${expense.value.id}`)
  } else {
    router.push('/finanzas/gastos')
  }
}

// File handling
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value.push(...Array.from(target.files))
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const uploadFiles = async () => {
  if (selectedFiles.value.length === 0) return

  isUploading.value = true
  try {
    const formData = new FormData()
    selectedFiles.value.forEach(file => {
      formData.append('files', file)
    })

    await $fetch(`/api/finance/expenses/instances/${instanceId}/attachments`, {
      method: 'POST',
      body: formData
    })

    selectedFiles.value = []
    await refresh()
  } catch (error: any) {
    console.error('Error uploading files:', error)
    alert(error?.data?.detail || 'Error al subir archivos')
  } finally {
    isUploading.value = false
  }
}

const deleteAttachment = async (attachmentId: string) => {
  if (!confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
    return
  }

  try {
    await $fetch(`/api/finance/expenses/instances/attachments/${attachmentId}`, {
      method: 'DELETE'
    })
    await refresh()
  } catch (error: any) {
    console.error('Error deleting attachment:', error)
    alert(error?.data?.detail || 'Error al eliminar archivo')
  }
}

const markAsPaid = async () => {
  if (!confirm('¿Marcar esta instancia como pagada?')) {
    return
  }

  isSubmitting.value = true
  try {
    const paymentDate = new Date().toISOString()
    await $fetch(`/api/finance/expenses/instances/${instanceId}`, {
      method: 'PUT',
      body: {
        status: 'paid',
        paymentDate: paymentDate
      }
    })
    await refresh()
  } catch (error: any) {
    console.error('Error marking as paid:', error)
    alert(error?.data?.detail || 'Error al marcar como pagado')
  } finally {
    isSubmitting.value = false
  }
}
</script>
