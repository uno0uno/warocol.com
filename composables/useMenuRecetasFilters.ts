import { computed } from 'vue'
import { useMenuFiltersStore } from '@/stores/menuFilters'
import { useTenantReactive } from '@/composables/useTenantReactive'

export function useMenuRecetasFilters() {
  const store = useMenuFiltersStore()
  const { currentTenant } = useTenantReactive()
  const tenantId = computed(() => currentTenant.value?.id ?? null)
  const f = computed(() => store.recetasFor(tenantId.value))

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

  const clearFilters = () => {
    if (tenantId.value) store.resetRecetas(tenantId.value)
  }

  const hasActiveFilters = computed(
    () => !!localSearchTerm.value || !!appliedSearch.value,
  )

  return {
    localSearchTerm,
    appliedSearch,
    apiSearchField,
    clearFilters,
    hasActiveFilters,
  }
}
