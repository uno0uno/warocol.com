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

/** Pill chip matching UiStatusBadge size="sm" (e.g. Disponible). */
export function filterPillClass(
  active: boolean,
  tone: 'primary' | 'secondary' | 'success' = 'primary',
): string {
  const base =
    'inline-flex items-center font-semibold px-2 py-0.5 text-xs rounded-md transition-colors flex-shrink-0 border-0'
  if (!active) {
    return `${base} bg-secondary text-secondary-foreground`
  }
  const activeTone = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary text-secondary-foreground',
    success: 'bg-status-success-bg text-status-success-text',
  }[tone]
  return `${base} ${activeTone} cursor-pointer`
}

/** Shared filter-bar control chrome (matches UiFilterSelect / h-10 selects). */
const filterBarControlBase =
  'inline-flex items-center justify-center min-h-[44px] h-10 px-3 rounded-lg border-2 text-sm font-semibold transition-colors flex-shrink-0 cursor-pointer'

/** Toggle chip in filter bars — same surface as selects, primary when active. */
export function filterChipClass(active: boolean, _compact = false): string {
  if (active) {
    return `${filterBarControlBase} border-primary bg-primary/10 text-primary`
  }
  return `${filterBarControlBase} border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary`
}

/** Product type chips (Todos / Menú / Reventa). */
export function productTypeChipClass(active: boolean): string {
  if (active) {
    return `${filterBarControlBase} border-primary bg-primary/10 text-primary font-medium`
  }
  return `${filterBarControlBase} border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary`
}
