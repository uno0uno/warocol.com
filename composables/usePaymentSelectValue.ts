import type { PosPaymentGroup } from '~/utils/paymentDefaults'

export interface PaymentFormFields {
  payment_method: string
  payment_method_id: string | null
}

/** Resolve composed select value (`slug:` or `slug:uuid`) into API fields. */
export function resolvePaymentSelection(
  value: string,
  groups: PosPaymentGroup[],
): { payment_method: string; payment_method_id: string | null } {
  const idx = value.indexOf(':')
  const slug = idx === -1 ? value : value.slice(0, idx)
  const methodId = idx === -1 ? '' : value.slice(idx + 1)

  if (methodId) {
    return { payment_method: slug, payment_method_id: methodId }
  }

  for (const group of groups) {
    if (group.slug === slug) {
      return { payment_method: slug, payment_method_id: null }
    }
    const method = group.methods.find(m => m.id === slug)
    if (method) {
      return { payment_method: group.slug, payment_method_id: method.id }
    }
  }

  return { payment_method: slug, payment_method_id: null }
}

/** v-model helper: `groupSlug:` or `groupSlug:methodUuid` (same as ventas/crear + POS). */
export function usePaymentSelectValue(
  form: Ref<PaymentFormFields>,
  paymentGroups: Ref<PosPaymentGroup[]>,
) {
  const paymentSelectValue = computed({
    get: () => {
      if (!form.value.payment_method && !form.value.payment_method_id) return ''
      return `${form.value.payment_method}:${form.value.payment_method_id ?? ''}`
    },
    set: (value: string) => {
      if (!value) {
        form.value.payment_method = ''
        form.value.payment_method_id = null
        return
      }
      const resolved = resolvePaymentSelection(value, paymentGroups.value)
      form.value.payment_method = resolved.payment_method
      form.value.payment_method_id = resolved.payment_method_id
    },
  })

  const hasPaymentSelected = computed(
    () => Boolean(form.value.payment_method || form.value.payment_method_id),
  )

  return { paymentSelectValue, hasPaymentSelected }
}
