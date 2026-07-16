<template>
  <UiCatalogSearchCombobox
    v-model="searchTerm"
    :options="options"
    :placeholder="resolvedPlaceholder"
    :loading="loading"
    :error="error"
    :allow-create="allowCreate"
    :listbox-label="t('abastecimiento.glossary.ingredientSearchResults')"
    :loading-label="t('abastecimiento.glossary.searchLoading')"
    :empty-label="t('abastecimiento.glossary.noSearchResults')"
    :error-label="t('abastecimiento.glossary.searchError')"
    :create-label="t('abastecimiento.glossary.createNamed', { name: searchTerm.trim() })"
    @search="onSearch"
    @focus="onFocus"
    @select="onSelect"
    @create="onCreate"
  >
    <template #presentation="{ option }">
      {{ option.label }}
    </template>
    <template #option="{ option }">
      <span class="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
        <span class="min-w-0 break-words whitespace-normal leading-snug">
          {{ option.label }}
          <span class="text-text-secondary">({{ option.raw.unit }})</span>
        </span>
        <span
          v-if="option.raw.is_resale"
          class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0"
        >{{ t('menu.common.reventa') }}</span>
        <span
          v-else-if="option.raw.is_custom"
          class="text-xs bg-surface-secondary text-text-secondary rounded px-1 flex-shrink-0"
        >{{ t('abastecimiento.glossary.customLabel') }}</span>
      </span>
    </template>
  </UiCatalogSearchCombobox>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Ingredient {
  id: string
  name: string
  unit: string
  [key: string]: any
}

interface Props {
  placeholder?: string
  initialValue?: string
  allowCreate?: boolean
  baseOnly?: boolean
  type?: string
}

interface Emits {
  (event: 'select', ingredient: Ingredient): void
  (event: 'create', term: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  initialValue: '',
  allowCreate: false,
  baseOnly: false,
})

const emit = defineEmits<Emits>()
const { t } = useI18n({ useScope: 'global' })
const WAREHOUSE_COPY = useWarehouseCopy()
const resolvedPlaceholder = computed(
  () => props.placeholder || WAREHOUSE_COPY.menuSearchPlaceholder,
)
const searchTerm = ref(props.initialValue)
const ingredientType = computed(() => props.type)
const { query, groupedResults, loading, error } = useIngredientSearch({
  baseOnly: props.baseOnly,
  type: ingredientType,
  searchOnEmpty: true,
})

const options = computed(() => groupedResults.value.map((row: Ingredient & { _isHeader?: boolean }) => ({
  id: row._isHeader ? `header-${row.id}` : row.id,
  label: row.name,
  kind: row._isHeader ? 'presentation' as const : 'option' as const,
  class: row.parent_id ? 'ps-6 flex items-start gap-1.5' : 'flex items-start gap-1.5',
  raw: row,
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
  const ingredient = option.raw as Ingredient
  query.value = ''
  emit('select', ingredient)
}

function onCreate(value: string) {
  query.value = ''
  emit('create', value)
}
</script>
