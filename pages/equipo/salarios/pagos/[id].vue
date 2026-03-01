<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const router = useRouter()
const paymentId = route.params.id as string

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// State
const isSubmitting = ref(false)
const isUploading = ref(false)
const isEditMode = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])

// Edit form
const editForm = ref({
  payment_amount: 0,
  payment_date: '',
  payment_method: '',
  payment_reference: '',
  notes: '',
  status: ''
})

// Fetch payment data
const { data: paymentData, error, refresh, pending } = useAsyncData(
  `salary-payment-${paymentId}`,
  () => $fetch(`/api/salaries/payments/${paymentId}`),
  {
    server: false,
    watch: [currentTenant]
  }
)

const isLoading = computed(() => pending.value)
const fetchError = computed(() => error.value)

const payment = computed(() => paymentData.value?.data)
const employee = computed(() => paymentData.value?.employee)

// Helper functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
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

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'pending': 'Pendiente',
    'paid': 'Pagado',
    'cancelled': 'Cancelado'
  }
  return labels[status] || status
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'paid': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Actions
const goBack = () => {
  if (employee.value?.id) {
    router.push(`/equipo/salarios/${employee.value.id}`)
  } else {
    router.push('/equipo/salarios')
  }
}

const toggleEditMode = () => {
  if (!isEditMode.value && payment.value) {
    // Entering edit mode - populate form with current values
    editForm.value = {
      payment_amount: payment.value.payment_amount || 0,
      payment_date: payment.value.payment_date ? new Date(payment.value.payment_date).toISOString().split('T')[0] : '',
      payment_method: payment.value.payment_method || '',
      payment_reference: payment.value.payment_reference || '',
      notes: payment.value.notes || '',
      status: payment.value.status || ''
    }
  }
  isEditMode.value = !isEditMode.value
}

const cancelEdit = () => {
  isEditMode.value = false
}

const saveChanges = async () => {
  isSubmitting.value = true
  try {
    const payload: any = {
      payment_amount: editForm.value.payment_amount
    }

    if (editForm.value.payment_date) {
      payload.payment_date = editForm.value.payment_date
    }

    if (editForm.value.payment_method) {
      payload.payment_method = editForm.value.payment_method
    }

    if (editForm.value.payment_reference) {
      payload.payment_reference = editForm.value.payment_reference
    }

    if (editForm.value.notes) {
      payload.notes = editForm.value.notes
    }

    if (editForm.value.status) {
      payload.status = editForm.value.status
    }

    await $fetch(`/api/salaries/payments/${paymentId}`, {
      method: 'PUT',
      body: payload
    })

    await refresh()
    isEditMode.value = false
  } catch (error: any) {
    console.error('Error updating payment:', error)
    alert(error?.data?.detail || 'Error al actualizar el pago')
  } finally {
    isSubmitting.value = false
  }
}

const markAsPaid = async () => {
  if (!confirm('¿Marcar este pago como pagado?')) return

  isSubmitting.value = true
  try {
    const payload = {
      status: 'paid',
      payment_date: new Date().toISOString()
    }

    await $fetch(`/api/salaries/payments/${paymentId}`, {
      method: 'PUT',
      body: payload
    })

    await refresh()
  } catch (error: any) {
    console.error('Error marking as paid:', error)
    alert(error?.data?.detail || 'Error al marcar como pagado')
  } finally {
    isSubmitting.value = false
  }
}

const handleFileSelect = (event: Event) => {
  console.log('handleFileSelect called')
  const target = event.target as HTMLInputElement
  console.log('Target files:', target.files)

  if (target.files) {
    const newFiles = Array.from(target.files)
    console.log('Adding files:', newFiles.map(f => f.name))
    selectedFiles.value.push(...newFiles)
    console.log('Total selected files:', selectedFiles.value.length)

    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const uploadFiles = async () => {
  console.log('uploadFiles called, selectedFiles:', selectedFiles.value.length)

  if (selectedFiles.value.length === 0) {
    console.log('No files selected, returning')
    return
  }

  isUploading.value = true
  console.log('Starting upload...')

  try {
    const formData = new FormData()
    selectedFiles.value.forEach(file => {
      console.log('Adding file to FormData:', file.name)
      formData.append('files', file)
    })

    console.log('Sending POST request to:', `/api/salaries/payments/${paymentId}/attachments`)

    const response = await $fetch(`/api/salaries/payments/${paymentId}/attachments`, {
      method: 'POST',
      body: formData
    })

    console.log('Upload response:', response)

    selectedFiles.value = []
    await refresh()

    console.log('Upload successful!')
  } catch (error: any) {
    console.error('Error uploading files:', error)
    alert(error?.data?.detail || 'Error al subir archivos')
  } finally {
    isUploading.value = false
  }
}

const deleteAttachment = async (attachmentId: string) => {
  if (!confirm('¿Eliminar este archivo?')) return

  try {
    await $fetch(`/api/salaries/payments/attachments/${attachmentId}`, {
      method: 'DELETE'
    })
    await refresh()
  } catch (error: any) {
    console.error('Error deleting attachment:', error)
    alert(error?.data?.detail || 'Error al eliminar archivo')
  }
}

useHead({
  title: payment.value
    ? `Pago - ${formatPeriodLabel(payment.value.period_month)}`
    : 'Detalle de Pago'
})

// Set refresh handler for layout
const { setRefreshHandler } = useLayoutActions()
onMounted(() => {
  setRefreshHandler(refresh)
})
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar el pago</p>
        <p class="text-sm text-text-secondary mb-4">{{ fetchError.message }}</p>
        <button
          @click="refresh"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else-if="payment">
      <!-- Navigation Header -->
      <div class="flex justify-between items-center mb-4 sm:mb-6">
        <button
          @click="goBack"
          class="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span class="text-sm font-medium">Volver</span>
        </button>

        <div class="flex items-center gap-3">
          <h1 class="text-lg font-semibold text-text-primary">Pago de Salario</h1>
          <span
            class="px-3 py-1 rounded-full text-sm font-medium"
            :class="getStatusColor(payment.status)"
          >
            {{ getStatusLabel(payment.status) }}
          </span>
          <button
            v-if="!isEditMode"
            @click="toggleEditMode"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Editar
          </button>
        </div>
      </div>

      <!-- Key Information Grid (View Mode) -->
      <div v-if="!isEditMode" class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <!-- Employee -->
          <div>
            <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              Empleado
            </p>
            <p class="text-sm font-semibold text-text-primary">
              {{ employee?.name || '-' }}
            </p>
            <p class="text-xs text-text-secondary">
              {{ employee?.role_label || employee?.role || '-' }}
            </p>
          </div>

          <!-- Period -->
          <div>
            <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              Período
            </p>
            <p class="text-sm font-semibold text-text-primary">
              {{ formatPeriodLabel(payment.period_month) }}
            </p>
          </div>

          <!-- Payment Date -->
          <div>
            <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              Fecha de Pago
            </p>
            <p class="text-sm font-semibold text-text-primary">
              {{ payment.payment_date ? formatDate(payment.payment_date) : 'Sin pagar' }}
            </p>
          </div>

          <!-- Amount -->
          <div>
            <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              Monto
            </p>
            <p class="text-lg font-bold text-primary">
              {{ formatCurrency(payment.payment_amount) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Edit Form -->
      <div v-else class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4">Editar Pago</h3>

        <form @submit.prevent="saveChanges">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <!-- Payment Amount -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Monto *
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                <input
                  type="number"
                  v-model.number="editForm.payment_amount"
                  required
                  step="1000"
                  min="0"
                  class="w-full pl-8 pr-4 py-2 rounded-lg border-2 border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <!-- Payment Date -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Fecha de Pago
              </label>
              <input
                type="date"
                v-model="editForm.payment_date"
                class="w-full px-4 py-2 rounded-lg border-2 border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <!-- Payment Method -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Método de Pago
              </label>
              <input
                type="text"
                v-model="editForm.payment_method"
                placeholder="Ej: Transferencia, Efectivo"
                class="w-full px-4 py-2 rounded-lg border-2 border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <!-- Payment Reference -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Referencia de Pago
              </label>
              <input
                type="text"
                v-model="editForm.payment_reference"
                placeholder="Ej: Número de transacción"
                class="w-full px-4 py-2 rounded-lg border-2 border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <!-- Status -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Estado
              </label>
              <select
                v-model="editForm.status"
                class="w-full px-4 py-2 rounded-lg border-2 border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <!-- Notes -->
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-text-primary mb-2">
                Notas
              </label>
              <textarea
                v-model="editForm.notes"
                rows="3"
                placeholder="Observaciones adicionales..."
                class="w-full px-4 py-2 rounded-lg border-2 border-border bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              ></textarea>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              @click="cancelEdit"
              type="button"
              class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-text-secondary hover:bg-background transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Payment Details (only if paid and view mode) -->
      <div v-if="!isEditMode && payment.status === 'paid' && (payment.payment_method || payment.payment_reference)" class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 class="text-base font-semibold text-text-primary mb-4">Detalles del Pago</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-if="payment.payment_method">
            <p class="text-sm font-medium text-text-secondary mb-1">Método de Pago</p>
            <p class="text-base text-text-primary">{{ payment.payment_method }}</p>
          </div>
          <div v-if="payment.payment_reference">
            <p class="text-sm font-medium text-text-secondary mb-1">Referencia</p>
            <p class="text-base text-text-primary">{{ payment.payment_reference }}</p>
          </div>
        </div>
      </div>

      <!-- Notes (view mode only) -->
      <div v-if="!isEditMode && payment.notes" class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 class="text-base font-semibold text-text-primary mb-3">Notas</h3>
        <p class="text-sm text-text-secondary whitespace-pre-wrap">{{ payment.notes }}</p>
      </div>

      <!-- Attachments Section -->
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 class="text-base font-semibold text-text-primary mb-4">
          Comprobantes de Pago
          <span v-if="payment.attachments" class="text-text-secondary font-normal">
            ({{ payment.attachments.length }})
          </span>
        </h3>

        <!-- Existing Attachments -->
        <div v-if="payment.attachments && payment.attachments.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <div
            v-for="attachment in payment.attachments"
            :key="attachment.id"
            class="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:shadow-md transition-shadow"
          >
            <a
              :href="attachment.path"
              target="_blank"
              class="flex items-center space-x-3 flex-1 min-w-0 hover:text-primary transition-colors"
            >
              <svg class="w-6 h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-text-primary truncate">{{ attachment.file_name }}</p>
                <p class="text-xs text-text-secondary">{{ formatFileSize(attachment.file_size) }}</p>
              </div>
            </a>
            <button
              @click="deleteAttachment(attachment.id)"
              class="text-destructive hover:text-destructive/80 ml-2"
              title="Eliminar archivo"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- File Upload -->
        <div>
          <div class="border-2 border-dashed border-border rounded-lg p-6 bg-background">
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
                  @click="fileInput?.click()"
                  class="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Seleccionar archivos
                </button>
                <p class="text-xs text-text-tertiary mt-3">PDF, imágenes (JPG, PNG)</p>
              </div>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="(file, index) in selectedFiles"
                :key="index"
                class="flex items-center justify-between bg-surface border border-border p-3 rounded-lg"
              >
                <div class="flex items-center space-x-3 flex-1 min-w-0">
                  <svg class="w-6 h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-text-primary truncate">{{ file.name }}</p>
                    <p class="text-xs text-text-secondary">{{ formatFileSize(file.size) }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeFile(index)"
                  class="text-destructive hover:text-destructive/80 ml-2 flex-shrink-0"
                  title="Eliminar archivo"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="flex gap-2 pt-2">
                <button
                  type="button"
                  @click="fileInput?.click()"
                  class="flex-1 px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  Agregar más
                </button>
                <button
                  type="button"
                  @click="uploadFiles"
                  :disabled="isUploading"
                  class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {{ isUploading ? 'Subiendo...' : 'Subir archivos' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mark as Paid Action (only show in view mode) -->
      <div v-if="!isEditMode && payment.status === 'pending'" class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-text-primary mb-1">
              Confirmar Pago
            </h3>
            <p class="text-sm text-text-secondary">
              Marca este pago como completado una vez realizado el pago al empleado
            </p>
          </div>
          <button
            @click="markAsPaid"
            :disabled="isSubmitting"
            class="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isSubmitting ? 'Procesando...' : 'Marcar como Pagado' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
