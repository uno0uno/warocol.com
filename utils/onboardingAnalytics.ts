export type OnboardingAnalyticsEvent =
  | 'public_cta_clicked'
  | 'registration_started'
  | 'email_verified'

export interface OnboardingAnalyticsPayload {
  dedupeId?: string | null
  source?: string | null
  content?: string | null
  campaign?: string | null
  variant?: string | null
  intent?: string | null
  method?: 'cta' | 'automatic' | null
}

export interface DataLayerTarget {
  dataLayer?: Array<Record<string, string>>
}

const EVENT_NAMES = new Set<OnboardingAnalyticsEvent>([
  'public_cta_clicked',
  'registration_started',
  'email_verified',
])
const DEDUPE_PREFIX = 'waro:onboarding:event:'
const PUBLIC_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/
const PUBLIC_FIELDS = ['source', 'content', 'campaign', 'variant', 'intent'] as const

export const buildOnboardingAnalyticsEvent = (
  event: OnboardingAnalyticsEvent,
  payload: OnboardingAnalyticsPayload = {},
): Record<string, string> => {
  if (!EVENT_NAMES.has(event)) throw new Error('Unsupported onboarding event')
  const result: Record<string, string> = { event }
  for (const key of PUBLIC_FIELDS) {
    const value = payload[key]
    if (value && PUBLIC_VALUE_PATTERN.test(value)) result[key] = value
  }
  if (payload.method === 'cta' || payload.method === 'automatic') result.method = payload.method
  return result
}

export const trackOnboardingEvent = (
  event: OnboardingAnalyticsEvent,
  payload: OnboardingAnalyticsPayload = {},
  target?: DataLayerTarget | null,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
): boolean => {
  const browserTarget = target === undefined
    ? (typeof window === 'undefined' ? null : window as DataLayerTarget)
    : target
  if (!browserTarget) return false

  const dedupeId = payload.dedupeId ?? 'flow'
  const dedupeKey = `${DEDUPE_PREFIX}${event}:${dedupeId}`
  if (storage?.getItem(dedupeKey) === '1') return false

  browserTarget.dataLayer = browserTarget.dataLayer ?? []
  browserTarget.dataLayer.push(buildOnboardingAnalyticsEvent(event, payload))
  storage?.setItem(dedupeKey, '1')
  return true
}
