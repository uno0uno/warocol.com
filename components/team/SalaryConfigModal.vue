<template>
  <UiTheModal @close="$emit('close')" max-width="md">
    <template #header>
      <h2 class="text-xl font-bold text-text-primary">Configurar Salario</h2>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Employee Info -->
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

        <!-- Salary Type -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-3">Tipo de Salario</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="relative flex flex-col p-3 border-2 rounded-lg cursor-pointer transition-all"
              :class="form.salary_type === 'smmlv' ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'"
            >
              <input type="radio" v-model="form.salary_type" value="smmlv" class="sr-only" />
              <span class="font-semibold text-sm text-text-primary">Basado en SMMLV</span>
              <span class="text-xs text-text-secondary mt-1">Multiplicador del minimo</span>
            </label>
            <label
              class="relative flex flex-col p-3 border-2 rounded-lg cursor-pointer transition-all"
              :class="form.salary_type === 'fixed' ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'"
            >
              <input type="radio" v-model="form.salary_type" value="fixed" class="sr-only" />
              <span class="font-semibold text-sm text-text-primary">Monto Fijo</span>
              <span class="text-xs text-text-secondary mt-1">Valor mensual fijo</span>
            </label>
          </div>
        </div>

        <!-- SMMLV Config -->
        <div v-if="form.salary_type === 'smmlv'" class="space-y-4">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p class="text-sm text-blue-800">
              <strong>SMMLV 2026:</strong> {{ formatCurrency(smmlv) }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Multiplicador</label>
            <div class="flex items-center gap-3">
              <UiDecimalInput
                v-model="form.multiplier"
                :precision="1"
                :min="0.5"
                :max="10"
                class="w-24 px-3 py-2 text-center font-semibold"
              />
              <span class="text-text-secondary">x SMMLV</span>
            </div>
            <div class="flex gap-2 mt-2">
              <button
                v-for="mult in [1, 1.5, 2, 2.5, 3]"
                :key="mult"
                type="button"
                @click="form.multiplier = mult"
                class="px-2 py-1 rounded text-xs font-medium transition-colors"
                :class="form.multiplier === mult ? 'bg-primary text-white' : 'bg-gray-100 text-text-primary hover:bg-gray-200'"
              >
                {{ mult }}x
              </button>
            </div>
          </div>
        </div>

        <!-- Fixed Amount Config -->
        <div v-else-if="form.salary_type === 'fixed'">
          <label class="block text-sm font-medium text-text-primary mb-2">Monto Mensual</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
            <UiDecimalInput
              v-model="form.fixed_amount"
              :min="0"
              :precision="2"
              class="w-full pl-7 pr-3 py-2 font-semibold"
              placeholder="0"
            />
          </div>
          <div class="flex gap-2 mt-2">
            <button
              v-for="amount in [1500000, 2000000, 2500000, 3000000]"
              :key="amount"
              type="button"
              @click="form.fixed_amount = amount"
              class="px-2 py-1 rounded text-xs font-medium transition-colors"
              :class="form.fixed_amount === amount ? 'bg-primary text-white' : 'bg-gray-100 text-text-primary hover:bg-gray-200'"
            >
              {{ formatCurrencyShort(amount) }}
            </button>
          </div>
        </div>

        <!-- Calculated Salary Preview -->
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="text-sm text-text-secondary mb-1">Salario Calculado</p>
          <p class="text-2xl font-bold text-primary">{{ formatCurrency(calculatedSalary) }}</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
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
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-2"
        >
          <CommonsTheCustomLoader v-if="isSubmitting" size="small" />
          <span>{{ isSubmitting ? 'Guardando...' : 'Guardar' }}</span>
        </button>
      </div>
    </template>
  </UiTheModal>
</template>

<script setup lang="ts">
const props = defineProps({
  employee: { type: Object, required: true },
  smmlv: { type: Number, default: 1423500 }
})

const emit = defineEmits(['close', 'saved'])

const form = reactive({
  salary_type: props.employee.salary_type || 'smmlv',
  multiplier: props.employee.multiplier || 1,
  fixed_amount: props.employee.fixed_amount || null
})

const isSubmitting = ref(false)

const calculatedSalary = computed(() => {
  if (form.salary_type === 'smmlv') {
    return (form.multiplier || 0) * props.smmlv
  } else if (form.salary_type === 'fixed') {
    return form.fixed_amount || 0
  }
  return 0
})

const isFormValid = computed(() => {
  if (!form.salary_type) return false
  if (form.salary_type === 'smmlv' && (!form.multiplier || form.multiplier <= 0)) return false
  if (form.salary_type === 'fixed' && (!form.fixed_amount || form.fixed_amount <= 0)) return false
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

const formatCurrencyShort = (value) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  return formatCurrency(value)
}

const handleSubmit = async () => {
  if (!isFormValid.value) return

  isSubmitting.value = true

  try {
    const body = {
      salary_type: form.salary_type,
    }

    if (form.salary_type === 'smmlv') {
      body.minimum_wage_multiplier = form.multiplier
    } else {
      body.fixed_amount = form.fixed_amount
    }

    await $fetch(`/api/salaries/employees/${props.employee.id}/config`, {
      method: 'POST',
      body
    })

    emit('saved')
  } catch (err) {
    console.error('Error saving salary config:', err)
    useToast().error(err.data?.detail || 'Error al guardar la configuracion')
  } finally {
    isSubmitting.value = false
  }
}
</script>
