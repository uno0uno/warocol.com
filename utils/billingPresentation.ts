export interface BillingPresentationState {
  subscriptionStatus?: string | null
  checkoutUrl?: string | null
  accessLevel?: string | null
}

export type BillingScenarioId =
  | 'starter_or_none'
  | 'active'
  | 'pending_checkout'
  | 'pending_restart'
  | 'past_due_warning'
  | 'past_due_read_only'
  | 'blocked'
  | 'cancelled'
  | 'expired'

export type BillingPrimaryAction = 'none' | 'open_subscribe' | 'complete_checkout' | 'recover'

export interface BillingScenarioPresentation {
  id: BillingScenarioId
  primaryAction: BillingPrimaryAction
  /** Pending checkout only — Cancelar intento stays secondary */
  showAbandonSecondary: boolean
  showRecoveryAlert: boolean
  alertTone: 'none' | 'warning' | 'critical'
  /** i18n key under billing.* or full path already prefixed */
  alertTitleKey: string | null
  primaryLabelKey: string | null
}

/**
 * Single matrix for Mi Plan header CTA + recovery alert (#2222).
 * Does not change API grace rules — presentation only.
 */
export function resolveBillingScenario (
  state: BillingPresentationState,
): BillingScenarioPresentation {
  const status = state.subscriptionStatus ?? null
  const level = state.accessLevel ?? null
  const hasCheckout = Boolean(state.checkoutUrl)

  if (status === 'pending' && hasCheckout) {
    return {
      id: 'pending_checkout',
      primaryAction: 'complete_checkout',
      showAbandonSecondary: true,
      showRecoveryAlert: false,
      alertTone: 'none',
      alertTitleKey: null,
      primaryLabelKey: 'billing.completePayment',
    }
  }

  if (status === 'pending') {
    return {
      id: 'pending_restart',
      primaryAction: 'open_subscribe',
      showAbandonSecondary: false,
      showRecoveryAlert: false,
      alertTone: 'none',
      alertTitleKey: null,
      primaryLabelKey: 'billing.subscribe',
    }
  }

  if (status === 'past_due' && level === 'full_with_warning') {
    return {
      id: 'past_due_warning',
      primaryAction: 'recover',
      showAbandonSecondary: false,
      showRecoveryAlert: true,
      alertTone: 'warning',
      alertTitleKey: 'billing.paymentFailedGrace',
      primaryLabelKey: hasCheckout ? 'billing.completePayment' : 'billing.updatePayment',
    }
  }

  if (status === 'past_due' && level === 'read_only') {
    return {
      id: 'past_due_read_only',
      primaryAction: 'recover',
      showAbandonSecondary: false,
      showRecoveryAlert: true,
      alertTone: 'warning',
      alertTitleKey: 'billing.aiSuspended',
      primaryLabelKey: hasCheckout ? 'billing.completePayment' : 'billing.updatePayment',
    }
  }

  if (status === 'cancelled') {
    return {
      id: 'cancelled',
      primaryAction: 'open_subscribe',
      showAbandonSecondary: false,
      showRecoveryAlert: true,
      alertTone: 'critical',
      alertTitleKey: 'billing.subscriptionCancelledTitle',
      primaryLabelKey: 'billing.reactivate',
    }
  }

  if (status === 'expired') {
    return {
      id: 'expired',
      primaryAction: hasCheckout ? 'complete_checkout' : 'open_subscribe',
      showAbandonSecondary: false,
      showRecoveryAlert: true,
      alertTone: 'critical',
      alertTitleKey: 'billing.subscriptionExpired',
      primaryLabelKey: hasCheckout ? 'billing.completePayment' : 'billing.reactivate',
    }
  }

  // past_due past grace, or any non-pending subscription with blocked access
  // (do not treat onboarding with no subscription row + blocked as recovery)
  if (
    status === 'past_due'
    || (level === 'blocked' && status && status !== 'pending')
  ) {
    return {
      id: 'blocked',
      primaryAction: hasCheckout ? 'complete_checkout' : 'open_subscribe',
      showAbandonSecondary: false,
      showRecoveryAlert: true,
      alertTone: 'critical',
      alertTitleKey: 'billing.subscriptionExpired',
      primaryLabelKey: hasCheckout ? 'billing.completePayment' : 'billing.reactivate',
    }
  }

  if (status === 'active') {
    return {
      id: 'active',
      primaryAction: 'none',
      showAbandonSecondary: false,
      showRecoveryAlert: false,
      alertTone: 'none',
      alertTitleKey: null,
      primaryLabelKey: null,
    }
  }

  // No row / Starter (incl. access blocked with no subscription — onboarding)
  return {
    id: 'starter_or_none',
    primaryAction: 'open_subscribe',
    showAbandonSecondary: false,
    showRecoveryAlert: false,
    alertTone: 'none',
    alertTitleKey: null,
    primaryLabelKey: 'billing.upgradeToPro',
  }
}

export const canStartBillingSubscription = ({
  subscriptionStatus,
  checkoutUrl,
  accessLevel,
}: BillingPresentationState) => {
  const scenario = resolveBillingScenario({ subscriptionStatus, checkoutUrl, accessLevel })
  return scenario.primaryAction === 'open_subscribe' && !scenario.showRecoveryAlert
}

export const shouldShowBillingRecoveryAlert = (state: BillingPresentationState) =>
  resolveBillingScenario(state).showRecoveryAlert

export interface BillingPriceOffer {
  segment: string
  currency: string
  monthly_amount_minor: number
  annual_amount_minor: number
  monthly_amount: number
  annual_amount: number
}

/** Format SaaS list price from MoR price_offer (major units). */
export const formatBillingOfferAmount = (
  amount: number,
  currency: string,
  localeTag: string,
) =>
  new Intl.NumberFormat(localeTag, {
    style: 'currency',
    currency: (currency || 'USD').toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

/** Legacy annual 10× list — two months “saved” vs paying monthly (display-only helper). */
export const billingOfferAnnualSavings = (offer: BillingPriceOffer | null | undefined) =>
  offer ? offer.monthly_amount * 2 : 0

export const billingEventProviderRef = (metadata: Record<string, unknown> | null | undefined) => {
  if (!metadata) return null
  if (metadata.paddle_transaction_id) return String(metadata.paddle_transaction_id)
  if (metadata.wompi_transaction_id) return String(metadata.wompi_transaction_id)
  if (metadata.gateway_reference) return String(metadata.gateway_reference)
  return null
}

export const billingEventProviderLabelKey = (metadata: Record<string, unknown> | null | undefined) => {
  if (!metadata) return 'billing.processedByProvider'
  const provider = String(metadata.provider || '').toLowerCase()
  if (provider === 'lemon_squeezy' || metadata.ls_checkout_id || metadata.ls_order_id) {
    return 'billing.processedByLemonSqueezy'
  }
  if (metadata.paddle_transaction_id || provider === 'paddle') return 'billing.processedByPaddle'
  if (metadata.wompi_transaction_id || provider === 'wompi') return 'billing.processedByWompi'
  return 'billing.processedByProvider'
}

/**
 * Hosted checkout may return https://localhost even when Nuxt is http.
 * Local Nuxt has no TLS — force http and drop a mistaken /waro-colombia prefix (#2205 / #943).
 */
export function normalizeLocalCheckoutUrl (url: string): string {
  try {
    const parsed = new URL(url)
    const localHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (!localHost) return url
    parsed.protocol = 'http:'
    if (parsed.pathname === '/waro-colombia') {
      parsed.pathname = '/'
    } else if (parsed.pathname.startsWith('/waro-colombia/')) {
      parsed.pathname = parsed.pathname.slice('/waro-colombia'.length) || '/'
    }
    return parsed.toString()
  } catch {
    return url
  }
}
