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
  function resolveLabel(slug: string | null | undefined, methodId?: string | null): string {
    if (methodId) {
      for (const group of paymentGroups.value) {
        const method = group.methods?.find(m => m.id === methodId)
        if (method) return `${group.name} · ${method.name}`
      }
    }
    if (slug) {
      const group = paymentGroups.value.find(g => g.slug === slug)
      if (group) return group.name
      // slug might actually be a method ID (UUID) stored directly
      for (const g of paymentGroups.value) {
        const method = g.methods?.find(m => m.id === slug)
        if (method) return `${g.name} · ${method.name}`
      }
    }
    if (!slug) return '—'
    return slug.charAt(0).toUpperCase() + slug.slice(1)
  }
  return { resolveLabel }
}
