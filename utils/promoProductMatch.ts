import type { PromotionScheduleRow } from './promotionPreview.ts'
import { formatPromoValue } from './promotionPreview.ts'

export interface ActivePromotionRow {
  id: string
  name: string
  promo_type: string
  scope_type: string
  schedules: PromotionScheduleRow[]
  is_currently_active?: boolean
  category_ids?: string[]
  product_ids?: string[]
  value_json?: Record<string, unknown>
  priority?: number
}

export type PromoBadgeDisplay = {
  label: string
  title?: string
}

export type PromoTypeBlockMap = Record<string, string[]>

export type PromoPickOptions = {
  promoTypeBlockMap?: PromoTypeBlockMap | null
}

const VALID_PROMO_TYPES = new Set(['percent_off', 'fixed_off', 'bogo'])

/** Client mirror of api promotions_service.DEFAULT_PROMO_TYPE_BLOCK_MAP. */
export const DEFAULT_PROMO_TYPE_BLOCK_MAP: PromoTypeBlockMap = {
  bogo: ['percent_off', 'fixed_off'],
}

/** Client mirror of api promotions_service.normalize_promo_type_block_map. */
export function normalizePromoTypeBlockMap(
  raw?: PromoTypeBlockMap | null,
): PromoTypeBlockMap {
  if (!raw || Object.keys(raw).length === 0) {
    return { ...DEFAULT_PROMO_TYPE_BLOCK_MAP }
  }
  const normalized: PromoTypeBlockMap = {}
  for (const [winner, blocked] of Object.entries(raw)) {
    if (!VALID_PROMO_TYPES.has(winner)) continue
    if (!Array.isArray(blocked)) continue
    const cleaned = blocked.filter(
      (promoType) => typeof promoType === 'string' && VALID_PROMO_TYPES.has(promoType),
    )
    if (cleaned.length > 0) normalized[winner] = cleaned
  }
  return Object.keys(normalized).length > 0
    ? normalized
    : { ...DEFAULT_PROMO_TYPE_BLOCK_MAP }
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

function scopeSpecificityRank(scopeType: string): number {
  if (scopeType === 'products') return 2
  if (scopeType === 'categories') return 1
  return 0
}

function promoRankKey(promo: ActivePromotionRow): [number, number, string] {
  return [
    promo.priority ?? 0,
    scopeSpecificityRank(promo.scope_type),
    promo.name ?? '',
  ]
}

function promoBlockRankKey(promo: ActivePromotionRow): [number, number] {
  return [promo.priority ?? 0, scopeSpecificityRank(promo.scope_type)]
}

/** Client mirror of api promotions_service._filter_type_blocked_candidates. */
export function filterTypeBlockedCandidates(
  matches: ActivePromotionRow[],
  typeBlockMap: PromoTypeBlockMap,
): ActivePromotionRow[] {
  if (matches.length === 0) return []
  const eligible: ActivePromotionRow[] = []
  for (const candidate of matches) {
    const candidateType = candidate.promo_type ?? ''
    const candidateRank = promoBlockRankKey(candidate)
    let blocked = false
    for (const other of matches) {
      if (other === candidate) continue
      const blockedTypes = typeBlockMap[other.promo_type ?? ''] ?? []
      if (!blockedTypes.includes(candidateType)) continue
      const otherRank = promoBlockRankKey(other)
      if (otherRank[0] > candidateRank[0] || otherRank[1] > candidateRank[1]) {
        blocked = true
        break
      }
      if (otherRank[0] === candidateRank[0] && otherRank[1] === candidateRank[1]) {
        blocked = true
        break
      }
    }
    if (!blocked) eligible.push(candidate)
  }
  return eligible
}

function comparePromoRank(a: ActivePromotionRow, b: ActivePromotionRow): number {
  const [aPriority, aScope, aName] = promoRankKey(a)
  const [bPriority, bScope, bName] = promoRankKey(b)
  if (aPriority !== bPriority) return aPriority - bPriority
  if (aScope !== bScope) return aScope - bScope
  return aName.localeCompare(bName)
}

/** Client mirror of api promotions_service._pick_best_promotion_for_line. */
/** Minimum cart quantity before BOGO savings apply (buy paid + get free units). */
export function bogoMinQuantity(valueJson?: Record<string, unknown> | null): number {
  const buy = Number(valueJson?.buy_qty) || 0
  const get = Number(valueJson?.get_qty) || 0
  if (buy < 1 || get < 1) return 0
  return buy + get
}

export function pickBestPromotionForProduct(
  promos: ActivePromotionRow[],
  productId: string,
  categoryId?: string | null,
  options?: PromoPickOptions,
): ActivePromotionRow | null {
  const matches = promosMatchingProduct(promos, productId, categoryId)
  if (matches.length === 0) return null
  const blockMap = normalizePromoTypeBlockMap(options?.promoTypeBlockMap)
  const eligible = filterTypeBlockedCandidates(matches, blockMap)
  if (eligible.length === 0) return null
  return eligible.reduce((best, promo) =>
    comparePromoRank(promo, best) >= 0 ? promo : best,
  )
}

export function promoBadgeForProduct(
  promos: ActivePromotionRow[],
  productId: string,
  categoryId?: string | null,
  options?: PromoPickOptions,
): PromoBadgeDisplay | null {
  const matches = promosMatchingProduct(promos, productId, categoryId)
  if (matches.length === 0) return null

  const best = pickBestPromotionForProduct(promos, productId, categoryId, options)
  if (!best) return null

  const valueLabel = formatPromoValue(best.promo_type, best.value_json)
  const label = valueLabel && valueLabel !== '—' ? valueLabel : best.name

  let title = best.name
  if (best.promo_type === 'bogo') {
    const minQty = bogoMinQuantity(best.value_json)
    if (minQty > 0) title = `${best.name} (mín. ${minQty} ud.)`
  }
  if (matches.length > 1) {
    const others = matches
      .filter((p) => p.id !== best.id)
      .map((p) => p.name)
      .filter(Boolean)
    if (others.length > 0) title = `${title} (+ ${others.join(', ')})`
  }

  return { label, title }
}

export type LinePromoInput = {
  subtotal: number
  quantity?: number
}

/** Client mirror of api promotions_service._compute_line_promo_savings. */
export function computeLinePromoSavings(
  line: LinePromoInput,
  promo: Pick<ActivePromotionRow, 'promo_type' | 'value_json'>,
): number {
  const subtotal = Number(line.subtotal) || 0
  const quantity = Math.max(1, Number(line.quantity) || 1)
  if (subtotal <= 0) return 0

  const valueJson = (promo.value_json ?? {}) as Record<string, unknown>

  if (promo.promo_type === 'percent_off') {
    const pct = Number(valueJson.percent) || 0
    if (pct <= 0) return 0
    return Math.min(Math.round(subtotal * pct / 100), Math.round(subtotal))
  }

  if (promo.promo_type === 'fixed_off') {
    const amount = Number(valueJson.amount_cop) || 0
    if (amount <= 0) return 0
    return Math.min(Math.round(amount), Math.round(subtotal))
  }

  if (promo.promo_type === 'bogo') {
    const buyQty = Number(valueJson.buy_qty) || 0
    const getQty = Number(valueJson.get_qty) || 0
    if (buyQty < 1 || getQty < 1) return 0
    const bundle = buyQty + getQty
    const sets = Math.floor(quantity / bundle)
    if (sets <= 0) return 0
    const unitPrice = subtotal / quantity
    const freeUnits = sets * getQty
    return Math.min(Math.round(freeUnits * unitPrice), Math.round(subtotal))
  }

  return 0
}

export function linePromoSavingsForProduct(
  promos: ActivePromotionRow[],
  productId: string,
  line: LinePromoInput,
  categoryId?: string | null,
  options?: PromoPickOptions,
): number {
  const promo = pickBestPromotionForProduct(promos, productId, categoryId, options)
  if (!promo) return 0
  return computeLinePromoSavings(line, promo)
}
