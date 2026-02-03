<template>
  <div class="page-layout">
    <form @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
      <!-- Left Column: Form Content -->
      <div class="xl:col-span-2 space-y-6">
        <!-- Enhanced Employee Card -->
        <div class="relative overflow-hidden bg-white border border-titan-300 rounded-xl p-6 md:p-8 shadow-sm">
          <!-- Empleado Info -->
          <div class="mb-8 pb-6 border-b border-titan-300">
            <h3 class="text-lg font-bold text-crocus-700 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Empleado
            </h3>
            <div class="flex items-center gap-4 bg-titan-100 rounded-xl p-4 border border-titan-200">
              <div class="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-md"
                :style="{ backgroundColor: employee.color }">
                {{ employee.initials }}
              </div>
              <div>
                <p class="font-semibold text-text-primary text-lg">{{ employee.name }}</p>
                <p class="text-sm text-text-secondary">{{ employee.email }}</p>
              </div>
            </div>
          </div>

          <!-- Tipo de Salario -->
          <div class="mb-8">
            <h3 class="text-lg font-bold text-crocus-700 mb-6 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tipo de Salario
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                class="group relative flex flex-col p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02]"
                :class="form.salary_type === 'smmlv' 
                  ? 'border-crocus-500 bg-crocus-50 shadow-md' 
                  : 'border-titan-300 bg-white hover:border-crocus-300 hover:shadow-sm'"
              >
                <input type="radio" v-model="form.salary_type" value="smmlv" class="sr-only" />
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                    :class="form.salary_type === 'smmlv' 
                      ? 'bg-crocus-600 text-white shadow-md' 
                      : 'bg-titan-200 text-titan-600 group-hover:bg-titan-300'">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span class="font-bold text-text-primary text-base">Basado en SMMLV</span>
                </div>
                <p class="text-sm text-text-secondary leading-relaxed">
                  El salario se calcula como un multiplicador del salario mínimo. Se actualiza automáticamente.
                </p>
              </label>

              <label
                class="group relative flex flex-col p-5 border-2 rounded-xl cursor-pointer"
                :class="form.salary_type === 'fixed' 
                  ? 'border-crocus-500 bg-crocus-50 shadow-md' 
                  : 'border-titan-300 bg-white hover:border-crocus-300 hover:shadow-sm'"
              >
                <input type="radio" v-model="form.salary_type" value="fixed" class="sr-only" />
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                    :class="form.salary_type === 'fixed' 
                      ? 'bg-crocus-600 text-white shadow-md' 
                      : 'bg-titan-200 text-titan-600 group-hover:bg-titan-300'">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span class="font-bold text-text-primary text-base">Monto Fijo</span>
                </div>
                <p class="text-sm text-text-secondary leading-relaxed">
                  Ingresa un monto mensual fijo. No se actualiza automáticamente.
                </p>
              </label>

              <label
                class="group relative flex flex-col p-5 border-2 rounded-xl cursor-pointer"
                :class="form.salary_type === 'hourly' 
                  ? 'border-crocus-500 bg-crocus-50 shadow-md' 
                  : 'border-titan-300 bg-white hover:border-crocus-300 hover:shadow-sm'"
              >
                <input type="radio" v-model="form.salary_type" value="hourly" class="sr-only" />
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                    :class="form.salary_type === 'hourly' 
                      ? 'bg-crocus-600 text-white shadow-md' 
                      : 'bg-titan-200 text-titan-600 group-hover:bg-titan-300'">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span class="font-bold text-text-primary text-base">Por Hora</span>
                </div>
                <p class="text-sm text-text-secondary leading-relaxed">
                  Define un valor por hora. El pago se calcula según las horas reportadas.
                </p>
              </label>
            </div>
          </div>

          <!-- Configuración según tipo -->
          <div class="mt-8">
            <!-- SMMLV Config -->
            <div v-if="form.salary_type === 'smmlv'" class="space-y-6">
              <h3 class="text-lg font-bold text-crocus-700 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Multiplicador SMMLV
              </h3>

              <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                <p class="text-sm text-blue-900 font-medium">
                  <strong class="text-base">SMMLV 2026:</strong> {{ formatCurrency(smmlv) }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-bold text-text-primary mb-3">
                  Multiplicador *
                </label>
                <div class="flex items-center gap-4">
                  <input
                    v-model.number="form.multiplier"
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10"
                    required
                    class="input-base w-40 px-5 py-3 text-center text-xl font-bold rounded-xl focus:ring-2 focus:ring-crocus-500"
                    placeholder="1.0"
                  />
                  <span class="text-text-secondary font-medium">× SMMLV</span>
                </div>
                <p class="text-xs text-text-tertiary mt-2">
                  Ejemplos: 1.0 = 1 salario mínimo, 1.5 = 1.5 salarios mínimos
                </p>
              </div>

              <!-- Quick select buttons -->
              <div>
                <p class="text-sm font-bold text-text-primary mb-3">Selección rápida:</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="mult in [1, 1.5, 2, 2.5, 3]"
                    :key="mult"
                    type="button"
                    @click="form.multiplier = mult"
                    class="px-5 py-2.5 rounded-xl text-sm font-bold"
                    :class="form.multiplier === mult 
                      ? 'bg-crocus-600 text-white shadow-md' 
                      : 'bg-white border-2 border-titan-300 text-text-primary hover:border-crocus-400 hover:shadow-sm'"
                  >
                    {{ mult }}×
                  </button>
                </div>
              </div>
            </div>

            <!-- Fixed Amount Config -->
            <div v-else-if="form.salary_type === 'fixed'" class="space-y-6">
              <h3 class="text-lg font-bold text-crocus-700 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Monto Mensual Fijo
              </h3>

              <div>
                <label class="block text-sm font-bold text-text-primary mb-3">
                  Salario Mensual *
                </label>
                <div class="relative">
                  <span class="absolute left-5 top-1/2 -translate-y-1/2 text-crocus-600 font-bold text-xl">$</span>
                  <input
                    v-model.number="form.fixed_amount"
                    type="number"
                    min="0"
                    step="1000"
                    required
                    class="input-base w-full pl-10 pr-5 py-3 text-xl font-bold rounded-xl focus:ring-2 focus:ring-crocus-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <!-- Quick select buttons -->
              <div>
                <p class="text-sm font-bold text-text-primary mb-3">Selección rápida:</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="amount in [1500000, 2000000, 2500000, 3000000, 4000000]"
                    :key="amount"
                    type="button"
                    @click="form.fixed_amount = amount"
                    class="px-4 py-2.5 rounded-xl text-sm font-bold"
                    :class="form.fixed_amount === amount 
                      ? 'bg-crocus-600 text-white shadow-md' 
                      : 'bg-white border-2 border-titan-300 text-text-primary hover:border-crocus-400 hover:shadow-sm'"
                  >
                    {{ formatCurrencyShort(amount) }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Hourly Config -->
            <div v-else-if="form.salary_type === 'hourly'" class="space-y-6">
              <h3 class="text-lg font-bold text-crocus-700 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Valor por Hora
              </h3>

              <div>
                <label class="block text-sm font-bold text-text-primary mb-3">
                  Valor Hora *
                </label>
                <div class="relative">
                  <span class="absolute left-5 top-1/2 -translate-y-1/2 text-crocus-600 font-bold text-xl">$</span>
                  <input
                    v-model.number="form.hourly_rate"
                    type="number"
                    min="0"
                    step="100"
                    required
                    class="input-base w-full pl-10 pr-5 py-3 text-xl font-bold rounded-xl focus:ring-2 focus:ring-crocus-500"
                    placeholder="0"
                  />
                </div>
              </div>

               <!-- Quick select buttons -->
               <div>
                <p class="text-sm font-bold text-text-primary mb-3">Selección rápida:</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="amount in [5000, 8000, 10000, 15000, 20000]"
                    :key="amount"
                    type="button"
                    @click="form.hourly_rate = amount"
                    class="px-4 py-2.5 rounded-xl text-sm font-bold"
                    :class="form.hourly_rate === amount 
                      ? 'bg-crocus-600 text-white shadow-md' 
                      : 'bg-white border-2 border-titan-300 text-text-primary hover:border-crocus-400 hover:shadow-sm'"
                  >
                    {{ formatCurrency(amount) }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Frecuencia de Pago -->
          <div class="mt-10">
            <h3 class="text-lg font-bold text-crocus-700 mb-6 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Frecuencia de Pago
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label
                v-for="freq in paymentFrequencies"
                :key="freq.value"
                class="group relative flex flex-col p-5 border-2 rounded-xl cursor-pointer"
                :class="form.payment_frequency === freq.value 
                  ? 'border-crocus-500 bg-crocus-50 shadow-md' 
                  : 'border-titan-300 bg-white hover:border-crocus-300 hover:shadow-sm'"
              >
                <input type="radio" v-model="form.payment_frequency" :value="freq.value" class="sr-only" />
                <div class="flex flex-col items-center text-center gap-3">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                    :class="form.payment_frequency === freq.value 
                      ? 'bg-crocus-600 text-white shadow-md' 
                      : 'bg-titan-200 text-titan-600 group-hover:bg-titan-300'">
                    {{ freq.icon }}
                  </div>
                  <div>
                    <span class="font-bold text-text-primary block mb-1">{{ freq.label }}</span>
                    <p class="text-xs text-text-secondary">{{ freq.description }}</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <!-- Notas -->
          <div class="mt-10">
            <h3 class="text-lg font-bold text-crocus-700 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notas
            </h3>
            <textarea
              v-model="form.notes"
              class="input-base w-full px-5 py-3 min-h-[100px] rounded-xl focus:ring-2 focus:ring-crocus-500 resize-none"
              placeholder="Notas adicionales sobre la configuración salarial (opcional)"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Right Column: Summary & Actions -->
      <div class="xl:col-span-1">
        <div class="sticky top-6 bg-white border border-titan-300 rounded-xl p-6 shadow-sm">
          <h3 class="text-lg font-bold text-crocus-700 mb-6 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Resumen
          </h3>

          <div class="bg-titan-100 rounded-xl p-5 border border-titan-200 mb-6">
            <div class="space-y-4">
              <div>
                <p class="text-xs text-text-tertiary mb-1 uppercase tracking-wide font-semibold">Empleado</p>
                <p class="font-bold text-text-primary">{{ employee.name }}</p>
              </div>
              <div>
                <p class="text-xs text-text-tertiary mb-1 uppercase tracking-wide font-semibold">Tipo de Salario</p>
                <p class="font-bold text-text-primary">
                  {{ form.salary_type === 'smmlv' ? 'Basado en SMMLV' : form.salary_type === 'fixed' ? 'Monto Fijo' : form.salary_type === 'hourly' ? 'Por Hora' : 'Sin seleccionar' }}
                </p>
              </div>
              <div v-if="form.salary_type === 'hourly' && form.hourly_rate">
                <p class="text-xs text-text-tertiary mb-1 uppercase tracking-wide font-semibold">Valor Hora</p>
                <p class="font-bold text-text-primary">{{ formatCurrency(form.hourly_rate) }} / hora</p>
              </div>
              <div v-if="form.salary_type === 'smmlv' && form.multiplier">
                <p class="text-xs text-text-tertiary mb-1 uppercase tracking-wide font-semibold">Multiplicador</p>
                <p class="font-bold text-text-primary">{{ form.multiplier }}× SMMLV</p>
              </div>
              <div>
                <p class="text-xs text-text-tertiary mb-1 uppercase tracking-wide font-semibold">Frecuencia</p>
                <p class="font-bold text-text-primary">{{ frequencyLabel }}</p>
              </div>
              <div class="pt-4 border-t-2 border-titan-300">
                <p class="text-xs text-text-tertiary mb-2 uppercase tracking-wide font-semibold">Salario Mensual</p>
                <p class="text-3xl font-black text-crocus-600">
                  {{ formatCurrency(calculatedSalary) }}
                </p>
                <p v-if="form.payment_frequency !== 'monthly'" class="text-sm text-crocus-600 mt-2 font-semibold">
                  {{ formatCurrency(salaryPerPayment) }} por pago
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <button
              type="submit"
              :disabled="isSubmitting || !isFormValid"
              class="w-full py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-bold shadow-md"
            >
              <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ isSubmitting ? 'Guardando...' : 'Guardar Configuración' }}</span>
            </button>

            <NuxtLink
              :to="`/equipo/salarios/${employeeId}`"
              class="w-full py-4 border-2 border-titan-300 rounded-xl text-text-secondary hover:text-text-primary hover:bg-titan-50 hover:border-crocus-400 font-bold block text-center"
            >
              Cancelar
            </NuxtLink>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
const route = useRoute()
const toast = useToast()
const employeeId = route.params.id

useHead({ title: 'Configurar Salario - Equipo' })

// SMMLV 2026
const smmlv = ref(1423500)

// Form state
const form = reactive({
  salary_type: 'smmlv',
  multiplier: 1,
  fixed_amount: null,
  hourly_rate: null,
  payment_frequency: 'monthly',
  notes: ''
})

// Payment frequencies
const paymentFrequencies = [
  { value: 'monthly', label: 'Mensual', icon: '1x', description: '1 pago por mes' },
  { value: 'biweekly', label: 'Quincenal', icon: '2x', description: '2 pagos por mes' },
  { value: 'weekly', label: 'Semanal', icon: '4x', description: '4 pagos por mes' }
]

const isSubmitting = ref(false)

// Fetch employee data
const { data: employeeData } = useAsyncData(
  `employee-config-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}`),
  {
    server: false,
    default: () => ({ data: null }),
    transform: (response) => {
      const data = response?.data
      // Pre-fill form if employee has existing config
      if (data?.salary_type) {
        form.salary_type = data.salary_type
        form.multiplier = data.multiplier || 1
        form.fixed_amount = data.fixed_amount
        form.hourly_rate = data.hourly_rate
        form.payment_frequency = data.payment_frequency || 'monthly'
        form.notes = data.salary_notes || ''
      }
      if (response?.smmlv) {
        smmlv.value = response.smmlv
      }
      return data
    }
  }
)

const employee = computed(() => employeeData.value || {
  name: 'Cargando...',
  email: '',
  initials: '...',
  color: '#ccc'
})

// Calculated salary (monthly)
const calculatedSalary = computed(() => {
  if (form.salary_type === 'smmlv') {
    return (form.multiplier || 0) * smmlv.value
  } else if (form.salary_type === 'fixed') {
    return form.fixed_amount || 0
  } else if (form.salary_type === 'hourly') {
    // Estimate monthly based on 240 hours (standard work month)
    return (form.hourly_rate || 0) * 240
  }
  return 0
})

// Salary per payment based on frequency
const salaryPerPayment = computed(() => {
  const divisors = { monthly: 1, biweekly: 2, weekly: 4 }
  return calculatedSalary.value / (divisors[form.payment_frequency] || 1)
})

// Frequency label
const frequencyLabel = computed(() => {
  const freq = paymentFrequencies.find(f => f.value === form.payment_frequency)
  return freq?.label || 'Mensual'
})

// Form validation
const isFormValid = computed(() => {
  if (!form.salary_type) return false
  if (form.salary_type === 'smmlv' && (!form.multiplier || form.multiplier <= 0)) return false
  if (form.salary_type === 'fixed' && (!form.fixed_amount || form.fixed_amount <= 0)) return false
  if (form.salary_type === 'hourly' && (!form.hourly_rate || form.hourly_rate <= 0)) return false
  return true
})

// Formatters
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0)
}

const formatCurrencyShort = (value) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  return formatCurrency(value)
}

// Handle form submission
const handleSubmit = async () => {
  if (!isFormValid.value) return

  isSubmitting.value = true

  try {
    const body = {
      salary_type: form.salary_type,
      payment_frequency: form.payment_frequency,
      notes: form.notes
    }

    if (form.salary_type === 'smmlv') {
      body.minimum_wage_multiplier = form.multiplier
    } else if (form.salary_type === 'hourly') {
      body.hourly_rate = form.hourly_rate
    } else {
      body.fixed_amount = form.fixed_amount
    }

    await $fetch(`/api/salaries/employees/${employeeId}/config`, {
      method: 'POST',
      body
    })

    toast.success('Salario configurado correctamente')
    clearNuxtData(`employee-salary-detail-${employeeId}`)
    clearNuxtData(`employees-salaries-*`)
    await navigateTo(`/equipo/salarios/${employeeId}`)
  } catch (err) {
    console.error('Error saving salary config:', err)
    toast.error(err.data?.detail || 'Error al guardar la configuracion')
  } finally {
    isSubmitting.value = false
  }
}
</script>
