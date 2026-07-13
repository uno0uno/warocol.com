<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
import { ref, reactive, computed, watch, inject, onMounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const employeeId = route.params.id as string

useHead({ title: () => t('equipo.salarios.detailTitle') })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// Loading states
const isLoading = ref(true)
const error = ref<string | null>(null)
const isEditMode = ref(false)
const isSubmitting = ref(false)
const isDeleting = ref(false)

// Fetch employee data
const { data: employeeData, pending: employeePending, refresh, error: fetchError } = useAsyncData(
  `employee-salary-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}`),
  {
    server: false,
    watch: [currentTenant]
  }
)

const employee = computed(() => (employeeData.value as any)?.data)
const isLoadingEmployee = computed(() => employeePending.value)

// Fetch salary payments
const { data: paymentsData, pending: paymentsPending, refresh: refreshPayments } = useAsyncData(
  `employee-payments-${employeeId}`,
  async () => {
    if (!employee.value) return { data: [] }
    try {
      const response = await $fetch(`/api/salaries/payments`, {
        params: { employee_id: employeeId }
      })
      return response
    } catch (error) {
      console.error('Error fetching payments:', error)
      return { data: [] }
    }
  },
  {
    server: false,
    watch: [currentTenant, employee]
  }
)

const payments = computed(() => (paymentsData.value as any)?.data || [])
const isLoadingPayments = computed(() => paymentsPending.value)

// Edit form
const editForm = reactive({
  salaryType: 'smmlv',
  minimumWageMultiplier: 1,
  fixedAmount: 0,
  hourlyRate: 0,
  notes: '',
  employmentType: 'employee' as string,
  dailyRate: 0 as number
})

// File upload
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const attachmentsToRemove = ref<string[]>([])

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

const removeAttachment = (attachmentId: string) => {
  if (!confirm(t('equipo.salarios.deleteFileConfirm'))) {
    return
  }
  attachmentsToRemove.value.push(attachmentId)
}

// Actions
const goBack = () => {
  router.push('/equipo/salarios')
}

const toggleEditMode = () => {
  if (!isEditMode.value && employee.value) {
    // Entering edit mode - populate form
    editForm.salaryType = employee.value.salary_type || 'smmlv'
    editForm.minimumWageMultiplier = employee.value.multiplier || 1
    editForm.fixedAmount = employee.value.fixed_amount || 0
    editForm.hourlyRate = employee.value.hourly_rate || 0
    editForm.notes = employee.value.salary_notes || ''
    editForm.employmentType = employee.value.employment_type || 'employee'
    editForm.dailyRate = employee.value.daily_rate || 0
  }
  isEditMode.value = !isEditMode.value
  selectedFiles.value = []
  attachmentsToRemove.value = []
}

const cancelEdit = () => {
  isEditMode.value = false
  selectedFiles.value = []
  attachmentsToRemove.value = []
  error.value = null
}

const saveChanges = async () => {
  isSubmitting.value = true
  error.value = null

  try {
    // Build config object
    const config: Record<string, any> = {
      salary_type: editForm.salaryType,
      notes: editForm.notes
    }
    if (editForm.salaryType === 'smmlv') {
      config.minimum_wage_multiplier = editForm.minimumWageMultiplier
    } else if (editForm.salaryType === 'fixed') {
      config.fixed_amount = editForm.fixedAmount
    } else if (editForm.salaryType === 'hourly') {
      config.hourly_rate = editForm.hourlyRate
    }

    config.employment_type = editForm.employmentType
    if (editForm.employmentType === 'daily') {
      config.daily_rate = editForm.dailyRate
    }

    // Send as JSON
    await $fetch(`/api/salaries/employees/${employeeId}/config`, {
      method: 'POST',
      body: config
    })

    // Handle attachment deletions
    for (const attachmentId of attachmentsToRemove.value) {
      try {
        await $fetch(`/api/salaries/attachments/${attachmentId}`, {
          method: 'DELETE'
        })
      } catch (err) {
        console.error('Error deleting attachment:', err)
      }
    }

    await refresh()
    isEditMode.value = false
    selectedFiles.value = []
    attachmentsToRemove.value = []
  } catch (err: any) {
    console.error('Error updating salary:', err)
    error.value = err?.data?.detail || t('equipo.salarios.updateError')
  } finally {
    isSubmitting.value = false
  }
}

const deleteEmployee = async () => {
  if (!confirm(t('equipo.salarios.deleteConfirm'))) {
    return
  }

  isDeleting.value = true
  isSubmitting.value = true

  try {
    await $fetch(`/api/team/employees/${employeeId}`, {
      method: 'DELETE'
    })
    router.push('/equipo/salarios')
  } catch (error: any) {
    console.error('Error deleting employee:', error)
    toast.error(error?.data?.detail || t('equipo.salarios.deleteError'))
    isDeleting.value = false
    isSubmitting.value = false
  }
}

const markAsPaid = async (payment: any) => {
  try {
    const payload = {
      status: 'paid',
      payment_date: new Date().toISOString()
    }

    await $fetch(`/api/salaries/payments/${payment.id}`, {
      method: 'PUT',
      body: payload
    })

    await refreshPayments()
  } catch (error: any) {
    console.error('Error marking as paid:', error)
    toast.error(error?.data?.detail || t('equipo.salarios.markPaidError'))
  }
}

// Helper functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(toNumberLocaleTag(locale.value), {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const { formatDate: _fmtDate } = useFormatters()
const formatDate = (dateString: string) => _fmtDate(dateString)

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'pending': t('equipo.salarios.pending'),
    'paid': t('equipo.salarios.paid'),
    'cancelled': t('equipo.salarios.canceled')
  }
  return labels[status] || status
}

const getSalaryTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'smmlv': t('equipo.salarios.minimumWage'),
    'fixed': t('equipo.salarios.fixed'),
    'hourly': t('equipo.salarios.hourly'),
    'daily': t('equipo.salarios.dayLaborer')
  }
  return labels[type] || type
}

const getEmploymentTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'employee': t('equipo.salarios.employee'),
    'contractor': t('equipo.salarios.contractor'),
    'daily': t('equipo.salarios.dayLaborer')
  }
  return labels[type] || type
}

// Set refresh handler for layout
const { setRefreshHandler } = useLayoutActions()
onMounted(() => {
  setRefreshHandler(refresh)
})

// Watch for data load
watch(employeeData, (data) => {
  if (data) {
    isLoading.value = false
  }
}, { immediate: true })
</script>

<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      :label="isDeleting ? t('equipo.salarios.deletingEmployee') : t('equipo.salarios.savingEmployee')"
      :hint="isDeleting ? t('equipo.salarios.deletingBody') : t('equipo.salarios.updatingBody')"
      variant="glass"
      indicator="matrix"
    />

    <!-- Loading State -->
    <div v-if="isLoadingEmployee" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <template v-else-if="employee">
      <!-- Navigation Header -->
      <div class="flex items-center gap-3 mb-4">
        <button
          @click="goBack"
          class="flex items-center gap-2 px-4 py-2 bg-surface border-2 border-border text-text-primary rounded-lg hover:border-primary transition-colors text-sm font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{{ t('equipo.common.back') }}</span>
        </button>
        <button
          v-if="!isEditMode"
          @click="deleteEmployee"
          class="flex items-center gap-2 px-4 py-2 bg-surface border-2 border-border text-destructive rounded-lg hover:border-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>{{ t('equipo.common.delete') }}</span>
        </button>
      </div>

      <!-- Header Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
        <div class="p-4 sm:p-6">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <!-- Employee Info -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div class="space-y-1 min-w-0">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {{ t('equipo.salarios.employee') }}
                </p>
                <p class="text-sm sm:text-base font-semibold text-text-primary truncate">
                  {{ employee.name }}
                </p>
                <p class="text-xs text-text-secondary truncate">
                  {{ getEmploymentTypeLabel(employee.employment_type) }}
                </p>
              </div>
            </div>

            <!-- Salary Info -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {{ t('equipo.salarios.monthlySalary') }}
                </p>
                <p class="text-sm sm:text-lg font-semibold text-primary">
                  {{ employee.calculated_salary ? formatCurrency(employee.calculated_salary) : t('equipo.salarios.notConfigured') }}
                </p>
                <p v-if="employee.salary_type === 'smmlv' && employee.multiplier" class="text-xs text-text-secondary">
                  {{ employee.multiplier }}x SMMLV
                </p>
              </div>
            </div>

            <!-- Total Paid -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  {{ t('equipo.salarios.totalPaidYear', { year: new Date().getFullYear() }) }}
                </p>
                <p class="text-sm sm:text-lg font-semibold text-primary">
                  {{ formatCurrency(employee.total_paid_this_year || 0) }}
                </p>
                <p class="text-xs text-text-secondary">
                  {{ t('equipo.salarios.paymentCount', { count: employee.payments_count || 0 }) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Salary Configuration Details -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
        <div class="p-4 sm:p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>{{ t('equipo.salarios.configTitle') }}</span>
            </h3>
            <button
              v-if="!isEditMode"
              @click="toggleEditMode"
              class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
            >
              {{ t('equipo.common.edit') }}
            </button>
          </div>

          <!-- View Mode -->
          <div v-if="!isEditMode">
            <div class="overflow-x-auto">
              <table class="w-full border-2 border-border rounded-lg">
                <thead class="bg-surface-secondary">
                  <tr>
                    <th class="px-4 py-3 text-start text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border w-1/3">
                      {{ t('equipo.salarios.field') }}
                    </th>
                    <th class="px-4 py-3 text-start text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      {{ t('equipo.salarios.value') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-surface divide-y divide-border">
                  <!-- Employment Type Row -->
                  <tr class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                      {{ t('equipo.salarios.contractType') }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary">
                      <span class="font-medium">{{ employee.employment_type ? getEmploymentTypeLabel(employee.employment_type) : t('equipo.salarios.notConfigured') }}</span>
                    </td>
                  </tr>

                  <!-- Type Row — hidden for daily workers -->
                  <tr v-if="employee.employment_type !== 'daily'" class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                      {{ t('equipo.salarios.salaryType') }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary">
                      <span class="font-medium">{{ employee.salary_type ? getSalaryTypeLabel(employee.salary_type) : t('equipo.salarios.notConfigured') }}</span>
                    </td>
                  </tr>

                  <!-- Multiplier Row (if SMMLV) -->
                  <tr v-if="employee.salary_type === 'smmlv' && employee.employment_type !== 'daily'" class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                      {{ t('equipo.salarios.smmlvMultiplier') }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary">
                      <span class="font-medium">{{ employee.multiplier || '-' }}x</span>
                    </td>
                  </tr>

                  <!-- Fixed Amount Row — hidden for daily workers -->
                  <tr v-if="employee.salary_type === 'fixed' && employee.employment_type !== 'daily'" class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                      {{ t('equipo.salarios.fixedAmount') }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary">
                      <span class="font-bold text-primary text-lg">{{ formatCurrency(employee.fixed_amount || 0) }}</span>
                    </td>
                  </tr>

                  <!-- Daily Rate Row (if daily worker) -->
                  <tr v-if="employee.employment_type === 'daily'" class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                      {{ t('equipo.salarios.dailyRate') }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary">
                      <span class="font-bold text-primary text-lg">{{ formatCurrency(employee.daily_rate || 0) }}</span>
                    </td>
                  </tr>

                  <!-- Calculated Salary Row — hidden for daily workers (no fixed monthly salary) -->
                  <tr v-if="employee.employment_type !== 'daily'" class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                      {{ t('equipo.salarios.calculated') }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary">
                      <span class="font-bold text-primary text-lg">{{ employee.calculated_salary ? formatCurrency(employee.calculated_salary) : '-' }}</span>
                    </td>
                  </tr>

                  <!-- Notes Row -->
                  <tr class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-sm font-medium text-text-secondary">
                      {{ t('equipo.common.notes') }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary">
                      <span class="font-medium">{{ employee.salary_notes || t('equipo.salarios.noNotes') }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Edit Mode -->
          <form v-else @submit.prevent="saveChanges" novalidate>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <!-- Employment Type -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('equipo.salarios.contractTypeReq') }}
                </label>
                <select
                  v-model="editForm.employmentType"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <option value="employee">{{ t('equipo.salarios.employee') }}</option>
                  <option value="contractor">{{ t('equipo.salarios.contractor') }}</option>
                  <option value="daily">{{ t('equipo.salarios.dayLaborer') }}</option>
                </select>
              </div>

              <!-- Daily Rate (if daily worker) -->
              <div v-if="editForm.employmentType === 'daily'">
                <label class="block text-sm font-medium text-text-primary mb-2">
                    {{ t('equipo.salarios.dailyRateReq') }}
                </label>
                <div class="relative">
                  <span class="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                  <UiDecimalInput
                    v-model="editForm.dailyRate"
                    :min="0"
                    :precision="2"
                    class="w-full ps-8 pe-4 py-2.5"
                  />
                </div>
              </div>

              <!-- Salary Type -->
              <!-- Salary type + dependent fields — hidden for daily workers -->
              <template v-if="editForm.employmentType !== 'daily'">
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    {{ t('equipo.salarios.salaryTypeReq') }}
                  </label>
                  <select
                    v-model="editForm.salaryType"
                    class="input-base w-full px-4 py-2"
                  >
                    <option v-if="editForm.employmentType !== 'contractor'" value="smmlv">{{ t('equipo.salarios.minimumWage') }} (SMMLV)</option>
                    <option value="fixed">{{ t('equipo.salarios.fixed') }}</option>
                    <option value="hourly">{{ t('equipo.salarios.hourly') }}</option>
                  </select>
                </div>

                <!-- Multiplier (if SMMLV) -->
                <div v-if="editForm.salaryType === 'smmlv'">
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    {{ t('equipo.salarios.multiplierReq') }}
                  </label>
                  <UiDecimalInput
                    v-model="editForm.minimumWageMultiplier"
                    :precision="1"
                    :min="0.5"
                    class="w-full px-4 py-2"
                  />
                </div>

                <!-- Fixed Amount (if fixed) -->
                <div v-if="editForm.salaryType === 'fixed'">
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    {{ t('equipo.salarios.fixedAmountReq') }}
                  </label>
                  <div class="relative">
                    <span class="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                    <UiDecimalInput
                      v-model="editForm.fixedAmount"
                      :min="0"
                      :precision="2"
                      class="w-full ps-8 pe-4 py-2"
                    />
                  </div>
                </div>

                <!-- Hourly Rate (if hourly) -->
                <div v-if="editForm.salaryType === 'hourly'">
                  <label class="block text-sm font-medium text-text-primary mb-2">
                    {{ t('equipo.salarios.hourlyRateReq') }}
                  </label>
                  <div class="relative">
                    <span class="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                    <UiDecimalInput
                      v-model="editForm.hourlyRate"
                      :min="0"
                      :precision="2"
                      class="w-full ps-8 pe-4 py-2"
                    />
                  </div>
                </div>
              </template>

              <!-- Notes -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  {{ t('equipo.salarios.notesOptional') }}
                </label>
                <textarea
                  v-model="editForm.notes"
                  rows="3"
                  :placeholder="t('equipo.salarios.notesPlaceholder')"
                  class="input-base w-full px-4 py-2 resize-none"
                ></textarea>
              </div>
            </div>

            <!-- Error message -->
            <div v-if="error" class="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p class="text-sm text-red-600 font-medium">{{ error }}</p>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-4 border-t border-border">
              <button
                @click="cancelEdit"
                type="button"
                class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-text-secondary hover:bg-background transition-colors font-medium"
              >
                {{ t('equipo.common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {{ isSubmitting ? t('equipo.common.saving') : t('equipo.salarios.saveChanges') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Change History Table -->
      <div v-if="payments && payments.length > 0" class="mt-6">
        <EquipoSalaryChangeHistoryTable :payment-id="payments[0].id" />
      </div>

      <!-- Payments Table -->
      <div class="bg-surface border-2 border-border rounded-lg mt-6">
        <div class="p-4 sm:p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary">{{ t('equipo.salarios.paymentHistory') }}</h3>
            <NuxtLink
              :to="`/equipo/salarios/${employeeId}/pago`"
              class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              {{ t('equipo.salarios.newPayment') }}
            </NuxtLink>
          </div>

          <!-- Loading State -->
          <div v-if="isLoadingPayments" class="flex justify-center py-8">
            <CommonsTheCustomLoader size="medium" />
          </div>

          <!-- Empty State -->
          <div v-else-if="payments.length === 0" class="text-center py-8">
            <p class="text-sm text-text-secondary">{{ t('equipo.salarios.noPayments') }}</p>
          </div>

          <!-- Payments Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-start py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.common.period') }}</th>
                  <th class="text-start py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.common.date') }}</th>
                  <th class="text-end py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.common.amount') }}</th>
                  <th class="text-start py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.common.method') }}</th>
                  <th class="text-start py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.common.status') }}</th>
                  <th class="text-center py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.salarios.files') }}</th>
                  <th class="text-center py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.common.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="payment in payments"
                  :key="payment.id"
                  class="border-b border-border hover:bg-background transition-colors"
                >
                  <td class="py-3 px-4 text-sm text-text-primary">{{ payment.period_month }}</td>
                  <td class="py-3 px-4 text-sm text-text-secondary">{{ formatDate(payment.payment_date) }}</td>
                  <td class="py-3 px-4 text-sm text-end font-medium">
                    <span class="text-primary">{{ formatCurrency(payment.net_pay ?? payment.payment_amount) }}</span>
                    <span v-if="payment.net_pay && payment.net_pay !== payment.payment_amount" class="block text-xs text-text-tertiary">
                      {{ t('equipo.salarios.gross') }}: {{ formatCurrency(payment.payment_amount) }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-sm text-text-secondary">{{ payment.payment_method }}</td>
                  <td class="py-3 px-4">
                    <span
                      :class="{
                        'bg-green-100 text-green-800': payment.status === 'paid',
                        'bg-yellow-100 text-yellow-800': payment.status === 'pending',
                        'bg-red-100 text-red-800': payment.status === 'cancelled'
                      }"
                      class="px-2 py-1 rounded-full text-xs font-medium"
                    >
                      {{ getStatusLabel(payment.status) }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center justify-center gap-2">
                      <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span class="text-sm text-text-secondary">{{ payment.attachments?.length || 0 }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex justify-center gap-2">
                      <NuxtLink
                        :to="`/equipo/salarios/pagos/${payment.id}`"
                        class="p-2 text-text-secondary hover:text-primary transition-colors rounded-lg"
                        :title="t('equipo.salarios.viewDetails')"
                        :aria-label="t('equipo.salarios.viewPaymentDetails')"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </NuxtLink>
                      <button
                        v-if="payment.status === 'pending'"
                        @click="markAsPaid(payment)"
                        class="p-2 text-green-600 hover:text-green-700 transition-colors rounded-lg"
                        :title="t('equipo.salarios.markPaid')"
                        :aria-label="t('equipo.salarios.markPaid')"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <!-- Prestaciones Sociales (solo empleados y jornaleros) -->
      <div v-if="employee.employment_type && employee.employment_type !== 'contractor'" class="bg-surface border-2 border-border rounded-lg mt-6">
        <div class="p-4 sm:p-6">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-1">{{ t('equipo.salarios.benefits') }}</h3>
          <p class="text-sm text-text-secondary mb-4">{{ t('equipo.salarios.benefitsDescription') }}</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <NuxtLink
              :to="`/equipo/salarios/${employeeId}/prestaciones/prima`"
              class="flex flex-col items-center gap-2 p-4 bg-background border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <span class="text-sm font-medium text-text-primary">{{ t('equipo.salarios.prima') }}</span>
              <span class="text-xs text-text-secondary">{{ t('equipo.salarios.primaMonths') }}</span>
            </NuxtLink>
            <NuxtLink
              :to="`/equipo/salarios/${employeeId}/prestaciones/cesantias`"
              class="flex flex-col items-center gap-2 p-4 bg-background border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span class="text-sm font-medium text-text-primary">{{ t('equipo.salarios.cesantias') }}</span>
              <span class="text-xs text-text-secondary">{{ t('equipo.salarios.cesantiasMonths') }}</span>
            </NuxtLink>
            <NuxtLink
              :to="`/equipo/salarios/${employeeId}/prestaciones/int-cesantias`"
              class="flex flex-col items-center gap-2 p-4 bg-background border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span class="text-sm font-medium text-text-primary">{{ t('equipo.salarios.intCesantias') }}</span>
              <span class="text-xs text-text-secondary">{{ t('equipo.salarios.annualRate') }}</span>
            </NuxtLink>
            <NuxtLink
              :to="`/equipo/salarios/${employeeId}/prestaciones/vacaciones`"
              class="flex flex-col items-center gap-2 p-4 bg-background border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm font-medium text-text-primary">{{ t('equipo.salarios.vacaciones') }}</span>
              <span class="text-xs text-text-secondary">{{ t('equipo.salarios.compensation') }}</span>
            </NuxtLink>
            <NuxtLink
              :to="`/equipo/salarios/${employeeId}/prestaciones/dotacion`"
              class="flex flex-col items-center gap-2 p-4 bg-background border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span class="text-sm font-medium text-text-primary">{{ t('equipo.salarios.dotacion') }}</span>
              <span class="text-xs text-text-secondary">{{ t('equipo.salarios.vacMonths') }}</span>
            </NuxtLink>
            <NuxtLink
              :to="`/equipo/salarios/${employeeId}/prestaciones/horas-extras`"
              class="flex flex-col items-center gap-2 p-4 bg-background border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm font-medium text-text-primary">{{ t('equipo.salarios.horasExtras') }}</span>
              <span class="text-xs text-text-secondary">{{ t('equipo.salarios.art168') }}</span>
            </NuxtLink>
            <NuxtLink
              :to="`/equipo/salarios/${employeeId}/prestaciones/liquidacion`"
              class="flex flex-col items-center gap-2 p-4 bg-red-50 border-2 border-red-200 rounded-xl hover:border-red-500 hover:bg-red-100 transition-all text-center"
            >
              <svg class="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span class="text-sm font-medium text-red-700">{{ t('equipo.salarios.liquidacion') }}</span>
              <span class="text-xs text-red-500">{{ t('equipo.salarios.retirement') }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
