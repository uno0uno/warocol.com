<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <Transition name="panel">
      <div
        v-if="open"
        role="dialog"
        aria-modal="true"
        :aria-label="isEdit ? t('analitica.puntos.rewards.editAria') : t('analitica.puntos.rewards.newAria')"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl border-border
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full md:border-l"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-border" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600"
                aria-hidden="true"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-lg font-bold text-text-primary leading-tight">
                  {{ isEdit ? t('analitica.puntos.rewards.editTitle') : t('analitica.puntos.rewards.newTitle') }}
                </h2>
                <p class="text-sm text-text-secondary mt-0.5 leading-snug">
                  {{ isEdit ? reward?.name : t('analitica.puntos.rewards.subtitle') }}
                </p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="t('common.close')"
              class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
              @click="close"
            >
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div class="flex flex-col gap-1.5">
            <label for="reward-name" class="text-sm font-medium text-text-primary">{{ t('analitica.puntos.rewards.name') }}</label>
            <input
              id="reward-name"
              v-model="form.name"
              type="text"
              :placeholder="t('analitica.puntos.rewards.namePlaceholder')"
              class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              :disabled="isSaving"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="reward-type" class="text-sm font-medium text-text-primary">{{ t('analitica.puntos.rewards.type') }}</label>
            <select
              id="reward-type"
              v-model="form.reward_type"
              class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background"
              :disabled="isSaving || isEdit"
            >
              <option value="fixed_cop_off">{{ t('analitica.puntos.rewards.fixedDiscountFull') }}</option>
              <option value="free_product">{{ t('analitica.puntos.rewards.freeProduct') }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="reward-cost" class="text-sm font-medium text-text-primary">{{ t('analitica.puntos.rewards.cost') }}</label>
            <input
              id="reward-cost"
              v-model.number="form.waros_cost"
              type="number"
              min="1"
              step="1"
              class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background"
              :disabled="isSaving"
            />
          </div>

          <div v-if="form.reward_type === 'fixed_cop_off'" class="flex flex-col gap-1.5">
            <label for="reward-cop" class="text-sm font-medium text-text-primary">{{ t('analitica.puntos.rewards.discountCop') }}</label>
            <input
              id="reward-cop"
              v-model.number="form.fixed_cop_off"
              type="number"
              min="1"
              step="1000"
              class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background"
              :disabled="isSaving"
            />
          </div>

          <div v-else class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-text-primary">{{ t('analitica.puntos.rewards.product') }}</label>
            <UiProductSearchInput
              v-if="!selectedProduct"
              :placeholder="t('analitica.puntos.rewards.searchProduct')"
              @select="onProductSelect"
            />
            <div
              v-else
              class="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg bg-surface-secondary"
            >
              <span class="text-sm font-medium text-text-primary truncate">{{ selectedProduct.name }}</span>
              <button
                type="button"
                class="text-xs text-text-secondary hover:text-text-primary"
                @click="clearProduct"
              >
                {{ t('common.edit') }}
              </button>
            </div>
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="form.is_active"
              type="checkbox"
              class="rounded border-border text-primary focus:ring-primary"
              :disabled="isSaving"
            />
            <span class="text-sm text-text-primary">{{ t('analitica.puntos.rewards.active') }}</span>
          </label>

          <p v-if="apiError" role="alert" class="text-sm text-red-600">{{ apiError }}</p>
        </div>

        <div class="flex-shrink-0 border-t border-border px-6 py-4 flex items-center justify-end gap-3 bg-surface">
          <button
            type="button"
            class="min-h-[44px] px-4 text-sm font-medium text-text-secondary border-2 border-border rounded-lg hover:bg-surface-secondary"
            @click="close"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="isSaving || !canSubmit"
            class="min-h-[44px] px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            @click="handleSubmit"
          >
            <UiLoadingDots v-if="isSaving" size="9px" />
            <span v-else>{{ isEdit ? t('common.save') : t('analitica.puntos.rewards.create') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import type { WaroReward, WaroRewardType } from '~/composables/useWaroRewards'
import type { ProductRow } from '~/composables/useProductSearch'

interface Props {
  modelValue: boolean
  reward?: WaroReward | null
  isSaving: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', payload: {
    name: string
    reward_type: WaroRewardType
    waros_cost: number
    fixed_cop_off?: number | null
    product_id?: string | null
    is_active: boolean
  }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n({ useScope: 'global' })

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const isEdit = computed(() => !!props.reward?.id)
const apiError = ref<string | null>(null)
const selectedProduct = ref<ProductRow | null>(null)

const form = reactive({
  name: '',
  reward_type: 'fixed_cop_off' as WaroRewardType,
  waros_cost: 100,
  fixed_cop_off: 5000 as number | null,
  is_active: true,
})

function close() {
  open.value = false
}

watch(() => props.modelValue, async (v) => {
  if (!v) return
  apiError.value = null
  if (props.reward) {
    form.name = props.reward.name
    form.reward_type = props.reward.reward_type
    form.waros_cost = props.reward.waros_cost
    form.fixed_cop_off = props.reward.fixed_cop_off
    form.is_active = props.reward.is_active
    if (props.reward.product_id) {
      try {
        const res = await $fetch<{ data?: { name?: string } }>(
          `/api/menu/products/${props.reward.product_id}`,
        )
        selectedProduct.value = {
          id: props.reward.product_id,
          name: res.data?.name || t('analitica.puntos.rewards.product'),
        }
      } catch {
        selectedProduct.value = {
          id: props.reward.product_id,
          name: t('analitica.puntos.rewards.product'),
        }
      }
    } else {
      selectedProduct.value = null
    }
  } else {
    form.name = ''
    form.reward_type = 'fixed_cop_off'
    form.waros_cost = 100
    form.fixed_cop_off = 5000
    form.is_active = true
    selectedProduct.value = null
  }
})

const onProductSelect = (product: ProductRow) => {
  selectedProduct.value = product
}

const clearProduct = () => {
  selectedProduct.value = null
}

const canSubmit = computed(() => {
  if (!form.name.trim() || form.waros_cost < 1) return false
  if (form.reward_type === 'fixed_cop_off') {
    return !!form.fixed_cop_off && form.fixed_cop_off > 0
  }
  return !!selectedProduct.value?.id
})

const handleSubmit = () => {
  if (!canSubmit.value) return
  emit('save', {
    name: form.name.trim(),
    reward_type: form.reward_type,
    waros_cost: form.waros_cost,
    fixed_cop_off:
      form.reward_type === 'fixed_cop_off' ? form.fixed_cop_off : null,
    product_id:
      form.reward_type === 'free_product' ? selectedProduct.value?.id ?? null : null,
    is_active: form.is_active,
  })
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.3s ease;
}
.panel-enter-from,
.panel-leave-to {
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
