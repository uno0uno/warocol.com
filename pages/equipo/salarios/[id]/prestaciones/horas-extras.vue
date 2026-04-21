<template>
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
    <!-- Left Column: Form + History -->
    <div class="xl:col-span-2 space-y-6">

      <!-- Employee Info Card -->
      <div class="bg-surface border-2 border-border rounded-xl p-6 md:p-8 shadow-sm">
        <div class="mb-8 pb-6 border-b border-border">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Empleado</h3>
          <div v-if="!employee" class="flex items-center gap-4 bg-background rounded-lg p-4 animate-pulse">
            <div class="w-12 h-12 rounded-full bg-titan-200 flex-shrink-0" />
            <div class="space-y-2 flex-1">
              <div class="h-4 w-36 rounded bg-titan-200" />
              <div class="h-3 w-48 rounded bg-titan-200" />
            </div>
          </div>
          <div v-else class="flex items-center gap-4 bg-background rounded-lg p-4">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
              :style="{ backgroundColor: employee.color }"
            >
              {{ employee.initials }}
            </div>
            <div>
              <p class="font-medium text-text-primary">{{ employee.name }}</p>
              <p class="text-sm text-text-secondary">{{ employee.email }}</p>
            </div>
          </div>
        </div>

        <!-- Overtime form -->
        <form v-if="employee" @submit.prevent="handleSubmit" novalidate>
          <div class="space-y-6">
            <h3 class="text-lg font-semibold text-text-primary">Registro de Horas Extras</h3>

            <!-- Salary info banner -->
            <div v-if="employee.hourly_rate" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-sm text-blue-800">
                <strong>Tarifa horaria configurada:</strong>
                {{ formatCurrency(Number(employee.hourly_rate)) }}/h
                <span class="text-blue-600 ml-1">(precargada abajo, editable)</span>
              </p>
            </div>

            <!-- Period month -->
            <div>
              <label for="period_month" class="block text-sm font-medium text-text-primary mb-2">
                Período (mes) *
              </label>
              <input
                id="period_month"
                v-model="form.period_month"
                type="month"
                required
                class="input-base w-full px-4 py-2"
                aria-label="Período de las horas extras (mes)"
              />
              <p class="text-xs text-text-tertiary mt-1">Mes en que se trabajaron las horas extras</p>
            </div>

            <!-- Base hourly rate -->
            <div>
              <label for="base_hourly_rate" class="block text-sm font-medium text-text-primary mb-2">
                Tarifa horaria base *
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                <input
                  id="base_hourly_rate"
                  v-model.number="form.base_hourly_rate"
                  type="number"
                  min="1"
                  step="any"
                  required
                  class="input-base w-full pl-8 pr-4 py-2"
                  placeholder="0"
                  aria-label="Tarifa horaria base"
                />
              </div>
              <p class="text-xs text-text-tertiary mt-1">
                Tarifa ordinaria por hora. Referencia: salario mensual ÷ 240.
                {{ employee?.calculated_salary ? `Ej: ${formatCurrency(Math.round(Number(employee.calculated_salary) / 240))}/h` : '' }}
              </p>
            </div>

            <!-- Hours by type -->
            <div>
              <p class="text-sm font-medium text-text-primary mb-3">Horas trabajadas por tipo *</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                <!-- Diurna -->
                <div class="bg-background rounded-lg p-4 border border-border">
                  <label for="hours_diurna" class="block text-sm font-medium text-text-primary mb-1">
                    Diurna
                  </label>
                  <p class="text-xs text-text-tertiary mb-2">+25% sobre tarifa ordinaria (×1.25)</p>
                  <input
                    id="hours_diurna"
                    v-model.number="form.hours_diurna"
                    type="number"
                    min="0"
                    step="0.5"
                    class="input-base w-full px-3 py-2"
                    placeholder="0"
                    aria-label="Horas extras diurnas"
                  />
                  <p v-if="form.hours_diurna > 0 && form.base_hourly_rate > 0" class="text-xs text-emerald-700 mt-1 font-medium">
                    = {{ formatCurrency(Math.round(form.hours_diurna * form.base_hourly_rate * 1.25)) }}
                  </p>
                </div>

                <!-- Nocturna -->
                <div class="bg-background rounded-lg p-4 border border-border">
                  <label for="hours_nocturna" class="block text-sm font-medium text-text-primary mb-1">
                    Nocturna
                  </label>
                  <p class="text-xs text-text-tertiary mb-2">+75% sobre tarifa ordinaria (×1.75)</p>
                  <input
                    id="hours_nocturna"
                    v-model.number="form.hours_nocturna"
                    type="number"
                    min="0"
                    step="0.5"
                    class="input-base w-full px-3 py-2"
                    placeholder="0"
                    aria-label="Horas extras nocturnas"
                  />
                  <p v-if="form.hours_nocturna > 0 && form.base_hourly_rate > 0" class="text-xs text-emerald-700 mt-1 font-medium">
                    = {{ formatCurrency(Math.round(form.hours_nocturna * form.base_hourly_rate * 1.75)) }}
                  </p>
                </div>

                <!-- Dominical/festivo diurna -->
                <div class="bg-background rounded-lg p-4 border border-border">
                  <label for="hours_dom_diurna" class="block text-sm font-medium text-text-primary mb-1">
                    Dominical/festivo diurna
                  </label>
                  <p class="text-xs text-text-tertiary mb-2">+100% sobre tarifa ordinaria (×2.00)</p>
                  <input
                    id="hours_dom_diurna"
                    v-model.number="form.hours_dominical_diurna"
                    type="number"
                    min="0"
                    step="0.5"
                    class="input-base w-full px-3 py-2"
                    placeholder="0"
                    aria-label="Horas extras dominical o festivo diurnas"
                  />
                  <p v-if="form.hours_dominical_diurna > 0 && form.base_hourly_rate > 0" class="text-xs text-emerald-700 mt-1 font-medium">
                    = {{ formatCurrency(Math.round(form.hours_dominical_diurna * form.base_hourly_rate * 2.0)) }}
                  </p>
                </div>

                <!-- Dominical/festivo nocturna -->
                <div class="bg-background rounded-lg p-4 border border-border">
                  <label for="hours_dom_nocturna" class="block text-sm font-medium text-text-primary mb-1">
                    Dominical/festivo nocturna
                  </label>
                  <p class="text-xs text-text-tertiary mb-2">+150% sobre tarifa ordinaria (×2.50)</p>
                  <input
                    id="hours_dom_nocturna"
                    v-model.number="form.hours_dominical_nocturna"
                    type="number"
                    min="0"
                    step="0.5"
                    class="input-base w-full px-3 py-2"
                    placeholder="0"
                    aria-label="Horas extras dominical o festivo nocturnas"
                  />
                  <p v-if="form.hours_dominical_nocturna > 0 && form.base_hourly_rate > 0" class="text-xs text-emerald-700 mt-1 font-medium">
                    = {{ formatCurrency(Math.round(form.hours_dominical_nocturna * form.base_hourly_rate * 2.5)) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Computed total -->
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p class="text-sm text-text-secondary mb-1">Total calculado</p>
              <p class="text-2xl font-bold text-emerald-700">{{ formatCurrency(computedTotal) }}</p>
              <p v-if="totalHours === 0" class="text-xs text-text-tertiary mt-1">Ingresa horas y tarifa para calcular</p>
              <p v-else class="text-xs text-text-tertiary mt-1">
                {{ totalHours.toFixed(1) }}h totales · Tarifa base {{ formatCurrency(form.base_hourly_rate || 0) }}/h
              </p>
            </div>

            <!-- Payment method -->
            <div>
              <label for="payment_method" class="block text-sm font-medium text-text-primary mb-2">
                Método de pago
              </label>
              <select
                id="payment_method"
                v-model="form.payment_method"
                class="input-base w-full px-4 py-2"
                aria-label="Método de pago de las horas extras"
              >
                <option value="">Sin especificar</option>
                <option value="transfer">Transferencia</option>
                <option value="cash">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
                <option value="check">Cheque</option>
              </select>
            </div>

            <!-- Payment date -->
            <div>
              <label for="payment_date" class="block text-sm font-medium text-text-primary mb-2">
                Fecha de pago *
              </label>
              <input
                id="payment_date"
                v-model="form.payment_date"
                type="date"
                required
                class="input-base w-full px-4 py-2"
                aria-label="Fecha de pago de las horas extras"
              />
            </div>

            <!-- Notes -->
            <div>
              <label for="notes" class="block text-sm font-medium text-text-primary mb-2">
                Notas
              </label>
              <textarea
                id="notes"
                v-model="form.notes"
                class="input-base w-full px-4 py-2 min-h-[80px]"
                placeholder="Notas adicionales (opcional)"
                aria-label="Notas adicionales"
              ></textarea>
            </div>

            <!-- Error message -->
            <div v-if="errorMessage" role="alert" class="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-4">
              <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm text-red-700">{{ errorMessage }}</p>
            </div>

            <!-- Form actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                :disabled="isSubmitting || !isFormValid"
                class="flex-1 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-emerald-500/20 min-h-[44px]"
              >
                <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
                <span>{{ isSubmitting ? 'Registrando...' : 'Registrar Horas Extras' }}</span>
              </button>
              <NuxtLink
                :to="`/equipo/salarios/${employeeId}`"
                class="px-6 py-3 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-colors font-medium text-center min-h-[44px] flex items-center"
              >
                Cancelar
              </NuxtLink>
            </div>
          </div>
        </form>

        <!-- Loading skeleton -->
        <div v-else class="space-y-4 animate-pulse">
          <div class="h-5 w-48 rounded bg-titan-200" />
          <div class="h-10 rounded bg-titan-200" />
          <div class="h-10 rounded bg-titan-200" />
        </div>
      </div>

      <!-- History Section -->
      <div class="bg-surface border-2 border-border rounded-xl p-6 md:p-8 shadow-sm">
        <h3 class="text-lg font-semibold text-text-primary mb-4">Historial de Horas Extras</h3>

        <div v-if="isLoadingHistory" class="space-y-3 animate-pulse">
          <div v-for="i in 3" :key="i" class="h-14 rounded bg-titan-200" />
        </div>

        <UiResponsiveDataView
          v-else
          :data="overtimeHistory"
          :columns="historyColumns"
          item-key="id"
          empty-message="Sin horas extras registradas"
          empty-sub-message="Los pagos de horas extras aparecerán aquí"
        >
          <template #cell-period_month="{ item }">
            <span class="font-medium text-text-primary">{{ formatPeriodMonth(item.period_month) }}</span>
          </template>
          <template #cell-hours_summary="{ item }">
            <span class="text-text-secondary text-sm">{{ formatHoursSummary(item) }}</span>
          </template>
          <template #cell-total_amount="{ item }">
            <span class="font-semibold text-emerald-700">{{ formatCurrency(Number(item.total_amount)) }}</span>
          </template>
          <template #cell-payment_date="{ item }">
            <span class="text-text-secondary text-sm">{{ formatDate(item.payment_date) }}</span>
          </template>
          <template #cell-payment_method="{ item }">
            <span class="text-text-secondary text-sm capitalize">{{ item.payment_method || '—' }}</span>
          </template>

          <!-- Mobile card -->
          <template #card="{ item }">
            <div class="bg-surface border border-border rounded-xl p-4 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-text-primary">{{ formatPeriodMonth(item.period_month) }}</span>
                <span class="font-bold text-emerald-700 text-lg">{{ formatCurrency(Number(item.total_amount)) }}</span>
              </div>
              <p class="text-sm text-text-secondary">{{ formatHoursSummary(item) }}</p>
              <div class="flex items-center gap-4 text-sm text-text-secondary">
                <span>{{ formatDate(item.payment_date) }}</span>
                <span v-if="item.payment_method">· {{ item.payment_method }}</span>
              </div>
              <p v-if="item.notes" class="text-xs text-text-tertiary">{{ item.notes }}</p>
            </div>
          </template>
        </UiResponsiveDataView>
      </div>
    </div>

    <!-- Right Column: Summary -->
    <div class="xl:col-span-1">
      <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
        <h3 class="text-lg font-semibold text-text-primary mb-4">Resumen</h3>

        <div class="bg-background rounded-lg p-4 border border-border space-y-3">
          <div>
            <p class="text-sm text-text-secondary mb-1">Empleado</p>
            <p class="font-medium text-text-primary">{{ employee?.name || '—' }}</p>
          </div>
          <div>
            <p class="text-sm text-text-secondary mb-1">Período</p>
            <p class="font-medium text-text-primary">
              {{ form.period_month ? formatPeriodMonth(form.period_month) : 'Sin seleccionar' }}
            </p>
          </div>
          <div>
            <p class="text-sm text-text-secondary mb-1">Total horas</p>
            <p class="font-medium text-text-primary">{{ totalHours.toFixed(1) }}h</p>
          </div>
          <div>
            <p class="text-sm text-text-secondary mb-1">Tarifa base</p>
            <p class="font-medium text-text-primary">
              {{ form.base_hourly_rate ? `${formatCurrency(form.base_hourly_rate)}/h` : '—' }}
            </p>
          </div>
          <div class="pt-3 border-t border-border">
            <p class="text-sm text-text-secondary mb-1">Total horas extras</p>
            <p class="text-2xl font-bold text-emerald-600">{{ formatCurrency(computedTotal) }}</p>
            <p class="text-xs text-text-tertiary mt-0.5">Asiento: DR 5110 / CR Bancos</p>
          </div>
        </div>

        <!-- Info box -->
        <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-xs text-blue-800 font-medium mb-1">Horas Extras (Art. 168-170 C.S.T.)</p>
          <ul class="text-xs text-blue-700 space-y-1">
            <li>Diurna: +25% (×1.25)</li>
            <li>Nocturna: +75% (×1.75)</li>
            <li>Dom./fest. diurna: +100% (×2.00)</li>
            <li>Dom./fest. nocturna: +150% (×2.50)</li>
          </ul>
          <p class="text-xs text-blue-600 mt-2">Aplica a todos los tipos de contrato.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const toast = useToast()
const employeeId = route.params.id as string

useHead({ title: 'Horas Extras - Equipo' })

const { formatDate } = useFormatters()

// Default period_month = current YYYY-MM
const defaultPeriodMonth = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
}).format(new Date())

// Form state
const form = reactive({
  period_month: defaultPeriodMonth,
  base_hourly_rate: null as number | null,
  hours_diurna: 0,
  hours_nocturna: 0,
  hours_dominical_diurna: 0,
  hours_dominical_nocturna: 0,
  payment_method: 'transfer',
  payment_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()),
  notes: '',
})

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

// Fetch employee data
const { data: employeeData } = useAsyncData(
  `employee-overtime-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}`),
  {
    server: false,
    default: () => null,
    transform: (response: any) => response?.data,
  }
)

const employee = computed(() => employeeData.value)

// Pre-fill hourly rate from employee config when it loads
watch(employee, (emp) => {
  if (emp?.hourly_rate && !form.base_hourly_rate) {
    form.base_hourly_rate = Number(emp.hourly_rate)
  }
}, { immediate: true })

// Fetch history
const { data: historyData, pending: isLoadingHistory, refresh: refreshHistory } = useAsyncData(
  `overtime-history-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}/horas-extras`),
  {
    server: false,
    default: () => ({ data: [] }),
  }
)

const overtimeHistory = computed(() => (historyData.value as any)?.data || [])

// Computed totals
const totalHours = computed(() =>
  (form.hours_diurna || 0) +
  (form.hours_nocturna || 0) +
  (form.hours_dominical_diurna || 0) +
  (form.hours_dominical_nocturna || 0)
)

const computedTotal = computed(() => {
  if (!form.base_hourly_rate || form.base_hourly_rate <= 0) return 0
  const rate = form.base_hourly_rate
  return Math.round(
    (form.hours_diurna || 0) * rate * 1.25 +
    (form.hours_nocturna || 0) * rate * 1.75 +
    (form.hours_dominical_diurna || 0) * rate * 2.0 +
    (form.hours_dominical_nocturna || 0) * rate * 2.5
  )
})

// History table columns
const historyColumns = [
  { key: 'period_month',    label: 'Período',         sortable: false },
  { key: 'hours_summary',   label: 'Horas',           sortable: false },
  { key: 'total_amount',    label: 'Total',           sortable: false },
  { key: 'payment_date',    label: 'Fecha',           sortable: false },
  { key: 'payment_method',  label: 'Método',          sortable: false },
]

// Form validation
const isFormValid = computed(() => {
  if (!form.period_month) return false
  if (!form.base_hourly_rate || form.base_hourly_rate <= 0) return false
  if (totalHours.value <= 0) return false
  if (!form.payment_date) return false
  if (computedTotal.value <= 0) return false
  return true
})

// Formatters
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatPeriodMonth = (pm: string) => {
  if (!pm) return '—'
  const [year, month] = pm.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
}

const formatHoursSummary = (item: any) => {
  const parts: string[] = []
  if (Number(item.hours_diurna) > 0) parts.push(`${Number(item.hours_diurna)}h diurna`)
  if (Number(item.hours_nocturna) > 0) parts.push(`${Number(item.hours_nocturna)}h nocturna`)
  if (Number(item.hours_dominical_diurna) > 0) parts.push(`${Number(item.hours_dominical_diurna)}h dom. diurna`)
  if (Number(item.hours_dominical_nocturna) > 0) parts.push(`${Number(item.hours_dominical_nocturna)}h dom. nocturna`)
  return parts.join(' · ') || '—'
}

// Submit
const handleSubmit = async () => {
  if (!isFormValid.value) return
  errorMessage.value = null
  isSubmitting.value = true

  try {
    const payload = {
      period_month: form.period_month,
      base_hourly_rate: form.base_hourly_rate,
      hours_diurna: form.hours_diurna || 0,
      hours_nocturna: form.hours_nocturna || 0,
      hours_dominical_diurna: form.hours_dominical_diurna || 0,
      hours_dominical_nocturna: form.hours_dominical_nocturna || 0,
      total_amount: computedTotal.value,
      payment_method: form.payment_method || null,
      payment_date: form.payment_date ? `${form.payment_date}T00:00:00` : new Date().toISOString(),
      notes: form.notes || null,
    }

    await $fetch(`/api/salaries/employees/${employeeId}/horas-extras`, {
      method: 'POST',
      body: payload,
    })

    toast.add({ title: 'Horas extras registradas', color: 'green' })
    await refreshHistory()

    // Reset hour fields
    form.hours_diurna = 0
    form.hours_nocturna = 0
    form.hours_dominical_diurna = 0
    form.hours_dominical_nocturna = 0
    form.notes = ''

  } catch (err: any) {
    const detail = err?.data?.detail
    if (typeof detail === 'string') {
      errorMessage.value = detail
    } else {
      errorMessage.value = 'Error al registrar las horas extras. Intenta de nuevo.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>
