<template>
  <div class="bg-surface border border-border rounded-lg overflow-hidden">
    <div class="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">{{ t('analitica.puntos.rewards.title') }}</h3>
        <p class="text-xs text-text-secondary mt-0.5">{{ t('analitica.puntos.rewards.subtitle') }}</p>
      </div>
      <button
        type="button"
        @click="openCreate"
        class="min-h-[44px] px-4 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {{ t('analitica.puntos.rewards.new') }}
      </button>
    </div>

    <div v-if="isLoading" class="flex justify-center py-10">
      <CommonsTheCustomLoader size="medium" />
    </div>

    <div v-else-if="!rewards.length" class="px-4 py-10 text-center text-sm text-text-secondary">
      {{ t('analitica.puntos.rewards.empty') }}
    </div>

    <div v-else class="divide-y divide-border">
      <div
        v-for="reward in rewards"
        :key="reward.id"
        class="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-sm font-semibold text-text-primary">{{ reward.name }}</p>
            <span
              :class="[
                'text-xs px-2 py-0.5 rounded-full font-medium',
                reward.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
              ]"
            >
              {{ reward.is_active ? t('analitica.puntos.active') : t('analitica.puntos.inactive') }}
            </span>
          </div>
          <p class="text-xs text-text-secondary mt-1">
            {{ typeLabel(reward.reward_type) }}
            · {{ t('analitica.puntos.rewards.warosCost', { amount: formatNumber(reward.waros_cost, { maximumFractionDigits: 0 }) }) }}
            <template v-if="reward.reward_type === 'fixed_cop_off' && reward.fixed_cop_off">
              · {{ t('analitica.puntos.rewards.discountAmount', { amount: formatCurrency(reward.fixed_cop_off) }) }}
            </template>
          </p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            @click="openEdit(reward)"
            class="min-h-[36px] px-3 text-xs font-semibold rounded-lg border border-border hover:bg-surface-secondary"
          >
            {{ t('common.edit') }}
          </button>
          <button
            type="button"
            @click="confirmDelete(reward)"
            class="min-h-[36px] px-3 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
          >
            {{ t('common.delete') }}
          </button>
        </div>
      </div>
    </div>

    <PuntosWaroRewardModal
      v-model="showModal"
      :reward="selectedReward"
      :is-saving="isSaving"
      @save="handleSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { WaroReward } from '~/composables/useWaroRewards'

const { show: showToast } = useToast()
const { t } = useI18n({ useScope: 'global' })
const { formatCurrency, formatNumber } = useFormatters()
const {
  rewards,
  isLoading,
  createReward,
  updateReward,
  deleteReward,
  isSaving,
  apiError,
} = useWaroRewards()

const showModal = ref(false)
const selectedReward = ref<WaroReward | null>(null)

const typeLabel = (type: string) =>
  type === 'free_product' ? t('analitica.puntos.rewards.freeProduct') : t('analitica.puntos.rewards.fixedDiscount')

const openCreate = () => {
  selectedReward.value = null
  showModal.value = true
}

const openEdit = (reward: WaroReward) => {
  selectedReward.value = reward
  showModal.value = true
}

const handleSave = async (payload: Parameters<typeof createReward>[0]) => {
  try {
    if (selectedReward.value) {
      await updateReward(selectedReward.value.id, payload)
      showToast(t('analitica.puntos.rewards.updated'), 'success')
    } else {
      await createReward(payload)
      showToast(t('analitica.puntos.rewards.created'), 'success')
    }
    showModal.value = false
  } catch (e) {
    showToast(apiError(e), 'error')
  }
}

const confirmDelete = async (reward: WaroReward) => {
  if (!confirm(t('analitica.puntos.rewards.confirmDelete', { name: reward.name }))) return
  try {
    await deleteReward(reward.id)
    showToast(t('analitica.puntos.rewards.deleted'), 'success')
  } catch (e) {
    showToast(apiError(e), 'error')
  }
}
</script>
