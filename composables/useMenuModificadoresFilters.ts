import { computed } from 'vue'
import { useMenuFiltersStore } from '@/stores/menuFilters'
import { useTenantReactive } from '@/composables/useTenantReactive'

export function useMenuModificadoresFilters() {
  const store = useMenuFiltersStore()
  const { currentTenant } = useTenantReactive()
  const tenantId = computed(() => currentTenant.value?.id ?? null)
  const f = computed(() => store.modificadoresFor(tenantId.value))

  const searchQuery = computed({
    get: () => f.value.searchQuery,
    set: (v: string) => { f.value.searchQuery = v },
  })

  const clearFilters = () => {
    if (tenantId.value) store.resetModificadores(tenantId.value)
  }

  const hasActiveFilters = computed(() => !!searchQuery.value)

  return {
    searchQuery,
    clearFilters,
    hasActiveFilters,
  }
}
