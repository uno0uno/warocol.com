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

export function isShiftOpen(data: Record<string, any> | null | undefined): boolean {
  return data?.status === 'open' || !!data?.openingCash
}

/** Pinia Colada segment so preview refetches when shift opens or fondo changes. */
export function cierrePreviewShiftCacheKey(data: Record<string, any> | null | undefined): string {
  if (!isShiftOpen(data)) return 'closed'
  return `open-${data?.openingCash ?? 0}`
}
