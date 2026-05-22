import type { MenuCatalogBulkFieldState } from '@/types/menu-catalog'

export type MenuCatalogSelectionOptions = {
  /** Skip rows that cannot be selected (e.g. open_priced shell). */
  isRowSelectable?: (row: { id: string; open_priced?: boolean }) => boolean
}

/**
 * Checkbox selection + bulk filter field state for menu catalog tables.
 */
export function useMenuCatalogSelection(options: MenuCatalogSelectionOptions = {}) {
  const { isRowSelectable = () => true } = options

  const selectedIds = ref<string[]>([])
  const bulkCategoryId = ref('')
  const bulkStationId = ref('')
  const bulkAvailability = ref('')
  const bulkInCatalog = ref('')
  const bulkOnline = ref('')
  const bulkQr = ref('')

  const bulkFields = computed<MenuCatalogBulkFieldState>(() => ({
    bulkCategoryId: bulkCategoryId.value,
    bulkStationId: bulkStationId.value,
    bulkAvailability: bulkAvailability.value,
    bulkInCatalog: bulkInCatalog.value,
    bulkOnline: bulkOnline.value,
    bulkQr: bulkQr.value,
  }))

  function resetBulkFields() {
    bulkCategoryId.value = ''
    bulkStationId.value = ''
    bulkAvailability.value = ''
    bulkInCatalog.value = ''
    bulkOnline.value = ''
    bulkQr.value = ''
  }

  function toggleSelect(id: string, products: { id: string; open_priced?: boolean }[]) {
    const product = products.find((p) => p.id === id)
    if (product && !isRowSelectable(product)) return
    const idx = selectedIds.value.indexOf(id)
    if (idx >= 0) {
      selectedIds.value = selectedIds.value.filter((_, i) => i !== idx)
    } else {
      selectedIds.value = [...selectedIds.value, id]
    }
  }

  function allPageSelected(selectableOnPage: { id: string }[]) {
    const ids = selectableOnPage.map((p) => p.id)
    return ids.length > 0 && ids.every((id) => selectedIds.value.includes(id))
  }

  function toggleSelectAll(selectableOnPage: { id: string }[]) {
    if (allPageSelected(selectableOnPage)) {
      const pageIds = new Set(selectableOnPage.map((p) => p.id))
      selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id))
    } else {
      const merged = new Set(selectedIds.value)
      for (const p of selectableOnPage) {
        merged.add(p.id)
      }
      selectedIds.value = [...merged]
    }
  }

  function clearSelection() {
    selectedIds.value = []
    resetBulkFields()
  }

  function canBulkApplyCatalog(flags: {
    showOnline: boolean
    showQr: boolean
    showInCatalog?: boolean
  }) {
    return (
      selectedIds.value.length > 0
      && (
        !!bulkCategoryId.value
        || bulkAvailability.value !== ''
        || (flags.showInCatalog && bulkInCatalog.value !== '')
        || !!bulkStationId.value
        || (flags.showOnline && bulkOnline.value !== '')
        || (flags.showQr && bulkQr.value !== '')
      )
    )
  }

  function catalogRowSelectionClass(rowId: string, baseClass: string) {
    if (selectedIds.value.includes(rowId)) return 'bg-primary/10'
    return baseClass
  }

  return {
    selectedIds,
    bulkCategoryId,
    bulkStationId,
    bulkAvailability,
    bulkInCatalog,
    bulkOnline,
    bulkQr,
    bulkFields,
    resetBulkFields,
    toggleSelect,
    allPageSelected,
    toggleSelectAll,
    clearSelection,
    canBulkApplyCatalog,
    catalogRowSelectionClass,
  }
}
