<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
const { formatCurrency } = useFormatters()

const enabled = defineModel<boolean>('enabled', { default: false })
const discountType = defineModel<'percent' | 'fixed'>('discountType', { default: 'percent' })
const discountInput = defineModel<string>('discountInput', { default: '' })

const props = defineProps<{
  baseAmount: number
}>()

const roundedBase = computed(() => Math.max(0, Math.round(props.baseAmount || 0)))

const discountAmount = computed(() => {
  if (!enabled.value || !discountInput.value) return 0
  const val = Number(discountInput.value)
  if (!Number.isFinite(val) || val <= 0) return 0
  if (discountType.value === 'percent') {
    return Math.min(Math.round(roundedBase.value * val / 100), roundedBase.value)
  }
  return Math.min(Math.round(val), roundedBase.value)
})

const validationError = computed(() => {
  if (!enabled.value || !discountInput.value) return ''
  const val = Number(discountInput.value)
  if (!Number.isFinite(val) || val <= 0) {
    return t('pos.checkout.discount.greaterThanZero')
  }
  if (discountType.value === 'percent') {
    return val > 100 ? t('pos.checkout.discount.percentMax') : ''
  }
  if (roundedBase.value <= 0) {
    return t('pos.checkout.discount.noSubtotal')
  }
  if (Math.round(val) > roundedBase.value) {
    return t('pos.checkout.discount.fixedMax', { amount: formatCurrency(roundedBase.value) })
  }
  return ''
})

function toggleEnabled() {
  enabled.value = !enabled.value
  if (!enabled.value) {
    discountInput.value = ''
  }
}

function selectType(type: 'percent' | 'fixed') {
  discountType.value = type
  discountInput.value = ''
}

function clearInput() {
  discountInput.value = ''
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm font-semibold text-text-primary">
        {{ t('pos.checkout.discount.title') }}
      </p>
      <button
        type="button"
        role="switch"
        :aria-checked="enabled"
        :aria-label="t('pos.checkout.discount.title')"
        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
        :class="enabled ? 'bg-crocus-300' : 'bg-border'"
        @click="toggleEnabled"
      >
        <span
          class="pointer-events-none inline-block h-5 w-5 rounded-full bg-control-toggle-thumb shadow transform ring-0 transition duration-200"
          :class="enabled ? 'translate-x-5' : 'translate-x-0'"
        />
      </button>
    </div>

    <div v-if="enabled" class="space-y-3">
      <div class="flex rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          class="flex-1 min-h-[44px] text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
          :class="discountType === 'percent' ? 'bg-crocus-50 text-primary' : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/70'"
          @click="selectType('percent')"
        >
          %
        </button>
        <button
          type="button"
          class="flex-1 min-h-[44px] text-sm font-semibold transition-colors border-l border-border focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
          :class="discountType === 'fixed' ? 'bg-crocus-50 text-primary' : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/70'"
          @click="selectType('fixed')"
        >
          {{ t('pos.checkout.discount.fixed') }}
        </button>
      </div>

      <input
        v-model="discountInput"
        type="number"
        :min="0.01"
        :max="discountType === 'percent' ? 100 : roundedBase"
        :step="discountType === 'percent' ? 0.01 : 1"
        :placeholder="discountType === 'percent' ? t('pos.checkout.discount.percentPlaceholder') : t('pos.checkout.discount.fixedPlaceholder')"
        :aria-invalid="validationError ? 'true' : 'false'"
        :aria-label="t('pos.checkout.discount.title')"
        :class="validationError ? 'border-state-danger-border focus:ring-state-danger-border' : 'border-border focus:ring-primary'"
        class="w-full min-h-[44px] px-4 py-2.5 rounded-xl border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2"
      />

      <div class="flex items-start justify-between gap-3">
        <p
          v-if="validationError"
          class="text-xs font-medium text-state-danger-text"
        >
          {{ validationError }}
        </p>
        <p
          v-else
          class="text-xs text-text-tertiary"
        >
          {{ t('pos.checkout.discount.baseAvailable', { amount: formatCurrency(roundedBase) }) }}
        </p>
        <button
          v-if="discountInput"
          type="button"
          class="text-xs font-semibold text-text-secondary hover:text-primary min-h-[44px]"
          @click="clearInput"
        >
          {{ t('pos.checkout.discount.clear') }}
        </button>
      </div>

      <div
        v-if="discountAmount > 0"
        class="flex items-center justify-between px-4 py-2.5 bg-crocus-50 rounded-lg"
      >
        <span class="text-sm font-medium text-primary">{{ t('pos.checkout.discount.applied') }}</span>
        <span class="text-sm font-semibold text-primary">-{{ formatCurrency(discountAmount) }}</span>
      </div>
    </div>
  </div>
</template>
