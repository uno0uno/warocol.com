export type BillingLifecycleKind =
  | 'trialing'
  | 'trial_expired'
  | 'active'
  | 'paid_grace'
  | 'pending'
  | 'inactive'
  | 'unknown'

export interface BillingLifecycle {
  kind: BillingLifecycleKind
  status: string | null
  accessLevel: string | null
  trialStartedAt: string | null
  trialEndsAt: string | null
  trialDaysRemaining: number | null
  isTrial: boolean
  isReadOnly: boolean
  isPaidGrace: boolean
}

type Payload = Record<string, unknown> | null | undefined

const DAY_MS = 24 * 60 * 60 * 1000

const asRecord = (value: unknown): Payload =>
  value && typeof value === 'object' ? value as Record<string, unknown> : null

const readValue = (sources: Payload[], keys: string[]) => {
  for (const source of sources) {
    if (!source) continue
    for (const key of keys) {
      const value = source[key]
      if (value !== null && value !== undefined) return value
    }
  }
  return null
}

const readString = (sources: Payload[], keys: string[]) => {
  const value = readValue(sources, keys)
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const readNumber = (sources: Payload[], keys: string[]) => {
  const value = readValue(sources, keys)
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) ? number : null
}

const normalizeStatus = (value: string | null) => value?.toLowerCase().replace(/-/g, '_') ?? null

export const resolveBillingLifecycle = (
  subscriptionValue: unknown,
  accessValue?: unknown,
  now = Date.now(),
): BillingLifecycle => {
  const subscription = asRecord(subscriptionValue)
  const access = asRecord(accessValue)
  const sources = [subscription, access]
  const status = normalizeStatus(readString(sources, [
    'status',
    'subscription_status',
    'subscriptionStatus',
    'billing_status',
    'billingStatus',
  ]))
  const accessLevel = normalizeStatus(readString([access, subscription], ['level', 'access_level', 'accessLevel']))
  const trialStartedAt = readString(sources, ['trial_started_at', 'trialStartedAt'])
  const trialEndsAt = readString(sources, ['trial_ends_at', 'trialEndsAt'])
  const serverDays = readNumber(sources, [
    'trial_days_remaining',
    'trialDaysRemaining',
    'days_remaining',
    'daysRemaining',
  ])

  let kind: BillingLifecycleKind = 'unknown'
  if (status === 'trialing') kind = 'trialing'
  else if (status === 'trial_expired') kind = 'trial_expired'
  else if (status === 'active') kind = 'active'
  else if (status === 'past_due') kind = 'paid_grace'
  else if (status === 'pending') kind = 'pending'
  else if (status === 'cancelled' || status === 'expired' || status === 'free') kind = 'inactive'

  let trialDaysRemaining: number | null = null
  if (kind === 'trial_expired') {
    trialDaysRemaining = 0
  } else if (kind === 'trialing') {
    if (serverDays !== null) trialDaysRemaining = Math.max(0, Math.ceil(serverDays))
    else if (trialEndsAt) {
      const end = Date.parse(trialEndsAt)
      if (Number.isFinite(end)) trialDaysRemaining = Math.max(0, Math.ceil((end - now) / DAY_MS))
    }
  }

  return {
    kind,
    status,
    accessLevel,
    trialStartedAt,
    trialEndsAt,
    trialDaysRemaining,
    isTrial: kind === 'trialing' || kind === 'trial_expired',
    isReadOnly: accessLevel === 'read_only' || kind === 'trial_expired',
    isPaidGrace: kind === 'paid_grace',
  }
}

export const isAllowedBillingAccess = (level: unknown) =>
  level === 'full' || level === 'full_with_warning' || level === 'read_only'
