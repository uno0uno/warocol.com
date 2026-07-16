<template>
  <UiCatalogSearchCombobox
    v-model="searchTerm"
    :options="options"
    :placeholder="placeholder"
    :loading="loading"
    :error="error"
    :allow-create="allowCreate"
    :can-create="!exactMatch"
    :listbox-label="t('abastecimiento.glossary.categorySearchResults')"
    :loading-label="t('abastecimiento.glossary.searchLoading')"
    :empty-label="t('abastecimiento.glossary.noSearchResults')"
    :error-label="t('abastecimiento.glossary.searchError')"
    :create-label="t('abastecimiento.glossary.createNamed', { name: searchTerm.trim() })"
    @search="onSearch"
    @focus="onFocus"
    @select="onSelect"
    @create="onCreate"
  >
    <template #option="{ option }">
      <span class="min-w-0 flex-1 break-words whitespace-normal leading-snug">
        {{ option.label }}
      </span>
      <span
        v-if="!option.raw.tenant_id"
        class="text-xs bg-surface-secondary text-text-secondary rounded px-1 flex-shrink-0"
      >{{ t('abastecimiento.glossary.globalLabel') }}</span>
    </template>
  </UiCatalogSearchCombobox>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCategorySearch, type CategoryRow } from '~/composables/useCategorySearch'
import { normalizeCatalogSearchText, rankCatalogSearchOptions } from '~/utils/catalogSearchRanking'

interface Props {
  placeholder?: string
  initialValue?: string
  allowCreate?: boolean
}

interface Emits {
  (event: 'select', category: CategoryRow): void
  (event: 'create', term: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar categoría...',
  initialValue: '',
  allowCreate: false,
})

const emit = defineEmits<Emits>()
const { t } = useI18n({ useScope: 'global' })
const searchTerm = ref(props.initialValue)
const { query, results, loading, error } = useCategorySearch()
const rankedResults = computed(() =>
  rankCatalogSearchOptions(results.value, searchTerm.value, category => category.name),
)
const options = computed(() => rankedResults.value.map(category => ({
  id: category.id,
  label: category.name,
  class: 'flex items-start gap-1.5',
  raw: category,
})))
const exactMatch = computed(() => {
  const value = normalizeCatalogSearchText(searchTerm.value)
  return !!value && results.value.some(
    category => normalizeCatalogSearchText(category.name) === value,
  )
})

watch(() => props.initialValue, (value) => {
  searchTerm.value = value ?? ''
  query.value = value ?? ''
})

function onSearch(value: string) {
  query.value = value
}

function onFocus(value: string) {
  query.value = value
}

function onSelect(option: { raw?: unknown }) {
  query.value = ''
  emit('select', option.raw as CategoryRow)
}

function onCreate(value: string) {
  query.value = ''
  emit('create', value)
}
</script>
