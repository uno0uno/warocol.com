/**
 * Post-checkout thank-you polling helpers (#943 Lemon Squeezy / MoR).
 * Activation remains webhook/API reconcile — never trust browser alone.
 */

export type BillingThankYouPhase = 'activating' | 'ready' | 'timeout'

export interface BillingCheckoutStatusResponse {
  checkout_id?: string | null
  gateway_reference?: string | null
  activated?: boolean
  waro_ready?: boolean
  access_level?: string | null
  subscription_status?: string | null
  reason?: string | null
}

export const BILLING_THANK_YOU_POLL_MS = 2500
export const BILLING_THANK_YOU_MAX_ATTEMPTS = 24 // ~60s

export function billingThankYouPhaseFromStatus (
  status: BillingCheckoutStatusResponse | null | undefined,
  attempt: number,
  maxAttempts = BILLING_THANK_YOU_MAX_ATTEMPTS,
): BillingThankYouPhase {
  if (status?.waro_ready || status?.access_level === 'full' || status?.access_level === 'full_with_warning') {
    return 'ready'
  }
  if (attempt >= maxAttempts) return 'timeout'
  return 'activating'
}

/** @deprecated Use BillingThankYouPhase — kept until #944 purge */
export type PaddleThankYouPhase = BillingThankYouPhase
/** @deprecated Use BillingCheckoutStatusResponse */
export type PaddleTxnStatusResponse = BillingCheckoutStatusResponse
/** @deprecated Use BILLING_THANK_YOU_POLL_MS */
export const PADDLE_THANK_YOU_POLL_MS = BILLING_THANK_YOU_POLL_MS
/** @deprecated Use BILLING_THANK_YOU_MAX_ATTEMPTS */
export const PADDLE_THANK_YOU_MAX_ATTEMPTS = BILLING_THANK_YOU_MAX_ATTEMPTS
/** @deprecated Use billingThankYouPhaseFromStatus */
export const paddleThankYouPhaseFromStatus = billingThankYouPhaseFromStatus
