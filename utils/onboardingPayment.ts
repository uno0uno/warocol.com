export type OnboardingPaymentStatus = 'created' | 'pending' | 'approved' | 'declined' | 'error'

export interface OnboardingPlan {
  id: string
  name: string
  slug: string
  description: string | null
  priceAnnual: number | string
  currency: 'COP'
  billingCycle: 'annual'
  features: Record<string, unknown>
}

export interface OnboardingCheckoutResult {
  attempt_id: string
  plan_id: string
  checkout_url: string
  amount_in_cents: number
  currency: 'COP'
  billing_cycle: 'annual'
  status: 'pending'
}

export interface OnboardingPaymentAttempt {
  attempt_id: string
  plan_id: string
  amount_in_cents: number
  currency: 'COP'
  status: OnboardingPaymentStatus
}

export interface OnboardingCheckoutContext {
  attemptId: string
  planId: string
}

export const ONBOARDING_CHECKOUT_STORAGE_KEY = 'waro:onboarding:checkout'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value)

export const buildOnboardingCheckoutBody = (planId: string): { plan_id: string } => {
  if (!isUuid(planId)) throw new Error('ONBOARDING_PLAN_ID_INVALID')
  return { plan_id: planId }
}

export const isSafeCheckoutUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export const formatAnnualCop = (value: number | string): string => {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount) || amount < 0) return ''
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const featureLabels = (features: Record<string, unknown>): string[] =>
  Object.entries(features)
    .filter(([, value]) => value === true || (typeof value === 'number' && value > 0))
    .map(([key, value]) => {
      const label = key.replace(/[_-]+/g, ' ').replace(/^\w/, letter => letter.toUpperCase())
      return typeof value === 'number' ? `${label}: ${value.toLocaleString('es-CO')}` : label
    })

export const readCheckoutContext = (
  storage: Pick<Storage, 'getItem'> | null | undefined,
): OnboardingCheckoutContext | null => {
  if (!storage) return null
  try {
    const parsed = JSON.parse(storage.getItem(ONBOARDING_CHECKOUT_STORAGE_KEY) ?? 'null')
    if (!isUuid(parsed?.attemptId) || !isUuid(parsed?.planId)) return null
    return { attemptId: parsed.attemptId, planId: parsed.planId }
  } catch {
    return null
  }
}

export const writeCheckoutContext = (
  storage: Pick<Storage, 'setItem'>,
  context: OnboardingCheckoutContext,
) => storage.setItem(ONBOARDING_CHECKOUT_STORAGE_KEY, JSON.stringify(context))

export const clearCheckoutContext = (storage: Pick<Storage, 'removeItem'>) =>
  storage.removeItem(ONBOARDING_CHECKOUT_STORAGE_KEY)
