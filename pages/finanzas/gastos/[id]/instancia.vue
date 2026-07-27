<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useOperationalQuotaGate } from '~/composables/useOperationalQuotaGate'
import { useQuotaExceeded } from '~/composables/useQuotaExceeded'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })

const route = useRoute()
const router = useRouter()
const expenseId = route.params.id as string

const {
  quotaLimitModalOpen,
  quotaLimitModalMessage,
  closeQuotaLimitModal,
  goToBillingFromQuotaLimitModal,
  handleCreateClick,
} = useOperationalQuotaGate('expenses_per_period')
const { handleQuotaError, getQuotaMessage } = useQuotaExceeded()
const { t } = useI18n({ useScope: 'global' })

useHead({ title: 'Nueva Instancia de Pago' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()
const { todayISO } = useTenantTimezone()

// Loading states
const isLoading = ref(true)
const isSubmitting = ref(false)
const error = ref<string | null>(null)

// Fetch expense data
const { data: expenseData } = await useAsyncData(
  `expense-${expenseId}`,
  () => $fetch(`/api/finance/expenses/${expenseId}`),
  {
    server: false,
    watch: [currentTenant]
  }
)

const expense = computed(() => expenseData.value?.data)

// Form state
const instanceForm = reactive({
  periodMonth: todayISO().slice(0, 7), // YYYY-MM format
  scheduledDate: todayISO(),
  amount: null as number | null,
  notes: '',
  selectedFiles: [] as File[]
})

// File upload
const fileInput = ref<HTMLInputElement | null>(null)

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    instanceForm.selectedFiles.push(...Array.from(target.files))
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

const removeFile = (index: number) => {
  instanceForm.selectedFiles.splice(index, 1)
}

// Validation
const isFormValid = computed(() => {
  return instanceForm.periodMonth && instanceForm.scheduledDate
})

// Actions
const goBack = () => {
  router.push(`/finanzas/gastos/${expenseId}`)
}

const createInstance = async () => {
  if (!isFormValid.value) return

  isSubmitting.value = true
  error.value = null

  try {
    const payload = {
      periodMonth: instanceForm.periodMonth,
      scheduledDate: instanceForm.scheduledDate,
      status: 'pending'
    }

    if (instanceForm.amount !== null && instanceForm.amount > 0) {
      payload.amount = instanceForm.amount
    } else if (expense.value?.amount) {
      payload.amount = expense.value.amount
    }

    if (instanceForm.notes) {
      payload.notes = instanceForm.notes
    }

    const response = await $fetch(`/api/finance/expenses/${expenseId}/instances`, {
      method: 'POST',
      body: payload
    })

    // Upload files separately if present
    if (instanceForm.selectedFiles.length > 0 && response.data?.id) {
      try {
        const formData = new FormData()
        instanceForm.selectedFiles.forEach(file => formData.append('files', file))
        await $fetch(`/api/finance/expenses/instances/${response.data.id}/attachments`, {
          method: 'POST',
          body: formData
        })
      } catch (fileError) {
        console.error('Error uploading files:', fileError)
        // Continue even if file upload fails
      }
    }

    // Navigate back to expense detail
    router.push(`/finanzas/gastos/${expenseId}`)
  } catch (err: any) {
    if (handleQuotaError(err, { resource: 'expenses_per_period', showInline: false })) {
      quotaLimitModalMessage.value = getQuotaMessage(err, 'expenses_per_period')
      quotaLimitModalOpen.value = true
      error.value = null
      return
    }
    console.error('Error creating instance:', err)
    error.value = err?.data?.detail || 'Error al crear la instancia'
  } finally {
    isSubmitting.value = false
  }
}

const onCreateInstanceClick = () => {
  void handleCreateClick(() => { void createInstance() })
}

// Helper functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Watch for data load
watch(expenseData, (data) => {
  if (data) {
    isLoading.value = false
  }
}, { immediate: true })
</script>

<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      label="Creando instancia..."
      hint="Estamos registrando la instancia del gasto y consolidando sus datos."
      variant="glass"
      indicator="matrix"
    />

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Header Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
        <div class="p-4 sm:p-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <!-- Expense Info -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div class="space-y-1 min-w-0">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Nueva Instancia
                </p>
                <p class="text-sm sm:text-base font-semibold text-text-primary truncate">
                  {{ expense?.category?.categoryName }}
                </p>
                <p class="text-xs text-text-secondary truncate">
                  {{ expense?.description }}
                </p>
              </div>
            </div>

            <!-- Amount -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Monto Base
                </p>
                <p class="text-sm sm:text-lg font-semibold text-primary">
                  {{ expense ? formatCurrency(expense.amount) : '-' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <form @submit.prevent="onCreateInstanceClick">
        <div class="bg-surface border-border border-2 rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6">Detalles de la Instancia</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <!-- Period Month -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Período *
                </label>
                <input
                  type="month"
                  v-model="instanceForm.periodMonth"
                  required
                  class="input-base w-full px-4 py-2"
                />
                <p class="text-xs text-text-tertiary mt-1">
                  Mes al que corresponde el pago
                </p>
              </div>

              <!-- Scheduled Date -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Fecha Programada *
                </label>
                <input
                  type="date"
                  v-model="instanceForm.scheduledDate"
                  required
                  class="input-base w-full px-4 py-2"
                />
                <p class="text-xs text-text-tertiary mt-1">
                  Fecha en la que está programado el pago
                </p>
              </div>

              <!-- Amount (Optional) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Monto (Opcional)
                </label>
                <div class="relative">
                  <span class="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">$</span>
                  <UiDecimalInput
                    v-model="instanceForm.amount"
                    :min="0"
                    :precision="2"
                    :placeholder="`Predeterminado: ${expense ? formatCurrency(expense.amount) : ''}`"
                    class="input-base w-full ps-8 pe-4 py-2"
                  />
                </div>
                <p class="text-xs text-text-tertiary mt-1">
                  Si el monto varía, especifícalo aquí. De lo contrario, se usará el monto base.
                </p>
              </div>

              <!-- Notes -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Notas (Opcional)
                </label>
                <textarea
                  v-model="instanceForm.notes"
                  rows="3"
                  placeholder="Observaciones o detalles adicionales..."
                  class="input-base w-full px-4 py-2 resize-none"
                ></textarea>
              </div>

              <!-- File Upload Section -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Comprobantes de Pago (Opcional)
                </label>
                <div class="border-2 border-dashed border-border rounded-lg p-6 bg-background">
                  <input
                    ref="fileInput"
                    type="file"
                    @change="handleFileSelect"
                    accept="image/*,application/pdf"
                    multiple
                    class="hidden"
                  />

                  <div v-if="instanceForm.selectedFiles.length === 0">
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
                      <p class="text-xs text-text-tertiary mt-3">
                        PDF, imágenes (JPG, PNG)
                      </p>
                    </div>
                  </div>

                  <div v-else class="space-y-2">
                    <div
                      v-for="(file, index) in instanceForm.selectedFiles"
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
                        class="text-destructive hover:text-destructive/80 ms-2 flex-shrink-0"
                        title="Eliminar archivo"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      @click="fileInput?.click()"
                      class="w-full px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      Agregar más archivos
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Error message -->
            <div v-if="error" class="mt-6 p-4 bg-state-danger-bg border-2 border-state-danger-border rounded-lg">
              <p class="text-sm text-state-danger-text font-medium">{{ error }}</p>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 mt-6 pt-6 border-t border-border">
              <button
                @click="goBack"
                type="button"
                class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-text-secondary hover:bg-background transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="!isFormValid || isSubmitting"
                class="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {{ isSubmitting ? 'Creando...' : 'Crear Instancia' }}
              </button>
            </div>
          </div>
        </div>
      </form>
    </template>

    <UiConfirmActionModal
      v-model="quotaLimitModalOpen"
      :title="t('billing.upgrade.quotaBlocked')"
      :message="quotaLimitModalMessage"
      :confirm-label="t('nav.miPlan')"
      :cancel-label="t('billing.close')"
      @confirm="goToBillingFromQuotaLimitModal"
      @cancel="closeQuotaLimitModal"
    />
  </div>
</template>
