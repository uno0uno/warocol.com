/**
 * Waros Points System Composable
 * Fetches and mutates earning rules and the global system toggle.
 */

export interface WaroRule {
  rule_type: 'ticket_value' | 'purchase_count' | 'frequency' | 'per_ticket_qty'
  is_active: boolean
  config: Record<string, number>
}

export interface WarosConfigResponse {
  is_enabled: boolean
  rules: WaroRule[]
}

const RULE_META: Record<string, { label: string; description: string }> = {
  ticket_value: {
    label: 'Por valor de compra',
    description: 'Otorga puntos según el total de cada compra',
  },
  purchase_count: {
    label: 'Por número de pedidos',
    description: 'Otorga puntos por cada pedido completado',
  },
  frequency: {
    label: 'Por frecuencia',
    description: 'Otorga puntos cuando el cliente compra varias veces en un período',
  },
  per_ticket_qty: {
    label: 'Por cantidad de ítems',
    description: 'Otorga puntos según el número de ítems en el pedido',
  },
}

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
    payload: { is_active: boolean; config: Record<string, number> }
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

  const toggleGlobal = async (value: boolean) => {
    const prev = isEnabled.value
    isEnabled.value = value
    try {
      await $fetch('/api/admin/waros/config', {
        method: 'PATCH',
        body: { is_enabled: value },
      })
    } catch {
      isEnabled.value = prev // revert on error
    }
  }

  const getRuleMeta = (rule_type: string) =>
    RULE_META[rule_type] ?? { label: rule_type, description: '' }

  const configSummary = (rule: WaroRule): string => {
    const c = rule.config
    switch (rule.rule_type) {
      case 'ticket_value':
        return `${c.points_per_peso ?? 1} punto por cada $1 gastado`
      case 'purchase_count':
        return `${c.points_per_order ?? 10} puntos por pedido`
      case 'frequency':
        return `${c.points ?? 50} puntos al comprar en los últimos ${c.within_days ?? 7} días`
      case 'per_ticket_qty':
        return `${c.points_per_item ?? 2} puntos por ítem`
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
    toggleGlobal,
    getRuleMeta,
    configSummary,
  }
}
