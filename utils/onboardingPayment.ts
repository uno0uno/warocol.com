export type OnboardingPaymentStatus = 'created' | 'pending' | 'approved' | 'declined' | 'error'

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
