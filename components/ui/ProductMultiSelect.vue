<template>
  <div class="space-y-2">
    <UiProductSearchInput
      :input-id="inputId"
      :placeholder="resolvedPlaceholder"
      :include-all-types="includeAllTypes"
      :exclude-ids="modelValue.map((p) => p.id)"
      @select="onSelect"
    />

    <ul v-if="showChips" class="flex flex-wrap gap-2" role="list">
      <li
        v-for="product in modelValue"
        :key="product.id"
        class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1"
      >
        <span class="max-w-[14rem] truncate">{{ product.name }}</span>
        <button
          type="button"
          class="hover:opacity-70 min-h-[24px] min-w-[24px] flex items-center justify-center"
          :aria-label="t('menu.modificadores.removeProduct', { name: product.name })"
          @click="removeProduct(product.id)"
        >
          ×
        </button>
      </li>
    </ul>

    <div v-else-if="showBulkSummary" class="flex flex-wrap items-center gap-2">
      <p class="text-sm text-text-secondary">{{ summaryText }}</p>
      <button
        type="button"
        class="text-sm text-primary font-medium min-h-[44px] px-1"
        @click="pickerOpen = true"
      >
        {{ t('menu.modificadores.editProductList') }}
      </button>
    </div>

    <p class="text-xs text-text-tertiary">
      <template v-if="modelValue.length === 0">
        {{ t('menu.modificadores.searchAndAddProducts') }}
      </template>
      <template v-else>
        {{ t('menu.modificadores.selectedProductsCount', { count: modelValue.length }) }}
      </template>
    </p>

    <PromocionesPromotionScopePickerModal
      v-model="pickerOpen"
      :products="modelValue"
      @remove="removeProduct"
      @clear-all="clearAll"
    />
  </div>
</template>

<script setup lang="ts">
import type { ProductRow } from '~/composables/useProductSearch'
import { formatScopeLabel } from '~/utils/promotionPreview'

const { t } = useI18n({ useScope: 'global' })

export interface ProductSelection {
  id: string
  name: string
}

const CHIP_THRESHOLD = 15

const props = withDefaults(defineProps<{
  modelValue: ProductSelection[]
  inputId?: string
  placeholder?: string
  includeAllTypes?: boolean
  chipThreshold?: number
}>(), {
  inputId: 'product-multi-select',
  placeholder: undefined,
  includeAllTypes: true,
  chipThreshold: CHIP_THRESHOLD,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: ProductSelection[]): void
}>()

const pickerOpen = ref(false)

const resolvedPlaceholder = computed(() => props.placeholder || t('menu.modificadores.searchProduct'))

const showChips = computed(
  () => props.modelValue.length > 0 && props.modelValue.length <= props.chipThreshold,
)
const showBulkSummary = computed(() => props.modelValue.length > props.chipThreshold)

const summaryText = computed(() =>
  formatScopeLabel(
    'products',
    [],
    props.modelValue.map((p) => p.name),
    { productCount: props.modelValue.length, countOnlyThreshold: props.chipThreshold },
  ),
)

function onSelect(product: ProductRow) {
  if (props.modelValue.some((p) => p.id === product.id)) return
  emit('update:modelValue', [...props.modelValue, { id: product.id, name: product.name }])
}

function removeProduct(id: string) {
  emit('update:modelValue', props.modelValue.filter((p) => p.id !== id))
}

function clearAll() {
  emit('update:modelValue', [])
  pickerOpen.value = false
}
</script>
