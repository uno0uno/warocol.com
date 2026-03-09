import { useTenantReactive } from '@/composables/useTenantReactive'

/**
 * Standard limit for full-catalog ingredient fetches across all pages.
 * Change this single value to adjust the limit everywhere at once.
 */
export const INGREDIENTS_FETCH_LIMIT = 1000

/**
 * Shared composable for fetching ingredients across all /menu/* pages.
 * Nuxt deduplicates useAsyncData by key, so only one API call is made
 * regardless of how many pages use this composable simultaneously.
 */
export const useMenuIngredients = () => {
  const { currentTenant } = useTenantReactive()

  const { data: ingredientsData, pending: ingredientsLoading } = useAsyncData(
    `menu-ingredients-${currentTenant.value?.id || 'default'}`,
    () => $fetch('/api/suppliers/ingredients', { query: { limit: INGREDIENTS_FETCH_LIMIT } }),
    {
      server: false,
      watch: [currentTenant],
      default: () => ({ data: [] })
    }
  )

  const availableIngredients = computed(() => (ingredientsData.value as any)?.data || [])

  return { ingredientsData, ingredientsLoading, availableIngredients }
}
