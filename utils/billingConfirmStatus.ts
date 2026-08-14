/** Visual tone for billing confirmation status cards (#2311). */
export type ConfirmStatusTone = 'waiting' | 'ready' | 'warning' | 'danger'

export function statusWellClass(tone: ConfirmStatusTone): string {
  const pulse = tone === 'waiting' ? ' animate-pulse motion-reduce:animate-none' : ''
  if (tone === 'ready') return `bg-state-success-bg ring-8 ring-state-success-bg/40${pulse}`
  if (tone === 'danger') return `bg-state-danger-bg ring-8 ring-state-danger-bg/40${pulse}`
  return `bg-state-warning-bg ring-8 ring-state-warning-bg/40${pulse}`
}

export function statusCardBorderClass(tone: ConfirmStatusTone): string {
  if (tone === 'ready') return 'border-state-success-border'
  if (tone === 'danger') return 'border-state-danger-border'
  return 'border-state-warning-border'
}

export function thankYouToneFromPhase(phase: 'activating' | 'ready' | 'timeout'): ConfirmStatusTone {
  if (phase === 'ready') return 'ready'
  if (phase === 'timeout') return 'warning'
  return 'waiting'
}

export function returnToneFromView(view: 'approved' | 'pending' | 'failed' | 'unknown' | 'loading' | 'thank_you'): ConfirmStatusTone {
  if (view === 'approved') return 'ready'
  if (view === 'pending') return 'waiting'
  return 'danger'
}
