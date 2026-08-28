/** Shared POS control sizing — matches DashboardShellHeader (`h-9` / 36px). */
export function usePosToolbarControl() {
  const controlHeightClass = 'h-9'
  const controlRadiusClass = 'rounded-lg'
  const controlTextClass = 'text-sm'

  const bannerActionButtonClass = [
    controlHeightClass,
    controlRadiusClass,
    controlTextClass,
    'inline-flex items-center justify-center gap-1.5 px-2.5 font-medium transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ')

  const bannerSessionFieldClass = [
    'banner-session-field',
    controlHeightClass,
    controlRadiusClass,
    'min-w-0 inline-flex items-center gap-1.5 border border-border bg-surface px-2',
    'transition-all duration-200 focus-within:ring-2 focus-within:ring-form-control-focus-ring focus-within:border-form-control-focus-border',
  ].join(' ')

  const categoryChipClass = [
    controlHeightClass,
    'inline-flex items-center px-3 rounded-lg',
    controlTextClass,
    'font-medium whitespace-nowrap theme-transition',
  ].join(' ')

  return {
    controlHeightClass,
    controlRadiusClass,
    controlTextClass,
    bannerActionButtonClass,
    bannerSessionFieldClass,
    categoryChipClass,
  }
}
