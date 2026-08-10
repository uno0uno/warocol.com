export interface BillingPresentationState {
  subscriptionStatus?: string | null
  checkoutUrl?: string | null
  accessLevel?: string | null
}

export interface BillingPriceOffer {
  segment: string
  currency: string
  monthly_amount_minor: number
  annual_amount_minor: number
  monthly_amount: number
  annual_amount: number
}

export const canStartBillingSubscription = ({
  subscriptionStatus,
  checkoutUrl,
  accessLevel,
}: BillingPresentationState) =>
  !subscriptionStatus ||
  subscriptionStatus === 'cancelled' ||
  subscriptionStatus === 'expired' ||
  (subscriptionStatus === 'pending' && !checkoutUrl) ||
  (accessLevel === 'blocked' && !checkoutUrl)

export const shouldShowBillingRecoveryAlert = ({
  subscriptionStatus,
  accessLevel,
}: BillingPresentationState) =>
  !!subscriptionStatus &&
  subscriptionStatus !== 'pending' &&
  (subscriptionStatus === 'past_due' || accessLevel === 'blocked')

/** Format SaaS list price from Paddle price_offer (major units). */
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

/** Annual list is 10× monthly → two months “saved” vs paying monthly. */
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
  if (metadata.paddle_transaction_id || metadata.provider === 'paddle') return 'billing.processedByPaddle'
  if (metadata.wompi_transaction_id || metadata.provider === 'wompi') return 'billing.processedByWompi'
  return 'billing.processedByProvider'
}
