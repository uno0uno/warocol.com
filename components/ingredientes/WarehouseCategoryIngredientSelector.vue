<template>
  <section class="space-y-3" :aria-busy="loading">
    <div class="space-y-1.5">
      <label :for="inputId" class="text-sm font-medium text-text-primary">
        {{ t('abastecimiento.glossary.categoryIngredientSelectorTitle') }}
      </label>
      <UiWarehouseCategorySearchInput
        v-model="pendingCategory"
        :input-id="inputId"
        :placeholder="t('abastecimiento.glossary.categoryIngredientSelectorPlaceholder')"
        :listbox-label="t('abastecimiento.glossary.warehouseCategorySearchResults')"
        compact
        :allow-create="false"
        placement="bottom"
        @change="onCategorySelected"
      />
    </div>

    <ul v-if="selectedCategories.length" class="flex flex-wrap gap-2">
      <li
        v-for="category in selectedCategories"
        :key="category.id"
        class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
      >
        <span>{{ category.name }}</span>
        <button
          type="button"
          class="min-h-6 min-w-6 rounded-full hover:bg-primary/10"
          :aria-label="t('abastecimiento.glossary.removeWarehouseCategorySelection', { name: category.name })"
          @click="removeSelectedCategory(category.id)"
        >
          ×
        </button>
      </li>
    </ul>

    <p v-if="loading" class="text-xs text-text-secondary" aria-live="polite">
      {{ t('abastecimiento.glossary.categoryIngredientsLoading') }}
    </p>

    <div v-if="error" class="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2" role="alert">
      <p class="text-xs text-destructive">
        {{ t('abastecimiento.glossary.categoryIngredientsError') }}
      </p>
      <button type="button" class="text-xs font-medium text-primary" :disabled="loading" @click="retry">
        {{ t('abastecimiento.glossary.categoryIngredientsRetry') }}
      </button>
    </div>

    <p v-if="emptyCategoryNames" class="text-xs text-text-secondary">
      {{ t('abastecimiento.glossary.categoryIngredientsEmpty', { categories: emptyCategoryNames }) }}
    </p>
    <p v-if="unavailableCategoryNames" class="text-xs text-warning">
      {{ t('abastecimiento.glossary.categoryIngredientsPartial', { categories: unavailableCategoryNames }) }}
    </p>

    <div v-if="preparedRows.length" class="space-y-2">
      <div
        v-for="row in preparedRows"
        :key="row.ingredient_id"
        class="grid gap-2 rounded-lg border border-border bg-surface-secondary/30 p-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-end"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-text-primary">{{ row.name }}</p>
        </div>
        <label class="space-y-1 text-xs text-text-secondary">
          <span>{{ t('abastecimiento.glossary.categoryIngredientQuantity') }}</span>
          <input
            type="number"
            min="0"
            step="any"
            class="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
            :value="row.quantity ?? ''"
            @input="onQuantityInput(row.ingredient_id, $event)"
          />
        </label>
        <label class="space-y-1 text-xs text-text-secondary">
          <span>{{ t('abastecimiento.glossary.categoryIngredientUnit') }}</span>
          <input
            type="text"
            class="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-primary"
            :value="row.unit ?? ''"
            @input="onUnitInput(row.ingredient_id, $event)"
          />
        </label>
        <button
          type="button"
          class="min-h-9 rounded-md px-2 text-xs text-destructive hover:bg-destructive/10"
          :aria-label="t('abastecimiento.glossary.removePreparedIngredient', { name: row.name })"
          @click="removePreparedRow(row.ingredient_id)"
        >
          {{ t('abastecimiento.glossary.removePreparedIngredientAction') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WarehouseCategoryRow } from '~/composables/useWarehouseCategorySearch'
import {
  useWarehouseCategoryIngredientSelector,
  type PreparedWarehouseCategoryIngredient,
} from '~/composables/useWarehouseCategoryIngredientSelector'

const props = withDefaults(defineProps<{
  existingIngredientIds?: string[]
  inputId?: string
}>(), {
  existingIngredientIds: () => [],
  inputId: 'warehouse-category-ingredient-selector',
})

const emit = defineEmits<{
  (event: 'update:preparedRows', rows: PreparedWarehouseCategoryIngredient[]): void
}>()

const { t } = useI18n({ useScope: 'global' })
const pendingCategory = ref<WarehouseCategoryRow | null>(null)
const {
  selectedCategories,
  preparedRows,
  emptyCategoryIds,
  unavailableCategoryIds,
  loading,
  error,
  addCategory,
  removeCategory,
  removePreparedRow,
  updatePreparedRow,
  resolve,
  retry,
} = useWarehouseCategoryIngredientSelector({
  getExistingIngredientIds: () => props.existingIngredientIds,
})

function namesForCategoryIds(ids: string[]) {
  const namesById = new Map(selectedCategories.value.map(category => [category.id, category.name]))
  return ids.map(id => namesById.get(id)).filter(Boolean).join(', ')
}

const emptyCategoryNames = computed(() => namesForCategoryIds(emptyCategoryIds.value))
const unavailableCategoryNames = computed(() => namesForCategoryIds(unavailableCategoryIds.value))

async function onCategorySelected(category: WarehouseCategoryRow | null) {
  if (!category) return
  await addCategory(category)
  pendingCategory.value = null
}

function removeSelectedCategory(categoryId: string) {
  void removeCategory(categoryId)
}

function onQuantityInput(ingredientId: string, event: Event) {
  const value = (event.target as HTMLInputElement).value.trim()
  const quantity = value === '' ? null : Number(value)
  updatePreparedRow(ingredientId, {
    quantity: quantity === null || Number.isFinite(quantity) ? quantity : null,
  })
}

function onUnitInput(ingredientId: string, event: Event) {
  const value = (event.target as HTMLInputElement).value.trim()
  updatePreparedRow(ingredientId, { unit: value || null })
}

watch(
  preparedRows,
  rows => emit('update:preparedRows', rows.map(row => ({ ...row }))),
  { deep: true, immediate: true },
)

watch(
  () => props.existingIngredientIds,
  () => {
    if (selectedCategories.value.length) void resolve()
  },
  { deep: true },
)
</script>
