/** Base Tailwind classes for filter bar `<select>` controls. */
const filterSelectBase =
  'h-10 max-w-full min-w-0 whitespace-nowrap py-2 pl-3 pr-8 rounded-lg border-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0 transition-colors'

/** @deprecated Use filterSelectClassFor(value) for active primary border. */
export const filterSelectClass = `${filterSelectBase} border-border text-text-primary`

/** Primary border + emphasis when a value is selected (not placeholder). */
export function filterSelectClassFor(
  value: string | null | undefined,
  options?: { active?: boolean },
): string {
  const isActive = options?.active ?? (value != null && value !== '')
  return [
    filterSelectBase,
    isActive
      ? 'border-primary text-text-primary font-medium'
      : 'border-border text-text-secondary',
  ].join(' ')
}

/** Toggle chip in filter bars (Online, Sin receta, …). */
export function filterChipClass(active: boolean, compact = false): string {
  const sizing = compact ? 'h-10 px-2.5' : 'min-h-[44px] px-3'
  return [
    `flex items-center gap-2 cursor-pointer ${sizing} rounded-lg border-2 transition-colors flex-shrink-0`,
    active
      ? 'border-primary bg-primary/5 text-primary'
      : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary/40',
  ].join(' ')
}
