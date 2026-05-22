import type { ComputedRef, Ref } from 'vue'
import type {
  MenuCatalogBulkFieldState,
  ProductDraft,
  ProductDraftSource,
} from '@/types/menu-catalog'

export type UseMenuCatalogEditModeOptions = {
  categories: ComputedRef<{ id: string; name: string }[]>
  products: ComputedRef<ProductDraftSource[]>
  selectedIds: Ref<string[]>
  bulkFields: ComputedRef<MenuCatalogBulkFieldState>
  isOpenSaleShell: (row: { open_priced?: boolean }) => boolean
  showOnlineControls: ComputedRef<boolean>
  showTableQrColumn: ComputedRef<boolean>
}

export function draftHasChanges(d: ProductDraft): boolean {
  return (
    d.name !== d.originalName
    || d.category_id !== d.originalCategoryId
    || d.price !== d.originalPrice
    || d.costo_percibido !== d.originalCostoPercibido
    || d.is_available !== d.originalIsAvailable
    || d.is_available_online !== d.originalIsAvailableOnline
    || d.is_available_table_qr !== d.originalIsAvailableTableQr
    || d.station_id !== d.originalStationId
  )
}

export function createDraftFromProduct(
  product: ProductDraftSource,
  resolveCategoryId: (p: ProductDraftSource) => string,
): ProductDraft {
  const category_id = resolveCategoryId(product)
  const price = Number(product.price)
  const costo =
    product.costo_percibido != null && product.costo_percibido !== ''
      ? Number(product.costo_percibido)
      : null
  const station_id = product.station_id ?? null
  const is_available = !!product.is_available
  const is_available_online = !!product.is_available_online
  const is_available_table_qr = !!product.is_available_table_qr
  return {
    name: String(product.name),
    category_id,
    price,
    costo_percibido: costo,
    is_available,
    is_available_online,
    is_available_table_qr,
    station_id,
    originalName: String(product.name),
    originalCategoryId: category_id,
    originalPrice: price,
    originalCostoPercibido: costo,
    originalIsAvailable: is_available,
    originalIsAvailableOnline: is_available_online,
    originalIsAvailableTableQr: is_available_table_qr,
    originalStationId: station_id,
  }
}

/**
 * Inline edit mode with per-row drafts and bulk→draft overrides (productos catalog).
 */
export function useMenuCatalogEditMode(options: UseMenuCatalogEditModeOptions) {
  const {
    categories,
    products,
    selectedIds,
    bulkFields,
    isOpenSaleShell,
    showOnlineControls,
    showTableQrColumn,
  } = options

  const editMode = ref(false)
  const productDrafts = ref<Record<string, ProductDraft>>({})

  function resolveCategoryId(product: ProductDraftSource): string {
    if (product.category_id) return String(product.category_id)
    const name = product.category_name
    if (!name) return ''
    const match = categories.value.find((c) => c.name === name)
    return match?.id ?? ''
  }

  function ensureDraft(product: ProductDraftSource): ProductDraft {
    if (!productDrafts.value[product.id]) {
      productDrafts.value = {
        ...productDrafts.value,
        [product.id]: createDraftFromProduct(product, resolveCategoryId),
      }
    }
    return productDrafts.value[product.id]
  }

  function applyBulkOverridesForSelectedRows() {
    if (selectedIds.value.length === 0) return
    const {
      bulkCategoryId,
      bulkStationId,
      bulkAvailability,
      bulkOnline,
      bulkQr,
    } = bulkFields.value

    for (const id of selectedIds.value) {
      const product = products.value.find((p) => p.id === id)
      if (!product || isOpenSaleShell(product)) continue
      const draft = ensureDraft(product)
      if (bulkCategoryId) draft.category_id = bulkCategoryId
      if (bulkAvailability !== '') {
        draft.is_available = bulkAvailability === 'true'
      }
      if (bulkStationId) draft.station_id = bulkStationId
      if (bulkOnline !== '') {
        draft.is_available_online = bulkOnline === 'true'
      }
      if (bulkQr !== '') {
        draft.is_available_table_qr = bulkQr === 'true'
      }
    }
  }

  const hasBulkPendingOnSelection = computed(() => {
    if (selectedIds.value.length === 0) return false
    const {
      bulkCategoryId,
      bulkStationId,
      bulkAvailability,
      bulkOnline,
      bulkQr,
    } = bulkFields.value

    if (!editMode.value) {
      return (
        !!bulkCategoryId
        || bulkAvailability !== ''
        || !!bulkStationId
        || (showOnlineControls.value && bulkOnline !== '')
        || (showTableQrColumn.value && bulkQr !== '')
      )
    }
    if (
      !bulkCategoryId
      && bulkAvailability === ''
      && !bulkStationId
      && (!showOnlineControls.value || bulkOnline === '')
      && (!showTableQrColumn.value || bulkQr === '')
    ) {
      return false
    }
    return selectedIds.value.some((id) => {
      const product = products.value.find((p) => p.id === id)
      if (!product || isOpenSaleShell(product)) return false
      const draft = productDrafts.value[id] ?? createDraftFromProduct(product, resolveCategoryId)
      if (bulkCategoryId && draft.category_id !== bulkCategoryId) return true
      if (bulkAvailability !== '') {
        const want = bulkAvailability === 'true'
        if (draft.is_available !== want) return true
      }
      if (bulkStationId && draft.station_id !== bulkStationId) return true
      if (showOnlineControls.value && bulkOnline !== '') {
        const want = bulkOnline === 'true'
        if (draft.is_available_online !== want) return true
      }
      if (showTableQrColumn.value && bulkQr !== '') {
        const want = bulkQr === 'true'
        if (draft.is_available_table_qr !== want) return true
      }
      return false
    })
  })

  const hasRowChanges = computed(() =>
    Object.values(productDrafts.value).some(draftHasChanges),
  )

  const hasChanges = computed(() => hasRowChanges.value || hasBulkPendingOnSelection.value)

  const canSubmit = computed(() => {
    const drafts = Object.values(productDrafts.value)
    if (drafts.length === 0 && hasBulkPendingOnSelection.value) {
      return true
    }
    return drafts.every((d) => !!d.name.trim() && !!d.category_id && d.price > 0)
  })

  const displayProducts = computed(() =>
    products.value.map((p) => {
      const draft = productDrafts.value[String(p.id)]
      if (!draft) return p
      const cat = categories.value.find((c) => c.id === draft.category_id)
      return {
        ...p,
        name: draft.name,
        category_id: draft.category_id,
        category_name: cat?.name ?? p.category_name,
        price: draft.price,
        costo_percibido: draft.costo_percibido,
        is_available: draft.is_available,
        is_available_online: draft.is_available_online,
        is_available_table_qr: draft.is_available_table_qr,
        station_id: draft.station_id,
      }
    }),
  )

  function discardAllDrafts() {
    productDrafts.value = {}
  }

  function cancelEditOperation(clearSelection: () => void) {
    if (hasChanges.value) {
      const ok = window.confirm('¿Descartar los cambios y cancelar la edición?')
      if (!ok) return
    }
    discardAllDrafts()
    editMode.value = false
    clearSelection()
  }

  function toggleEditMode(clearSelection: () => void) {
    if (editMode.value) {
      cancelEditOperation(clearSelection)
      return
    }
    editMode.value = true
  }

  function toggleDraftOnline(product: ProductDraftSource) {
    const draft = ensureDraft(product)
    draft.is_available_online = !draft.is_available_online
  }

  function toggleDraftTableQr(product: ProductDraftSource) {
    const draft = ensureDraft(product)
    draft.is_available_table_qr = !draft.is_available_table_qr
  }

  function canBulkApplyEdit() {
    if (selectedIds.value.length > 0) {
      return (hasChanges.value && canSubmit.value) || hasBulkPendingOnSelection.value
    }
    return hasChanges.value && canSubmit.value
  }

  function buildSavePatchBody(draft: ProductDraft): Record<string, unknown> {
    const body: Record<string, unknown> = {
      name: draft.name.trim(),
      category_id: draft.category_id,
      price: draft.price,
      costo_percibido: draft.costo_percibido,
    }
    if (draft.is_available !== draft.originalIsAvailable) {
      body.is_available = draft.is_available
    }
    if (draft.station_id !== draft.originalStationId) {
      body.station_id = draft.station_id
    }
    if (showOnlineControls.value && draft.is_available_online !== draft.originalIsAvailableOnline) {
      body.is_available_online = draft.is_available_online
    }
    if (showTableQrColumn.value && draft.is_available_table_qr !== draft.originalIsAvailableTableQr) {
      body.is_available_table_qr = draft.is_available_table_qr
    }
    return body
  }

  function idsWithDraftChanges(): string[] {
    const ids: string[] = []
    for (const [id, draft] of Object.entries(productDrafts.value)) {
      if (draftHasChanges(draft)) ids.push(id)
    }
    return ids
  }

  return {
    editMode,
    productDrafts: productDrafts as Ref<Record<string, ProductDraft>>,
    ensureDraft,
    displayProducts,
    hasChanges,
    canSubmit,
    hasBulkPendingOnSelection,
    applyBulkOverridesForSelectedRows,
    discardAllDrafts,
    cancelEditOperation,
    toggleEditMode,
    toggleDraftOnline,
    toggleDraftTableQr,
    canBulkApplyEdit,
    buildSavePatchBody,
    idsWithDraftChanges,
    draftHasChanges,
    createDraftFromProduct: (p: ProductDraftSource) => createDraftFromProduct(p, resolveCategoryId),
  }
}
