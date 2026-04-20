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
          v-if="employee && employee.employment_type === 'contractor'"
          class="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center"
        >
          <div class="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p class="font-semibold text-amber-900 mb-1">No elegible para intereses sobre cesantías</p>
          <p class="text-sm text-amber-700">
            Los intereses sobre cesantías aplican únicamente a empleados con contrato laboral o jornaleros.
            Este trabajador tiene tipo de contrato
            <strong>prestación de servicios</strong>.
          </p>
          <NuxtLink
            :to="`/equipo/salarios/${employeeId}`"
            class="mt-4 inline-block px-4 py-2 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors text-sm font-medium"
          >
            Volver al detalle
          </NuxtLink>
        </div>

        <!-- Int-Cesantías form — only for employee and daily -->
        <form v-else-if="employee" @submit.prevent="handleSubmit" novalidate>
          <div class="space-y-6">
            <h3 class="text-lg font-semibold text-text-primary">Registro de Intereses sobre Cesantías</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Año selector -->
              <div>
                <label for="anio" class="block text-sm font-medium text-text-primary mb-2">
                  Año *
                </label>
                <select
                  id="anio"
                  v-model.number="form.anio"
                  required
                  class="input-base w-full px-4 py-2"
                  :class="paidAnios.includes(form.anio) ? 'border-red-300 bg-red-50' : ''"
                >
                  <option value="" disabled>Seleccionar año</option>
                  <option
                    v-for="opt in anioOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}{{ paidAnios.includes(opt.value) ? ' — YA PAGADO' : '' }}
                  </option>
                </select>
                <p v-if="paidAnios.includes(form.anio)" class="text-xs text-red-600 mt-1">
                  Este año ya tiene intereses sobre cesantías registrados para este empleado.
                </p>
                <p v-else class="text-xs text-text-tertiary mt-1">
                  Fecha límite de pago: 31 de enero del año siguiente
                </p>
              </div>

              <!-- Cesantías base -->
              <div>
                <label for="cesantias_base" class="block text-sm font-medium text-text-primary mb-2">
                  Base de cesantías acumuladas *
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                  <input
                    id="cesantias_base"
                    v-model.number="form.cesantias_base"
                    type="number"
                    min="1"
                    step="any"
                    required
                    class="input-base w-full pl-8 pr-4 py-2 text-lg font-semibold"
                    placeholder="0"
                    aria-label="Base de cesantías acumuladas"
                  />
                </div>
                <p class="text-xs text-text-tertiary mt-1">Saldo acumulado de cesantías sobre el cual se calcula el 12% de intereses</p>
              </div>
            </div>

            <!-- Intereses calculated + override -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Auto-calculated preview -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Intereses calculados (12% anual)
                </label>
                <div class="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span class="text-xl font-bold text-emerald-700">{{ formatCurrency(intCesantiasPreview) }}</span>
                  <p class="text-xs text-emerald-600 mt-0.5">
                    {{ form.cesantias_base ? `$${form.cesantias_base.toLocaleString('es-CO')} × 12%` : 'Ingrese la base de cesantías' }}
                  </p>
                </div>
              </div>

              <!-- Manual override -->
              <div>
                <label for="int_cesantias_amount" class="block text-sm font-medium text-text-primary mb-2">
                  Monto a pagar (editable)
                </label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                  <input
                    id="int_cesantias_amount"
                    v-model.number="form.int_cesantias_amount"
                    type="number"
                    min="1"
                    step="any"
                    class="input-base w-full pl-8 pr-4 py-2"
                    :placeholder="intCesantiasPreview ? intCesantiasPreview.toString() : '0'"
                    aria-label="Monto de intereses sobre cesantías a pagar"
                  />
                </div>
                <p class="text-xs text-text-tertiary mt-1">Déjelo vacío para usar el calculado automáticamente</p>
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
                aria-label="Fecha de pago de los intereses sobre cesantías"
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

            <!-- Form actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                :disabled="isSubmitting || !isFormValid || paidAnios.includes(form.anio)"
                class="flex-1 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-emerald-500/20 min-h-[44px]"
              >
                <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
                <span>{{ isSubmitting ? 'Registrando...' : 'Registrar Intereses' }}</span>
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
        <h3 class="text-lg font-semibold text-text-primary mb-4">Historial de Intereses sobre Cesantías</h3>

        <div v-if="isLoadingHistory" class="space-y-3 animate-pulse">
          <div v-for="i in 3" :key="i" class="h-14 rounded bg-titan-200" />
        </div>

        <UiResponsiveDataView
          v-else
          :data="intCesantiasHistory"
          :columns="historyColumns"
          item-key="id"
          empty-message="Sin pagos de intereses registrados"
          empty-sub-message="Los pagos de intereses sobre cesantías aparecerán aquí"
        >
          <!-- Desktop cell slots -->
          <template #cell-anio="{ item }">
            <span class="font-medium text-text-primary">{{ item.anio }}</span>
          </template>
          <template #cell-int_cesantias_amount="{ item }">
            <span class="font-semibold text-emerald-700">{{ formatCurrency(Number(item.int_cesantias_amount)) }}</span>
          </template>
          <template #cell-cesantias_base="{ item }">
            <span class="text-text-secondary text-sm">{{ formatCurrency(Number(item.cesantias_base)) }}</span>
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
                <span class="font-semibold text-text-primary">Intereses {{ item.anio }}</span>
                <span class="font-bold text-emerald-700 text-lg">{{ formatCurrency(Number(item.int_cesantias_amount)) }}</span>
              </div>
              <div class="flex items-center gap-4 text-sm text-text-secondary">
                <span>{{ formatDate(item.payment_date) }}</span>
                <span>· Base: {{ formatCurrency(Number(item.cesantias_base)) }}</span>
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
            <p class="text-sm text-text-secondary mb-1">Año</p>
            <p class="font-medium text-text-primary">{{ form.anio || 'Sin seleccionar' }}</p>
          </div>
          <div>
            <p class="text-sm text-text-secondary mb-1">Base de cesantías</p>
            <p class="font-medium text-text-primary">{{ form.cesantias_base ? formatCurrency(form.cesantias_base) : '—' }}</p>
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
            <p class="text-sm text-text-secondary mb-1">Intereses a Pagar</p>
            <p class="text-2xl font-bold text-emerald-600">{{ formatCurrency(effectiveAmount) }}</p>
            <p class="text-xs text-text-tertiary mt-0.5">Asiento: DR 2615 / CR Bancos</p>
          </div>
        </div>

        <!-- Info box -->
        <div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p class="text-xs text-blue-800 font-medium mb-1">Intereses sobre cesantías (Ley colombiana)</p>
          <p class="text-xs text-blue-700">
            12% anual sobre el saldo acumulado de cesantías.
            Se pagan directamente al empleado antes del 31 de enero de cada año.
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

useHead({ title: 'Intereses sobre Cesantías - Equipo' })

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

// Año options: current year + previous year
const anioOptions = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const prevYear = year - 1
  return [
    { value: year,     label: `${year}` },
    { value: prevYear, label: `${prevYear}` },
  ]
})

const defaultAnio = new Date().getFullYear()

// Form state
const form = reactive({
  anio: defaultAnio,
  cesantias_base: null as number | null,
  int_cesantias_amount: null as number | null,  // null = auto-calculate
  payment_method: 'transfer',
  payment_date: new Date().toISOString().split('T')[0],
  notes: '',
})

const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

// Fetch employee data
const { data: employeeData } = useAsyncData(
  `employee-int-cesantias-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}`),
  {
    server: false,
    default: () => ({ data: null }),
    transform: (response: any) => response?.data,
  }
)

const employee = computed(() => employeeData.value)

// Fetch int-cesantías payment history
const { data: historyData, pending: isLoadingHistory, refresh: refreshHistory } = useAsyncData(
  `int-cesantias-history-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}/int-cesantias`),
  {
    server: false,
    default: () => ({ data: [] }),
  }
)

const intCesantiasHistory = computed(() => (historyData.value as any)?.data || [])

// Set of años already paid
const paidAnios = computed<number[]>(() =>
  intCesantiasHistory.value.map((p: any) => Number(p.anio))
)

// Auto-calculated preview: base * 12%
const intCesantiasPreview = computed(() => {
  const base = form.cesantias_base || 0
  if (base <= 0) return 0
  return Math.round(base * 0.12)
})

// Effective amount: manual override takes priority over auto-calculated
const effectiveAmount = computed(() => {
  if (form.int_cesantias_amount && form.int_cesantias_amount > 0) {
    return form.int_cesantias_amount
  }
  return intCesantiasPreview.value
})

// History table columns
const historyColumns = [
  { key: 'anio',                  label: 'Año',              sortable: false },
  { key: 'int_cesantias_amount',  label: 'Intereses pagados', sortable: false },
  { key: 'cesantias_base',        label: 'Base cesantías',   sortable: false },
  { key: 'payment_date',          label: 'Fecha de pago',    sortable: false },
  { key: 'payment_method',        label: 'Metodo',           sortable: false },
]

// Selected payment method label
const selectedMethodLabel = computed(() => {
  const method = paymentMethods.value.find(m => m.value === form.payment_method)
  return method?.label || ''
})

// Form validation
const isFormValid = computed(() => {
  if (!form.anio) return false
  if (!form.cesantias_base || form.cesantias_base <= 0) return false
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

// Submit
const handleSubmit = async () => {
  if (!isFormValid.value) return
  errorMessage.value = null
  isSubmitting.value = true

  try {
    const payload = {
      anio: form.anio,
      cesantias_base: form.cesantias_base,
      // Only send int_cesantias_amount if manually overridden; null = backend calculates
      int_cesantias_amount: (form.int_cesantias_amount && form.int_cesantias_amount > 0)
        ? form.int_cesantias_amount
        : null,
      payment_method: form.payment_method,
      payment_date: form.payment_date ? `${form.payment_date}T00:00:00` : new Date().toISOString(),
      notes: form.notes || null,
    }

    await $fetch(`/api/salaries/employees/${employeeId}/int-cesantias`, {
      method: 'POST',
      body: payload,
    })

    toast.success('Intereses sobre cesantías registrados correctamente')
    await refreshHistory()
    // Reset form to a clean state
    form.notes = ''
    form.cesantias_base = null
    form.int_cesantias_amount = null
  } catch (err: any) {
    const status = err?.status || err?.response?.status
    if (status === 409) {
      errorMessage.value = `Los intereses sobre cesantías del año ${form.anio} ya fueron registrados para este empleado.`
    } else {
      errorMessage.value = err?.data?.detail || 'Error al registrar los intereses sobre cesantías'
    }
    console.error('Error recording int-cesantias:', err)
  } finally {
    isSubmitting.value = false
  }
}
</script>
