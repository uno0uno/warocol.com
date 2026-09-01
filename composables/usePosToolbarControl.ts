/**
 * Shared POS control + spacing tokens.
 * Heights match DashboardShellHeader (`h-9`).
 * Gaps follow 8px scale (Atlassian / Mesh): tighter inside clusters, larger between sections.
 */
export function usePosToolbarControl() {
  const controlHeightClass = 'h-9'
  const controlRadiusClass = 'rounded-lg'
  const controlTextClass = 'text-sm'

  /** Inset padding for POS surface panels (mesa banner, cart blocks) — 12px */
  const panelPaddingClass = 'p-3'
  /** Sibling controls / chips / action grids / product tiles — 12px */
  const siblingGapClass = 'gap-3'
  /** Vertical stack of sibling actions (Cuenta / Limpiar / Enviar) — 12px */
  const siblingStackClass = 'space-y-3'
  /** Parent blocks (banner ↔ catalog ↔ cart column) — 16px */
  const sectionGapClass = 'gap-4'
  const sectionStackClass = 'space-y-4'

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

  /** Checkout — touch-friendly controls (44px) and section rhythm aligned with POS toolbar scale */
  const checkoutControlHeightClass = 'min-h-[44px]'
  const checkoutSectionCardClass =
    'bg-surface rounded-2xl shadow-sm border border-border p-4'
  const checkoutSectionCardFlushClass =
    'bg-surface rounded-2xl border border-border overflow-hidden shadow-sm'
  const checkoutSectionTitleClass =
    'font-bold text-text-primary flex items-center gap-2 mb-3 text-sm md:text-base'
  const checkoutAccordionTriggerClass = [
    checkoutControlHeightClass,
    'w-full px-4 flex items-center gap-3 text-start hover:bg-surface-secondary/40 transition-colors',
  ].join(' ')
  const checkoutStatGridClass = 'grid grid-cols-3 gap-3 items-stretch'
  const checkoutStatCardClass = [
    'rounded-lg bg-surface-secondary/70 px-2 py-2 text-center min-h-[3rem]',
    'flex flex-col justify-center',
  ].join(' ')
  const checkoutInlineRowClass = [
    checkoutControlHeightClass,
    'flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-secondary/40 px-3',
  ].join(' ')
  const checkoutAlertBannerClass = [
    checkoutControlHeightClass,
    'flex items-center gap-3 px-4 py-3 rounded-xl',
  ].join(' ')

  return {
    controlHeightClass,
    controlRadiusClass,
    controlTextClass,
    siblingGapClass,
    siblingStackClass,
    sectionGapClass,
    sectionStackClass,
    panelPaddingClass,
    bannerActionButtonClass,
    bannerSessionFieldClass,
    categoryChipClass,
    checkoutControlHeightClass,
    checkoutSectionCardClass,
    checkoutSectionCardFlushClass,
    checkoutSectionTitleClass,
    checkoutAccordionTriggerClass,
    checkoutStatGridClass,
    checkoutStatCardClass,
    checkoutInlineRowClass,
    checkoutAlertBannerClass,
  }
}
