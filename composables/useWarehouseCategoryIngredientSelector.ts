import { ref } from 'vue'
import type { WarehouseCategoryRow } from '~/composables/useWarehouseCategorySearch'

export interface WarehouseCategoryIngredientCandidate {
  ingredient_id: string
  name: string
  unit: string
  warehouse_category_id: string
}

export interface PreparedWarehouseCategoryIngredient {
  ingredient_id: string
  name: string
  quantity: number | null
  unit: string | null
  warehouse_category_id: string
}

interface ResolutionResponse {
  data: {
    ingredients: WarehouseCategoryIngredientCandidate[]
    empty_category_ids: string[]
    unavailable_category_ids: string[]
  }
}

export function useWarehouseCategoryIngredientSelector(options: {
  getExistingIngredientIds?: () => string[]
  excludeResale?: boolean
} = {}) {
  const selectedCategories = ref<WarehouseCategoryRow[]>([])
  const preparedRows = ref<PreparedWarehouseCategoryIngredient[]>([])
  const emptyCategoryIds = ref<string[]>([])
  const unavailableCategoryIds = ref<string[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const dismissedIngredientIds = new Set<string>()
  let latestRequestId = 0

  function uniqueIds(values: string[]) {
    return [...new Set(values.filter(Boolean))]
  }

  async function resolve() {
    const requestId = ++latestRequestId
    const categoryIds = uniqueIds(selectedCategories.value.map(category => category.id))
    error.value = null

    if (!categoryIds.length) {
      preparedRows.value = []
      emptyCategoryIds.value = []
      unavailableCategoryIds.value = []
      loading.value = false
      return
    }

    loading.value = true
    try {
      const excludeIngredientIds = uniqueIds([
        ...(options.getExistingIngredientIds?.() ?? []),
        ...dismissedIngredientIds,
      ])
      const response = await $fetch<ResolutionResponse>(
        '/api/suppliers/ingredients/resolve-by-warehouse-categories',
        {
          method: 'POST',
          body: {
            category_ids: categoryIds,
            exclude_ingredient_ids: excludeIngredientIds,
            exclude_resale: options.excludeResale ?? false,
          },
        },
      )
      if (requestId !== latestRequestId) return

      const seenIds = new Set<string>()
      const existingPreparedRows = new Map(
        preparedRows.value.map(row => [row.ingredient_id, row]),
      )
      preparedRows.value = (response.data?.ingredients ?? []).flatMap((ingredient) => {
        if (seenIds.has(ingredient.ingredient_id)) return []
        seenIds.add(ingredient.ingredient_id)
        const existingRow = existingPreparedRows.get(ingredient.ingredient_id)
        return [{
          ingredient_id: ingredient.ingredient_id,
          name: ingredient.name,
          quantity: existingRow?.quantity ?? null,
          unit: existingRow?.unit ?? (ingredient.unit?.trim() || null),
          warehouse_category_id: ingredient.warehouse_category_id,
        }]
      })
      emptyCategoryIds.value = uniqueIds(response.data?.empty_category_ids ?? [])
      unavailableCategoryIds.value = uniqueIds(response.data?.unavailable_category_ids ?? [])
    } catch (resolveError: any) {
      if (requestId !== latestRequestId) return
      error.value = resolveError instanceof Error
        ? resolveError
        : new Error('Unable to resolve warehouse category ingredients')
    } finally {
      if (requestId === latestRequestId) loading.value = false
    }
  }

  async function hydrateFromSnapshot(
    categories: WarehouseCategoryRow[],
    rows: PreparedWarehouseCategoryIngredient[] = [],
  ) {
    const seenCategoryIds = new Set<string>()
    selectedCategories.value = categories.filter((category) => {
      if (!category?.id || seenCategoryIds.has(category.id)) return false
      seenCategoryIds.add(category.id)
      return true
    })
    preparedRows.value = rows.map(row => ({ ...row }))
    emptyCategoryIds.value = []
    unavailableCategoryIds.value = []
    error.value = null
    loading.value = false
  }

  async function addCategory(category: WarehouseCategoryRow | null) {
    if (!category || selectedCategories.value.some(selected => selected.id === category.id)) {
      return false
    }
    selectedCategories.value = [...selectedCategories.value, category]
    await resolve()
    return true
  }

  async function removeCategory(categoryId: string) {
    selectedCategories.value = selectedCategories.value.filter(category => category.id !== categoryId)
    preparedRows.value = preparedRows.value.filter(
      row => row.warehouse_category_id !== categoryId,
    )
    emptyCategoryIds.value = emptyCategoryIds.value.filter(id => id !== categoryId)
    unavailableCategoryIds.value = unavailableCategoryIds.value.filter(id => id !== categoryId)
    await resolve()
  }

  function removePreparedRow(ingredientId: string) {
    dismissedIngredientIds.add(ingredientId)
    preparedRows.value = preparedRows.value.filter(row => row.ingredient_id !== ingredientId)
  }

  function updatePreparedRow(
    ingredientId: string,
    patch: Partial<Pick<PreparedWarehouseCategoryIngredient, 'quantity' | 'unit'>>,
  ) {
    preparedRows.value = preparedRows.value.map(row =>
      row.ingredient_id === ingredientId ? { ...row, ...patch } : row,
    )
  }

  return {
    selectedCategories,
    preparedRows,
    emptyCategoryIds,
    unavailableCategoryIds,
    loading,
    error,
    addCategory,
    hydrateFromSnapshot,
    removeCategory,
    removePreparedRow,
    updatePreparedRow,
    resolve,
    retry: resolve,
  }
}
