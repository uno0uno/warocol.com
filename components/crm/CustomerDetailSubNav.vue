<script setup lang="ts">
import {
  shellHeaderToolButtonActiveClass,
  shellHeaderToolTextButtonClass,
} from '~/utils/shellHeaderToolClasses'

export type CustomerDetailSection = 'orders' | 'cartera' | 'paymentHistory' | 'wallet'

const props = defineProps<{
  modelValue: CustomerDetailSection
}>()

const emit = defineEmits<{
  'update:modelValue': [CustomerDetailSection]
}>()

const { t } = useI18n({ useScope: 'global' })

const tabs = computed(() => [
  { id: 'orders' as CustomerDetailSection, label: t('analitica.customerDetail.subNav.orders') },
  { id: 'cartera' as CustomerDetailSection, label: t('analitica.customerDetail.subNav.cartera') },
  { id: 'paymentHistory' as CustomerDetailSection, label: t('analitica.customerDetail.subNav.paymentHistory') },
  { id: 'wallet' as CustomerDetailSection, label: t('analitica.customerDetail.subNav.wallet') },
])

const select = (id: CustomerDetailSection) => {
  if (props.modelValue !== id) emit('update:modelValue', id)
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2"
    role="tablist"
    :aria-label="t('analitica.customerDetail.subNav.aria')"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :class="[
        shellHeaderToolTextButtonClass,
        modelValue === tab.id ? shellHeaderToolButtonActiveClass : '',
      ]"
      :aria-selected="modelValue === tab.id"
      @click="select(tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
