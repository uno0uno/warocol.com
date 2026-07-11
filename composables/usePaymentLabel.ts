import { type ComputedRef } from 'vue'

interface PaymentMethod {
  id: string
  name: string
}

interface PaymentGroup {
  id: string
  slug: string
  name: string
  methods?: PaymentMethod[]
}

export function usePaymentLabel(paymentGroups: ComputedRef<PaymentGroup[]>) {
  const { t, te } = useI18n({ useScope: 'global' })

  function groupLabel(group: PaymentGroup): string {
    const key = `pos.payment.defaults.${group.slug}`
    return te(key) ? t(key) : group.name
  }

  function resolveLabel(slug: string | null | undefined, methodId?: string | null): string {
    if (methodId) {
      for (const group of paymentGroups.value) {
        const method = group.methods?.find(m => m.id === methodId)
        if (method) return `${groupLabel(group)} · ${method.name}`
      }
    }
    if (slug) {
      const group = paymentGroups.value.find(g => g.slug === slug)
      if (group) return groupLabel(group)
      // slug might actually be a method ID (UUID) stored directly
      for (const g of paymentGroups.value) {
        const method = g.methods?.find(m => m.id === slug)
        if (method) return `${groupLabel(g)} · ${method.name}`
      }
    }
    if (!slug) return '—'
    return slug.charAt(0).toUpperCase() + slug.slice(1)
  }
  return { groupLabel, resolveLabel }
}
