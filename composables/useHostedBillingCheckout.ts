/**
 * Hosted MoR checkout helper (#943 Lemon Squeezy).
 * Opens checkout_url externally; thank-you page polls the API — no Lemon.js / Paddle.js.
 */

const PENDING_FLAG_KEY = 'waro_hosted_checkout_pending'
const CHECKOUT_ID_KEY = 'waro_ls_checkout_id'

export function markHostedCheckoutPending (checkoutId?: string | null) {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(PENDING_FLAG_KEY, '1')
    const id = checkoutId != null ? String(checkoutId).trim() : ''
    if (id) sessionStorage.setItem(CHECKOUT_ID_KEY, id)
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearHostedCheckoutPending () {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(PENDING_FLAG_KEY)
    sessionStorage.removeItem(CHECKOUT_ID_KEY)
  } catch {
    /* ignore */
  }
}

export function isHostedCheckoutPending (): boolean {
  if (!import.meta.client) return false
  try {
    return sessionStorage.getItem(PENDING_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export function readStoredHostedCheckoutId (): string | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(CHECKOUT_ID_KEY)
    return raw && raw.trim() ? raw.trim() : null
  } catch {
    return null
  }
}

/** Normalize gateway_reference `ls_chk_{id}` or raw id for status poll query. */
export function normalizeLsCheckoutId (raw: string | null | undefined): string | null {
  if (raw == null) return null
  const value = String(raw).trim()
  if (!value) return null
  if (value.startsWith('ls_chk_') && !value.startsWith('ls_chk_mock_')) {
    return value.slice('ls_chk_'.length) || null
  }
  return value
}

export function useHostedBillingCheckout () {
  async function openCheckoutUrl (
    url: string,
    options?: { checkoutId?: string | null, normalizeUrl?: (u: string) => string },
  ) {
    const checkoutId = options?.checkoutId
    markHostedCheckoutPending(checkoutId)
    const href = options?.normalizeUrl ? options.normalizeUrl(url) : url
    await navigateTo(href, { external: true })
  }

  return {
    openCheckoutUrl,
    markHostedCheckoutPending,
    clearHostedCheckoutPending,
    isHostedCheckoutPending,
    readStoredHostedCheckoutId,
    normalizeLsCheckoutId,
  }
}
