<template>
  <UiCatalogSearchCombobox
    :model-value="modelValue"
    :options="options"
    :input-id="inputId"
    :placeholder="placeholder"
    :listbox-label="listboxLabel"
    :loading="loading"
    :error="error"
    :allow-create="true"
    :can-create="!exactMatch"
    placement="top"
    :loading-label="t('abastecimiento.glossary.searchLoading')"
    :empty-label="t('abastecimiento.glossary.noSearchResults')"
    :error-label="t('abastecimiento.glossary.searchError')"
    :create-label="t('abastecimiento.glossary.createNamed', { name: modelValue.trim() })"
    @update:model-value="updateValue"
    @search="onSearch"
    @focus="onSearch"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarehouseCategorySearch } from '~/composables/useWarehouseCategorySearch'
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
const { query, results, loading, error } = useWarehouseCategorySearch()

const rankedCategories = computed(() =>
  rankCatalogSearchOptions(results.value, props.modelValue, category => category.name),
)

const options = computed(() =>
  rankedCategories.value.map(category => ({
    id: category.name,
    label: category.name,
    raw: category,
  })),
)

const exactMatch = computed(() => {
  const normalizedValue = normalizeCatalogSearchText(props.modelValue)
  return !!normalizedValue && results.value.some(
    category => normalizeCatalogSearchText(category.name) === normalizedValue,
  )
})

function onSearch(value: string) {
  query.value = value
}

function updateValue(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
}

</script>
