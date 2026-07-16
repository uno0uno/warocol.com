<template>
  <UiCatalogSearchCombobox
    :model-value="queryText"
    :options="options"
    :input-id="inputId"
    :placeholder="placeholder"
    :listbox-label="listboxLabel"
    :loading="loading || mutating"
    :error="error"
    :allow-create="true"
    :can-create="canCreate"
    placement="top"
    :loading-label="t('abastecimiento.glossary.searchLoading')"
    :empty-label="t('abastecimiento.glossary.noSearchResults')"
    :error-label="t('abastecimiento.glossary.searchError')"
    :create-label="t('abastecimiento.glossary.createNamed', { name: queryText.trim() })"
    @update:model-value="onInputValue"
    @search="onSearch"
    @focus="onSearch"
    @select="onSelect"
    @create="onCreate"
  />

  <div v-if="selectedCategory" class="mt-2 rounded-lg border border-border bg-surface-secondary/40 px-3 py-2">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate text-xs font-medium text-text-primary">{{ selectedCategory.name }}</p>
        <p class="text-[11px] text-text-tertiary">
          {{ selectedCategory.scope === 'global'
            ? t('abastecimiento.glossary.warehouseCategoryGlobal')
            : t('abastecimiento.glossary.warehouseCategoryPrivate') }}
        </p>
      </div>
      <div v-if="selectedCategory.can_manage && !renaming && !confirmingArchive" class="flex gap-1">
        <button
          type="button"
          class="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
          @click="startRename"
        >
          {{ t('abastecimiento.glossary.renameWarehouseCategory') }}
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          @click="confirmingArchive = true"
        >
          {{ t('abastecimiento.glossary.archiveWarehouseCategory') }}
        </button>
      </div>
    </div>

    <div v-if="renaming" class="mt-2 flex gap-2">
      <input
        v-model="renameValue"
        type="text"
        class="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary"
        :aria-label="t('abastecimiento.glossary.renameWarehouseCategory')"
      />
      <button type="button" class="text-xs font-medium text-primary" :disabled="mutating" @click="saveRename">
        {{ t('abastecimiento.glossary.saveChanges') }}
      </button>
      <button type="button" class="text-xs text-text-secondary" @click="renaming = false">
        {{ t('abastecimiento.glossary.cancel') }}
      </button>
    </div>

    <div v-if="confirmingArchive" class="mt-2">
      <p class="text-xs text-text-secondary">
        {{ t('abastecimiento.glossary.archiveWarehouseCategoryConfirm') }}
      </p>
      <div class="mt-1 flex justify-end gap-2">
        <button type="button" class="text-xs text-text-secondary" @click="confirmingArchive = false">
          {{ t('abastecimiento.glossary.cancel') }}
        </button>
        <button type="button" class="text-xs font-medium text-destructive" :disabled="mutating" @click="archiveSelected">
          {{ t('abastecimiento.glossary.archiveWarehouseCategory') }}
        </button>
      </div>
    </div>
  </div>
  <p v-if="actionError" class="mt-2 text-xs text-destructive" role="alert">{{ actionError }}</p>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  useWarehouseCategorySearch,
  type WarehouseCategoryRow,
} from '~/composables/useWarehouseCategorySearch'
import { normalizeCatalogSearchText, rankCatalogSearchOptions } from '~/utils/catalogSearchRanking'

const props = withDefaults(defineProps<{
  modelValue: WarehouseCategoryRow | null
  inputId?: string
  placeholder?: string
  listboxLabel?: string
}>(), {
  inputId: 'ing-category',
  placeholder: '',
  listboxLabel: 'Warehouse categories',
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: WarehouseCategoryRow | null): void
  (event: 'change', value: WarehouseCategoryRow | null): void
}>()

const { t } = useI18n({ useScope: 'global' })
const {
  query,
  results,
  loading,
  error,
  mutating,
  createCategory,
  renameCategory,
  archiveCategory,
} = useWarehouseCategorySearch()
const queryText = ref(props.modelValue?.name ?? '')
const renaming = ref(false)
const renameValue = ref('')
const confirmingArchive = ref(false)
const actionError = ref('')
const preserveQueryOnClear = ref(false)

watch(
  () => props.modelValue,
  (category) => {
    if (category) {
      queryText.value = category.name
    } else if (preserveQueryOnClear.value) {
      preserveQueryOnClear.value = false
    } else {
      queryText.value = ''
    }
    if (category?.name) query.value = category.name
    renaming.value = false
    confirmingArchive.value = false
  },
  { immediate: true },
)

const rankedCategories = computed(() =>
  rankCatalogSearchOptions(results.value, queryText.value, category => category.name),
)

const options = computed(() =>
  rankedCategories.value.map(category => ({
    id: category.name,
    label: category.name,
    raw: category,
  })),
)

const exactMatch = computed(() => {
  const normalizedValue = normalizeCatalogSearchText(queryText.value)
  return !!normalizedValue && results.value.some(
    category => normalizeCatalogSearchText(category.name) === normalizedValue,
  )
})

const selectedCategory = computed(() => {
  if (!props.modelValue) return null
  return results.value.find(category => category.id === props.modelValue?.id) ?? props.modelValue
})

const canCreate = computed(() =>
  !exactMatch.value && !!queryText.value.trim() && !mutating.value,
)

function onSearch(value: string) {
  query.value = value
}

function updateSelection(value: WarehouseCategoryRow | null) {
  emit('update:modelValue', value)
  emit('change', value)
}

function errorMessage(actionFailure: any) {
  const detail = actionFailure?.data?.detail
  if (typeof detail === 'string') return detail
  if (typeof detail?.message === 'string') return detail.message
  return t('abastecimiento.glossary.warehouseCategorySaveError')
}

function onInputValue(value: string) {
  queryText.value = value
  if (
    props.modelValue
    && normalizeCatalogSearchText(value) !== normalizeCatalogSearchText(props.modelValue.name)
  ) {
    preserveQueryOnClear.value = true
    updateSelection(null)
  }
}

function onSelect(option: { raw?: WarehouseCategoryRow }) {
  if (!option.raw) return
  queryText.value = option.raw.name
  updateSelection(option.raw)
}

async function onCreate(name: string) {
  actionError.value = ''
  try {
    const category = await createCategory(name)
    queryText.value = category.name
    updateSelection(category)
  } catch (createError: any) {
    actionError.value = errorMessage(createError)
  }
}

function startRename() {
  if (!selectedCategory.value?.can_manage) return
  renameValue.value = selectedCategory.value.name
  renaming.value = true
  actionError.value = ''
}

async function saveRename() {
  if (!selectedCategory.value?.can_manage || !renameValue.value.trim()) return
  actionError.value = ''
  try {
    const category = await renameCategory(selectedCategory.value.id, renameValue.value)
    queryText.value = category.name
    updateSelection(category)
    renaming.value = false
  } catch (renameError: any) {
    actionError.value = errorMessage(renameError)
  }
}

async function archiveSelected() {
  if (!selectedCategory.value?.can_manage) return
  actionError.value = ''
  try {
    await archiveCategory(selectedCategory.value.id)
    queryText.value = ''
    query.value = ''
    updateSelection(null)
    confirmingArchive.value = false
  } catch (archiveError: any) {
    actionError.value = errorMessage(archiveError)
  }
}

</script>
