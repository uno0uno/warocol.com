import { isUuid, type OnboardingPaymentStatus } from './onboardingPayment.ts'

export type OnboardingAnalyticsEvent =
  | 'plan_selected'
  | 'checkout_started'
  | 'checkout_abandoned'
  | 'payment_result'
  | 'trial_started'
  | 'trial_payment_clicked'
  | 'trial_expired'

interface OnboardingAnalyticsPayload {
  planId?: string | null
  paymentStatus?: OnboardingPaymentStatus | null
  dedupeId?: string | null
}

interface DataLayerTarget {
  dataLayer?: Array<Record<string, string>>
}

const EVENT_NAMES = new Set<OnboardingAnalyticsEvent>([
  'plan_selected',
  'checkout_started',
  'checkout_abandoned',
  'payment_result',
  'trial_started',
  'trial_payment_clicked',
  'trial_expired',
])
const PAYMENT_STATUSES = new Set<OnboardingPaymentStatus>([
  'created',
  'pending',
  'approved',
  'declined',
  'error',
])
const DEDUPE_PREFIX = 'waro:onboarding:event:'

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
