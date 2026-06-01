<script setup lang="ts">
import type { WaroReward } from '~/composables/useWaroRewards'

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

function rewardSubtitle(reward: WaroReward) {
  if (reward.reward_type === 'fixed_cop_off' && reward.fixed_cop_off) {
    return `-${formatCurrency(reward.fixed_cop_off)} · ${reward.waros_cost.toLocaleString('es-CO')} pts`
  }
  return `Producto gratis · ${reward.waros_cost.toLocaleString('es-CO')} pts`
}
</script>

<template>
  <Transition name="sheet">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-4 bg-black/50"
      @click.self="close"
    >
      <div
        class="bottom-sheet-panel bg-surface w-full md:max-w-md border border-border flex flex-col rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[85vh]"
        @click.stop
      >
        <div class="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-text-primary">Canjear recompensa</h2>
            <p class="text-sm text-text-secondary mt-0.5">
              Saldo: {{ warosBalance.toLocaleString('es-CO') }} pts
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
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
            No hay recompensas activas configuradas.
          </div>
          <ul v-else class="space-y-2">
            <li v-for="reward in activeRewards" :key="reward.id">
              <button
                type="button"
                class="w-full text-left p-4 rounded-xl border transition-colors min-h-[44px]"
                :class="warosBalance >= reward.waros_cost
                  ? 'border-border hover:border-amber-400 hover:bg-amber-50/50'
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
