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

export function formatDaysBitmask(mask: number, locale = 'es'): string {
  const days = DAY_BITS.filter((d) => mask & d.bit).map((d) => locale === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][Math.log2(d.bit)]
    : d.short)
  if (days.length === 0) return locale === 'en' ? 'no days' : 'sin días'
  if (days.length === 7) return locale === 'en' ? 'every day' : 'todos los días'
  return days.join('–')
}

function formatTimeHHMM(t: string): string {
  if (!t) return ''
  return t.slice(0, 5)
}

export function formatScheduleWindow(sched: PromotionScheduleRow, locale = 'es'): string {
  const days = formatDaysBitmask(sched.days_of_week, locale)
  const start = formatTimeHHMM(sched.start_time)
  const end = formatTimeHHMM(sched.end_time)
  if (!start && !end) return days
  return `${days} ${start}–${end}`
}

/** Join all schedule rows for list/preview copy (warocol.com#983). */
export function formatScheduleWindows(schedules: PromotionScheduleRow[], locale = 'es'): string {
  if (schedules.length === 0) return locale === 'en' ? 'no schedule' : 'sin horario'
  return schedules.map((schedule) => formatScheduleWindow(schedule, locale)).join('; ')
}

export function formatPromoTypeLabel(promoType: string, locale = 'es'): string {
  switch (promoType) {
    case 'percent_off':
      return locale === 'en' ? '% discount' : '% descuento'
    case 'fixed_off':
      return locale === 'en' ? 'Fixed discount' : 'Descuento fijo'
    case 'bogo':
      return '2×1 / BOGO'
    default:
      return promoType
  }
}

/** Discount amount copy for list columns (percent, COP, BOGO qty). */
export function formatPromoValue(
  promoType: string,
  valueJson?: Record<string, unknown> | null,
  locale = 'es',
): string {
  const v = valueJson ?? {}
  switch (promoType) {
    case 'percent_off': {
      const pct = Number(v.percent)
      return Number.isFinite(pct) ? `${pct}%` : '—'
    }
    case 'fixed_off': {
      const amount = Number(v.amount_cop)
      if (!Number.isFinite(amount)) return '—'
      return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(amount)
    }
    case 'bogo': {
      const buy = Number(v.buy_qty)
      const get = Number(v.get_qty)
      if (!Number.isFinite(buy) || !Number.isFinite(get)) return '—'
      if (buy < 1 || get < 1) return '—'
      return locale === 'en'
        ? `Buy ${buy} · ${get} free (min. ${buy + get})`
        : `Compra ${buy} · ${get} gratis (mín. ${buy + get})`
    }
    default:
      return '—'
  }
}

export type ScopeLabelCounts = {
  categoryCount?: number
  productCount?: number
  /** Above this count, show "N productos/categorías" only (list page default: 5). */
  countOnlyThreshold?: number
}

export function formatScopeTypeLabel(scopeType: string, locale = 'es'): string {
  switch (scopeType) {
    case 'categories':
      return locale === 'en' ? 'Categories' : 'Categorías'
    case 'products':
      return locale === 'en' ? 'Products' : 'Productos'
    case 'all_products':
      return locale === 'en' ? 'All products' : 'Todos los productos'
    default:
      return scopeType
  }
}

export function formatScopeLabel(
  scopeType: string,
  categoryNames: string[],
  productNames: string[],
  counts?: ScopeLabelCounts,
  locale = 'es',
): string {
  const threshold = counts?.countOnlyThreshold ?? 5
  if (scopeType === 'all_products') return locale === 'en' ? 'All products' : 'Todos los productos'
  if (scopeType === 'categories') {
    const n = counts?.categoryCount ?? categoryNames.length
    if (n > threshold) return locale === 'en' ? `${n} categories` : `${n} categorías`
    if (categoryNames.length === 1) return categoryNames[0]
    if (categoryNames.length > 1) {
      const head = categoryNames.slice(0, 2).join(', ')
      const extra = categoryNames.length - 2
      return extra > 0 ? `${head} +${extra}` : head
    }
    if (n === 1) return locale === 'en' ? '1 category' : '1 categoría'
    if (n > 1) return locale === 'en' ? `${n} categories` : `${n} categorías`
    return locale === 'en' ? 'Categories (none selected)' : 'Categorías (sin seleccionar)'
  }
  if (scopeType === 'products') {
    const n = counts?.productCount ?? productNames.length
    if (n > threshold) return locale === 'en' ? `${n} products` : `${n} productos`
    if (productNames.length === 1) return productNames[0]
    if (productNames.length > 1) {
      const head = productNames.slice(0, 2).join(', ')
      const extra = productNames.length - 2
      return extra > 0 ? `${head} +${extra}` : head
    }
    if (n === 1) return locale === 'en' ? '1 product' : '1 producto'
    if (n > 1) return locale === 'en' ? `${n} products` : `${n} productos`
    return locale === 'en' ? 'Products (none selected)' : 'Productos (sin seleccionar)'
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
  categoryIds?: string[]
  productIds?: string[]
  locale?: string
}): string {
  const activeWord =
    opts.isCurrentlyActive === true
      ? 'Activa'
      : opts.isCurrentlyActive === false
        ? 'Inactiva ahora'
        : opts.isActive
          ? 'Activa'
          : 'Desactivada'
  const locale = opts.locale ?? 'es'
  const schedPart = formatScheduleWindows(opts.schedules, locale)
  const scopePart = formatScopeLabel(
    opts.scopeType,
    opts.categoryNames ?? [],
    opts.productNames ?? [],
    {
      categoryCount: opts.categoryIds?.length,
      productCount: opts.productIds?.length,
    },
    locale,
  )
  const localizedActiveWord = locale === 'en'
    ? opts.isCurrentlyActive === true ? 'Active' : opts.isCurrentlyActive === false ? 'Inactive now' : opts.isActive ? 'Active' : 'Disabled'
    : activeWord
  return `${localizedActiveWord} ${schedPart} ${locale === 'en' ? 'for' : 'en'} ${scopePart}`
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
