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

        <!-- Not eligible guard — not an employee or salary > 2 SMMLV -->
        <div
          v-if="employee && !isEligible"
          class="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center"
        >
          <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p class="font-semibold text-amber-900 mb-1">No elegible para dotación</p>
          <p v-if="employee.employment_type !== 'employee'" class="text-sm text-amber-700">
            La dotación aplica únicamente a empleados con contrato laboral.
            Este trabajador tiene tipo de contrato
            <strong>{{ employee.employment_type === 'daily' ? 'jornalero' : 'prestación de servicios' }}</strong>.
          </p>
          <p v-else class="text-sm text-amber-700">
            El salario configurado supera 2 SMMLV ($2.847.000). La dotación solo aplica a empleados
            que devenguen hasta dos salarios mínimos (Art. 230 CST).
          </p>
          <NuxtLink
            :to="`/equipo/salarios/${employeeId}`"
            class="mt-4 inline-block px-4 py-2 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors text-sm font-medium"
          >
            Volver al detalle
          </NuxtLink>
        </div>

        <!-- Dotación form — only for eligible employees -->
        <form v-else-if="employee" @submit.prevent="handleSubmit" novalidate>
          <div class="space-y-6">
            <h3 class="text-lg font-semibold text-text-primary">Registro de Dotación</h3>

            <!-- Salary info banner -->
            <div v-if="employee.calculated_salary" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-sm text-blue-800">
                <strong>Salario base configurado:</strong>
                {{ formatCurrency(Number(employee.calculated_salary)) }}
                <span class="text-blue-600 ml-1">
                  ({{ employee.salary_type === 'smmlv' ? `${employee.multiplier}x SMMLV` : employee.salary_type === 'hourly' ? 'Por horas' : 'Monto fijo' }})
                </span>
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Period selector -->
              <div>
                <label for="period" class="block text-sm font-medium text-text-primary mb-2">
                  Período de dotación *
                </label>
                <select
                  id="period"
                  v-model="form.period"
                  required
                  class="input-base w-full px-4 py-2"
                  :class="isPaidPeriod ? 'border-red-300 bg-red-50' : ''"
                >
                  <option value="" disabled>Seleccionar período</option>
                  <option
                    v-for="opt in periodOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}{{ paidPeriods.includes(opt.value) ? ' — YA REGISTRADO' : '' }}
                  </option>
                </select>
                <p v-if="isPaidPeriod" class="text-xs text-red-600 mt-1">
                  Este período ya tiene una dotación registrada para este empleado.
                </p>
                <p v-else class="text-xs text-text-tertiary mt-1">
                  Abr = antes del 30 Abr · Ago = antes del 31 Ago · Dic = antes del 20 Dic
                </p>
              </div>

              <!-- Year -->
              <div>
                <label for="year" class="block text-sm font-medium text-text-primary mb-2">
                  Año *
                </label>
                <input
                  id="year"
                  v-model.number="form.year"
                  type="number"
                  min="2020"
                  max="2100"
                  step="1"
                  required
                  class="input-base w-full px-4 py-2"
                  aria-label="Año de la dotación"
                />
              </div>
            </div>

            <!-- Items description -->
            <div>
              <label for="items_description" class="block text-sm font-medium text-text-primary mb-2">
                Artículos entregados
              </label>
              <textarea
                id="items_description"
                v-model="form.items_description"
                class="input-base w-full px-4 py-2 min-h-[80px]"
                placeholder="Ej: 2 camisas, 1 pantalón, 1 par de zapatos antideslizantes"
                aria-label="Descripción de artículos entregados"
              ></textarea>
            </div>

            <!-- Total amount -->
            <div>
              <label for="total_amount" class="block text-sm font-medium text-text-primary mb-2">
                Valor total de la dotación *
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                <input
                  id="total_amount"
                  v-model.number="form.total_amount"
                  type="number"
                  min="1"
                  step="any"
                  required
                  class="input-base w-full pl-8 pr-4 py-2 text-lg font-semibold"
                  placeholder="0"
                  aria-label="Valor total de la dotación"
                />
              </div>
              <p class="text-xs text-text-tertiary mt-1">Costo de los artículos entregados (asiento: DR 5115 / CR Bancos)</p>
            </div>

            <!-- Payment method -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-3">Metodo de Pago *</label>
              <div v-if="isLoadingMethods" class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="flex flex-col items-center p-4 border-2 border-border rounded-xl animate-pulse"
                >
                  <div class="w-10 h-10 rounded-full bg-titan-200 mb-2" />
                  <div class="h-3 w-14 rounded bg-titan-200" />
                </div>
              </div>
              <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label
                  v-for="method in paymentMethods"
                  :key="method.value"
                  class="relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all min-h-[44px]"
                  :class="form.payment_method === method.value ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'"
                >
                  <input
                    type="radio"
                    v-model="form.payment_method"
                    :value="method.value"
                    class="sr-only"
                    :aria-label="method.label"
                  />
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                    :class="form.payment_method === method.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'"
                  >
                    <component :is="method.icon" class="w-5 h-5" />
                  </div>
                  <span class="text-sm font-medium text-text-primary text-center">{{ method.label }}</span>
                </label>
              </div>
            </div>

            <!-- Payment date -->
            <div>
              <label for="payment_date" class="block text-sm font-medium text-text-primary mb-2">
                Fecha de Entrega *
              </label>
              <input
                id="payment_date"
                v-model="form.payment_date"
                type="date"
                required
                class="input-base w-full px-4 py-2"
                aria-label="Fecha de entrega de la dotación"
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
            <div v-if="errorMessage" role="alert" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-sm text-red-700">{{ errorMessage }}</p>
            </div>

            <!-- Form actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                :disabled="isSubmitting || !isFormValid || isPaidPeriod"
                class="flex-1 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-emerald-500/20 min-h-[44px]"
              >
                <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
                <span>{{ isSubmitting ? 'Registrando...' : 'Registrar Dotación' }}</span>
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

        <!-- Loading skeleton for form -->
        <div v-else class="space-y-4 animate-pulse">
          <div class="h-5 w-48 rounded bg-titan-200" />
          <div class="h-10 rounded bg-titan-200" />
          <div class="h-10 rounded bg-titan-200" />
        </div>
      </div>

      <!-- History Section -->
      <div class="bg-surface border-2 border-border rounded-xl p-6 md:p-8 shadow-sm">
        <h3 class="text-lg font-semibold text-text-primary mb-4">Historial de Dotaciones</h3>

        <div v-if="isLoadingHistory" class="space-y-3 animate-pulse">
          <div v-for="i in 3" :key="i" class="h-14 rounded bg-titan-200" />
        </div>

        <UiResponsiveDataView
          v-else
          :data="dotacionHistory"
          :columns="historyColumns"
          item-key="id"
          empty-message="Sin dotaciones registradas"
          empty-sub-message="Las dotaciones entregadas aparecerán aquí"
        >
          <!-- Desktop cell slots -->
          <template #cell-period="{ item }">
            <span class="font-medium text-text-primary">{{ formatPeriod(item.period, item.year) }}</span>
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
          <template #cell-items_description="{ item }">
            <span class="text-text-secondary text-sm">{{ item.items_description || '—' }}</span>
          </template>

          <!-- Mobile card -->
          <template #card="{ item }">
            <div class="bg-surface border border-border rounded-xl p-4 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-text-primary">{{ formatPeriod(item.period, item.year) }}</span>
                <span class="font-bold text-emerald-700 text-lg">{{ formatCurrency(Number(item.total_amount)) }}</span>
              </div>
              <div class="flex items-center gap-4 text-sm text-text-secondary">
                <span>{{ formatDate(item.payment_date) }}</span>
                <span v-if="item.payment_method">· {{ item.payment_method }}</span>
              </div>
              <p v-if="item.items_description" class="text-xs text-text-tertiary">{{ item.items_description }}</p>
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
              {{ form.period ? formatPeriod(form.period, form.year) : 'Sin seleccionar' }}
            </p>
          </div>
          <div>
            <p class="text-sm text-text-secondary mb-1">Metodo de Pago</p>
            <p class="font-medium text-text-primary">{{ selectedMethodLabel || 'Sin seleccionar' }}</p>
          </div>
          <div>
            <p class="text-sm text-text-secondary mb-1">Fecha</p>
            <p class="font-medium text-text-primary">
              {{ form.payment_date ? formatDate(form.payment_date) : 'Sin seleccionar' }}
            </p>
          </div>
          <div class="pt-3 border-t border-border">
            <p class="text-sm text-text-secondary mb-1">Valor dotación</p>
            <p class="text-2xl font-bold text-emerald-600">{{ formatCurrency(form.total_amount || 0) }}</p>
            <p class="text-xs text-text-tertiary mt-0.5">Asiento: DR 5115 / CR Bancos</p>
          </div>
        </div>

        <!-- Info box -->
        <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-xs text-blue-800 font-medium mb-1">Dotación (Art. 230 CST)</p>
          <p class="text-xs text-blue-700">
            Para empleados que devenguen hasta 2 SMMLV ($2.847.000 en 2026).
            Tres períodos: 30 Abr · 31 Ago · 20 Dic.
            Incluye calzado, vestido de trabajo y herramientas.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { useFormatters } from '~/composables/useFormatters'
import { SLUG_ICON_MAP, SLUG_ICON_FALLBACK } from '~/utils/paymentDefaults'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const toast = useToast()
const employeeId = route.params.id as string

useHead({ title: 'Dotación - Equipo' })

const { formatDate } = useFormatters()

// Payment methods
const { paymentGroups, fetchPaymentMethods, isLoading: isLoadingMethods } = usePaymentMethods()
fetchPaymentMethods()

const paymentMethods = computed(() => {
  const items: { value: string; label: string; icon: any }[] = []
  for (const g of paymentGroups.value) {
    const icon = SLUG_ICON_MAP[g.slug] ?? SLUG_ICON_FALLBACK
    if (g.methods.length) {
      for (const m of g.methods) {
        items.push({ value: m.id, label: m.name, icon })
      }
    } else {
      items.push({ value: g.slug, label: g.name, icon })
    }
  }
  return items
})

// Period options: current year + previous year
const periodOptions = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const prevYear = year - 1
  return [
    { value: `${year}-APR`, label: `${year} — Abril (30 Abr)` },
    { value: `${year}-AUG`, label: `${year} — Agosto (31 Ago)` },
    { value: `${year}-DEC`, label: `${year} — Diciembre (20 Dic)` },
    { value: `${prevYear}-APR`, label: `${prevYear} — Abril (30 Abr)` },
    { value: `${prevYear}-AUG`, label: `${prevYear} — Agosto (31 Ago)` },
    { value: `${prevYear}-DEC`, label: `${prevYear} — Diciembre (20 Dic)` },
  ]
})

// Default period based on current month
const defaultPeriodKey = (() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-indexed
  if (month <= 4) return `${year}-APR`
  if (month <= 8) return `${year}-AUG`
  return `${year}-DEC`
})()

// Decompose period key (e.g. "2026-APR") into form fields
const defaultYear = new Date().getFullYear()
const defaultPeriod = defaultPeriodKey.split('-')[1] as string

// Form state
const form = reactive({
  period: defaultPeriod,
  year: defaultYear,
  items_description: '',
  total_amount: null as number | null,
  payment_method: 'transfer',
  payment_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()),
  notes: '',
})

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

// Fetch employee data
const { data: employeeData } = useAsyncData(
  `employee-dotacion-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}`),
  {
    server: false,
    default: () => ({ data: null }),
    transform: (response: any) => response?.data,
  }
)

const employee = computed(() => employeeData.value)

// SMMLV 2026 threshold for eligibility check on the frontend
// Backend enforces this too — frontend is informational only
const SMMLV_2026 = 1_423_500
const SMMLV_2X = SMMLV_2026 * 2

const isEligible = computed(() => {
  if (!employee.value) return true // optimistic while loading
  if (employee.value.employment_type !== 'employee') return false
  const salary = Number(employee.value.calculated_salary || 0)
  return salary <= SMMLV_2X
})

// Fetch dotación payment history
const { data: historyData, pending: isLoadingHistory, refresh: refreshHistory } = useAsyncData(
  `dotacion-history-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}/dotacion`),
  {
    server: false,
    default: () => ({ data: [] }),
  }
)

const dotacionHistory = computed(() => (historyData.value as any)?.data || [])

// Set of period+year keys already registered (e.g. "APR-2026")
const paidPeriods = computed<string[]>(() =>
  dotacionHistory.value.map((p: any) => `${p.year}-${p.period}`)
)

const isPaidPeriod = computed(() =>
  paidPeriods.value.includes(`${form.year}-${form.period}`)
)

// History table columns
const historyColumns = [
  { key: 'period',            label: 'Período',            sortable: false },
  { key: 'total_amount',      label: 'Valor dotación',     sortable: false },
  { key: 'payment_date',      label: 'Fecha de entrega',   sortable: false },
  { key: 'payment_method',    label: 'Metodo',             sortable: false },
  { key: 'items_description', label: 'Artículos',          sortable: false },
]

// Selected payment method label
const selectedMethodLabel = computed(() => {
  const method = paymentMethods.value.find(m => m.value === form.payment_method)
  return method?.label || ''
})

// Form validation
const isFormValid = computed(() => {
  if (!form.period) return false
  if (!form.year || form.year < 2020) return false
  if (!form.total_amount || form.total_amount <= 0) return false
  if (!form.payment_method) return false
  if (!form.payment_date) return false
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

const PERIOD_LABELS: Record<string, string> = {
  APR: 'Abril',
  AUG: 'Agosto',
  DEC: 'Diciembre',
}

const formatPeriod = (period: string, year: number) =>
  `${year} — ${PERIOD_LABELS[period] || period}`

// Submit
const handleSubmit = async () => {
  if (!isFormValid.value) return
  errorMessage.value = null
  isSubmitting.value = true

  try {
    const payload = {
      period: form.period,
      year: form.year,
      items_description: form.items_description || null,
      total_amount: form.total_amount,
      payment_method: form.payment_method,
      payment_date: form.payment_date ? `${form.payment_date}T00:00:00` : new Date().toISOString(),
      notes: form.notes || null,
    }

    await $fetch(`/api/salaries/employees/${employeeId}/dotacion`, {
      method: 'POST',
      body: payload,
    })

    toast.success('Dotación registrada correctamente')
    await refreshHistory()
    // Reset form
    form.items_description = ''
    form.total_amount = null
    form.notes = ''
  } catch (err: any) {
    const status = err?.status || err?.response?.status
    if (status === 409) {
      errorMessage.value = `La dotación de ${formatPeriod(form.period, form.year)} ya fue registrada para este empleado.`
    } else if (status === 400) {
      errorMessage.value = err?.data?.detail || 'Este empleado no es elegible para dotación'
    } else {
      errorMessage.value = err?.data?.detail || 'Error al registrar la dotación'
    }
    console.error('Error recording dotacion:', err)
  } finally {
    isSubmitting.value = false
  }
}
</script>
