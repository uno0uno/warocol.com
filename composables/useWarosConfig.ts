/**
 * Waros Points System Composable
 * Fetches and mutates earning rules and the global system toggle.
 *
 * Config schemas per rule_type:
 *   ticket_value   → { base_waros, base_pesos, tiers: [{from, to, multiplier}] }
 *   purchase_count → { milestones: [{purchase_number, bonus}] }
 *   frequency      → { purchases, within_days, bonus }
 *   per_ticket_qty → { points_per_item, bonus_from_qty?, bonus_extra_points? }
 *
 * NOTE: backend currently evaluates flat scalars only. The rich config is stored
 * in JSONB and will be evaluated once the backend is updated (see api-warolabs).
 */

// ── Config type helpers ───────────────────────────────────────────────────

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

// ── Composable ────────────────────────────────────────────────────────────

export const useWarosConfig = () => {
  const rules = ref<WaroRule[]>([])
  const isEnabled = ref(false)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  const fetchRules = async () => {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<WarosConfigResponse>('/api/admin/waros/rules')
      rules.value = res.rules
      isEnabled.value = res.is_enabled
    } catch (e: any) {
      error.value = e?.data?.detail || e?.message || 'Error al cargar configuración'
    } finally {
      isLoading.value = false
    }
  }

  const updateRule = async (
    rule_type: string,
    payload: { is_active: boolean; config: Record<string, any> }
  ) => {
    isSaving.value = true
    try {
      await $fetch(`/api/admin/waros/rules/${rule_type}`, {
        method: 'PUT',
        body: payload,
      })
    } finally {
      isSaving.value = false
    }
  }

  const toggleRule = async (rule_type: string) => {
    await $fetch(`/api/admin/waros/rules/${rule_type}/toggle`, {
      method: 'PATCH',
    })
  }

  const toggleGlobal = async (value: boolean) => {
    const prev = isEnabled.value
    isEnabled.value = value
    try {
      await $fetch('/api/admin/waros/config', {
        method: 'PATCH',
        body: { is_enabled: value },
      })
    } catch (e) {
      isEnabled.value = prev
      throw e
    }
  }

  const getRuleMeta = (rule_type: string) =>
    RULE_META[rule_type] ?? { label: rule_type, description: '', icon: '' }

  const configSummary = (rule: WaroRule): string => {
    const c = rule.config
    switch (rule.rule_type) {
      case 'ticket_value': {
        const waros = c.base_waros ?? 1
        const pesos = (c.base_pesos ?? 1000).toLocaleString('es-CO')
        const tierCount = c.tiers?.length ?? 0
        const base = `${waros} Waro por $${pesos} COP`
        return tierCount > 0 ? `${base} · ${tierCount} tier${tierCount > 1 ? 's' : ''} configurado${tierCount > 1 ? 's' : ''}` : base
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

  return {
    rules,
    isEnabled,
    isLoading,
    isSaving,
    error,
    fetchRules,
    updateRule,
    toggleRule,
    toggleGlobal,
    getRuleMeta,
    configSummary,
  }
}
