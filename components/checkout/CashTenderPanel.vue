<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
import {
  formatIntegerMoney,
  normalizeUiLocale,
  parseIntegerMoney,
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

const uiLocale = computed<UiLocale>(() =>
  normalizeUiLocale(locale.value),
)

const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

const { formatCurrency } = useFormatters()

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

const appendDigit = (digit: string) => {
  const current = Math.max(0, Math.floor(Number(cashReceived.value) || 0))
  const next = `${current === 0 ? '' : String(current)}${digit}`
  // Cap length to avoid absurd POS amounts from repeated taps
  if (next.length > 12) return
  cashReceived.value = Number(next)
}

const backspaceDigit = () => {
  const current = Math.max(0, Math.floor(Number(cashReceived.value) || 0))
  const next = String(current).slice(0, -1)
  cashReceived.value = next ? Number(next) : 0
}

const clearAmount = () => {
  cashReceived.value = 0
}

const showVuelto = computed(() => {
  if (props.requireInputForFeedback && cashReceived.value <= 0) return false
  return cashShortfall.value <= 0.01
})
const showShortfall = computed(() => {
  if (props.requireInputForFeedback && cashReceived.value <= 0) return false
  return cashShortfall.value > 0.01
})

const keyBtnClass =
  'min-h-[56px] px-4 py-3 rounded-lg bg-surface-secondary dark:bg-surface text-text-primary text-xl font-semibold hover:bg-border/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary active:scale-95'
</script>

<template>
  <div class="flex flex-col gap-3 p-4 rounded-xl bg-surface border border-border">
    <label :for="inputId" class="text-sm font-medium text-text-primary">
      {{ t('pos.cash.received') }}
    </label>
    <div class="relative">
      <input
        :id="inputId"
        type="text"
        inputmode="numeric"
        :value="cashReceivedDisplay"
        :aria-label="t('pos.cash.receivedAria', { amount: formatCurrency(amountToCharge) })"
        placeholder="0"
        class="w-full min-h-[60px] ps-4 pe-10 py-3 bg-white dark:bg-surface border-2 border-green-500 rounded-xl text-3xl font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-green-500 tabular-nums placeholder:text-text-tertiary placeholder:font-normal"
        @input="onCashReceivedInput"
      />
      <span class="absolute end-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-green-600 pointer-events-none">$</span>
    </div>
    <button
      type="button"
      :aria-label="t('pos.cash.exactAria')"
      class="w-full min-h-[56px] px-4 py-3 rounded-lg bg-surface-secondary dark:bg-surface text-text-primary text-base font-semibold hover:bg-border/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      @click="cashReceived = amountToCharge"
    >
      {{ t('pos.cash.exact') }}
    </button>
    <div
      class="grid grid-cols-3 gap-3"
      role="group"
      :aria-label="t('pos.cash.keypadAria')"
    >
      <button
        v-for="digit in keypadDigits"
        :key="digit"
        type="button"
        :class="keyBtnClass"
        :aria-label="t('pos.cash.digitAria', { digit })"
        @click="appendDigit(digit)"
      >
        {{ digit }}
      </button>
      <button
        type="button"
        :class="keyBtnClass"
        :aria-label="t('pos.cash.backspaceAria')"
        @click="backspaceDigit"
      >
        ⌫
      </button>
      <button
        type="button"
        :class="keyBtnClass"
        :aria-label="t('pos.cash.digitAria', { digit: '0' })"
        @click="appendDigit('0')"
      >
        0
      </button>
      <button
        type="button"
        :class="keyBtnClass"
        :aria-label="t('pos.cash.clearAria')"
        @click="clearAmount"
      >
        {{ t('pos.cash.clear') }}
      </button>
    </div>
    <div
      v-if="showVuelto"
      class="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40"
      role="status"
      aria-live="polite"
    >
      <span class="text-base font-medium text-green-700 dark:text-green-400">{{ t('pos.cash.change') }}</span>
      <span class="text-3xl font-bold text-green-700 dark:text-green-400 tabular-nums">
        {{ formatCurrency(cashChange) }}
      </span>
    </div>
    <p v-else-if="showShortfall" class="flex items-center gap-2 text-sm text-destructive">
      <svg class="h-[1em] w-[1em] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {{ t('pos.cash.shortfall', { amount: formatCurrency(cashShortfall) }) }}
    </p>
  </div>
</template>
