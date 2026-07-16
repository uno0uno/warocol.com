<template>
  <UiCatalogSearchCombobox
    :model-value="modelValue"
    :options="options"
    :input-id="inputId"
    :placeholder="placeholder"
    :listbox-label="listboxLabel"
    :allow-create="true"
    :can-create="!exactMatch"
    :loading-label="t('abastecimiento.glossary.searchLoading')"
    :empty-label="t('abastecimiento.glossary.noSearchResults')"
    :error-label="t('abastecimiento.glossary.searchError')"
    :create-label="t('abastecimiento.glossary.createNamed', { name: modelValue.trim() })"
    @update:model-value="updateValue"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const rankedCategories = computed(() =>
  rankCatalogSearchOptions(WAREHOUSE_CATEGORY_SUGGESTIONS, props.modelValue, category => category),
)

const options = computed(() =>
  rankedCategories.value.map(category => ({
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

function updateValue(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
}

</script>
