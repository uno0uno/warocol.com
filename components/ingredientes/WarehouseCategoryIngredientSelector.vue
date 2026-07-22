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

    <Transition name="category-panel">
      <div v-if="selectedCategories.length" class="category-panel">
        <section
          class="min-h-0 overflow-hidden rounded-xl border border-border bg-background"
          :aria-labelledby="`${inputId}-prepared-label`"
        >
          <header
            :id="`${inputId}-prepared-label`"
            data-test="category-batch-label"
            class="flex items-center gap-2 border-b border-border bg-surface-secondary/50 px-3 py-2.5"
          >
            <svg class="h-4 w-4 flex-shrink-0 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2h9A1.5 1.5 0 0 1 21 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-10Z" />
            </svg>
            <h4 class="text-sm font-semibold text-text-primary">
              {{ t('abastecimiento.glossary.categoryIngredientsBatchLabel') }}
            </h4>
          </header>

          <TransitionGroup name="category-group">
            <section
              v-for="group in preparedGroups"
              :key="group.category.id"
              data-test="category-group"
              class="border-b border-border last:border-b-0"
              :aria-labelledby="`${inputId}-category-${group.category.id}`"
            >
              <header class="flex min-h-11 items-center justify-between gap-3 border-b border-border/70 bg-surface px-3 py-2">
                <div class="flex min-w-0 items-center gap-2">
              <h5
                    :id="`${inputId}-category-${group.category.id}`"
                    class="min-w-0 break-words text-sm font-medium text-text-primary"
                  >
                    {{ group.category.name }}
                  </h5>
                  <span class="text-xs tabular-nums text-text-tertiary" aria-hidden="true">
                    {{ group.rows.length }}
                  </span>
                </div>
                <button
                  type="button"
                  class="inline-flex min-h-9 min-w-9 flex-shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-destructive/5 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  :aria-label="t('abastecimiento.glossary.removeWarehouseCategorySelection', { name: group.category.name })"
                  :title="t('abastecimiento.glossary.removeWarehouseCategorySelection', { name: group.category.name })"
                  @click="removeSelectedCategory(group.category.id)"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </header>

              <div
                v-if="group.rows.length && !hidePreparedIngredientRows"
                class="space-y-3 bg-surface-secondary/20 p-3"
                role="list"
                data-test="category-prepared-rows"
              >
                <div
                  v-for="row in group.rows"
                  :key="row.ingredient_id"
                  role="listitem"
                  class="rounded-lg border border-border bg-background p-3 sm:p-4"
                >
                  <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div class="min-w-0 md:col-span-5">
                      <p class="mb-1 text-xs font-medium text-text-secondary">
                        {{ t('abastecimiento.glossary.warehouseItemOrResaleRequired') }}
                      </p>
                      <div
                        class="input-base flex min-h-[38px] items-center gap-2 px-3 py-2 text-sm text-text-primary"
                        :title="row.name"
                      >
                        <svg class="h-4 w-4 flex-shrink-0 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                        </svg>
                        <span class="truncate">{{ row.name }}</span>
                      </div>
                    </div>

                    <label class="md:col-span-3">
                      <span class="mb-1 block text-xs font-medium text-text-secondary">
                        {{ t('abastecimiento.glossary.categoryIngredientQuantity') }} *
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        class="input-base w-full px-3 py-2 text-sm"
                        :value="row.quantity ?? ''"
                        @input="onQuantityInput(row.ingredient_id, $event)"
                      />
                    </label>

                    <label class="md:col-span-3">
                      <span class="mb-1 block text-xs font-medium text-text-secondary">
                        {{ t('abastecimiento.glossary.categoryIngredientUnit') }}
                      </span>
                      <select
                        v-if="unitOptions"
                        :value="row.unit ?? ''"
                        :disabled="loadingUnitIds?.has(row.ingredient_id)"
                        class="input-base w-full px-3 py-2 text-sm disabled:opacity-50"
                        @change="onUnitInput(row.ingredient_id, $event)"
                      >
                        <option
                          v-for="option in unitOptions(row.ingredient_id)"
                          :key="option.value"
                          :value="option.value"
                        >
                          {{ option.label }}
                        </option>
                      </select>
                      <input
                        v-else
                        type="text"
                        class="input-base w-full px-3 py-2 text-sm"
                        :value="row.unit ?? ''"
                        @input="onUnitInput(row.ingredient_id, $event)"
                      />
                    </label>

                    <div class="md:col-span-1">
                      <span class="mb-1 hidden text-xs font-medium text-text-secondary md:block" aria-hidden="true">&nbsp;</span>
                      <button
                        type="button"
                        class="flex min-h-[38px] w-full items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/5 focus:outline-none focus:ring-2 focus:ring-destructive/30"
                        :aria-label="t('abastecimiento.glossary.removePreparedIngredient', { name: row.name })"
                        :title="t('abastecimiento.glossary.removePreparedIngredientAction')"
                        @click="removePreparedRow(row.ingredient_id)"
                      >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7 18.133 19.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </TransitionGroup>
        </section>
      </div>
    </Transition>
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
  unitOptions?: (ingredientId: string) => Array<{ value: string, label: string }>
  loadingUnitIds?: Set<string>
  excludeResale?: boolean
  /** Hide compact quantity/unit rows when parent syncs prepared rows elsewhere (e.g. modifier options). */
  hidePreparedIngredientRows?: boolean
}>(), {
  existingIngredientIds: () => [],
  inputId: 'warehouse-category-ingredient-selector',
  excludeResale: false,
  hidePreparedIngredientRows: false,
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
  excludeResale: props.excludeResale,
})

function namesForCategoryIds(ids: string[]) {
  const namesById = new Map(selectedCategories.value.map(category => [category.id, category.name]))
  return ids.map(id => namesById.get(id)).filter(Boolean).join(', ')
}

const emptyCategoryNames = computed(() => namesForCategoryIds(emptyCategoryIds.value))
const unavailableCategoryNames = computed(() => namesForCategoryIds(unavailableCategoryIds.value))
const preparedGroups = computed(() => selectedCategories.value.map(category => ({
  category,
  rows: preparedRows.value.filter(row => row.warehouse_category_id === category.id),
})))

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
  (ids, previousIds) => {
    if (!selectedCategories.value.length) return

    const previous = new Set(previousIds ?? [])
    const current = new Set(ids ?? [])

    for (const ingredientId of previous) {
      if (!current.has(ingredientId)) {
        removePreparedRow(ingredientId)
      }
    }
  },
  { deep: true },
)

function dismissPreparedIngredient(ingredientId: string) {
  removePreparedRow(ingredientId)
}

defineExpose({
  dismissPreparedIngredient,
})
</script>

<style scoped>
.category-panel {
  display: grid;
  grid-template-rows: 1fr;
}

.category-panel-enter-active,
.category-panel-leave-active {
  overflow: hidden;
  transition:
    grid-template-rows 220ms cubic-bezier(0.2, 0, 0, 1),
    opacity 160ms ease-out;
}

.category-panel-enter-from,
.category-panel-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

.category-group-enter-active,
.category-group-leave-active {
  transform-origin: top;
  transition:
    opacity 160ms ease-out,
    transform 180ms cubic-bezier(0.2, 0, 0, 1);
}

.category-group-enter-from,
.category-group-leave-to {
  opacity: 0;
  transform: translateY(-4px) scaleY(0.985);
}

@media (prefers-reduced-motion: reduce) {
  .category-panel-enter-active,
  .category-panel-leave-active,
  .category-group-enter-active,
  .category-group-leave-active {
    transition: none;
  }
}
</style>
