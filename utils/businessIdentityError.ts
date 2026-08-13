/**
 * Opaque storefront identity conflicts (warocol.com#2271 / api-warolabs#832).
 * Never surface leaked slug/name hints from API detail strings.
 */

const OPAQUE_CODES = new Set([
  'BUSINESS_IDENTITY_UNAVAILABLE',
  'BUSINESS_NAME_INVALID',
])

function asRecord (input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null
  return input as Record<string, unknown>
}

function nestedData (input: unknown): Record<string, unknown> | null {
  const root = asRecord(input)
  if (!root) return null
  return asRecord(root.data)
    ?? asRecord(asRecord(root.response)?._data)
    ?? asRecord(root)
}

export function extractApiErrorDetail (input: unknown): unknown {
  const data = nestedData(input)
  if (!data) return null
  if ('detail' in data) return data.detail
  return null
}

/** Lowercase, spaces → `-`, strip unsafe chars (preview / client normalize). */
export function normalizeStorefrontSlug (value: string): string {
  const raw = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  return raw
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function detailLooksLikeSlugTaken (detail: unknown): boolean {
  if (typeof detail !== 'string') return false
  const lower = detail.toLowerCase()
  return lower.includes('already taken')
    || (lower.includes('slug') && lower.includes('taken'))
}

export function isBusinessIdentityConflict (input: unknown): boolean {
  const detail = extractApiErrorDetail(input)
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const code = String((detail as Record<string, unknown>).code || '')
    if (OPAQUE_CODES.has(code)) return true
  }
  if (detailLooksLikeSlugTaken(detail)) return true
  if (typeof detail === 'string' && /choose a different business name/i.test(detail)) return true
  return false
}

/**
 * Prefer opaque i18n copy for identity conflicts; otherwise formatApiValidationError-style.
 */
export function resolveProfileSaveErrorMessage (
  input: unknown,
  opaqueMessage: string,
  fallback: string,
  formatDetail: (detail: unknown, fallback: string) => string,
): string {
  if (isBusinessIdentityConflict(input)) return opaqueMessage
  const detail = extractApiErrorDetail(input)
  return formatDetail(detail, fallback)
}
