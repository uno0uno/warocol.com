<script setup lang="ts">
import type { WaroReward } from '~/composables/useWaroRewards'
const { t, locale } = useI18n({ useScope: 'global' })

const props = defineProps<{
  modelValue: boolean
  warosBalance: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [reward: WaroReward]
}>()

const { rewards, isLoading, fetchRewards } = useWaroRewards()

const activeRewards = computed(() =>
  rewards.value.filter(r => r.is_active),
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) fetchRewards()
  },
)

function close() {
  emit('update:modelValue', false)
}

function pick(reward: WaroReward) {
  if (props.warosBalance < reward.waros_cost) return
  emit('select', reward)
  close()
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value || 0)
}

function rewardSubtitle(reward: WaroReward) {
  if (reward.reward_type === 'fixed_cop_off' && reward.fixed_cop_off) {
    return `-${formatCurrency(reward.fixed_cop_off)} · ${reward.waros_cost.toLocaleString(locale.value === 'en' ? 'en-US' : 'es-CO')} ${t('pos.wallet.pointsShort')}`
  }
  return `${t('pos.wallet.freeProduct')} · ${reward.waros_cost.toLocaleString(locale.value === 'en' ? 'en-US' : 'es-CO')} ${t('pos.wallet.pointsShort')}`
}
</script>

<template>
  <Transition name="sheet">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-4 bg-overlay-backdrop/50"
      @click.self="close"
    >
      <div
        class="bottom-sheet-panel bg-surface w-full md:max-w-md border border-border flex flex-col rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[85vh]"
        @click.stop
      >
        <div class="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-text-primary">{{ t('pos.wallet.redeemReward') }}</h2>
            <p class="text-sm text-text-secondary mt-0.5">
              {{ t('pos.wallet.pointsBalance', { amount: warosBalance.toLocaleString(locale === 'en' ? 'en-US' : 'es-CO') }) }}
            </p>
          </div>
          <button
            type="button"
            :aria-label="t('common.close')"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface-secondary"
            @click="close"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="isLoading" class="space-y-3">
            <div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-surface-secondary animate-pulse" />
          </div>
          <div v-else-if="activeRewards.length === 0" class="py-8 text-center text-text-secondary text-sm">
            {{ t('pos.wallet.noActiveRewards') }}
          </div>
          <ul v-else class="space-y-2">
            <li v-for="reward in activeRewards" :key="reward.id">
              <button
                type="button"
                class="w-full text-left p-4 rounded-xl border transition-colors min-h-[44px]"
                :class="warosBalance >= reward.waros_cost
                  ? 'border-border hover:border-state-warning-border hover:bg-state-warning-bg/50'
                  : 'border-border opacity-50 cursor-not-allowed'"
                :disabled="warosBalance < reward.waros_cost"
                @click="pick(reward)"
              >
                <p class="font-semibold text-text-primary">{{ reward.name }}</p>
                <p class="text-xs text-text-secondary mt-0.5">{{ rewardSubtitle(reward) }}</p>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Transition>
</template>
