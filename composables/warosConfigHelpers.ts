/**
 * Waros Config — Pure Helpers
 * Types, constants, and pure functions extracted from useWarosConfig.
 *
 * Importable without triggering useQuery — for callers that only need
 * type annotations or display helpers (ReglaCard, EditarReglaModal).
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface TicketValueTier {
  from: number
  to: number | null
  multiplier: number
}

export interface PurchaseCountMilestone {
  purchase_number: number
  bonus: number
}

export interface WaroRule {
  rule_type: 'ticket_value' | 'purchase_count' | 'frequency' | 'per_ticket_qty'
  is_active: boolean
  config: Record<string, any>
}

export interface WarosConfigResponse {
  is_enabled: boolean
  rules: WaroRule[]
}

// ── Rule metadata ─────────────────────────────────────────────────────────

type TranslateFn = (key: string, params?: Record<string, any>) => string
type NumberFormatFn = (value: number, options?: { maximumFractionDigits?: number }) => string

const RULE_META: Record<string, { labelKey: string; descriptionKey: string; icon: string }> = {
  ticket_value: {
    labelKey: 'analitica.puntos.rules.ticketValue',
    descriptionKey: 'analitica.puntos.rules.ticketValueDesc',
    icon: 'bag',
  },
  purchase_count: {
    labelKey: 'analitica.puntos.rules.purchaseCount',
    descriptionKey: 'analitica.puntos.rules.purchaseCountDesc',
    icon: 'count',
  },
  frequency: {
    labelKey: 'analitica.puntos.rules.frequency',
    descriptionKey: 'analitica.puntos.rules.frequencyDesc',
    icon: 'calendar',
  },
  per_ticket_qty: {
    labelKey: 'analitica.puntos.rules.perTicketQty',
    descriptionKey: 'analitica.puntos.rules.perTicketQtyDesc',
    icon: 'box',
  },
}

// ── Default configs per rule_type ─────────────────────────────────────────

export const DEFAULT_CONFIGS: Record<string, Record<string, any>> = {
  ticket_value: {
    base_waros: 1,
    base_pesos: 1000,
    tiers: [],
  },
  purchase_count: {
    milestones: [],
  },
  frequency: {
    purchases: 2,
    within_days: 60,
    bonus: 75,
  },
  per_ticket_qty: {
    points_per_item: 10,
    bonus_from_qty: null,
    bonus_extra_points: null,
  },
}

// ── Pure helper functions ─────────────────────────────────────────────────

export const getRuleMeta = (rule_type: string, t?: TranslateFn) => {
  const meta = RULE_META[rule_type]
  if (!meta) return { label: rule_type, description: '', icon: '' }
  return {
    label: t ? t(meta.labelKey) : meta.labelKey,
    description: t ? t(meta.descriptionKey) : meta.descriptionKey,
    icon: meta.icon,
  }
}

export const configSummary = (rule: WaroRule, t?: TranslateFn, formatNumber?: NumberFormatFn): string => {
  const tr = t ?? ((key: string, params?: Record<string, any>) => key.replace(/\{(\w+)\}/g, (_, k) => String(params?.[k] ?? '')))
  const nf = formatNumber ?? ((value: number) => String(value))
  const c = rule.config
  switch (rule.rule_type) {
    case 'ticket_value': {
      const waros = c.base_waros ?? 1
      const pesos = nf(c.base_pesos ?? 1000, { maximumFractionDigits: 0 })
      const tierCount = c.tiers?.length ?? 0
      const base = tr('analitica.puntos.summaries.ticketValueBase', { waros, pesos })
      return tierCount > 0
        ? `${base} · ${tr(tierCount === 1 ? 'analitica.puntos.summaries.tierOne' : 'analitica.puntos.summaries.tierMany', { count: tierCount })}`
        : base
    }
    case 'purchase_count': {
      const m = c.milestones
      if (!m?.length) return tr('analitica.puntos.summaries.noMilestones')
      return tr(m.length === 1 ? 'analitica.puntos.summaries.milestoneOne' : 'analitica.puntos.summaries.milestoneMany', {
        count: m.length,
        milestones: m.map((h: PurchaseCountMilestone) => `#${h.purchase_number} (+${h.bonus})`).join(', '),
      })
    }
    case 'frequency':
      return tr('analitica.puntos.summaries.frequency', { purchases: c.purchases ?? 2, days: c.within_days ?? 60, bonus: c.bonus ?? 75 })
    case 'per_ticket_qty': {
      const base = tr('analitica.puntos.summaries.perItem', { points: c.points_per_item ?? 10 })
      const bonus = c.bonus_from_qty ? ` · ${tr('analitica.puntos.summaries.bonusFromQty', { qty: c.bonus_from_qty })}` : ''
      return base + bonus
    }
    default:
      return ''
  }
}
