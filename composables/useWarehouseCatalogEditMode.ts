import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { WarehouseCategoryRow } from '~/composables/useWarehouseCategorySearch'

export type WarehouseCatalogIngredient = {
  id: string
  name: string
  category?: string | null
  warehouse_category_id?: string | null
  is_active?: boolean
  [key: string]: unknown
}

export type WarehouseIngredientDraft = {
  name: string
  category: WarehouseCategoryRow | null
  originalName: string
  originalWarehouseCategoryId: string
}

export type WarehouseCatalogMessages = {
  nameRequired: string
  categoryRequired: string
  saveFailed: string
}

type UseWarehouseCatalogEditModeOptions = {
  ingredients: ComputedRef<WarehouseCatalogIngredient[]>
  refetch: () => Promise<unknown> | unknown
  messages: WarehouseCatalogMessages
  concurrency?: number
}

export type WarehouseCatalogSaveResult = {
  ok: number
  fail: number
  invalid: number
}

export function warehouseCategoryFromIngredient(
  ingredient: WarehouseCatalogIngredient,
): WarehouseCategoryRow | null {
  if (!ingredient.warehouse_category_id || !ingredient.category) return null
  return {
    id: String(ingredient.warehouse_category_id),
    tenant_id: null,
    name: String(ingredient.category),
    normalized_name: String(ingredient.category),
    is_active: true,
    scope: 'global',
    can_manage: false,
    ingredient_count: 0,
    global_count: 0,
    tenant_count: 0,
  }
}

export function createWarehouseIngredientDraft(
  ingredient: WarehouseCatalogIngredient,
): WarehouseIngredientDraft {
  return {
    name: String(ingredient.name ?? ''),
    category: warehouseCategoryFromIngredient(ingredient),
    originalName: String(ingredient.name ?? ''),
    originalWarehouseCategoryId: String(ingredient.warehouse_category_id ?? ''),
  }
}

export function warehouseDraftHasChanges(draft: WarehouseIngredientDraft): boolean {
  return (
    draft.name !== draft.originalName
    || (draft.category?.id ?? '') !== draft.originalWarehouseCategoryId
  )
}

export function warehouseSaveErrorMessage(error: any, fallback: string): string {
  const detail = error?.data?.detail
  if (typeof detail === 'string') return detail
  if (typeof detail?.message === 'string') return detail.message
  return fallback
}

function withoutKeys<T>(source: Record<string, T>, keys: string[]): Record<string, T> {
  const removed = new Set(keys)
  return Object.fromEntries(Object.entries(source).filter(([key]) => !removed.has(key)))
}

export function useWarehouseCatalogEditMode(options: UseWarehouseCatalogEditModeOptions) {
  const { ingredients, refetch, messages } = options
  const maxConcurrency = Math.max(1, options.concurrency ?? 8)
  const editMode = ref(false)
  const drafts = ref<Record<string, WarehouseIngredientDraft>>({})
  const rowErrors = ref<Record<string, string>>({})
  const selectedIds = ref<string[]>([])
  const bulkCategory = ref<WarehouseCategoryRow | null>(null)
  const isSubmitting = ref(false)

  function ensureDraft(ingredient: WarehouseCatalogIngredient): WarehouseIngredientDraft {
    if (!drafts.value[ingredient.id]) {
      drafts.value = {
        ...drafts.value,
        [ingredient.id]: createWarehouseIngredientDraft(ingredient),
      }
    }
    return drafts.value[ingredient.id]
  }

  const displayIngredients = computed(() => ingredients.value.map((ingredient) => {
    const draft = drafts.value[ingredient.id]
    if (!draft) return ingredient
    return {
      ...ingredient,
      name: draft.name,
      category: draft.category?.name ?? '',
      warehouse_category_id: draft.category?.id ?? null,
    }
  }))

  const idsWithDraftChanges = computed(() => Object.entries(drafts.value)
    .filter(([, draft]) => warehouseDraftHasChanges(draft))
    .map(([id]) => id))

  const hasBulkPending = computed(() => {
    if (!bulkCategory.value || selectedIds.value.length === 0) return false
    return selectedIds.value.some((id) => {
      const ingredient = ingredients.value.find(row => row.id === id)
      if (!ingredient || ingredient.is_active === false) return false
      const categoryId = drafts.value[id]?.category?.id
        ?? String(ingredient.warehouse_category_id ?? '')
      return categoryId !== bulkCategory.value?.id
    })
  })

  const hasChanges = computed(() => idsWithDraftChanges.value.length > 0 || hasBulkPending.value)

  function clearRowError(id: string) {
    if (!rowErrors.value[id]) return
    rowErrors.value = withoutKeys(rowErrors.value, [id])
  }

  function clearSelection() {
    selectedIds.value = []
    bulkCategory.value = null
  }

  function toggleSelect(id: string) {
    const ingredient = ingredients.value.find(row => row.id === id)
    if (!ingredient || ingredient.is_active === false) return
    selectedIds.value = selectedIds.value.includes(id)
      ? selectedIds.value.filter(selectedId => selectedId !== id)
      : [...selectedIds.value, id]
  }

  function allPageSelected(visibleRows: WarehouseCatalogIngredient[]): boolean {
    const ids = visibleRows.filter(row => row.is_active !== false).map(row => row.id)
    return ids.length > 0 && ids.every(id => selectedIds.value.includes(id))
  }

  function toggleSelectAll(visibleRows: WarehouseCatalogIngredient[]) {
    const activeIds = visibleRows.filter(row => row.is_active !== false).map(row => row.id)
    if (activeIds.length === 0) return
    if (activeIds.every(id => selectedIds.value.includes(id))) {
      const visible = new Set(activeIds)
      selectedIds.value = selectedIds.value.filter(id => !visible.has(id))
      return
    }
    selectedIds.value = [...new Set([...selectedIds.value, ...activeIds])]
  }

  function applyBulkCategory() {
    if (!bulkCategory.value) return
    for (const id of selectedIds.value) {
      const ingredient = ingredients.value.find(row => row.id === id)
      if (!ingredient || ingredient.is_active === false) continue
      ensureDraft(ingredient).category = bulkCategory.value
      clearRowError(id)
    }
  }

  function validateDraft(draft: WarehouseIngredientDraft): string | null {
    if (!draft.name.trim()) return messages.nameRequired
    if (!draft.category?.id) return messages.categoryRequired
    return null
  }

  async function saveChanges(): Promise<WarehouseCatalogSaveResult> {
    if (isSubmitting.value) return { ok: 0, fail: 0, invalid: 0 }
    applyBulkCategory()
    const changedIds = Object.entries(drafts.value)
      .filter(([, draft]) => warehouseDraftHasChanges(draft))
      .map(([id]) => id)
    if (changedIds.length === 0) return { ok: 0, fail: 0, invalid: 0 }

    const validIds: string[] = []
    let invalid = 0
    for (const id of changedIds) {
      clearRowError(id)
      const validationError = validateDraft(drafts.value[id])
      if (validationError) {
        rowErrors.value = { ...rowErrors.value, [id]: validationError }
        invalid++
      } else {
        validIds.push(id)
      }
    }
    if (validIds.length === 0) return { ok: 0, fail: 0, invalid }

    isSubmitting.value = true
    const successfulIds: string[] = []
    let fail = 0
    let nextIndex = 0

    async function worker() {
      while (nextIndex < validIds.length) {
        const id = validIds[nextIndex++]
        const draft = drafts.value[id]
        try {
          await $fetch(`/api/suppliers/ingredients/${id}`, {
            method: 'PATCH',
            body: {
              name: draft.name.trim(),
              warehouse_category_id: draft.category?.id,
            },
          })
          successfulIds.push(id)
        } catch (error: any) {
          fail++
          rowErrors.value = {
            ...rowErrors.value,
            [id]: warehouseSaveErrorMessage(error, messages.saveFailed),
          }
        }
      }
    }

    try {
      await Promise.all(
        Array.from({ length: Math.min(maxConcurrency, validIds.length) }, () => worker()),
      )
      if (successfulIds.length > 0) {
        drafts.value = withoutKeys(drafts.value, successfulIds)
        rowErrors.value = withoutKeys(rowErrors.value, successfulIds)
        await refetch()
      }
      clearSelection()
      return { ok: successfulIds.length, fail, invalid }
    } finally {
      isSubmitting.value = false
    }
  }

  function discardAll() {
    drafts.value = {}
    rowErrors.value = {}
    clearSelection()
  }

  function cancelEditOperation(confirmDiscard: () => boolean = () => true): boolean {
    if (hasChanges.value && !confirmDiscard()) return false
    discardAll()
    editMode.value = false
    return true
  }

  function toggleEditMode(confirmDiscard: () => boolean = () => true): boolean {
    if (editMode.value) return cancelEditOperation(confirmDiscard)
    editMode.value = true
    return true
  }

  function resetForTenant() {
    discardAll()
    editMode.value = false
  }

  return {
    editMode,
    drafts: drafts as Ref<Record<string, WarehouseIngredientDraft>>,
    rowErrors: rowErrors as Ref<Record<string, string>>,
    selectedIds,
    bulkCategory,
    isSubmitting,
    displayIngredients,
    hasChanges,
    hasBulkPending,
    ensureDraft,
    clearRowError,
    clearSelection,
    toggleSelect,
    allPageSelected,
    toggleSelectAll,
    applyBulkCategory,
    saveChanges,
    discardAll,
    cancelEditOperation,
    toggleEditMode,
    resetForTenant,
  }
}
