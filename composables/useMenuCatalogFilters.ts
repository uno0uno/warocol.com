import { computed } from 'vue'
import { useMenuFiltersStore, type ProductTypeFilter } from '@/stores/menuFilters'
import { useTenantReactive } from '@/composables/useTenantReactive'

const DEFAULT_SORT = 'created_at_desc'

/**
 * Persisted catalog filters for Menú → Productos (Pinia, per tenant).
 */
export function useMenuCatalogFilters() {
  const store = useMenuFiltersStore()
  const { currentTenant } = useTenantReactive()
  const tenantId = computed(() => currentTenant.value?.id ?? null)

  const f = computed(() => store.catalogFor(tenantId.value))

  const localSearchTerm = computed({
    get: () => f.value.localSearchTerm,
    set: (v: string) => { f.value.localSearchTerm = v },
  })

  const appliedSearch = computed({
    get: () => f.value.appliedSearch,
    set: (v: string) => { f.value.appliedSearch = v },
  })

  const apiSearchField = computed({
    get: () => f.value.apiSearchField,
    set: (v: string) => { f.value.apiSearchField = v },
  })

  const categoryFilter = computed({
    get: () => f.value.categoryFilter,
    set: (v: string) => { f.value.categoryFilter = v },
  })

  const statusFilter = computed({
    get: () => f.value.statusFilter,
    set: (v: string) => { f.value.statusFilter = v },
  })

  const stationFilter = computed({
    get: () => f.value.stationFilter,
    set: (v: string) => { f.value.stationFilter = v },
  })

  const sortFilter = computed({
    get: () => f.value.sortFilter,
    set: (v: string) => { f.value.sortFilter = v },
  })

  const productTypeFilter = computed({
    get: () => f.value.productTypeFilter,
    set: (v: ProductTypeFilter) => { f.value.productTypeFilter = v },
  })

  const onlineOnly = computed({
    get: () => f.value.onlineOnly,
    set: (v: boolean) => { f.value.onlineOnly = v },
  })

  const qrOnly = computed({
    get: () => f.value.qrOnly,
    set: (v: boolean) => { f.value.qrOnly = v },
  })

  const noRecipeOnly = computed({
    get: () => f.value.noRecipeOnly,
    set: (v: boolean) => { f.value.noRecipeOnly = v },
  })

  const marginNegativeOnly = computed({
    get: () => f.value.marginNegativeOnly,
    set: (v: boolean) => { f.value.marginNegativeOnly = v },
  })

  const costDriftOnly = computed({
    get: () => f.value.costDriftOnly,
    set: (v: boolean) => { f.value.costDriftOnly = v },
  })

  const performSearch = (onApply?: () => void) => {
    appliedSearch.value = localSearchTerm.value.trim()
    onApply?.()
  }

  const clearSearch = () => {
    localSearchTerm.value = ''
    appliedSearch.value = ''
  }

  const clearFilters = (onClear?: () => void) => {
    if (tenantId.value) store.resetCatalog(tenantId.value)
    onClear?.()
  }

  const hasActiveFilters = computed(
    () =>
      !!localSearchTerm.value
      || !!appliedSearch.value
      || !!statusFilter.value
      || !!categoryFilter.value
      || !!stationFilter.value
      || sortFilter.value !== DEFAULT_SORT
      || productTypeFilter.value !== 'all'
      || onlineOnly.value
      || qrOnly.value
      || noRecipeOnly.value
      || marginNegativeOnly.value
      || costDriftOnly.value,
  )

  return {
    localSearchTerm,
    appliedSearch,
    apiSearchField,
    categoryFilter,
    statusFilter,
    stationFilter,
    sortFilter,
    productTypeFilter,
    onlineOnly,
    qrOnly,
    noRecipeOnly,
    marginNegativeOnly,
    costDriftOnly,
    performSearch,
    clearSearch,
    clearFilters,
    hasActiveFilters,
  }
}
