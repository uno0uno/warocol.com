import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DateRangeModel } from '@/composables/useDateRangePresets'

export interface IngredientAnalyticsFiltersState {
  dateRangeDates: DateRangeModel | null
}

function defaultIngredientAnalyticsFilters(): IngredientAnalyticsFiltersState {
  return {
    dateRangeDates: null,
  }
}

export const useIngredientAnalyticsFiltersStore = defineStore('ingredientAnalyticsFilters', () => {
  const unscopedIngredients = ref<IngredientAnalyticsFiltersState>(defaultIngredientAnalyticsFilters())
  const ingredientsByTenant = ref<Record<string, IngredientAnalyticsFiltersState>>({})

  function ingredientsFor(tenantId: string | null | undefined): IngredientAnalyticsFiltersState {
    if (!tenantId) return unscopedIngredients.value
    if (!ingredientsByTenant.value[tenantId]) {
      ingredientsByTenant.value[tenantId] = defaultIngredientAnalyticsFilters()
    }
    return ingredientsByTenant.value[tenantId]
  }

  function resetIngredients(tenantId: string | null | undefined) {
    if (!tenantId) {
      unscopedIngredients.value = defaultIngredientAnalyticsFilters()
      return
    }
    ingredientsByTenant.value[tenantId] = defaultIngredientAnalyticsFilters()
  }

  return {
    unscopedIngredients,
    ingredientsByTenant,
    ingredientsFor,
    resetIngredients,
  }
})
