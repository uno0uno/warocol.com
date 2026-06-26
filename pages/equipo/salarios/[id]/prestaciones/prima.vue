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

        <!-- Not eligible guard -->
        <div
          v-if="employee && employee.employment_type !== 'employee'"
          class="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center"
        >
          <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p class="font-semibold text-amber-900 mb-1">No elegible para prima de servicios</p>
          <p class="text-sm text-amber-700">
            La prima de servicios aplica únicamente a empleados con contrato laboral.
            Este trabajador tiene tipo de contrato
            <strong>{{ employee.employment_type === 'daily' ? 'jornalero' : 'prestación de servicios' }}</strong>.
          </p>
          <NuxtLink
            :to="`/equipo/salarios/${employeeId}`"
            class="mt-4 inline-block px-4 py-2 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors text-sm font-medium"
          >
            Volver al detalle
          </NuxtLink>
        </div>

        <!-- Prima form — only for employees -->
        <form v-else-if="employee" @submit.prevent="handleSubmit" novalidate>
          <div class="space-y-6">
            <h3 class="text-lg font-semibold text-text-primary">Registro de Prima de Servicios</h3>

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
              <!-- Semestre selector -->
              <div>
                <label for="semestre" class="block text-sm font-medium text-text-primary mb-2">
                  Semestre *
                </label>
                <select
                  id="semestre"
                  v-model="form.semestre"
                  required
                  class="input-base w-full px-4 py-2"
                  :class="paidSemestres.includes(form.semestre) ? 'border-red-300 bg-red-50' : ''"
                >
                  <option value="" disabled>Seleccionar semestre</option>
                  <option
                    v-for="opt in semestreOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}{{ paidSemestres.includes(opt.value) ? ' — YA PAGADO' : '' }}
                  </option>
                </select>
                <p v-if="paidSemestres.includes(form.semestre)" class="text-xs text-red-600 mt-1">
                  Este semestre ya tiene una prima registrada para este empleado.
                </p>
                <p v-else class="text-xs text-text-tertiary mt-1">
                  S1 = Ene–Jun (pagar antes del 30 Jun) · S2 = Jul–Dic (pagar antes del 20 Dic)
                </p>
              </div>

              <!-- Gross salary -->
              <div>
                <label for="gross_salary" class="block text-sm font-medium text-text-primary mb-2">
                  Salario base del semestre *
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                  <input
                    id="gross_salary"
                    v-model.number="form.gross_salary"
                    type="number"
                    min="1"
                    step="any"
                    required
                    class="input-base w-full pl-8 pr-4 py-2 text-lg font-semibold"
                    placeholder="0"
                    aria-label="Salario base del semestre"
                  />
                </div>
                <p class="text-xs text-text-tertiary mt-1">Pre-llenado con el salario configurado — editable</p>
              </div>
            </div>

            <!-- Days worked + Prima preview -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="days_worked" class="block text-sm font-medium text-text-primary mb-2">
                  Dias trabajados en el semestre
                </label>
                <input
                  id="days_worked"
                  v-model.number="form.days_worked"
                  type="number"
                  min="1"
                  max="184"
                  step="1"
                  class="input-base w-full px-4 py-2"
                  placeholder="180"
                  aria-label="Días trabajados en el semestre"
                />
                <p class="text-xs text-text-tertiary mt-1">180 = semestre completo (defecto)</p>
              </div>

              <!-- Prima preview -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Prima calculada
                </label>
                <div class="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span class="text-xl font-bold text-emerald-700">{{ formatCurrency(primaPreview) }}</span>
                  <p class="text-xs text-emerald-600 mt-0.5">
                    {{ form.gross_salary ? `$${form.gross_salary.toLocaleString('es-CO')} ÷ 180 × ${form.days_worked || 180} días` : 'Ingrese el salario base' }}
                  </p>
                </div>
              </div>
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
                Fecha de Pago *
              </label>
              <input
                id="payment_date"
                v-model="form.payment_date"
                type="date"
                required
                class="input-base w-full px-4 py-2"
                aria-label="Fecha de pago de la prima"
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
                placeholder="Notas adicionales sobre este pago (opcional)"
                aria-label="Notas adicionales"
              ></textarea>
            </div>

            <!-- Error message -->
            <div v-if="errorMessage" role="alert" class="bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-sm text-red-700">{{ errorMessage }}</p>
            </div>

            <!-- Form actions (inside form) -->
            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                :disabled="isSubmitting || !isFormValid || paidSemestres.includes(form.semestre)"
                class="flex-1 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-emerald-500/20 min-h-[44px]"
              >
                <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
                <span>{{ isSubmitting ? 'Registrando...' : 'Registrar Prima' }}</span>
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
        <h3 class="text-lg font-semibold text-text-primary mb-4">Historial de Primas</h3>

        <div v-if="isLoadingHistory" class="space-y-3 animate-pulse">
          <div v-for="i in 3" :key="i" class="h-14 rounded bg-titan-200" />
        </div>

        <UiResponsiveDataView
          v-else
          :data="primaHistory"
          :columns="historyColumns"
          item-key="id"
          empty-message="Sin pagos de prima registrados"
          empty-sub-message="Los pagos de prima de servicios aparecerán aquí"
        >
          <!-- Desktop cell slots -->
          <template #cell-semestre="{ item }">
            <span class="font-medium text-text-primary">{{ formatSemestre(item.semestre) }}</span>
          </template>
          <template #cell-prima_amount="{ item }">
            <span class="font-semibold text-emerald-700">{{ formatCurrency(Number(item.prima_amount)) }}</span>
          </template>
          <template #cell-payment_date="{ item }">
            <span class="text-text-secondary text-sm">{{ formatDate(item.payment_date) }}</span>
          </template>
          <template #cell-payment_method="{ item }">
            <span class="text-text-secondary text-sm capitalize">{{ item.payment_method || '—' }}</span>
          </template>
          <template #cell-days_worked="{ item }">
            <span class="text-text-secondary text-sm">{{ item.days_worked }} días</span>
          </template>

          <!-- Mobile card -->
          <template #card="{ item }">
            <div class="bg-surface border border-border rounded-xl p-4 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-text-primary">{{ formatSemestre(item.semestre) }}</span>
                <span class="font-bold text-emerald-700 text-lg">{{ formatCurrency(Number(item.prima_amount)) }}</span>
              </div>
              <div class="flex items-center gap-4 text-sm text-text-secondary">
                <span>{{ formatDate(item.payment_date) }}</span>
                <span v-if="item.payment_method">· {{ item.payment_method }}</span>
                <span>· {{ item.days_worked }} días</span>
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
            <p class="text-sm text-text-secondary mb-1">Semestre</p>
            <p class="font-medium text-text-primary">
              {{ form.semestre ? formatSemestre(form.semestre) : 'Sin seleccionar' }}
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
          <div>
            <p class="text-sm text-text-secondary mb-1">Dias trabajados</p>
            <p class="font-medium text-text-primary">{{ form.days_worked || 180 }} dias</p>
          </div>
          <div class="pt-3 border-t border-border">
            <p class="text-sm text-text-secondary mb-1">Prima a Pagar</p>
            <p class="text-2xl font-bold text-emerald-600">{{ formatCurrency(primaPreview) }}</p>
            <p class="text-xs text-text-tertiary mt-0.5">Asiento: DR 2620 / CR Bancos</p>
          </div>
        </div>

        <!-- Info box -->
        <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-xs text-blue-800 font-medium mb-1">Prima de servicios (Ley colombiana)</p>
          <p class="text-xs text-blue-700">
            15 días de salario por semestre trabajado.
            Primer pago: antes del 30 de junio.
            Segundo pago: antes del 20 de diciembre.
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

useHead({ title: 'Prima de Servicios - Equipo' })

const { formatDate } = useFormatters()

// Payment methods
const { paymentGroups, fetchPaymentMethods, isLoading: isLoadingMethods } = usePaymentMethods()
fetchPaymentMethods()
const { todayISO } = useTenantTimezone()

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

// Semestre options: current year S1/S2 + previous year S1/S2
const semestreOptions = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const prevYear = year - 1
  return [
    { value: `${year}-S1`,     label: `${year} — Primer semestre (Ene–Jun)` },
    { value: `${year}-S2`,     label: `${year} — Segundo semestre (Jul–Dic)` },
    { value: `${prevYear}-S1`, label: `${prevYear} — Primer semestre (Ene–Jun)` },
    { value: `${prevYear}-S2`, label: `${prevYear} — Segundo semestre (Jul–Dic)` },
  ]
})

// Default semestre: current year S1 if Jan–Jun, S2 if Jul–Dec
const defaultSemestre = (() => {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() < 6 ? `${year}-S1` : `${year}-S2`
})()

// Form state
const form = reactive({
  semestre: defaultSemestre,
  gross_salary: null as number | null,
  days_worked: 180,
  payment_method: 'transfer',
  payment_date: todayISO(),
  notes: '',
})

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

// Fetch employee data and pre-fill salary
const { data: employeeData } = useAsyncData(
  `employee-prima-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}`),
  {
    server: false,
    default: () => null,
    transform: (response: any) => {
      const data = response?.data
      if (data?.calculated_salary && data?.employment_type === 'employee') {
        form.gross_salary = Number(data.calculated_salary)
      }
      return data
    }
  }
)

const employee = computed(() => employeeData.value)

// Fetch prima payment history
const { data: historyData, pending: isLoadingHistory, refresh: refreshHistory } = useAsyncData(
  `prima-history-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}/prima`),
  {
    server: false,
    default: () => ({ data: [] }),
  }
)

const primaHistory = computed(() => (historyData.value as any)?.data || [])

// Set of semestres already paid (to warn the user and block submit)
const paidSemestres = computed<string[]>(() =>
  primaHistory.value.map((p: any) => p.semestre)
)

// Reactive prima calculation: (gross_salary / 180) * days_worked
const primaPreview = computed(() => {
  const salary = form.gross_salary || 0
  const days = form.days_worked || 180
  if (salary <= 0) return 0
  return Math.round((salary / 180) * days)
})

// History table columns
const historyColumns = [
  { key: 'semestre',       label: 'Semestre',        sortable: false },
  { key: 'prima_amount',   label: 'Prima pagada',     sortable: false },
  { key: 'payment_date',   label: 'Fecha de pago',    sortable: false },
  { key: 'payment_method', label: 'Metodo',           sortable: false },
  { key: 'days_worked',    label: 'Dias trabajados',  sortable: false },
]

// Selected payment method label
const selectedMethodLabel = computed(() => {
  const method = paymentMethods.value.find(m => m.value === form.payment_method)
  return method?.label || ''
})

// Form validation
const isFormValid = computed(() => {
  if (!form.semestre) return false
  if (!form.gross_salary || form.gross_salary <= 0) return false
  if (!form.payment_method) return false
  if (!form.payment_date) return false
  if (!form.days_worked || form.days_worked < 1) return false
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

const formatSemestre = (semestre: string) => {
  if (!semestre) return semestre
  const [year, half] = semestre.split('-')
  return half === 'S1'
    ? `${year} — Primer semestre`
    : `${year} — Segundo semestre`
}

// Submit
const handleSubmit = async () => {
  if (!isFormValid.value) return
  errorMessage.value = null
  isSubmitting.value = true

  try {
    const payload = {
      semestre: form.semestre,
      gross_salary: form.gross_salary,
      days_worked: form.days_worked || 180,
      payment_method: form.payment_method,
      payment_date: form.payment_date ? `${form.payment_date}T00:00:00` : new Date().toISOString(),
      notes: form.notes || null,
    }

    await $fetch(`/api/salaries/employees/${employeeId}/prima`, {
      method: 'POST',
      body: payload,
    })

    toast.success('Prima de servicios registrada correctamente')
    await refreshHistory()
    // Reset form to a clean state (keep defaults)
    form.notes = ''
    form.semestre = defaultSemestre
    form.days_worked = 180
  } catch (err: any) {
    const status = err?.status || err?.response?.status
    if (status === 409) {
      errorMessage.value = `La prima del semestre ${formatSemestre(form.semestre)} ya fue registrada para este empleado.`
    } else {
      errorMessage.value = err?.data?.detail || 'Error al registrar la prima de servicios'
    }
    console.error('Error recording prima:', err)
  } finally {
    isSubmitting.value = false
  }
}
</script>
