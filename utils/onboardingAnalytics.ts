import { isUuid, type OnboardingPaymentStatus } from './onboardingPayment.ts'

export type OnboardingAnalyticsEvent =
  | 'public_cta_clicked'
  | 'registration_started'
  | 'email_verified'
  | 'business_profile_completed'
  | 'plan_selected'
  | 'checkout_started'
  | 'checkout_abandoned'
  | 'payment_result'

export interface OnboardingAnalyticsPayload {
  planId?: string | null
  paymentStatus?: OnboardingPaymentStatus | null
  dedupeId?: string | null
  source?: string | null
  content?: string | null
  campaign?: string | null
  variant?: string | null
  intent?: string | null
}

export interface DataLayerTarget {
  dataLayer?: Array<Record<string, string>>
}

const EVENT_NAMES = new Set<OnboardingAnalyticsEvent>([
  'public_cta_clicked',
  'registration_started',
  'email_verified',
  'business_profile_completed',
  'plan_selected',
  'checkout_started',
  'checkout_abandoned',
  'payment_result',
])
const PAYMENT_STATUSES = new Set<OnboardingPaymentStatus>([
  'created',
  'pending',
  'approved',
  'declined',
  'error',
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
  if (isUuid(payload.planId)) result.plan_id = payload.planId
  if (payload.paymentStatus && PAYMENT_STATUSES.has(payload.paymentStatus)) {
    result.payment_status = payload.paymentStatus
  }
  for (const key of PUBLIC_FIELDS) {
    const value = payload[key]
    if (value && PUBLIC_VALUE_PATTERN.test(value)) result[key] = value
  }
  return result
}

export const trackOnboardingEvent = (
  event: OnboardingAnalyticsEvent,
  payload: OnboardingAnalyticsPayload = {},
  target?: DataLayerTarget | null,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
): boolean => {
  const browserTarget = target ?? (typeof window === 'undefined' ? null : window as DataLayerTarget)
  if (!browserTarget) return false

  const dedupeId = payload.dedupeId ?? payload.planId ?? 'flow'
  const dedupeKey = `${DEDUPE_PREFIX}${event}:${dedupeId}`
  if (storage?.getItem(dedupeKey) === '1') return false

  browserTarget.dataLayer = browserTarget.dataLayer ?? []
  browserTarget.dataLayer.push(buildOnboardingAnalyticsEvent(event, payload))
  storage?.setItem(dedupeKey, '1')
  return true
}
