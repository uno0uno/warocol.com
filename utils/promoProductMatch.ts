import type { ActivePromotionRow } from '~/composables/useActivePromotions'
import { formatPromoValue } from '~/utils/promotionPreview'

export type PromoBadgeDisplay = {
  label: string
  title?: string
}

function toIdSet(ids: Set<string> | readonly string[]): Set<string> {
  return ids instanceof Set ? ids : new Set(ids)
}

/** Client mirror of api promotions_service.product_in_scope. */
export function productInScope(
  scopeType: string,
  categoryIds: Set<string> | readonly string[],
  productIds: Set<string> | readonly string[],
  productId: string,
  categoryId?: string | null,
): boolean {
  if (scopeType === 'all_products') return true
  if (scopeType === 'products') return toIdSet(productIds).has(productId)
  if (scopeType === 'categories') {
    return categoryId != null && toIdSet(categoryIds).has(categoryId)
  }
  return false
}

export function promosMatchingProduct(
  promos: ActivePromotionRow[],
  productId: string,
  categoryId?: string | null,
): ActivePromotionRow[] {
  return promos.filter((promo) =>
    productInScope(
      promo.scope_type,
      promo.category_ids ?? [],
      promo.product_ids ?? [],
      productId,
      categoryId,
    ),
  )
}

/** Highest priority wins; tie-break by name (matches server _pick_best_promotion_for_line). */
export function pickBestPromotionForProduct(
  promos: ActivePromotionRow[],
  productId: string,
  categoryId?: string | null,
): ActivePromotionRow | null {
  const matches = promosMatchingProduct(promos, productId, categoryId)
  if (matches.length === 0) return null
  return matches.reduce((best, promo) => {
    const bestPriority = best.priority ?? 0
    const promoPriority = promo.priority ?? 0
    if (promoPriority > bestPriority) return promo
    if (promoPriority < bestPriority) return best
    return (promo.name ?? '') >= (best.name ?? '') ? promo : best
  })
}

export function promoBadgeForProduct(
  promos: ActivePromotionRow[],
  productId: string,
  categoryId?: string | null,
): PromoBadgeDisplay | null {
  const matches = promosMatchingProduct(promos, productId, categoryId)
  if (matches.length === 0) return null

  const best = pickBestPromotionForProduct(promos, productId, categoryId)
  if (!best) return null

  const valueLabel = formatPromoValue(best.promo_type, best.value_json)
  const label = valueLabel && valueLabel !== '—' ? valueLabel : best.name

  let title = best.name
  if (matches.length > 1) {
    const others = matches
      .filter((p) => p.id !== best.id)
      .map((p) => p.name)
      .filter(Boolean)
    if (others.length > 0) title = `${best.name} (+ ${others.join(', ')})`
  }

  return { label, title }
}
