import { computed } from 'vue'
import { useMenuFiltersStore } from '@/stores/menuFilters'
import { useTenantReactive } from '@/composables/useTenantReactive'

export function useMenuModificadoresFilters() {
  const store = useMenuFiltersStore()
  const { currentTenant } = useTenantReactive()
  const tenantId = computed(() => currentTenant.value?.id ?? null)
  const f = computed(() => store.modificadoresFor(tenantId.value))

  const localSearchTerm = computed({
    get: () => f.value.localSearchTerm,
    set: (v: string) => { f.value.localSearchTerm = v },
  })

  const appliedSearch = computed({
    get: () => f.value.appliedSearch,
    set: (v: string) => { f.value.appliedSearch = v },
  })

  const clearFilters = () => {
    if (tenantId.value) store.resetModificadores(tenantId.value)
  }

  const hasActiveFilters = computed(
    () => !!localSearchTerm.value || !!appliedSearch.value,
  )

  return {
    localSearchTerm,
    appliedSearch,
    clearFilters,
    hasActiveFilters,
  }
}
