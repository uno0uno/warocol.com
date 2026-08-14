import { describe, expect, it } from 'vitest'
import {
  returnToneFromView,
  statusCardBorderClass,
  statusWellClass,
  thankYouToneFromPhase,
} from './billingConfirmStatus'

describe('billingConfirmStatus', () => {
  it('pulses waiting wells and disables motion when reduced', () => {
    const waiting = statusWellClass('waiting')
    expect(waiting).toContain('animate-pulse')
    expect(waiting).toContain('motion-reduce:animate-none')
    expect(statusWellClass('ready')).not.toContain('animate-pulse')
    expect(statusWellClass('danger')).not.toContain('animate-pulse')
    expect(statusWellClass('warning')).not.toContain('animate-pulse')
  })

  it('maps tones to semantic borders', () => {
    expect(statusCardBorderClass('ready')).toBe('border-state-success-border')
    expect(statusCardBorderClass('danger')).toBe('border-state-danger-border')
    expect(statusCardBorderClass('waiting')).toBe('border-state-warning-border')
    expect(statusCardBorderClass('warning')).toBe('border-state-warning-border')
  })

  it('maps thank-you and return views to tones', () => {
    expect(thankYouToneFromPhase('activating')).toBe('waiting')
    expect(thankYouToneFromPhase('ready')).toBe('ready')
    expect(thankYouToneFromPhase('timeout')).toBe('warning')
    expect(returnToneFromView('pending')).toBe('waiting')
    expect(returnToneFromView('approved')).toBe('ready')
    expect(returnToneFromView('failed')).toBe('danger')
  })
})
