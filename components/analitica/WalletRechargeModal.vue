<template>
  <UiModal v-model="open" title="Recargar billetera">
    <div class="px-6 py-5 space-y-5">
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="text-sm text-text-secondary font-medium">Cliente</p>
          <p class="text-base font-semibold text-text-primary truncate">{{ customerName }}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-sm text-text-secondary font-medium">Saldo actual</p>
          <p class="text-base font-semibold text-primary">{{ formatCurrency(currentBalance) }}</p>
        </div>
      </div>

      <hr class="border-border" />

      <div class="flex flex-col gap-1.5">
        <label for="wallet-amount" class="text-sm font-medium text-text-primary">Monto (COP)</label>
        <input
          id="wallet-amount"
          v-model.number="amount"
          type="number"
          min="1"
          step="1000"
          placeholder="50000"
          class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          :class="{ 'border-red-400': !!validationError }"
        />
        <p v-if="validationError" role="alert" class="text-sm text-red-600">{{ validationError }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="wallet-payment" class="text-sm font-medium text-text-primary">Forma de pago</label>
        <select
          id="wallet-payment"
          v-model="paymentMethod"
          class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option v-for="opt in paymentOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="wallet-notes" class="text-sm font-medium text-text-primary">
          Nota <span class="text-text-secondary font-normal">(opcional)</span>
        </label>
        <textarea
          id="wallet-notes"
          v-model="notes"
          rows="2"
          placeholder="Ej. Recarga en efectivo..."
          class="px-3 py-2 text-sm border-2 border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <p v-if="apiError" role="alert" class="text-sm text-red-600">{{ apiError }}</p>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-3 px-6 py-4">
        <button
          type="button"
          @click="open = false"
          class="min-h-[44px] px-4 text-sm font-medium text-text-secondary border-2 border-border rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isRecharging || !!validationError || !amount"
          @click="handleSubmit"
          class="min-h-[44px] px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          <UiLoadingDots v-if="isRecharging" size="9px" />
          <span v-else>Registrar recarga</span>
        </button>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface PaymentOption {
  value: string
  label: string
}

interface Props {
  modelValue: boolean
  customerId: string
  customerName: string
  currentBalance: number
  paymentOptions: PaymentOption[]
  recharge: (amount_cop: number, payment_method: string, notes?: string) => Promise<unknown>
  isRecharging: boolean
  rechargeError: string | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'recharged'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { show: showToast } = useToast()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const amount = ref<number | null>(null)
const paymentMethod = ref('cash')
const notes = ref('')
const localError = ref<string | null>(null)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value || 0)

watch(() => props.modelValue, (v) => {
  if (v) {
    amount.value = null
    notes.value = ''
    localError.value = null
    if (props.paymentOptions.length) {
      paymentMethod.value = props.paymentOptions[0].value
    }
  }
})

watch(
  () => props.paymentOptions,
  (opts) => {
    if (opts.length && !opts.some((o) => o.value === paymentMethod.value)) {
      paymentMethod.value = opts[0].value
    }
  },
  { immediate: true }
)

const validationError = computed(() => {
  if (!amount.value || amount.value <= 0) return null
  if (!Number.isFinite(amount.value)) return 'Monto inválido'
  return null
})

const apiError = computed(() => localError.value || props.rechargeError)

const handleSubmit = async () => {
  if (!amount.value || amount.value <= 0 || validationError.value) return
  localError.value = null
  try {
    await props.recharge(amount.value, paymentMethod.value, notes.value.trim() || undefined)
    showToast('Recarga registrada correctamente', 'success')
    emit('recharged')
    open.value = false
  } catch (e: any) {
    localError.value = e?.data?.detail || e?.message || 'Error al registrar la recarga'
  }
}
</script>
