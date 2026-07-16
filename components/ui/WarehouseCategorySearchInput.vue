<template>
  <UiCatalogSearchCombobox
    :model-value="modelValue"
    :options="options"
    :input-id="inputId"
    :placeholder="placeholder"
    :listbox-label="listboxLabel"
    :loading="loading"
    :allow-create="true"
    :can-create="!exactMatch"
    placement="top"
    :loading-label="t('abastecimiento.glossary.searchLoading')"
    :empty-label="t('abastecimiento.glossary.noSearchResults')"
    :error-label="t('abastecimiento.glossary.searchError')"
    :create-label="t('abastecimiento.glossary.createNamed', { name: modelValue.trim() })"
    @update:model-value="updateValue"
    @search="scheduleSearch"
    @focus="scheduleSearch"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { WAREHOUSE_CATEGORY_SUGGESTIONS } from '~/constants/warehouseCategories'
import { normalizeCatalogSearchText, rankCatalogSearchOptions } from '~/utils/catalogSearchRanking'

const props = withDefaults(defineProps<{
  modelValue: string
  inputId?: string
  placeholder?: string
  listboxLabel?: string
}>(), {
  inputId: 'ing-category',
  placeholder: '',
  listboxLabel: 'Warehouse categories',
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', value: string): void
}>()

const { t } = useI18n({ useScope: 'global' })

const searchedValue = ref(props.modelValue)
const loading = ref(false)
const visibleCategories = ref(
  rankCatalogSearchOptions(WAREHOUSE_CATEGORY_SUGGESTIONS, props.modelValue, category => category),
)

const options = computed(() =>
  visibleCategories.value.map(category => ({
    id: normalizeCatalogSearchText(category),
    label: category,
    raw: category,
  })),
)

const exactMatch = computed(() => {
  const normalizedValue = normalizeCatalogSearchText(props.modelValue)
  return !!normalizedValue && WAREHOUSE_CATEGORY_SUGGESTIONS.some(
    category => normalizeCatalogSearchText(category) === normalizedValue,
  )
})

const finishSearch = useDebounceFn((value: string) => {
  visibleCategories.value = rankCatalogSearchOptions(
    WAREHOUSE_CATEGORY_SUGGESTIONS,
    value,
    category => category,
  )
  searchedValue.value = value
  loading.value = false
}, 300)

function scheduleSearch(value: string) {
  if (value === searchedValue.value && !loading.value) return

  loading.value = true
  void finishSearch(value)
}

function updateValue(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
}

</script>
