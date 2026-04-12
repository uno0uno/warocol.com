<template>
  <form @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
    <!-- Left Column: Form Content -->
    <div class="xl:col-span-2 space-y-6">
      <div class="bg-surface border-2 border-border rounded-xl p-6 md:p-8 shadow-sm">
        <!-- Empleado Info -->
        <div class="mb-8 pb-6 border-b border-border">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Empleado</h3>
          <div class="flex items-center gap-4 bg-background rounded-lg p-4">
            <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
              :style="{ backgroundColor: employee.color }">
              {{ employee.initials }}
            </div>
            <div>
              <p class="font-medium text-text-primary">{{ employee.name }}</p>
              <p class="text-sm text-text-secondary">{{ employee.email }}</p>
            </div>
          </div>
        </div>

        <!-- Información del Pago -->
        <div class="space-y-6">
          <h3 class="text-lg font-semibold text-text-primary">Informacion del Pago</h3>

          <!-- Salario configurado info -->
          <div v-if="employee.salary_type" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm text-blue-800">
              <strong>Salario configurado:</strong> 
              <span v-if="employee.salary_type === 'hourly'">
                {{ formatCurrency(employee.hourly_rate || 0) }} / hora
              </span>
              <span v-else>
                {{ formatCurrency(employee.calculated_salary || 0) }}
              </span>
              <span class="text-blue-600">
                ({{ employee.salary_type === 'smmlv' ? `${employee.multiplier}x SMMLV` : employee.salary_type === 'hourly' ? 'Pago por horas' : 'Monto fijo' }})
              </span>
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Monto del Pago -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Monto del Pago *
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                <input
                  v-model.number="form.payment_amount"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  class="input-base w-full pl-8 pr-4 py-2 text-lg font-semibold"
                  placeholder="0"
                />
              </div>
            </div>

            <!-- Fecha del Pago -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Fecha del Pago *
              </label>
              <input
                v-model="form.payment_date"
                type="date"
                required
                class="input-base w-full px-4 py-2"
              />
            </div>
          </div>

          <!-- Método de Pago -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-3">Metodo de Pago *</label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label
                v-for="method in paymentMethods"
                :key="method.value"
                class="relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all"
                :class="form.payment_method === method.value ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'"
              >
                <input
                  type="radio"
                  v-model="form.payment_method"
                  :value="method.value"
                  class="sr-only"
                />
                <div class="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                  :class="form.payment_method === method.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'">
                  <component :is="method.icon" class="w-5 h-5" />
                </div>
                <span class="text-sm font-medium text-text-primary text-center">{{ method.label }}</span>
              </label>
            </div>
          </div>

          <!-- Referencia de Pago -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Referencia del Pago
            </label>
            <input
              v-model="form.payment_reference"
              type="text"
              class="input-base w-full px-4 py-2"
              placeholder="Ej: TRF-123456, Comprobante #789"
            />
            <p class="text-xs text-text-tertiary mt-1">
              Numero de transferencia, comprobante o referencia del banco
            </p>
          </div>

          <!-- Periodo del Pago -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Periodo del Pago *
            </label>
            <input
              v-model="form.period_month"
              type="month"
              required
              class="input-base w-full px-4 py-2"
            />
            <p class="text-xs text-text-tertiary mt-1">
              Mes y ano al que corresponde este pago de salario
            </p>
          </div>
        </div>

        <!-- Comprobantes -->
        <div class="mt-8">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Comprobantes</h3>
          <PurchasesAttachmentUploader v-model="form.attachments" />
        </div>

        <!-- Notas -->
        <div class="mt-8">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Notas</h3>
          <textarea
            v-model="form.notes"
            class="input-base w-full px-4 py-2 min-h-[80px]"
            placeholder="Notas adicionales sobre este pago (opcional)"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Right Column: Summary & Actions -->
    <div class="xl:col-span-1">
      <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
        <h3 class="text-lg font-semibold text-text-primary mb-4">Resumen del Pago</h3>

        <div class="bg-background rounded-lg p-4 border border-border mb-6">
          <div class="space-y-3">
            <div>
              <p class="text-sm text-text-secondary mb-1">Empleado</p>
              <p class="font-medium text-text-primary">{{ employee.name }}</p>
            </div>
            <div>
              <p class="text-sm text-text-secondary mb-1">Metodo de Pago</p>
              <p class="font-medium text-text-primary">
                {{ selectedMethodLabel || 'Sin seleccionar' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-text-secondary mb-1">Fecha</p>
              <p class="font-medium text-text-primary">
                {{ form.payment_date ? formatDate(form.payment_date) : 'Sin seleccionar' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-text-secondary mb-1">Periodo</p>
              <p class="font-medium text-text-primary">
                {{ form.period_month ? formatPeriod(form.period_month) : 'Sin seleccionar' }}
              </p>
            </div>
            <div v-if="form.attachments.length > 0">
              <p class="text-sm text-text-secondary mb-1">Comprobantes</p>
              <p class="font-medium text-text-primary">{{ form.attachments.length }} archivo(s)</p>
            </div>
            <div class="pt-3 border-t border-border">
              <p class="text-sm text-text-secondary mb-1">Monto a Pagar</p>
              <p class="text-2xl font-bold text-primary">{{ formatCurrency(form.payment_amount || 0) }}</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <button
            type="submit"
            :disabled="isSubmitting || !isFormValid"
            class="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-emerald-500/20"
          >
            <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
            <span>{{ isSubmitting ? 'Registrando...' : 'Registrar Pago' }}</span>
          </button>

          <NuxtLink
            :to="`/equipo/salarios/${employeeId}`"
            class="w-full py-3 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-colors font-medium block text-center"
          >
            Cancelar
          </NuxtLink>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
const route = useRoute()
const toast = useToast()
const employeeId = route.params.id

useHead({ title: 'Registrar Pago - Equipo' })

// Payment methods
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { useFormatters } from '~/composables/useFormatters'
import { SLUG_ICON_MAP, SLUG_ICON_FALLBACK } from '~/utils/paymentDefaults'

const { paymentGroups, fetchPaymentMethods } = usePaymentMethods()
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

// Form state
const form = reactive({
  payment_amount: null,
  payment_method: 'cash',
  payment_reference: '',
  payment_date: new Date().toISOString().split('T')[0],
  period_month: new Date().toISOString().slice(0, 7),
  attachments: [],
  notes: ''
})

const isSubmitting = ref(false)

// Fetch employee data
const { data: employeeData } = useAsyncData(
  `employee-payment-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}`),
  {
    server: false,
    default: () => ({ data: null }),
    transform: (response) => {
      const data = response?.data
      // Pre-fill amount from salary config
      if (data?.calculated_salary) {
        form.payment_amount = data.calculated_salary
      }
      return data
    }
  }
)

const employee = computed(() => employeeData.value || {
  name: 'Cargando...',
  email: '',
  initials: '...',
  color: '#ccc',
  salary_type: null,
  calculated_salary: 0
})

// Selected method label
const selectedMethodLabel = computed(() => {
  const method = paymentMethods.value.find(m => m.value === form.payment_method)
  return method?.label || ''
})

// Form validation
const isFormValid = computed(() => {
  if (!form.payment_amount || form.payment_amount <= 0) return false
  if (!form.payment_method) return false
  if (!form.payment_date) return false
  if (!form.period_month) return false
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

const { formatDate } = useFormatters()

const formatPeriod = (periodString) => {
  if (!periodString) return ''
  const [year, month] = periodString.split('-')
  const date = new Date(year, month - 1)
  return date.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric'
  })
}

// Handle form submission
const handleSubmit = async () => {
  if (!isFormValid.value) return

  isSubmitting.value = true

  try {
    // Build JSON payload
    const payload = {
      tenant_member_id: employeeId,
      payment_amount: form.payment_amount,
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      period_month: form.period_month
    }

    if (form.payment_reference) {
      payload.payment_reference = form.payment_reference
    }
    if (form.notes) {
      payload.notes = form.notes
    }

    const response = await $fetch('/api/salaries/payments', {
      method: 'POST',
      body: payload
    })

    // Upload attachments if present
    if (form.attachments.length > 0 && response.data?.id) {
      try {
        const formData = new FormData()
        form.attachments.forEach((file) => {
          formData.append('files', file)
        })

        await $fetch(`/api/salaries/payments/${response.data.id}/attachments`, {
          method: 'POST',
          body: formData
        })
      } catch (fileError) {
        console.error('Error uploading files:', fileError)
        toast.error('Pago registrado, pero hubo un error al subir los archivos')
      }
    }

    toast.success('Pago registrado correctamente')
    clearNuxtData(`employee-salary-detail-${employeeId}`)
    clearNuxtData(`employees-salaries-*`)
    await navigateTo(`/equipo/salarios/${employeeId}`)
  } catch (err) {
    console.error('Error recording payment:', err)
    toast.error(err.data?.detail || 'Error al registrar el pago')
  } finally {
    isSubmitting.value = false
  }
}
</script>
