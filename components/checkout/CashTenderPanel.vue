<script setup lang="ts">
import {
  formatIntegerMoney,
  normalizeUiLocale,
  parseIntegerMoney,
  toNumberLocaleTag,
  type UiLocale,
} from '~/utils/parseLocaleDecimal'

const cashReceived = defineModel<number>({ default: 0 })

const props = withDefaults(defineProps<{
  inputId: string
  amountToCharge: number
  /** Split mode: only show vuelto/shortfall after cashier entered something */
  requireInputForFeedback?: boolean
}>(), {
  requireInputForFeedback: false,
})

const tenantsStore = useTenantsStore()
const uiLocale = computed<UiLocale>(() =>
  normalizeUiLocale((tenantsStore.businessProfile as { locale?: string } | null | undefined)?.locale),
)

const cashPresetsExtra = [
  { label: '+ $1.000', offset: 1000 },
  { label: '+ $5.000', offset: 5000 },
  { label: '+ $10.000', offset: 10000 },
  { label: '+ $20.000', offset: 20000 },
] as const

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat(toNumberLocaleTag(uiLocale.value), {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)

const cashChange = computed(() =>
  Math.max(0, (cashReceived.value || 0) - props.amountToCharge),
)
const cashShortfall = computed(() =>
  Math.max(0, props.amountToCharge - (cashReceived.value || 0)),
)
const cashReceivedDisplay = computed(() =>
  formatIntegerMoney(cashReceived.value, uiLocale.value),
)

const onCashReceivedInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const raw = parseIntegerMoney(input.value, uiLocale.value)
  cashReceived.value = raw
  input.value = formatIntegerMoney(raw, uiLocale.value)
}

const showVuelto = computed(() => {
  if (props.requireInputForFeedback && cashReceived.value <= 0) return false
  return cashShortfall.value <= 0.01
})
const showShortfall = computed(() => {
  if (props.requireInputForFeedback && cashReceived.value <= 0) return false
  return cashShortfall.value > 0.01
})
</script>

<template>
  <div class="flex flex-col gap-3 p-4 rounded-xl bg-surface border border-border">
    <label :for="inputId" class="text-sm font-medium text-text-primary">
      Efectivo recibido
    </label>
    <div class="relative">
      <input
        :id="inputId"
        type="text"
        inputmode="numeric"
        :value="cashReceivedDisplay"
        :aria-label="`Efectivo recibido por el cliente, monto a cobrar ${formatCurrency(amountToCharge)}`"
        placeholder="0"
        class="w-full min-h-[60px] pl-4 pr-10 py-3 bg-white dark:bg-surface border-2 border-green-500 rounded-xl text-3xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-green-500 tabular-nums placeholder:text-text-tertiary placeholder:font-normal"
        @input="onCashReceivedInput"
      />
      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-green-600 pointer-events-none">$</span>
    </div>
    <button
      type="button"
      aria-label="Pagar exacto, sin vuelto"
      class="w-full min-h-[56px] px-4 py-3 rounded-lg bg-surface-secondary dark:bg-surface text-text-primary text-base font-semibold hover:bg-border/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      @click="cashReceived = amountToCharge"
    >
      Sin vuelto
    </button>
    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="preset in cashPresetsExtra"
        :key="preset.label"
        type="button"
        class="min-h-[56px] px-4 py-3 rounded-lg bg-surface-secondary dark:bg-surface text-text-primary text-base font-semibold hover:bg-border/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        @click="cashReceived = (cashReceived || 0) + preset.offset"
      >
        {{ preset.label }}
      </button>
    </div>
    <div
      v-if="showVuelto"
      class="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40"
      role="status"
      aria-live="polite"
    >
      <span class="text-base font-medium text-green-700 dark:text-green-400">Vuelto</span>
      <span class="text-3xl font-bold text-green-700 dark:text-green-400 tabular-nums">
        {{ formatCurrency(cashChange) }}
      </span>
    </div>
    <p v-else-if="showShortfall" class="flex items-center gap-2 text-sm text-destructive">
      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Falta cobrar {{ formatCurrency(cashShortfall) }}
    </p>
  </div>
</template>
