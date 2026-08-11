/**
 * Post-Paddle checkout thank-you polling helpers (#2219).
 * Activation remains webhook/API reconcile — never trust browser alone.
 */

export type PaddleThankYouPhase = 'activating' | 'ready' | 'timeout'

export interface PaddleTxnStatusResponse {
  transaction_id?: string
  paddle_status?: string | null
  activated?: boolean
  waro_ready?: boolean
  access_level?: string | null
  subscription_status?: string | null
  reason?: string | null
}

export const PADDLE_THANK_YOU_POLL_MS = 2500
export const PADDLE_THANK_YOU_MAX_ATTEMPTS = 24 // ~60s

export function paddleThankYouPhaseFromStatus (
  status: PaddleTxnStatusResponse | null | undefined,
  attempt: number,
  maxAttempts = PADDLE_THANK_YOU_MAX_ATTEMPTS,
): PaddleThankYouPhase {
  if (status?.waro_ready || status?.access_level === 'full' || status?.access_level === 'full_with_warning') {
    return 'ready'
  }
  if (attempt >= maxAttempts) return 'timeout'
  return 'activating'
}
