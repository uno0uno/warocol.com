import type { ComputedRef, Ref } from 'vue'
import type { MenuCatalogBulkFieldState } from '@/types/menu-catalog'
import type { ResaleIngredientItemState, ResaleIngredientTableRow } from '@/composables/useResaleIngredientCatalog'

export type ResaleRowDraft = {
  price: number
  costo_percibido: number | null
  category_id: string
  is_available: boolean
  originalPrice: number
  originalCostoPercibido: number | null
  originalCategoryId: string
  originalIsAvailable: boolean
}

export function resaleDraftHasChanges(d: ResaleRowDraft): boolean {
  return (
    d.price !== d.originalPrice
    || d.costo_percibido !== d.originalCostoPercibido
    || d.category_id !== d.originalCategoryId
    || d.is_available !== d.originalIsAvailable
  )
}

export function createResaleDraftFromItem(
  item: ResaleIngredientItemState,
  resolveCategoryId: (item: ResaleIngredientItemState) => string,
): ResaleRowDraft {
  const category_id = resolveCategoryId(item)
  const price = Number(item.price)
  const costo = item.costoPercibido != null ? Number(item.costoPercibido) : null
  const is_available = !!item.isAvailable
  return {
    price,
    costo_percibido: costo,
    category_id,
    is_available,
    originalPrice: price,
    originalCostoPercibido: costo,
    originalCategoryId: category_id,
    originalIsAvailable: is_available,
  }
}

type UseResaleCatalogEditModeOptions = {
  categories: ComputedRef<{ id: string, name: string }[]>
  itemsWithStatus: Ref<ResaleIngredientItemState[]>
  selectedIds: Ref<string[]>
  bulkFields: ComputedRef<MenuCatalogBulkFieldState>
  isInCatalog: (item: ResaleIngredientItemState) => boolean
  itemHasChanges: ComputedRef<boolean>
}

export function useResaleCatalogEditMode(options: UseResaleCatalogEditModeOptions) {
  const { categories, itemsWithStatus, selectedIds, bulkFields, isInCatalog, itemHasChanges } = options

  const editMode = ref(false)
  const rowDrafts = ref<Record<string, ResaleRowDraft>>({})

  function resolveCategoryId(item: ResaleIngredientItemState): string {
    if (item.categoryId) return item.categoryId
    const p = item.existingProduct as { category_id?: string } | null
    if (p?.category_id) return String(p.category_id)
    return ''
  }

  function ensureDraft(item: ResaleIngredientItemState): ResaleRowDraft {
    const key = item.ingredient.id
    if (!rowDrafts.value[key]) {
      rowDrafts.value = {
        ...rowDrafts.value,
        [key]: createResaleDraftFromItem(item, resolveCategoryId),
      }
    }
    return rowDrafts.value[key]
  }

  function applyBulkOverridesForSelectedRows() {
    if (selectedIds.value.length === 0) return
    const { bulkCategoryId, bulkAvailability } = bulkFields.value

    for (const id of selectedIds.value) {
      const item = itemsWithStatus.value.find(i => i.ingredient.id === id)
      if (!item || !isInCatalog(item)) continue
      const draft = ensureDraft(item)
      if (bulkCategoryId) draft.category_id = bulkCategoryId
      if (bulkAvailability !== '') {
        draft.is_available = bulkAvailability === 'true'
      }
    }
  }

  const hasBulkPendingOnSelection = computed(() => {
    if (!editMode.value || selectedIds.value.length === 0) return false
    const { bulkCategoryId, bulkAvailability, bulkInCatalog } = bulkFields.value
    if (!bulkCategoryId && bulkAvailability === '' && bulkInCatalog === '') return false

    return selectedIds.value.some((id) => {
      const item = itemsWithStatus.value.find(i => i.ingredient.id === id)
      if (!item) return false
      if (bulkInCatalog !== '') {
        const wantInCatalog = bulkInCatalog === 'true'
        if (isInCatalog(item) !== wantInCatalog) return true
      }
      if (!isInCatalog(item)) return false
      const draft = rowDrafts.value[id] ?? createResaleDraftFromItem(item, resolveCategoryId)
      if (bulkCategoryId && draft.category_id !== bulkCategoryId) return true
      if (bulkAvailability !== '') {
        const want = bulkAvailability === 'true'
        if (draft.is_available !== want) return true
      }
      return false
    })
  })

  const hasDraftChanges = computed(() =>
    Object.values(rowDrafts.value).some(resaleDraftHasChanges),
  )

  const hasChanges = computed(() =>
    editMode.value && (hasDraftChanges.value || hasBulkPendingOnSelection.value || itemHasChanges.value),
  )

  const canSubmit = computed(() => {
    const drafts = Object.values(rowDrafts.value)
    if (drafts.length === 0 && hasBulkPendingOnSelection.value) return true
    return drafts.every(d => d.price > 0 && !!d.category_id)
  })

  function itemToDisplayRow(item: ResaleIngredientItemState): ResaleIngredientTableRow {
    const p = item.existingProduct
    const draft = rowDrafts.value[item.ingredient.id]
    const price = draft?.price ?? item.price
    const costo_percibido = draft?.costo_percibido ?? item.costoPercibido ?? p?.costo_percibido ?? null
    const category_id = draft?.category_id ?? item.categoryId
    const cat = categories.value.find(c => c.id === category_id)
    return {
      id: item.ingredient.id,
      _item: item,
      name: item.ingredient.name,
      category_name: cat?.name ?? item.ingredient.category ?? 'Sin categoría',
      price,
      is_available: draft?.is_available ?? item.isAvailable,
      costo_calculado: p?.costo_calculado ?? null,
      costo_percibido,
    }
  }

  function syncDraftsToItems() {
    for (const item of itemsWithStatus.value) {
      const draft = rowDrafts.value[item.ingredient.id]
      if (!draft || !isInCatalog(item)) continue
      item.price = draft.price
      item.costoPercibido = draft.costo_percibido
      item.categoryId = draft.category_id
      item.isAvailable = draft.is_available
    }
  }

  function discardAllDrafts() {
    rowDrafts.value = {}
  }

  function cancelEditOperation(onRebuild: () => void) {
    if (hasChanges.value) {
      const ok = window.confirm('¿Descartar los cambios y salir del modo edición?')
      if (!ok) return
    }
    discardAllDrafts()
    editMode.value = false
    onRebuild()
  }

  function canBulkApplyEdit() {
    if (selectedIds.value.length > 0) {
      return hasBulkPendingOnSelection.value || (hasDraftChanges.value && canSubmit.value) || itemHasChanges.value
    }
    return (hasDraftChanges.value && canSubmit.value) || itemHasChanges.value
  }

  return {
    editMode,
    rowDrafts,
    ensureDraft,
    itemToDisplayRow,
    hasChanges,
    canSubmit,
    hasBulkPendingOnSelection,
    applyBulkOverridesForSelectedRows,
    syncDraftsToItems,
    discardAllDrafts,
    cancelEditOperation,
    canBulkApplyEdit,
  }
}
