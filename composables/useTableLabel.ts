import { ref, watch, readonly } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

interface StoredLabel {
  singular: string
  plural: string
}

const DEFAULTS: StoredLabel = { singular: 'Mesa', plural: 'Mesas' }

const storageKey = (tenantId: string) => `waro_table_label_${tenantId}`

export function useTableLabel() {
  const { currentTenant } = useTenantReactive()

  const singular = ref<string>(DEFAULTS.singular)
  const plural = ref<string>(DEFAULTS.plural)

  const load = (tenantId: string | null | undefined) => {
    if (!tenantId || !import.meta.client) {
      singular.value = DEFAULTS.singular
      plural.value = DEFAULTS.plural
      return
    }
    const stored = localStorage.getItem(storageKey(tenantId))
    if (!stored) {
      singular.value = DEFAULTS.singular
      plural.value = DEFAULTS.plural
      return
    }
    try {
      const parsed = JSON.parse(stored) as Partial<StoredLabel>
      singular.value = parsed.singular?.trim() || DEFAULTS.singular
      plural.value = parsed.plural?.trim() || DEFAULTS.plural
    } catch {
      singular.value = DEFAULTS.singular
      plural.value = DEFAULTS.plural
    }
  }

  watch(() => currentTenant.value?.id, (id) => load(id), { immediate: true })

  const setLabel = (newSingular: string, newPlural: string) => {
    const tenantId = currentTenant.value?.id
    if (!tenantId || !import.meta.client) return
    const sin = newSingular.trim() || DEFAULTS.singular
    const plu = newPlural.trim() || DEFAULTS.plural
    singular.value = sin
    plural.value = plu
    localStorage.setItem(
      storageKey(tenantId),
      JSON.stringify({ singular: sin, plural: plu }),
    )
  }

  return {
    singular: readonly(singular),
    plural: readonly(plural),
    setLabel,
  }
}
