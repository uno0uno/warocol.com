import { DEFAULT_TENANT_TIMEZONE, timeHHMMFromISO } from '~/utils/bogotaDate'

export interface CierreListRowLike {
  status?: string
  periodStart?: string
  periodEnd?: string
  periodStartTime?: string | null
  periodEndTime?: string | null
  shiftTemplateId?: string | null
}

/** Row in arqueo list with status open (pending close). */
export function isCierreOpen(row: CierreListRowLike | null | undefined): boolean {
  return row?.status === 'open'
}

/** Deep link to the correct close wizard for an open shift list row. */
export function buildCierreCloseRoute(
  row: CierreListRowLike,
  timezone = DEFAULT_TENANT_TIMEZONE,
): string {
  const start = row.periodStart ?? ''
  const end = row.periodEnd ?? start

  if (row.shiftTemplateId) {
    const q = new URLSearchParams({
      mode: 'template',
      template: row.shiftTemplateId,
      start,
    })
    return `/finanzas/arqueo/z?${q.toString()}`
  }

  if (row.periodStartTime && row.periodEndTime) {
    const q = new URLSearchParams({
      mode: 'custom',
      start,
      end,
      startTime: timeHHMMFromISO(row.periodStartTime, timezone),
      endTime: timeHHMMFromISO(row.periodEndTime, timezone),
    })
    return `/finanzas/arqueo/z?${q.toString()}`
  }

  return `/finanzas/arqueo/nuevo?start=${start}`
}

/** Shared period params for cierre preview, shift-status, and open-shift (#920/#921). */
export function buildCierreWindowParams(opts: {
  periodStart: string
  periodEnd: string
  shiftTemplateId?: string | null
  periodStartTime?: string | null
  periodEndTime?: string | null
}): Record<string, string> {
  const base: Record<string, string> = {
    period_start: opts.periodStart,
    period_end: opts.periodEnd,
  }
  if (opts.shiftTemplateId) {
    base.shift_template_id = opts.shiftTemplateId
    return base
  }
  if (opts.periodStartTime) base.period_start_time = opts.periodStartTime
  if (opts.periodEndTime) base.period_end_time = opts.periodEndTime
  return base
}

export function buildCierreWindowBody(opts: {
  periodStart: string
  periodEnd: string
  shiftTemplateId?: string | null
  periodStartTime?: string | null
  periodEndTime?: string | null
}): Record<string, string> {
  const base: Record<string, string> = {
    periodStart: opts.periodStart,
    periodEnd: opts.periodEnd,
  }
  if (opts.shiftTemplateId) {
    base.shiftTemplateId = opts.shiftTemplateId
    return base
  }
  if (opts.periodStartTime) base.periodStartTime = opts.periodStartTime
  if (opts.periodEndTime) base.periodEndTime = opts.periodEndTime
  return base
}

export function isShiftOpen(data: Record<string, any> | null | undefined): boolean {
  return data?.status === 'open' || !!data?.openingCash
}

/** Pinia Colada segment so preview refetches when shift opens or fondo changes. */
export function cierrePreviewShiftCacheKey(data: Record<string, any> | null | undefined): string {
  if (!isShiftOpen(data)) return 'closed'
  return `open-${data?.openingCash ?? 0}`
}
