/** Shared 9×9 dashboard header icon buttons (bell, POS floor tools). */
export const shellHeaderToolButtonClass = [
  'relative h-9 w-9 flex-shrink-0 inline-flex items-center justify-center rounded-lg border',
  'border-shell-action-border bg-shell-action-bg text-shell-action-text',
  'hover:bg-shell-action-hover-bg',
  'focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
  'transition-colors',
].join(' ')

export const shellHeaderToolButtonActiveClass = [
  'text-primary border-primary/30 bg-primary/10',
  'hover:text-primary hover:bg-primary/10',
].join(' ')

export const shellHeaderToolBadgeClass =
  'absolute -top-1.5 -end-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold leading-none tabular-nums'
