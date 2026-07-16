export interface BillingPresentationState {
  subscriptionStatus?: string | null
  checkoutUrl?: string | null
  accessLevel?: string | null
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
