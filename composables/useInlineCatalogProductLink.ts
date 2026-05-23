import { useQueryCache } from '@pinia/colada'
import { fetchResaleLinkedIngredient } from '@/composables/useResaleLinkedIngredient'
import { useTenantReactive } from '@/composables/useTenantReactive'

/**
 * After inline ProductQuickCreatePanel saves, resolve linked resale ingredient and callback.
 */
export function useInlineCatalogProductLink() {
  const cache = useQueryCache()
  const { currentTenant } = useTenantReactive()

  async function linkCreatedProductToRow(
    product: Record<string, unknown>,
    onLink: (ingredient: Record<string, unknown>) => void | Promise<void>,
  ) {
    await cache.invalidateQueries({ key: ['menu-ingredients', currentTenant.value?.id ?? 'default'] })
    const ingredient = await fetchResaleLinkedIngredient(product)
    if (!ingredient) return
    await onLink(ingredient)
  }

  return { linkCreatedProductToRow }
}
