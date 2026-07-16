<template>
  <UiCatalogSearchCombobox
    v-model="searchTerm"
    :options="options"
    :input-id="inputId"
    :placeholder="placeholder"
    :loading="loading"
    :error="error"
    :listbox-label="t('abastecimiento.glossary.productSearchResults')"
    :loading-label="t('abastecimiento.glossary.searchLoading')"
    :empty-label="t('abastecimiento.glossary.noSearchResults')"
    :error-label="t('abastecimiento.glossary.searchError')"
    @search="onSearch"
    @focus="onFocus"
    @select="onSelect"
  >
    <template #option="{ option }">
      <span class="min-w-0 flex-1 break-words whitespace-normal leading-snug">
        {{ option.label }}
      </span>
    </template>
  </UiCatalogSearchCombobox>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProductSearch, type ProductRow } from '~/composables/useProductSearch'
import { rankCatalogSearchOptions } from '~/utils/catalogSearchRanking'

interface Props {
  placeholder?: string
  inputId?: string
  initialValue?: string
  excludeIds?: string[]
  includeAllTypes?: boolean
}

interface Emits {
  (event: 'select', product: ProductRow): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar producto…',
  inputId: undefined,
  initialValue: '',
  excludeIds: () => [],
  includeAllTypes: false,
})

const emit = defineEmits<Emits>()
const { t } = useI18n({ useScope: 'global' })
const searchTerm = ref(props.initialValue)
const { query, results, loading, error } = useProductSearch({
  includeAllTypes: props.includeAllTypes,
})
const excludeSet = computed(() => new Set(props.excludeIds))
const visibleResults = computed(() => results.value.filter(product => !excludeSet.value.has(product.id)))
const rankedResults = computed(() =>
  rankCatalogSearchOptions(visibleResults.value, searchTerm.value, product => product.name),
)
const options = computed(() => rankedResults.value.map(product => ({
  id: product.id,
  label: product.name,
  class: 'flex items-center',
  raw: product,
})))

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
  emit('select', option.raw as ProductRow)
}
</script>
