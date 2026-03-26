import { INGREDIENTS_FETCH_LIMIT } from '~/composables/useMenuIngredients'

/**
 * Pinia Colada query for the full ingredient catalog used across /menu/* pages.
 *
 * Key is tenant-scoped so switching tenants triggers a fresh fetch.
 * staleTime: 5 min — ingredient catalog changes infrequently.
 *
 * Usage:
 *   const { availableIngredients } = useMenuIngredientsQuery()
 */
export const useMenuIngredientsQuery = defineQuery(() => {
  const { currentTenant } = useTenantReactive()

  const { data, status, asyncStatus } = useQuery({
    key: () => ['menu-ingredients', currentTenant.value?.id ?? 'default'],
    query: () =>
      $fetch('/api/suppliers/ingredients', {
        query: { limit: INGREDIENTS_FETCH_LIMIT },
      }),
    staleTime: 5 * 60_000,
  })

  const availableIngredients = computed(() => (data.value as any)?.data || [])

  return { data, status, asyncStatus, availableIngredients }
})
