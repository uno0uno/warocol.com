export const REGISTRATION_STORAGE_KEY = 'waro:registration:draft:v1'
export const REGISTRATION_DRAFT_TTL_MS = 30 * 60 * 1000
export const REGISTRATION_RESEND_COOLDOWN_MS = 30 * 1000

const ATTRIBUTION_KEYS = ['source', 'content', 'campaign', 'variant'] as const
const ATTRIBUTION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/

export type RegistrationAttributionKey = typeof ATTRIBUTION_KEYS[number]
export type RegistrationAttribution = Partial<Record<RegistrationAttributionKey, string>>
export type RegistrationPhase = 'form' | 'code'

export interface RegistrationDraft {
  version: 1
  email: string
  phoneCountryIso: string
  phoneCountryCode: string
  phoneNumber: string
  businessName: string
  businessCountryCode: string
  baseCurrencyCode: string
  taxJurisdictionCode: string
  consent: boolean
  attribution: RegistrationAttribution
  phase: RegistrationPhase
  sentAt: number | null
  expiresAt: number
}

export interface RegistrationStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type QueryLike = Record<string, unknown>

const firstString = (value: unknown) => {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' ? candidate.trim() : ''
}

export const normalizeRegistrationEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''

export const normalizeRegistrationPhone = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/\D/g, '').slice(0, 15)
    : ''

export const normalizeRegistrationBusinessName = (value: unknown) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 120) : ''

export const normalizeRegistrationVisitorKey = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? text.slice(0, 128) : undefined
}

const normalizeCatalogCode = (value: unknown, length: number) =>
  typeof value === 'string' ? value.trim().toUpperCase().slice(0, length) : ''

export const sanitizeRegistrationAttribution = (query: QueryLike): RegistrationAttribution => {
  const attribution: RegistrationAttribution = {}
  for (const key of ATTRIBUTION_KEYS) {
    const value = firstString(query[key])
    if (ATTRIBUTION_PATTERN.test(value)) attribution[key] = value
  }
  return attribution
}

export const createRegistrationDraft = (
  values: Partial<Omit<RegistrationDraft, 'version' | 'expiresAt'>> = {},
  now = Date.now(),
): RegistrationDraft => ({
  version: 1,
  email: normalizeRegistrationEmail(values.email),
  phoneCountryIso: normalizeCatalogCode(values.phoneCountryIso || 'CO', 2),
  phoneCountryCode: normalizeRegistrationPhone(values.phoneCountryCode || '57').slice(0, 3),
  phoneNumber: normalizeRegistrationPhone(values.phoneNumber),
  businessName: normalizeRegistrationBusinessName(values.businessName),
  businessCountryCode: normalizeCatalogCode(values.businessCountryCode, 2),
  baseCurrencyCode: normalizeCatalogCode(values.baseCurrencyCode, 3),
  taxJurisdictionCode: normalizeCatalogCode(values.taxJurisdictionCode, 10),
  consent: values.consent === true,
  attribution: sanitizeRegistrationAttribution(values.attribution ?? {}),
  phase: values.phase === 'code' ? 'code' : 'form',
  sentAt: typeof values.sentAt === 'number' && Number.isFinite(values.sentAt) ? values.sentAt : null,
  expiresAt: now + REGISTRATION_DRAFT_TTL_MS,
})

export const readRegistrationDraft = (
  storage: RegistrationStorage,
  now = Date.now(),
): RegistrationDraft | null => {
  try {
    const raw = storage.getItem(REGISTRATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RegistrationDraft>
    if (parsed.version !== 1 || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= now) {
      storage.removeItem(REGISTRATION_STORAGE_KEY)
      return null
    }
    const draft = createRegistrationDraft(parsed, now)
    draft.expiresAt = parsed.expiresAt
    return draft
  } catch {
    storage.removeItem(REGISTRATION_STORAGE_KEY)
    return null
  }
}

export const writeRegistrationDraft = (
  storage: RegistrationStorage,
  values: Partial<Omit<RegistrationDraft, 'version' | 'expiresAt'>>,
  now = Date.now(),
) => {
  const draft = createRegistrationDraft(values, now)
  storage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(draft))
  return draft
}

export const clearRegistrationDraft = (storage: RegistrationStorage) => {
  storage.removeItem(REGISTRATION_STORAGE_KEY)
}

export const prefillRegistrationEmail = (
  storage: RegistrationStorage,
  email: string,
  now = Date.now(),
) => {
  const current = readRegistrationDraft(storage, now)
  return writeRegistrationDraft(storage, {
    ...current,
    email,
    phase: 'form',
    sentAt: null,
  }, now)
}

export const getRegistrationCooldownSeconds = (sentAt: number | null, now = Date.now()) => {
  if (!sentAt) return 0
  return Math.max(0, Math.ceil((sentAt + REGISTRATION_RESEND_COOLDOWN_MS - now) / 1000))
}

export const buildRegistrationPayload = (
  draft: RegistrationDraft,
  visitorKey?: string | null,
) => {
  const country_code = normalizeCatalogCode(draft.businessCountryCode, 2)
  const payload: Record<string, unknown> = {
    email: normalizeRegistrationEmail(draft.email),
    phone_country_code: Number(normalizeRegistrationPhone(draft.phoneCountryCode)),
    phone_number: normalizeRegistrationPhone(draft.phoneNumber),
    business_name: normalizeRegistrationBusinessName(draft.businessName),
    country_code,
    base_currency_code: normalizeCatalogCode(draft.baseCurrencyCode, 3),
    consent: draft.consent as true,
    ...sanitizeRegistrationAttribution(draft.attribution),
  }
  const jurisdiction = normalizeCatalogCode(draft.taxJurisdictionCode, 10)
  if (jurisdiction) payload.tax_jurisdiction_code = jurisdiction
  const normalizedVisitorKey = normalizeRegistrationVisitorKey(visitorKey)
  if (normalizedVisitorKey) payload.visitor_key = normalizedVisitorKey
  return payload
}
