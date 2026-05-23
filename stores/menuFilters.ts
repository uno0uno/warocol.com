import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Shared catalog filters (Menú → Productos / Reventa). */
export type ProductTypeFilter = 'menu' | 'resale' | 'all'

export interface MenuCatalogFiltersState {
  localSearchTerm: string
  appliedSearch: string
  apiSearchField: string
  categoryFilter: string
  statusFilter: string
  stationFilter: string
  sortFilter: string
  productTypeFilter: ProductTypeFilter
  onlineOnly: boolean
  qrOnly: boolean
  noRecipeOnly: boolean
  marginNegativeOnly: boolean
  costDriftOnly: boolean
}

export interface MenuRecetasFiltersState {
  localSearchTerm: string
  appliedSearch: string
  apiSearchField: string
}

export interface MenuModificadoresFiltersState {
  searchQuery: string
}

function defaultCatalog(): MenuCatalogFiltersState {
  return {
    localSearchTerm: '',
    appliedSearch: '',
    apiSearchField: 'name',
    categoryFilter: '',
    statusFilter: '',
    stationFilter: '',
    sortFilter: 'created_at_desc',
    productTypeFilter: 'menu',
    onlineOnly: false,
    qrOnly: false,
    noRecipeOnly: false,
    marginNegativeOnly: false,
    costDriftOnly: false,
  }
}

function defaultRecetas(): MenuRecetasFiltersState {
  return {
    localSearchTerm: '',
    appliedSearch: '',
    apiSearchField: 'name',
  }
}

function defaultModificadores(): MenuModificadoresFiltersState {
  return { searchQuery: '' }
}

export const useMenuFiltersStore = defineStore('menuFilters', () => {
  const catalogByTenant = ref<Record<string, MenuCatalogFiltersState>>({})
  const recetasByTenant = ref<Record<string, MenuRecetasFiltersState>>({})
  const modificadoresByTenant = ref<Record<string, MenuModificadoresFiltersState>>({})

  function catalogFor(tenantId: string | null | undefined): MenuCatalogFiltersState {
    if (!tenantId) return defaultCatalog()
    if (!catalogByTenant.value[tenantId]) {
      catalogByTenant.value[tenantId] = defaultCatalog()
    }
    return catalogByTenant.value[tenantId]
  }

  function recetasFor(tenantId: string | null | undefined): MenuRecetasFiltersState {
    if (!tenantId) return defaultRecetas()
    if (!recetasByTenant.value[tenantId]) {
      recetasByTenant.value[tenantId] = defaultRecetas()
    }
    return recetasByTenant.value[tenantId]
  }

  function modificadoresFor(tenantId: string | null | undefined): MenuModificadoresFiltersState {
    if (!tenantId) return defaultModificadores()
    if (!modificadoresByTenant.value[tenantId]) {
      modificadoresByTenant.value[tenantId] = defaultModificadores()
    }
    return modificadoresByTenant.value[tenantId]
  }

  function resetCatalog(tenantId: string) {
    catalogByTenant.value[tenantId] = defaultCatalog()
  }

  function resetRecetas(tenantId: string) {
    recetasByTenant.value[tenantId] = defaultRecetas()
  }

  function resetModificadores(tenantId: string) {
    modificadoresByTenant.value[tenantId] = defaultModificadores()
  }

  return {
    catalogByTenant,
    recetasByTenant,
    modificadoresByTenant,
    catalogFor,
    recetasFor,
    modificadoresFor,
    resetCatalog,
    resetRecetas,
    resetModificadores,
  }
})
