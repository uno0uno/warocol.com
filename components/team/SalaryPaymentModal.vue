<template>
  <UiTheModal @close="$emit('close')" max-width="lg">
    <template #header>
      <h2 class="text-xl font-bold text-text-primary">Registrar Pago de Salario</h2>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Employee Info -->
        <div class="flex items-center gap-4 bg-background rounded-lg p-4">
          <div class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
            :style="{ backgroundColor: employee.color }">
            {{ employee.initials }}
          </div>
          <div class="flex-1">
            <p class="font-medium text-text-primary">{{ employee.name }}</p>
            <p class="text-sm text-text-secondary">{{ employee.email }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-text-secondary">Salario configurado</p>
            <p class="font-bold text-primary">{{ formatCurrency(employee.calculated_salary || 0) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Payment Amount -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Monto del Pago *</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
              <input
                v-model.number="form.payment_amount"
                type="number"
                min="0"
                step="1000"
                required
                class="input-base w-full pl-7 pr-3 py-2 font-semibold"
                placeholder="0"
              />
            </div>
          </div>

          <!-- Payment Date -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Fecha del Pago *</label>
            <input
              v-model="form.payment_date"
              type="date"
              required
              class="input-base w-full px-3 py-2"
            />
          </div>
        </div>

        <!-- Payment Method -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-2">Metodo de Pago *</label>
          <div class="grid grid-cols-4 gap-2">
            <label
              v-for="method in paymentMethods"
              :key="method.value"
              class="relative flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all"
              :class="form.payment_method === method.value ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'"
            >
              <input type="radio" v-model="form.payment_method" :value="method.value" class="sr-only" />
              <span class="text-xs font-medium text-text-primary">{{ method.label }}</span>
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Payment Reference -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Referencia</label>
            <input
              v-model="form.payment_reference"
              type="text"
              class="input-base w-full px-3 py-2"
              placeholder="Ej: TRF-123456"
            />
          </div>

          <!-- Period -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Periodo *</label>
            <input
              v-model="form.period_month"
              type="month"
              required
              class="input-base w-full px-3 py-2"
            />
          </div>
        </div>

        <!-- Attachments -->
        <PurchasesAttachmentUploader v-model="form.attachments" />

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-2">Notas</label>
          <textarea
            v-model="form.notes"
            class="input-base w-full px-3 py-2 min-h-[60px]"
            placeholder="Notas adicionales (opcional)"
          ></textarea>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between items-center">
        <div class="text-sm text-text-secondary">
          Total: <span class="font-bold text-primary text-lg">{{ formatCurrency(form.payment_amount || 0) }}</span>
        </div>
        <div class="flex gap-3">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            @click="handleSubmit"
            :disabled="isSubmitting || !isFormValid"
            class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
          >
            <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
            <span>{{ isSubmitting ? 'Registrando...' : 'Registrar Pago' }}</span>
          </button>
        </div>
      </div>
    </template>
  </UiTheModal>
</template>

<script setup>
const props = defineProps({
  employee: { type: Object, required: true }
})

const emit = defineEmits(['close', 'saved'])

const paymentMethods = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Otro' }
]

const form = reactive({
  payment_amount: props.employee.calculated_salary || null,
  payment_method: 'transfer',
  payment_reference: '',
  payment_date: new Date().toISOString().split('T')[0],
  period_month: new Date().toISOString().slice(0, 7),
  attachments: [],
  notes: ''
})

const isSubmitting = ref(false)

const isFormValid = computed(() => {
  if (!form.payment_amount || form.payment_amount <= 0) return false
  if (!form.payment_method) return false
  if (!form.payment_date) return false
  if (!form.period_month) return false
  return true
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0)
}

const handleSubmit = async () => {
  if (!isFormValid.value) return

  isSubmitting.value = true

  try {
    const formData = new FormData()
    formData.append('tenant_member_id', props.employee.id)
    formData.append('payment_amount', form.payment_amount)
    formData.append('payment_method', form.payment_method)
    formData.append('payment_date', form.payment_date)
    formData.append('period_month', form.period_month)

    if (form.payment_reference) {
      formData.append('payment_reference', form.payment_reference)
    }
    if (form.notes) {
      formData.append('notes', form.notes)
    }

    form.attachments.forEach((file) => {
      formData.append('attachments', file)
    })

    await $fetch('/api/salaries/payments', {
      method: 'POST',
      body: formData
    })

    emit('saved')
  } catch (err) {
    console.error('Error recording payment:', err)
    useToast().error(err.data?.detail || 'Error al registrar el pago')
  } finally {
    isSubmitting.value = false
  }
}
</script>
