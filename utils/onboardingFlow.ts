export type OnboardingNextStep = 'business_profile' | 'terms' | 'payment' | 'activation' | 'setup'
export type AuthSessionKind = 'anonymous' | 'pending' | 'internal' | 'customer'

export interface OnboardingSessionLike {
  user?: unknown
  lifecycleStatus?: unknown
  lifecycle_status?: unknown
  nextStep?: unknown
  next_step?: unknown
  onboardingState?: unknown
  onboarding_state?: unknown
}

export interface OnboardingStatusLike {
  lifecycleStatus?: unknown
  lifecycle_status?: unknown
  nextStep?: unknown
  next_step?: unknown
}

const NEXT_STEPS = new Set<OnboardingNextStep>([
  'business_profile',
  'terms',
  'payment',
  'activation',
  'setup',
])

const asSession = (session: unknown) => session as OnboardingSessionLike | null | undefined
const asStatus = (status: unknown) => status as OnboardingStatusLike | null | undefined

export const getSessionLifecycle = (session: unknown) => {
  const value = asSession(session)
  return value?.lifecycleStatus ?? value?.lifecycle_status ?? null
}

export const getSessionNextStep = (session: unknown) => {
  const value = asSession(session)
  return value?.nextStep ?? value?.next_step ?? null
}

export const isPendingOnboardingSession = (session: unknown) =>
  Boolean(asSession(session)?.user) && getSessionLifecycle(session) === 'pending'

export const isActiveOnboardingSetupSession = (session: unknown) =>
  Boolean(asSession(session)?.user)
  && getSessionLifecycle(session) === 'active'
  && normalizeOnboardingNextStep(getSessionNextStep(session)) === 'setup'

export const isOnboardingEntrySession = (session: unknown) =>
  isPendingOnboardingSession(session)

export const classifyAuthSession = (
  session: unknown,
  canUseInternal: boolean,
): AuthSessionKind => {
  const value = asSession(session)
  if (!value?.user) return 'anonymous'
  if (isPendingOnboardingSession(value)) return 'pending'
  return canUseInternal ? 'internal' : 'customer'
}

export const normalizeOnboardingNextStep = (value: unknown): OnboardingNextStep | null =>
  typeof value === 'string' && NEXT_STEPS.has(value as OnboardingNextStep)
    ? value as OnboardingNextStep
    : null

export const getEditableBusinessName = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.toLocaleLowerCase() === 'negocio pendiente' ? '' : normalized
}
