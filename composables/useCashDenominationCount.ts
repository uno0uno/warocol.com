import { computed, ref, watch, type Ref } from 'vue'
import { resolveCashDenominations } from '~/utils/cashDenominations'
import { useFormatters } from '~/composables/useFormatters'

export function useCashDenominationCount(currencyOverride?: Ref<string | null | undefined>) {
  const { currencyCode, currencyMinorUnits } = useFormatters()

  const denominations = computed(() => resolveCashDenominations(
    currencyOverride?.value ?? currencyCode.value,
    currencyMinorUnits.value,
  ))

  const counts = ref<Record<number, string>>({})
  const monedasAmount = ref('0')
  const denomRefs = ref<HTMLInputElement[]>([])

  // Keep entered counts when the tenant currency resolves late; drop stale faces.
  watch(denominations, (list) => {
    counts.value = Object.fromEntries(list.map(d => [d, counts.value[d] ?? '0']))
  }, { immediate: true })

  const setDenomRef = (el: unknown, idx: number) => {
    if (el) denomRefs.value[idx] = el as HTMLInputElement
  }

  const sanitizeInt = (e: Event): string => {
    const el = e.target as HTMLInputElement
    return el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '') || '0'
  }

  const sanitizeIntStr = (e: Event): string => sanitizeInt(e)

  const totalCounted = computed(() =>
    denominations.value.reduce((sum, d) => sum + d * (parseInt(counts.value[d]) || 0), 0)
    + (parseInt(monedasAmount.value) || 0),
  )

  const toBreakdown = (): Record<string, number> => {
    const breakdown: Record<string, number> = {}
    for (const d of denominations.value) {
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
    for (const d of denominations.value) counts.value[d] = '0'
    monedasAmount.value = String(Math.max(0, Math.round(amount)))
  }

  return {
    denominations,
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
