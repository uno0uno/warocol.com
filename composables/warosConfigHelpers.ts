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

const RULE_META: Record<string, { label: string; description: string; icon: string }> = {
  ticket_value: {
    label: 'Por valor de compra',
    description: 'Otorga Waros según el total de cada compra',
    icon: 'bag',
  },
  purchase_count: {
    label: 'Por número de compras',
    description: 'Premia hitos de compra acumulados',
    icon: 'count',
  },
  frequency: {
    label: 'Por frecuencia',
    description: 'Bonifica clientes que compran seguido',
    icon: 'calendar',
  },
  per_ticket_qty: {
    label: 'Por productos comprados',
    description: 'Otorga Waros según cantidad de ítems en el pedido',
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

export const getRuleMeta = (rule_type: string) =>
  RULE_META[rule_type] ?? { label: rule_type, description: '', icon: '' }

export const configSummary = (rule: WaroRule): string => {
  const c = rule.config
  switch (rule.rule_type) {
    case 'ticket_value': {
      const waros = c.base_waros ?? 1
      const pesos = (c.base_pesos ?? 1000).toLocaleString('es-CO')
      const tierCount = c.tiers?.length ?? 0
      const base = `${waros} Waro por $${pesos} COP`
      return tierCount > 0
        ? `${base} · ${tierCount} tier${tierCount > 1 ? 's' : ''} configurado${tierCount > 1 ? 's' : ''}`
        : base
    }
    case 'purchase_count': {
      const m = c.milestones
      if (!m?.length) return 'Sin hitos configurados'
      return `${m.length} hito${m.length > 1 ? 's' : ''}: compra ${m.map((h: PurchaseCountMilestone) => `#${h.purchase_number} (+${h.bonus})`).join(', ')}`
    }
    case 'frequency':
      return `${c.purchases ?? 2} compras en ${c.within_days ?? 60} días → ${c.bonus ?? 75} Waros bonus`
    case 'per_ticket_qty': {
      const base = `${c.points_per_item ?? 10} Waros por producto`
      const bonus = c.bonus_from_qty ? ` · bonus desde ${c.bonus_from_qty} productos` : ''
      return base + bonus
    }
    default:
      return ''
  }
}
