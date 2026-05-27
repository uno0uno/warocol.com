import { ref, computed } from 'vue'

export const CASH_DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000] as const

export function useCashDenominationCount() {
  const counts = ref<Record<number, string>>(
    Object.fromEntries(CASH_DENOMINATIONS.map(d => [d, '0'])),
  )
  const monedasAmount = ref('0')
  const denomRefs = ref<HTMLInputElement[]>([])

  const setDenomRef = (el: unknown, idx: number) => {
    if (el) denomRefs.value[idx] = el as HTMLInputElement
  }

  const sanitizeInt = (e: Event): string => {
    const el = e.target as HTMLInputElement
    return el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '') || '0'
  }

  const sanitizeIntStr = (e: Event): string => sanitizeInt(e)

  const totalCounted = computed(() =>
    CASH_DENOMINATIONS.reduce((sum, d) => sum + d * (parseInt(counts.value[d]) || 0), 0)
    + (parseInt(monedasAmount.value) || 0),
  )

  const toBreakdown = (): Record<string, number> => {
    const breakdown: Record<string, number> = {}
    for (const d of CASH_DENOMINATIONS) {
      const n = parseInt(counts.value[d]) || 0
      if (n > 0) breakdown[String(d)] = n
    }
    const monedas = parseInt(monedasAmount.value) || 0
    if (monedas > 0) breakdown.monedas = monedas
    return breakdown
  }

  const focusNext = (idx: number) => {
    denomRefs.value[idx + 1]?.focus()
  }

  const setFromAmount = (amount: number) => {
    for (const d of CASH_DENOMINATIONS) counts.value[d] = '0'
    monedasAmount.value = String(Math.max(0, Math.round(amount)))
  }

  return {
    denominations: CASH_DENOMINATIONS,
    counts,
    monedasAmount,
    denomRefs,
    setDenomRef,
    sanitizeInt,
    sanitizeIntStr,
    totalCounted,
    toBreakdown,
    focusNext,
    setFromAmount,
  }
}
