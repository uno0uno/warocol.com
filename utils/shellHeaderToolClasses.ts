/** Shared 9×9 dashboard header icon buttons (bell, POS floor tools). */
export const shellHeaderToolButtonClass = [
  'relative overflow-visible h-9 w-9 flex-shrink-0 inline-flex items-center justify-center rounded-lg border',
  'border-shell-action-border bg-shell-action-bg text-shell-action-text',
  'hover:bg-shell-action-hover-bg',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-shell-action-focus-ring',
  'transition-colors',
].join(' ')

/** Header-style text chip (POS nav, floor Mesas/Domicilios tabs). */
export const shellHeaderToolTextButtonClass = [
  'relative inline-flex flex-shrink-0 items-center justify-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors',
  'border-shell-action-border bg-shell-action-bg text-shell-action-text',
  'hover:bg-shell-action-hover-bg',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-shell-action-focus-ring',
].join(' ')

/** Selected toggle — same border as default, hover tint as persistent background (no primary ring). */
export const shellHeaderToolButtonActiveClass = [
  'border-shell-action-border bg-shell-action-hover-bg',
  'hover:bg-shell-action-hover-bg',
  'ring-0 focus:ring-0 focus-visible:ring-0',
].join(' ')

export const shellHeaderToolBadgeClass =
  'pointer-events-none absolute -top-1 -end-1 z-10 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-badge-danger-bg text-badge-danger-text text-[10px] font-bold leading-none tabular-nums ring-2 ring-shell-header-bg'
