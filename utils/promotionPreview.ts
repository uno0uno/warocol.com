/** Human-readable promotion schedule + scope preview (warocol.com#981). */

export type PromotionScheduleRow = {
  days_of_week: number
  start_time: string
  end_time: string
  crosses_midnight?: boolean
}

const DAY_BITS = [
  { bit: 1, short: 'lun' },
  { bit: 2, short: 'mar' },
  { bit: 4, short: 'mié' },
  { bit: 8, short: 'jue' },
  { bit: 16, short: 'vie' },
  { bit: 32, short: 'sáb' },
  { bit: 64, short: 'dom' },
] as const

export function formatDaysBitmask(mask: number): string {
  const days = DAY_BITS.filter((d) => mask & d.bit).map((d) => d.short)
  if (days.length === 0) return 'sin días'
  if (days.length === 7) return 'todos los días'
  return days.join('–')
}

function formatTimeHHMM(t: string): string {
  if (!t) return ''
  return t.slice(0, 5)
}

export function formatScheduleWindow(sched: PromotionScheduleRow): string {
  const days = formatDaysBitmask(sched.days_of_week)
  const start = formatTimeHHMM(sched.start_time)
  const end = formatTimeHHMM(sched.end_time)
  if (!start && !end) return days
  return `${days} ${start}–${end}`
}

export function formatPromoTypeLabel(promoType: string): string {
  switch (promoType) {
    case 'percent_off':
      return '% descuento'
    case 'fixed_off':
      return 'Descuento fijo'
    case 'bogo':
      return '2×1 / BOGO'
    default:
      return promoType
  }
}

export function formatScopeLabel(
  scopeType: string,
  categoryNames: string[],
  productNames: string[],
): string {
  if (scopeType === 'all_products') return 'todos los productos'
  if (scopeType === 'categories') {
    if (!categoryNames.length) return 'categorías (sin seleccionar)'
    return categoryNames.length === 1
      ? categoryNames[0]
      : `${categoryNames.length} categorías`
  }
  if (scopeType === 'products') {
    if (!productNames.length) return 'productos (sin seleccionar)'
    return productNames.length === 1
      ? productNames[0]
      : `${productNames.length} productos`
  }
  return scopeType
}

export function buildPromotionPreview(opts: {
  isActive: boolean
  isCurrentlyActive?: boolean | null
  schedules: PromotionScheduleRow[]
  scopeType: string
  categoryNames?: string[]
  productNames?: string[]
}): string {
  const activeWord =
    opts.isCurrentlyActive === true
      ? 'Activa'
      : opts.isCurrentlyActive === false
        ? 'Inactiva ahora'
        : opts.isActive
          ? 'Activa'
          : 'Desactivada'
  const schedPart =
    opts.schedules.length > 0
      ? formatScheduleWindow(opts.schedules[0])
      : 'sin horario'
  const scopePart = formatScopeLabel(
    opts.scopeType,
    opts.categoryNames ?? [],
    opts.productNames ?? [],
  )
  return `${activeWord} ${schedPart} en ${scopePart}`
}

/** Client-side overlap check for two schedule rows (same tenant promo form). */
export function schedulesOverlap(a: PromotionScheduleRow, b: PromotionScheduleRow): boolean {
  if (!(a.days_of_week & b.days_of_week)) return false
  const toMin = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    return h * 60 + m
  }
  const aStart = toMin(a.start_time)
  const aEnd = toMin(a.end_time)
  const bStart = toMin(b.start_time)
  const bEnd = toMin(b.end_time)
  const rangesOverlap = (s1: number, e1: number, s2: number, e2: number) =>
    s1 < e2 && s2 < e1
  if (!a.crosses_midnight && !b.crosses_midnight) {
    return rangesOverlap(aStart, aEnd, bStart, bEnd)
  }
  // Midnight-crossing: conservative overlap if any shared day bit
  return true
}

export function findOverlappingScheduleIndices(schedules: PromotionScheduleRow[]): string | null {
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      if (schedulesOverlap(schedules[i], schedules[j])) {
        return `Los horarios ${i + 1} y ${j + 1} se superponen en los mismos días.`
      }
    }
  }
  return null
}
