/**
 * Map login / verify-code fetch failures to safe auth.* i18n keys.
 * Never return raw API `message` / `detail` for UI display (#2225).
 */

export type AuthLoginErrorKind = 'magic_link' | 'verify_code'

export type AuthLoginErrorKey =
  | 'auth.magicLinkError'
  | 'auth.invalidCode'
  | 'auth.networkError'
  | 'auth.rateLimited'
  | 'auth.authError'

const INVALID_CODE_NEEDLES = [
  'invalid or expired verification code',
  'invalid or expired token',
  'verification failed',
  'invalid code',
  'expired code',
  'código inválido',
  'codigo invalido',
  'código expirado',
  'codigo expirado',
]

const SEND_FAIL_NEEDLES = [
  'failed to send magic link',
  'failed to send',
]

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

export function extractAuthLoginStatus (input: unknown): number | null {
  const root = asRecord(input)
  if (!root) return null
  const data = nestedData(input)
  const candidates = [
    root.statusCode,
    root.status,
    asRecord(root.response)?.status,
    data?.status_code,
  ]
  for (const value of candidates) {
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) return n
  }
  return null
}

export function extractAuthLoginRawMessage (input: unknown): string {
  const root = asRecord(input)
  const data = nestedData(input)
  const candidates = [
    data?.message,
    data?.detail,
    data?.error,
    root?.message,
    root?.statusMessage,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value) && value.length) {
      // FastAPI validation detail array
      const first = value[0]
      if (typeof first === 'string') return first
      const msg = asRecord(first)?.msg
      if (typeof msg === 'string') return msg
    }
  }
  return ''
}

function messageMatches (message: string, needles: string[]): boolean {
  const lower = message.toLowerCase()
  return needles.some((needle) => lower.includes(needle))
}

/**
 * Resolve a user-facing i18n key for login magic-link or verify-code failures.
 */
export function resolveAuthLoginErrorKey (
  input: unknown,
  kind: AuthLoginErrorKind,
): AuthLoginErrorKey {
  const status = extractAuthLoginStatus(input)
  const message = extractAuthLoginRawMessage(input)

  if (status === 429 || messageMatches(message, ['rate limit', 'too many', 'demasiado', 'demasiados', 'demasiadas'])) {
    return 'auth.rateLimited'
  }

  // Network / CORS / offline — ofetch often has no HTTP status
  if (status === null) {
    const looksFetch =
      messageMatches(message, ['fetch', 'network', 'failed to fetch', 'load failed', 'econnrefused'])
      || (typeof input === 'object' && input !== null && 'cause' in (input as object))
    if (looksFetch || !message) return 'auth.networkError'
  }

  if (status !== null && status >= 500) {
    return kind === 'verify_code' ? 'auth.authError' : 'auth.magicLinkError'
  }

  if (kind === 'verify_code') {
    return 'auth.invalidCode'
  }

  // magic_link send
  if (status === 400 || status === 422 || messageMatches(message, SEND_FAIL_NEEDLES)) {
    return 'auth.magicLinkError'
  }
  if (status === 401 || status === 403) {
    return 'auth.authError'
  }
  return 'auth.magicLinkError'
}
