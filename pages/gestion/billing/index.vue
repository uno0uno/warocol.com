<script setup lang="ts">
import {
  useBilling,
  type BillingPlan,
  type BillingQuotaKey,
  BILLING_UNLIMITED_SENTINEL,
  STARTER_PLAN_SLUG,
  PRO_PLAN_SLUG,
  ELECTRONIC_INVOICE_PLAN_SLUG,
  isStarterPlanSlug,
  isPaidCheckoutPlanSlug,
} from '~/composables/useBilling'
import { useFormatters } from '~/composables/useFormatters'
import {
  canStartBillingSubscription,
  shouldShowBillingRecoveryAlert,
  formatBillingOfferAmount,
  billingEventProviderRef,
  billingEventProviderLabelKey,
  normalizeLocalPaddleCheckoutUrl,
} from '~/utils/billingPresentation'

interface Column {
  key: string
  title: string
  sortable?: boolean
  format?: string
  align?: 'left' | 'center' | 'right'
}

definePageMeta({})
const { t, locale } = useI18n({ useScope: 'global' })
useHead({ title: () => t('billing.paymentHistoryTitle') })

const {
  plans, priceOffer, subscription, accessStatus, events, eventsTotal, loading, isRefreshing, error,
  fetchPlans, fetchMyEvents, fetchBillingOverview, subscribeOrThrow, abandonPendingCheckout,
} = useBilling()

const { currentTenant } = useTenantReactive()
const accessStore = useAccessStore()
const {
  statusData: termsStatus,
  refreshTermsStatus,
} = useLegalTerms()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

const isInitialLoading = computed(() =>
  !!currentTenant.value &&
  (
    plans.value === undefined ||
    subscription.value === undefined ||
    accessStatus.value === undefined
  )
)

interface QuotaDisplayConfig {
  key: BillingQuotaKey
  label: string
  unit: string
  zeroLabel?: string
}

const quotaDisplayConfig: QuotaDisplayConfig[] = [
  { key: 'admin_users', label: '', unit: '' },
  { key: 'active_sessions_per_admin_user', label: '', unit: '' },
  { key: 'active_kitchens', label: '', unit: '' },
  { key: 'active_tables_including_bar', label: '', unit: '' },
  { key: 'active_qr_tables', label: '', unit: '' },
  { key: 'completed_online_orders_per_month', label: '', unit: '' },
  { key: 'electronic_invoices_per_period', label: '', unit: '', zeroLabel: '' },
  { key: 'menu_products', label: '', unit: '' },
  { key: 'menu_categories', label: '', unit: '' },
  { key: 'tenant_ingredients', label: '', unit: '' },
  { key: 'modifier_groups', label: '', unit: '' },
  { key: 'recipe_bases', label: '', unit: '' },
  { key: 'recipe_lines_per_product', label: '', unit: '' },
  { key: 'modifier_options_per_group', label: '', unit: '' },
]

const quotaLabels = computed<Record<string, { label: string; unit: string; zeroLabel?: string }>>(() => ({
  admin_users: { label: t('billing.quotaAdminUsers'), unit: t('billing.unitAdminUsers') },
  active_sessions_per_admin_user: { label: t('billing.quotaSessions'), unit: t('billing.unitSessions') },
  active_kitchens: { label: t('billing.quotaKitchens'), unit: t('billing.unitKitchens') },
  active_tables_including_bar: { label: t('billing.quotaTables'), unit: t('billing.unitTables') },
  active_qr_tables: { label: t('billing.quotaQrTables'), unit: t('billing.unitQrTables') },
  completed_online_orders_per_month: { label: t('billing.quotaOnlineOrders'), unit: t('billing.unitOnlineOrders') },
  electronic_invoices_per_period: { label: t('billing.quotaInvoices'), unit: t('billing.unitInvoices'), zeroLabel: t('billing.notIncluded') },
  menu_products: { label: t('billing.quota.menu_products'), unit: t('billing.unitProducts') },
  menu_categories: { label: t('billing.quota.menu_categories'), unit: t('billing.unitCategories') },
  tenant_ingredients: { label: t('billing.quota.tenant_ingredients'), unit: t('billing.unitIngredients') },
  modifier_groups: { label: t('billing.quota.modifier_groups'), unit: t('billing.unitModifierGroups') },
  recipe_bases: { label: t('billing.quota.recipe_bases'), unit: t('billing.unitRecipeBases') },
  recipe_lines_per_product: { label: t('billing.quota.recipe_lines_per_product'), unit: t('billing.unitRecipeLines') },
  modifier_options_per_group: { label: t('billing.quota.modifier_options_per_group'), unit: t('billing.unitModifierOptions') },
}))

// ── Pagination ───────────────────────────────────────────────────
const PAGE_SIZE = 20
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(eventsTotal.value / PAGE_SIZE)))

const goToPage = async (page: number) => {
  const p = Math.max(1, Math.min(page, totalPages.value))
  currentPage.value = p
  await fetchMyEvents(PAGE_SIZE, (p - 1) * PAGE_SIZE)
}

// ── Subscribe modal (2-step wizard) ─────────────────────────────
const showModal       = ref(false)
const wizardStep      = ref<1 | 2>(1)
const subscribing     = ref(false)
const checkoutRedirecting = ref(false)
const subscribeError  = ref<string | null>(null)
const billingActionError = ref<string | null>(null)
const plansLoading    = ref(false)
const payerEmail      = ref('')
const selectedPlan    = ref<BillingPlan | null>(null)

const featureEntries = (plan: BillingPlan) =>
  Object.entries(plan.features ?? {})
    .filter(([key, value]) =>
      key !== 'quotas' &&
      key !== 'electronic_invoice_limit' &&
      value !== null &&
      value !== undefined &&
      typeof value === 'string'
    )
    .map(([key, value]) => ({ key, value }))

const PLAN_CARD_HIGHLIGHT_KEYS: BillingQuotaKey[] = [
  'menu_products',
  'menu_categories',
  'completed_online_orders_per_month',
  'admin_users',
  'electronic_invoices_per_period',
]

const expandedPlanDetails = ref<Record<string, boolean>>({})
const step2ShowPlanDetails = ref(false)

const quotaRowsForPlan = (plan: BillingPlan) =>
  quotaDisplayConfig
    .map((config) => {
      const rawLimit = plan.quotas?.[config.key]
      if (rawLimit === null || rawLimit === undefined) return null
      const limit = Number(rawLimit)
      if (!Number.isFinite(limit)) return null
      return {
        ...config,
        ...(quotaLabels.value[config.key] ?? {}),
        limit,
        value: limit <= 0
          ? config.zeroLabel ?? 'No incluido'
          : `${limit.toLocaleString(toNumberLocaleTag(locale.value))} ${quotaLabels.value[config.key]?.unit ?? config.unit}`,
      }
    })
    .filter((row): row is QuotaDisplayConfig & { limit: number; value: string } => row !== null)

const highlightQuotaRows = (plan: BillingPlan, opts?: { includeScanLimit?: boolean }) => {
  const rows = quotaRowsForPlan(plan)
  const preferred = PLAN_CARD_HIGHLIGHT_KEYS
    .map((key) => rows.find((row) => row.key === key))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
  const budget = opts?.includeScanLimit ? 4 : 5
  if (preferred.length > 0) return preferred.slice(0, budget)
  return rows.slice(0, budget)
}

/** Step 2 expand: skip unlimited sentinels and "not included" zeros — avoid 1.000.000 noise. */
const checkoutDetailQuotaRows = (plan: BillingPlan) =>
  quotaRowsForPlan(plan).filter(
    (row) => row.limit > 0 && row.limit < BILLING_UNLIMITED_SENTINEL,
  )

const isRecommendedPlan = (plan: BillingPlan) => plan.slug === PRO_PLAN_SLUG

const isElectronicInvoicePlan = (plan: BillingPlan) =>
  plan.slug === ELECTRONIC_INVOICE_PLAN_SLUG

const togglePlanDetails = (planId: string) => {
  expandedPlanDetails.value = {
    ...expandedPlanDetails.value,
    [planId]: !expandedPlanDetails.value[planId],
  }
}

interface BillingTermsIntent {
  tenant_id: string
  plan_id: string
  payer_email: string
  created_at: number
}

const BILLING_RETURN_PATH = '/gestion/billing'
const BILLING_TERMS_PATH = '/terminos-y-condiciones'
const BILLING_INTENT_TTL_MS = 30 * 60 * 1000

const activePlans = computed(() => (plans.value ?? []).filter(p => p.is_active))
const isStarterTenant = computed(() =>
  accessStatus.value?.level === 'starter' || accessStore.planSlug === STARTER_PLAN_SLUG,
)
const starterPlan = computed(() => (plans.value ?? []).find(p => p.slug === STARTER_PLAN_SLUG) ?? null)
const proPlan = computed(() => (plans.value ?? []).find(p => p.slug === PRO_PLAN_SLUG) ?? null)
const displayPlanName = computed(() => {
  if (subscription.value?.plan_name) return subscription.value.plan_name
  if (isStarterTenant.value) return starterPlan.value?.name ?? t('billing.starterPlanName')
  return t('billing.noPlan')
})
// Quota-first compare matrix (#1804): same rows for both plans.
// Display rule: key absent OR limit >= BILLING_UNLIMITED_SENTINEL → no cap for that plan.
const COMPARE_QUOTA_KEYS: BillingQuotaKey[] = [
  'menu_products',
  'menu_categories',
  'recipe_bases',
  'modifier_groups',
  'tenant_ingredients',
  'completed_online_orders_per_month',
  'admin_users',
  'active_tables_including_bar',
  'active_kitchens',
  'active_qr_tables',
]

const planQuotaCell = (plan: BillingPlan, key: BillingQuotaKey) => {
  const raw = plan.quotas?.[key]
  const limit = raw === null || raw === undefined ? Number.POSITIVE_INFINITY : Number(raw)
  // Absent key or the API CATALOG_UNLIMITED sentinel both mean "no cap".
  if (!Number.isFinite(limit) || limit >= BILLING_UNLIMITED_SENTINEL) {
    return { text: t('billing.noLimit'), muted: false, limit: Number.POSITIVE_INFINITY }
  }
  if (limit <= 0) {
    return { text: quotaLabels.value[key]?.zeroLabel ?? t('billing.notIncluded'), muted: true, limit }
  }
  const unit = quotaLabels.value[key]?.unit ?? ''
  return { text: `${limit.toLocaleString(toNumberLocaleTag(locale.value))} ${unit}`.trim(), muted: false, limit }
}

const compareQuotaRows = computed(() => {
  const starter = starterPlan.value
  const pro = proPlan.value
  if (!starter || !pro) return []
  return COMPARE_QUOTA_KEYS
    .map((key) => ({
      key,
      label: quotaLabels.value[key]?.label ?? key,
      starter: planQuotaCell(starter, key),
      pro: planQuotaCell(pro, key),
    }))
    // Rows excluded in both plans add no comparison value.
    .filter((row) => !(row.starter.limit <= 0 && row.pro.limit <= 0))
})

// Grid rows (ventas-style UiResponsiveDataView): quota rows + plan-level scans row.
const compareColumns = computed<Column[]>(() => [
  { key: 'resource', title: t('billing.compareResource'), align: 'left' },
  { key: 'starter', title: starterPlan.value?.name ?? t('billing.starterPlanName'), align: 'center' },
  { key: 'pro', title: proPlan.value?.name ?? 'Pro', align: 'center' },
])

const compareTableRows = computed(() => {
  const starter = starterPlan.value
  const pro = proPlan.value
  if (!starter || !pro) return []
  const rows = compareQuotaRows.value.map((row) => ({
    id: row.key,
    resource: row.label,
    starterText: row.starter.text,
    starterMuted: row.starter.muted,
    proText: row.pro.text,
    proMuted: row.pro.muted,
  }))
  rows.push({
    id: 'scans',
    resource: t('billing.scansPerMonth'),
    starterText: starter.scan_limit.toLocaleString(toNumberLocaleTag(locale.value)),
    starterMuted: false,
    proText: pro.scan_limit.toLocaleString(toNumberLocaleTag(locale.value)),
    proMuted: false,
  })
  return rows
})
const currentTenantId = computed(() => currentTenant.value?.id ?? '')
const billingIntentKey = computed(() =>
  currentTenantId.value ? `waro:billing-terms-intent:${currentTenantId.value}` : ''
)

const getApiDetail = (err: unknown) => (err as any)?.data?.detail

const apiErrorMessage = (err: unknown, fallback: string) => {
  const detail = getApiDetail(err)
  if (typeof detail === 'string') return detail
  if (detail?.tenant_message) return String(detail.tenant_message)
  if (detail?.message) return String(detail.message)
  return (err as any)?.message || fallback
}

const isTermsAcceptanceRequiredError = (err: unknown) =>
  getApiDetail(err)?.code === 'terms_acceptance_required'

const setBillingFlowError = (message: string) => {
  if (showModal.value) subscribeError.value = message
  else billingActionError.value = message
}

const persistBillingIntent = () => {
  if (!import.meta.client || !billingIntentKey.value || !selectedPlan.value) return
  const intent: BillingTermsIntent = {
    tenant_id: currentTenantId.value,
    plan_id: selectedPlan.value.id,
    payer_email: payerEmail.value,
    created_at: Date.now(),
  }
  sessionStorage.setItem(billingIntentKey.value, JSON.stringify(intent))
}

const clearBillingIntent = () => {
  if (!import.meta.client || !billingIntentKey.value) return
  sessionStorage.removeItem(billingIntentKey.value)
}

const readBillingIntent = (): BillingTermsIntent | null => {
  if (!import.meta.client || !billingIntentKey.value) return null
  try {
    const raw = sessionStorage.getItem(billingIntentKey.value)
    if (!raw) return null
    const intent = JSON.parse(raw) as BillingTermsIntent
    const expired = Date.now() - intent.created_at > BILLING_INTENT_TTL_MS
    if (expired || intent.tenant_id !== currentTenantId.value) {
      clearBillingIntent()
      return null
    }
    return intent
  } catch {
    clearBillingIntent()
    return null
  }
}

const redirectToTermsAcceptance = async () => {
  persistBillingIntent()
  showModal.value = false
  await navigateTo({
    path: BILLING_TERMS_PATH,
    query: { return: BILLING_RETURN_PATH },
  })
}

const ensureTermsAcceptedForCheckout = async () => {
  if (!currentTenantId.value) {
    setBillingFlowError(t('billing.selectTenantBeforePurchase'))
    return false
  }

  try {
    const status = await refreshTermsStatus()

    if (status?.accepted === true) return true
    await redirectToTermsAcceptance()
    return false
  } catch (err) {
    setBillingFlowError(apiErrorMessage(
      err,
      t('billing.termsValidationError')
    ))
    return false
  }
}

const restoreBillingIntent = async () => {
  const intent = readBillingIntent()
  if (!intent) return
  if ((plans.value ?? []).length === 0) await fetchPlans()

  const plan = (plans.value ?? []).find(p => p.id === intent.plan_id)
  clearBillingIntent()

  if (!plan) {
    subscribeError.value = t('billing.planUnavailable')
    showModal.value = true
    wizardStep.value = 1
    return
  }

  selectedPlan.value = plan
  payerEmail.value = intent.payer_email
  subscribeError.value = null
  wizardStep.value = 2
  showModal.value = true
}

const openModal = async () => {
  subscribeError.value = null
  billingActionError.value = null
  payerEmail.value = ''
  selectedPlan.value = null
  wizardStep.value = 1
  showModal.value = true
  clearBillingIntent()
  if ((plans.value ?? []).length === 0) {
    plansLoading.value = true
    await fetchPlans()
    plansLoading.value = false
  }
}

const selectPlan = (plan: BillingPlan) => {
  if (!isPaidCheckoutPlanSlug(plan.slug)) {
    showModal.value = false
    return
  }
  selectedPlan.value = plan
  subscribeError.value = null
  step2ShowPlanDetails.value = false
  wizardStep.value = 2
}

const handleSubscribe = async () => {
  if (!payerEmail.value || !payerEmail.value.includes('@')) {
    subscribeError.value = t('billing.validEmailRequired')
    return
  }
  if (!selectedPlan.value) return
  subscribing.value = true
  subscribeError.value = null

  const termsAccepted = await ensureTermsAcceptedForCheckout()
  if (!termsAccepted) {
    subscribing.value = false
    return
  }

  try {
    const result = await subscribeOrThrow(selectedPlan.value.id, 'monthly', payerEmail.value)
    if (!result?.checkout_url) {
      subscribeError.value = t('billing.paymentStartError')
      return
    }
    clearBillingIntent()
    await navigateTo(normalizeLocalPaddleCheckoutUrl(result.checkout_url), { external: true })
  } catch (err) {
    if (isTermsAcceptanceRequiredError(err)) {
      await redirectToTermsAcceptance()
      return
    }
    subscribeError.value = apiErrorMessage(err, t('billing.paymentStartError'))
  } finally {
    subscribing.value = false
  }
}

const handleExistingCheckout = async (checkoutUrl?: string | null) => {
  if (!checkoutUrl) return
  checkoutRedirecting.value = true
  billingActionError.value = null

  const termsAccepted = await ensureTermsAcceptedForCheckout()
  if (!termsAccepted) {
    checkoutRedirecting.value = false
    return
  }

  await navigateTo(normalizeLocalPaddleCheckoutUrl(checkoutUrl), { external: true })
  checkoutRedirecting.value = false
}

const abandoningCheckout = ref(false)
const abandonConfirmOpen = ref(false)

const openAbandonConfirm = () => {
  if (abandoningCheckout.value) return
  billingActionError.value = null
  abandonConfirmOpen.value = true
}

const handleAbandonPendingCheckout = async () => {
  if (!import.meta.client || abandoningCheckout.value) return
  abandoningCheckout.value = true
  billingActionError.value = null
  try {
    const abandoned = await abandonPendingCheckout()
    if (!abandoned) {
      abandonConfirmOpen.value = false
      billingActionError.value = t('billing.abandonCheckoutError')
      return
    }
    abandonConfirmOpen.value = false
    await Promise.all([
      fetchBillingOverview(),
      accessStore.load(),
    ])
  } catch {
    abandonConfirmOpen.value = false
    billingActionError.value = t('billing.abandonCheckoutError')
  } finally {
    abandoningCheckout.value = false
  }
}

// ── Should show subscribe/reactivate button ──────────────────────
const isAccessBlocked = computed(() => accessStatus.value?.level === 'blocked')
const hasExistingCheckout = computed(() => !!subscription.value?.checkout_url)
const billingPresentationState = computed(() => ({
  subscriptionStatus: subscription.value?.status ?? null,
  checkoutUrl: subscription.value?.checkout_url ?? null,
  accessLevel: accessStatus.value?.level ?? null,
}))
const showBillingRecoveryAlert = computed(() =>
  shouldShowBillingRecoveryAlert(billingPresentationState.value)
)
const requiresTermsAcceptance = computed(() =>
  termsStatus.value?.pending === true || termsStatus.value?.accepted === false
)
const canSubscribe = computed(() => {
  return canStartBillingSubscription(billingPresentationState.value)
})
const primaryBillingActionLabel = computed(() => {
  if (!subscription.value || subscription.value.status === 'pending') {
    return t('billing.subscribe')
  }
  if (isAccessBlocked.value) return t('billing.reactivate')
  return t('billing.reactivate')
})
const recoveryActionLabel = computed(() => {
  if (requiresTermsAcceptance.value) return t('billing.acceptTerms')
  if (hasExistingCheckout.value) return t('billing.payNow')
  return subscription.value ? t('billing.reactivate') : t('billing.subscribe')
})
const handleRecoveryAction = async () => {
  billingActionError.value = null
  if (requiresTermsAcceptance.value) {
    await redirectToTermsAcceptance()
    return
  }
  if (subscription.value?.checkout_url) {
    await handleExistingCheckout(subscription.value.checkout_url)
    return
  }
  await openModal()
}

// ── Table columns ────────────────────────────────────────────────

const columns = computed<Column[]>(() => [
  { key: 'created_at', title: t('billing.date'), sortable: false },
  { key: 'event_type', title: t('billing.type'), sortable: false },
  { key: 'amount', title: t('billing.amount'), sortable: false },
  { key: 'metadata', title: t('billing.reference'), sortable: false },
])

// ── Slide-over ────────────────────────────────────────────────────
const selectedEvent = ref<any>(null)
const showEventDetail = ref(false)
const copiedField = ref<string | null>(null)

const openEventDetail = (item: any) => {
  selectedEvent.value = item
  showEventDetail.value = true
}

const copyToClipboard = async (text: string, field: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => { copiedField.value = null }, 1500)
  } catch {}
}

const slideHeaderStyle = computed(() => {
  if (!selectedEvent.value) return { icon: 'clock' }
  const iconMap: Record<string, string> = {
    payment_approved:       'check',
    subscription_renewed:   'check',
    subscription_created:   'plus',
    payment_rejected:       'x',
    payment_failed:         'x',
    subscription_cancelled: 'x',
  }
  return { icon: iconMap[selectedEvent.value.event_type] ?? 'clock' }
})

const eventReference = (item: any): string => {
  if (!item) return '—'
  const meta = item.metadata || {}
  const providerRef = billingEventProviderRef(meta)
  if (providerRef) return providerRef
  const url = meta.checkout_url as string | undefined
  if (url) {
    const match = url.match(/\/l\/([^/?#]+)/)
    if (match) return match[1]
  }
  // Gift events
  if (meta.label) return String(meta.label)
  if (meta.months) return t('billing.months', { count: meta.months })
  if (meta.days) return t('billing.days', { count: meta.days })
  return '—'
}

const eventAmount = (item: any): string | null => {
  const val = item?.amount ?? item?.metadata?.amount
  if (val == null || val === '') return null
  const currency = String(item?.currency || item?.metadata?.currency || 'USD').toUpperCase()
  return formatBillingOfferAmount(Number(val), currency, toNumberLocaleTag(locale.value))
}


// ── Helpers ──────────────────────────────────────────────────────
const loadAll = async () => {
  await fetchBillingOverview()
}

const { formatDate, formatDateTime } = useFormatters()

const formatOffer = (amount: number, currency?: string) =>
  formatBillingOfferAmount(
    amount,
    currency || priceOffer.value?.currency || 'USD',
    toNumberLocaleTag(locale.value),
  )

const offerMonthlyLabel = computed(() => {
  if (!priceOffer.value) return '—'
  return formatOffer(priceOffer.value.monthly_amount, priceOffer.value.currency)
})

const planPriceLabel = (plan: BillingPlan) => {
  if (isStarterPlanSlug(plan.slug)) return t('billing.freePrice')
  return offerMonthlyLabel.value
}

const planPriceSuffix = (plan: BillingPlan) => {
  if (isStarterPlanSlug(plan.slug)) return ''
  return t('billing.perMonth')
}

const cycleLabel = computed(() => {
  if (subscription.value?.billing_cycle === 'monthly') return t('billing.monthly')
  if (subscription.value?.billing_cycle === 'annual')  return t('billing.annual')
  return '—'
})

const isBillingBlocked = computed(() => accessStatus.value?.level === 'blocked')

const statusStyle = (status: string, accessLevel?: string | null) => {
  if (status === 'past_due' && accessLevel === 'blocked') {
    return {
      badge: 'bg-status-critical-bg text-status-critical-text',
      dot: 'bg-status-critical-text',
      label: t('billing.blocked'),
    }
  }

  const map: Record<string, { badge: string; dot: string; label: string }> = {
    active:    { badge: 'bg-status-success-bg text-status-success-text',   dot: 'bg-status-success-text',   label: t('billing.active') },
    pending:   { badge: 'bg-status-info-bg text-status-info-text',         dot: 'bg-status-info-text',       label: t('billing.pending') },
    past_due:  { badge: 'bg-status-warning-bg text-status-warning-text',   dot: 'bg-status-warning-text',   label: t('billing.grace') },
    blocked:   { badge: 'bg-status-critical-bg text-status-critical-text', dot: 'bg-status-critical-text', label: t('billing.blocked') },
    cancelled: { badge: 'bg-status-critical-bg text-status-critical-text', dot: 'bg-status-critical-text', label: t('billing.cancelled') },
    expired:   { badge: 'bg-surface-secondary text-text-secondary',        dot: 'bg-text-secondary',         label: t('billing.expired') },
  }
  return map[status] ?? { badge: 'bg-surface-secondary text-text-secondary', dot: 'bg-text-secondary', label: status }
}

const subscriptionStatusStyle = computed(() =>
  subscription.value
    ? statusStyle(subscription.value.status, accessStatus.value?.level)
    : null
)

const pastDueAlert = computed(() => {
  // Align with shouldShowBillingRecoveryAlert: never treat pending checkout as "expired".
  if (!subscription.value || !showBillingRecoveryAlert.value) return null

  if (isBillingBlocked.value) {
    return {
      bg: 'bg-status-critical-bg/40',
      icon: 'text-status-critical-text',
      title: t('billing.subscriptionExpired'),
      titleClass: 'text-status-critical-text',
      message: accessStatus.value?.message || t('billing.renewForAccess'),
    }
  }

  if (accessStatus.value?.level === 'read_only') {
    return {
      bg: 'bg-status-warning-bg/40',
      icon: 'text-status-warning-text',
      title: t('billing.aiSuspended'),
      titleClass: 'text-status-warning-text',
      message: accessStatus.value?.message || t('billing.renewForFullAccess'),
    }
  }

  return {
    bg: 'bg-status-warning-bg/40',
    icon: 'text-status-warning-text',
    title: t('billing.paymentPending'),
    titleClass: 'text-status-warning-text',
    message: accessStatus.value?.message || t('billing.accessGracePeriod'),
  }
})

const eventStyle = (type: string) => {
  const map: Record<string, { badge: string; label: string }> = {
    subscribe_initiated:    { badge: 'bg-surface-secondary text-text-secondary',        label: t('billing.eventSubscribeInitiated') },
    checkout_abandoned:     { badge: 'bg-surface-secondary text-text-secondary',        label: t('billing.eventCheckoutAbandoned') },
    gift_granted:           { badge: 'bg-status-info-bg text-status-info-text',         label: t('billing.eventGiftGranted') },
    subscription_created:   { badge: 'bg-status-info-bg text-status-info-text',         label: t('billing.eventSubscriptionCreated') },
    subscription_renewed:   { badge: 'bg-status-success-bg text-status-success-text',   label: t('billing.eventRenewal') },
    subscription_cancelled: { badge: 'bg-status-critical-bg text-status-critical-text', label: t('billing.eventCancellation') },
    subscription_expired:   { badge: 'bg-surface-secondary text-text-secondary',        label: t('billing.eventExpiration') },
    payment_approved:       { badge: 'bg-status-success-bg text-status-success-text',   label: t('billing.eventPaymentApproved') },
    payment_rejected:       { badge: 'bg-status-critical-bg text-status-critical-text', label: t('billing.eventPaymentRejected') },
    payment_failed:         { badge: 'bg-status-critical-bg text-status-critical-text', label: t('billing.eventPaymentFailed') },
    payment_pending:        { badge: 'bg-status-warning-bg text-status-warning-text',   label: t('billing.eventPaymentPending') },
    plan_changed:           { badge: 'bg-status-info-bg text-status-info-text',         label: t('billing.eventPlanChanged') },
  }
  return map[type] ?? { badge: 'bg-surface-secondary text-text-secondary', label: type }
}

onMounted(async () => {
  setRefreshHandler(loadAll)
  await restoreBillingIntent()
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => clearRefreshHandler(loadAll))
watch(() => currentTenant.value?.id, async () => {
  clearBillingIntent()
  await loadAll()
})
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="isInitialLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <CommonsTheErrorState v-else-if="error" />

    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- ── Plan card ──────────────────────────────────────────── -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">

        <!-- Header: plan name + status + action -->
        <div class="flex items-center justify-between gap-4 px-6 py-5 bg-surface-secondary border-b border-border">
          <div class="flex items-center gap-3 min-w-0">
            <div class="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center" aria-hidden="true">
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"
                  d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-medium text-text-secondary uppercase tracking-widest leading-none mb-1">{{ t('billing.currentPlan') }}</p>
              <p class="text-2xl font-bold text-text-primary leading-tight truncate">
                {{ displayPlanName }}
              </p>
              <p v-if="isStarterTenant && !subscription" class="text-xs text-text-secondary mt-1">
                {{ t('billing.starterPlanBadge') }}
              </p>
            </div>
          </div>

          <div class="shrink-0 flex items-center gap-2">
            <!-- Status badge -->
            <span
              v-if="subscription && subscriptionStatusStyle"
              :class="['inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full', subscriptionStatusStyle.badge]"
            >
              <span :class="['w-1.5 h-1.5 rounded-full', subscriptionStatusStyle.dot]" aria-hidden="true" />
              {{ subscriptionStatusStyle.label }}
            </span>

            <!-- Subscribe / Reactivate button -->
            <button
              v-if="canSubscribe && !showBillingRecoveryAlert"
              @click="openModal"
              class="min-h-[36px] px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all"
            >
              {{ primaryBillingActionLabel }}
            </button>

            <!-- Pending: complete payment or abandon (#2210) -->
            <div
              v-else-if="!showBillingRecoveryAlert && subscription?.status === 'pending' && subscription.checkout_url"
              class="flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                :disabled="checkoutRedirecting || abandoningCheckout"
                @click="handleExistingCheckout(subscription.checkout_url)"
                class="min-h-[36px] px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all flex items-center disabled:opacity-50"
              >
                {{ checkoutRedirecting ? t('billing.validating') : t('billing.completePayment') }}
              </button>
              <button
                type="button"
                :disabled="checkoutRedirecting || abandoningCheckout"
                @click="openAbandonConfirm"
                class="min-h-[36px] px-4 rounded-lg border border-border text-text-primary text-sm font-semibold hover:bg-surface-secondary active:scale-95 transition-all disabled:opacity-50"
              >
                {{ t('billing.abandonCheckout') }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="billingActionError" class="px-6 py-3 border-b border-border bg-destructive/10">
          <p class="text-sm text-destructive">{{ billingActionError }}</p>
        </div>

        <!-- Metrics grid (only when subscription exists) -->
        <div v-if="subscription" class="grid grid-cols-2 divide-x divide-border border-b border-border">
          <div class="px-6 py-4">
            <p class="text-xs font-medium text-text-secondary uppercase tracking-widest mb-1">{{ t('billing.paymentCycle') }}</p>
            <p class="text-base font-semibold text-text-primary">{{ cycleLabel }}</p>
          </div>
          <div class="px-6 py-4">
            <p class="text-xs font-medium text-text-secondary uppercase tracking-widest mb-1">{{ t('billing.nextRenewal') }}</p>
            <p class="text-base font-semibold text-text-primary">
              {{ subscription.current_period_end ? formatDate(subscription.current_period_end) : '—' }}
            </p>
          </div>
        </div>

        <!-- No subscription placeholder (compare matrix below owns the upgrade sell) -->
        <div v-if="!subscription" class="px-6 py-6 text-center">
          <p class="text-sm text-text-secondary mb-1">
            {{ isStarterTenant ? t('billing.starterActiveMessage') : t('billing.noActiveSubscription') }}
          </p>
          <p v-if="!isStarterTenant" class="text-xs text-text-secondary">
            {{ t('billing.choosePlanToStart') }}
          </p>
          <NuxtLink
            v-if="isStarterTenant"
            to="/gestion/billing/uso"
            class="inline-block mt-1 text-xs font-semibold text-primary hover:underline"
          >
            {{ t('billing.viewMyUsage') }}
          </NuxtLink>
        </div>

        <!-- Alert: past_due -->
        <div v-if="pastDueAlert" :class="['px-6 py-4 border-t border-border', pastDueAlert.bg]">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-start gap-2">
              <svg :class="['w-4 h-4 mt-0.5 shrink-0', pastDueAlert.icon]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p :class="['text-sm font-semibold', pastDueAlert.titleClass]">{{ pastDueAlert.title }}</p>
                <p class="text-xs text-text-secondary mt-0.5">{{ pastDueAlert.message }}</p>
              </div>
            </div>
            <button
              v-if="hasExistingCheckout || canSubscribe || requiresTermsAcceptance"
              type="button"
              :disabled="checkoutRedirecting"
              @click="handleRecoveryAction"
              class="shrink-0 min-h-[44px] px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all flex items-center"
            >
              {{ checkoutRedirecting ? t('billing.validating') : recoveryActionLabel }}
            </button>
          </div>
        </div>

      </div>
      <!-- ── End plan card ─────────────────────────────────────── -->

      <div
        v-if="isStarterTenant && starterPlan && proPlan"
        class="bg-surface border border-border rounded-xl overflow-hidden"
      >
        <div class="px-6 py-5 border-b border-border bg-[hsl(var(--titan-150))]">
          <h2 class="text-base font-semibold text-text-primary">{{ t('billing.comparePlans') }}</h2>
          <p class="text-sm text-text-secondary mt-1">{{ t('billing.starterUpgradeHint') }}</p>
        </div>

        <!-- Quota matrix as ventas-style grid (theme lavender header tokens) -->
        <div class="p-4 sm:p-6">
          <UiResponsiveDataView
            row-size="sm"
            variant="default"
            :columns="compareColumns"
            :data="compareTableRows"
            item-key="id"
          >
            <!-- Column headers: Starter (Tu plan) + Pro (precio) -->
            <template #header-starter>
              <div class="flex flex-col items-center gap-1 py-1">
                <span class="text-xs font-semibold uppercase tracking-wider text-data-table-header-text">{{ starterPlan.name }}</span>
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full border border-data-table-border bg-data-table-container-bg text-data-table-cell-muted">
                  {{ t('billing.yourPlan') }}
                </span>
              </div>
            </template>
            <template #header-pro>
              <div class="flex flex-col items-center gap-0.5 py-1">
                <span class="text-xs font-semibold uppercase tracking-widest text-primary">{{ proPlan.name }}</span>
                <span class="text-sm font-bold text-text-primary leading-tight">
                  {{ offerMonthlyLabel }}
                  <span class="text-[11px] font-normal text-text-secondary">{{ t('billing.perMonth') }}</span>
                </span>
              </div>
            </template>

            <!-- Desktop cells -->
            <template #cell-resource="{ row }">
              <span class="text-sm text-text-secondary">{{ row.resource }}</span>
            </template>
            <template #cell-starter="{ row }">
              <span
                :class="['block text-sm text-center', row.starterMuted ? 'text-text-secondary italic' : 'font-semibold text-text-primary']"
              >
                {{ row.starterText }}
              </span>
            </template>
            <template #cell-pro="{ row }">
              <span
                :class="['block text-sm text-center', row.proMuted ? 'text-text-secondary italic' : 'font-semibold text-primary']"
              >
                {{ row.proText }}
              </span>
            </template>

            <!-- Mobile card -->
            <template #card="{ item, index }">
              <div
                class="flex items-center gap-3 py-3 px-3 border-b border-border"
                :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
              >
                <span class="flex-1 min-w-0 text-sm text-text-secondary">{{ item.resource }}</span>
                <span class="flex flex-col items-end gap-0.5 flex-shrink-0 text-right">
                  <span :class="['text-xs', item.starterMuted ? 'text-text-secondary italic' : 'font-semibold text-text-primary']">
                    {{ starterPlan.name }}: {{ item.starterText }}
                  </span>
                  <span :class="['text-xs', item.proMuted ? 'text-text-secondary italic' : 'font-semibold text-primary']">
                    {{ proPlan.name }}: {{ item.proText }}
                  </span>
                </span>
              </div>
            </template>
          </UiResponsiveDataView>

          <!-- Single primary CTA -->
          <button
            type="button"
            class="mt-5 w-full sm:w-auto sm:ms-auto sm:flex min-h-[44px] px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all items-center justify-center"
            @click="openModal"
          >
            {{ t('billing.upgradeToPro') }}
          </button>
        </div>
      </div>

      <!-- Historial de pagos (neutral gray header; compare matrix keeps theme lavender) -->
      <div v-if="eventsTotal > 0" class="billing-neutral-tables">
        <UiResponsiveDataView
          row-size="sm"
          :columns="columns"
          :data="events"
          :empty-message="t('billing.emptyPayments')"
          :empty-sub-message="t('billing.emptyPaymentsSub')"
          variant="default"
          @row-click="openEventDetail"
        >
          <template #card="{ item, index }">
            <div
              v-if="item"
              class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
              :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
              @click="openEventDetail(item)"
            >
              <div class="flex-1 min-w-0">
                <span :class="['inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full', eventStyle(item.event_type).badge]">
                  {{ eventStyle(item.event_type).label }}
                </span>
                <p class="text-xs text-text-secondary mt-1 truncate">
                  {{ formatDateTime(item.created_at) }} · {{ eventReference(item) }}
                </p>
              </div>
              <div class="flex-shrink-0">
                <span v-if="eventAmount(item)" class="text-sm font-bold text-primary">{{ eventAmount(item) }}</span>
                <span v-else class="text-sm text-text-secondary italic">—</span>
              </div>
            </div>
          </template>
          <template #cell-created_at="{ value }">
            <span class="text-sm text-text-secondary whitespace-nowrap">{{ formatDateTime(value) }}</span>
          </template>
          <template #cell-event_type="{ value }">
            <span :class="['text-xs font-medium px-2.5 py-1 rounded-full inline-block', eventStyle(value).badge]">
              {{ eventStyle(value).label }}
            </span>
          </template>
          <template #cell-amount="{ row }">
            <span v-if="eventAmount(row)" class="text-sm font-semibold text-text-primary">{{ eventAmount(row) }}</span>
            <span v-else class="text-sm text-text-secondary italic">—</span>
          </template>
          <template #cell-metadata="{ value }">
            <span class="text-xs font-mono text-text-secondary">{{ eventReference({ metadata: value }) }}</span>
          </template>
        </UiResponsiveDataView>
      </div>

      <!-- Pagination — solo si hay más de una página -->
      <div v-if="eventsTotal > PAGE_SIZE" class="flex items-center justify-end px-1 py-2">
        <div class="flex items-center gap-1">
          <button :disabled="currentPage <= 1" @click="goToPage(1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('billing.firstPage')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('billing.previousPage')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ currentPage }}</span>
          <button :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('billing.nextPage')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button :disabled="currentPage >= totalPages" @click="goToPage(totalPages)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('billing.lastPage')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

    </div>

  <!-- ── Subscribe modal (2-step wizard) ─────────────────────── -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="wizardStep === 1 ? t('billing.selectPlan') : t('billing.confirmPayment')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-overlay-backdrop/50 backdrop-blur-sm" @click="showModal = false" />

      <!-- Modal -->
      <div :class="['relative bg-surface rounded-2xl shadow-xl border border-border w-full max-h-[90vh] overflow-y-auto transition-all', wizardStep === 1 && activePlans.length > 1 ? 'max-w-4xl' : 'max-w-md']">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-surface z-10">
          <div class="flex items-center gap-3">
            <!-- Back button on step 2 -->
            <button
              v-if="wizardStep === 2"
              @click="wizardStep = 1"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
              :aria-label="t('billing.back')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 class="text-lg font-bold text-text-primary">
                {{ wizardStep === 1 ? t('billing.choosePlan') : t('billing.confirmEmail') }}
              </h2>
              <p class="text-sm text-text-secondary mt-0.5">
                {{ wizardStep === 1 ? t('billing.cancelAnytime') : t('billing.stepTwoOfTwo') }}
              </p>
            </div>
          </div>
          <button
            @click="showModal = false"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
            :aria-label="t('billing.close')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="px-6 py-6 space-y-6">

          <!-- ── STEP 1: Plan selection ── -->
          <template v-if="wizardStep === 1">
            <p class="text-sm text-text-secondary text-center leading-relaxed">
              {{ t('billing.monthlySubscription') }}
            </p>

            <!-- Plans loading -->
            <div v-if="plansLoading" class="flex justify-center py-8">
              <CommonsTheCustomLoader size="medium" />
            </div>

            <!-- Plans grid -->
            <div
              v-else-if="activePlans.length > 0"
              :class="[
                'grid gap-4',
                activePlans.length > 1 ? 'lg:grid-cols-2' : 'grid-cols-1 justify-items-center',
              ]"
            >
              <div
                v-for="plan in activePlans"
                :key="plan.id"
                :class="[
                  'rounded-xl p-5 flex flex-col gap-3 w-full border',
                  isRecommendedPlan(plan)
                    ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                    : isElectronicInvoicePlan(plan)
                      ? 'bg-surface border-dashed border-border'
                      : 'bg-surface-secondary border-border opacity-95',
                ]"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p
                      v-if="isElectronicInvoicePlan(plan)"
                      class="text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-1"
                    >
                      {{ t('billing.colombiaAddOn') }}
                    </p>
                    <h3 class="text-base font-bold text-text-primary">{{ plan.name }}</h3>
                    <p class="text-sm text-text-secondary mt-0.5 line-clamp-2">
                      {{
                        isStarterPlanSlug(plan.slug)
                          ? t('billing.starterPlanBadge')
                          : (plan.description || t('billing.starterUpgradeHint'))
                      }}
                    </p>
                  </div>
                  <span
                    v-if="isRecommendedPlan(plan)"
                    class="shrink-0 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary text-primary-foreground"
                  >
                    {{ t('billing.recommended') }}
                  </span>
                  <span
                    v-else-if="isStarterPlanSlug(plan.slug) && isStarterTenant"
                    class="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border border-border text-text-secondary"
                  >
                    {{ t('billing.currentPlan') }}
                  </span>
                </div>

                <div class="flex items-end gap-1">
                  <span class="text-3xl font-bold text-text-primary">
                    {{ planPriceLabel(plan) }}
                  </span>
                  <span v-if="planPriceSuffix(plan)" class="text-sm text-text-secondary mb-1">
                    {{ planPriceSuffix(plan) }}
                  </span>
                </div>

                <ul class="space-y-1.5 flex-1">
                  <li
                    v-if="!isStarterPlanSlug(plan.slug)"
                    class="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <svg class="w-4 h-4 text-status-success-text shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {{ plan.scan_limit.toLocaleString(toNumberLocaleTag(locale)) }} {{ t('billing.scansPerMonth') }}
                  </li>
                  <li
                    v-for="quota in highlightQuotaRows(plan, { includeScanLimit: !isStarterPlanSlug(plan.slug) })"
                    :key="quota.key"
                    class="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <svg class="w-4 h-4 text-status-success-text shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>
                      {{ quota.label }}:
                      <span class="font-semibold text-text-primary">{{ quota.value }}</span>
                    </span>
                  </li>
                </ul>

                <button
                  type="button"
                  class="text-xs font-medium text-primary self-start hover:underline"
                  @click="togglePlanDetails(plan.id)"
                >
                  {{
                    expandedPlanDetails[plan.id]
                      ? t('billing.hidePlanDetails')
                      : t('billing.seePlanDetails')
                  }}
                </button>

                <ul
                  v-if="expandedPlanDetails[plan.id]"
                  class="space-y-1.5 pt-1 border-t border-border"
                >
                  <li
                    v-for="feature in featureEntries(plan)"
                    :key="feature.key"
                    class="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <svg class="w-4 h-4 text-status-success-text shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {{ feature.value }}
                  </li>
                  <li
                    v-for="quota in quotaRowsForPlan(plan)"
                    :key="`full-${quota.key}`"
                    class="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <svg class="w-4 h-4 text-status-success-text shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>
                      {{ quota.label }}:
                      <span class="font-semibold text-text-primary">{{ quota.value }}</span>
                    </span>
                  </li>
                </ul>

                <button
                  v-if="isPaidCheckoutPlanSlug(plan.slug)"
                  @click="selectPlan(plan)"
                  class="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {{ t('billing.chooseThisPlan') }}
                </button>
                <button
                  v-else
                  type="button"
                  disabled
                  class="w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-border text-sm font-semibold text-text-secondary cursor-default"
                >
                  {{ isStarterTenant ? t('billing.currentPlan') : t('billing.freePrice') }}
                </button>
              </div>
            </div>

            <!-- No plans -->
            <div v-else class="text-center py-8">
              <p class="text-sm text-text-secondary">{{ t('billing.noPlansAvailable') }}</p>
            </div>
          </template>

          <!-- ── STEP 2: Email + confirm ── -->
          <template v-else-if="wizardStep === 2 && selectedPlan">
            <!-- Icon header -->
            <div class="text-center">
              <div class="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p class="text-sm text-text-secondary">{{ t('billing.emailReceiptHint') }}</p>
            </div>

            <!-- Plan summary (compact — quotas behind optional detail, #2203) -->
            <div class="bg-surface-secondary rounded-xl p-4 space-y-3">
              <div class="flex justify-between items-center gap-4">
                <div>
                  <p class="text-sm font-semibold text-text-primary">{{ selectedPlan.name }} · {{ t('billing.monthly') }}</p>
                  <p class="text-xs text-text-secondary mt-0.5">{{ t('billing.billedMonthly') }}</p>
                </div>
                <p class="text-xl font-bold text-text-primary">
                  {{ offerMonthlyLabel }}
                </p>
              </div>
              <button
                v-if="checkoutDetailQuotaRows(selectedPlan).length > 0"
                type="button"
                class="text-xs font-medium text-primary hover:underline"
                @click="step2ShowPlanDetails = !step2ShowPlanDetails"
              >
                {{
                  step2ShowPlanDetails
                    ? t('billing.hidePlanDetails')
                    : t('billing.seePlanDetails')
                }}
              </button>
              <div
                v-if="step2ShowPlanDetails"
                class="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2"
              >
                <div
                  v-for="quota in checkoutDetailQuotaRows(selectedPlan)"
                  :key="quota.key"
                  class="text-xs text-text-secondary"
                >
                  <span>{{ quota.label }}</span>
                  <span class="block font-semibold text-text-primary">{{ quota.value }}</span>
                </div>
              </div>
            </div>

            <!-- Email field -->
            <div class="space-y-1.5">
              <label for="payer-email" class="block text-sm font-medium text-text-primary">
                {{ t('billing.email') }}
              </label>
              <input
                id="payer-email"
                v-model="payerEmail"
                type="email"
                placeholder="tu@correo.com"
                autocomplete="email"
                class="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
                @keyup.enter="handleSubscribe"
              />
            </div>

            <!-- Error -->
            <div v-if="subscribeError" class="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <p class="text-sm text-destructive">{{ subscribeError }}</p>
            </div>

            <!-- CTA -->
            <button
              @click="handleSubscribe"
              :disabled="subscribing"
              class="w-full py-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <UiLoadingDots v-if="subscribing" size="9px" color="currentColor" />
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>{{ subscribing ? t('billing.processing') : t('billing.payWithPaddle') }}</span>
            </button>

            <!-- Security note -->
            <div class="flex items-center justify-center gap-2 text-xs text-text-secondary">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {{ t('billing.securePaddlePayment') }}
            </div>
          </template>

        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── Event detail slide-over ──────────────────────────────── -->
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showEventDetail" class="fixed inset-0 z-40 bg-black/40" @click="showEventDetail = false" aria-hidden="true" />
    </Transition>

    <!-- Panel: bottom sheet on mobile, right slide-over on desktop -->
    <Transition name="billing-panel">
      <div
        v-if="showEventDetail && selectedEvent"
        role="dialog"
        aria-modal="true"
        :aria-label="t('billing.paymentDetail')"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-border" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <!-- Icon + title -->
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <!-- payment_approved / subscription_renewed -->
                <svg v-if="slideHeaderStyle.icon === 'check'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <!-- rejected / cancelled / expired -->
                <svg v-else-if="slideHeaderStyle.icon === 'x'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <!-- subscription_created -->
                <svg v-else-if="slideHeaderStyle.icon === 'plus'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <!-- subscribe_initiated / pending -->
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">{{ eventStyle(selectedEvent.event_type).label }}</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">{{ formatDateTime(selectedEvent.created_at) }}</p>
              </div>
            </div>
            <!-- Close -->
            <button
              @click="showEventDetail = false"
              type="button"
              :aria-label="t('billing.closePanel')"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <!-- Status badge row -->
          <div class="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
            <span class="text-sm font-medium text-text-primary">{{ t('billing.status') }}</span>
            <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full', eventStyle(selectedEvent.event_type).badge]">
              {{ eventStyle(selectedEvent.event_type).label }}
            </span>
          </div>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <!-- Amount block -->
          <div class="bg-surface-secondary/50 border border-primary/10 rounded-xl p-4">
            <p class="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1">{{ t('billing.amount') }}</p>
            <p class="text-3xl font-bold text-text-primary leading-none">
              {{ eventAmount(selectedEvent) ?? '—' }}
            </p>
            <p v-if="selectedEvent.amount || selectedEvent.metadata?.amount" class="text-xs text-text-secondary mt-1.5">{{ t(billingEventProviderLabelKey(selectedEvent.metadata)) }}</p>
            <p v-else-if="selectedEvent.event_type === 'gift_granted'" class="text-xs text-text-secondary mt-1.5">{{ t('billing.noCostCourtesy') }}</p>
          </div>

          <!-- Detail rows -->
          <div class="bg-surface-secondary/50 rounded-xl overflow-hidden divide-y divide-border/60">

            <!-- Gift: período otorgado -->
            <div v-if="selectedEvent.metadata?.label || selectedEvent.metadata?.months || selectedEvent.metadata?.days" class="flex items-center justify-between gap-3 px-4 py-3">
              <div class="min-w-0">
                <p class="text-xs font-medium text-text-secondary mb-0.5">{{ t('billing.grantedPeriod') }}</p>
                <p class="text-sm font-semibold text-text-primary">
                  {{ selectedEvent.metadata.label ?? (selectedEvent.metadata.months ? `${selectedEvent.metadata.months} meses` : `${selectedEvent.metadata.days} días`) }}
                </p>
              </div>
            </div>

            <!-- Gift: nota -->
            <div v-if="selectedEvent.metadata?.note" class="flex items-center gap-3 px-4 py-3">
              <div class="min-w-0">
                <p class="text-xs font-medium text-text-secondary mb-0.5">{{ t('billing.note') }}</p>
                <p class="text-sm text-text-primary">{{ selectedEvent.metadata.note }}</p>
              </div>
            </div>

            <!-- Transaction ID (Paddle preferred, Wompi legacy) -->
            <div v-if="billingEventProviderRef(selectedEvent.metadata)" class="flex items-center justify-between gap-3 px-4 py-3">
              <div class="min-w-0">
                <p class="text-xs font-medium text-text-secondary mb-0.5">{{ t('billing.transactionId') }}</p>
                <p class="text-sm font-mono text-text-primary truncate">{{ billingEventProviderRef(selectedEvent.metadata) }}</p>
              </div>
              <button
                @click="copyToClipboard(String(billingEventProviderRef(selectedEvent.metadata)), 'txn')"
                :aria-label="copiedField === 'txn' ? t('billing.copied') : t('billing.copyId')"
                class="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors"
              >
                <svg v-if="copiedField === 'txn'" class="w-4 h-4 text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <!-- Gateway reference -->
            <div v-if="selectedEvent.metadata?.gateway_reference" class="flex items-center justify-between gap-3 px-4 py-3">
              <div class="min-w-0">
                <p class="text-xs font-medium text-text-secondary mb-0.5">{{ t('billing.paymentReference') }}</p>
                <p class="text-sm font-mono text-text-primary truncate">{{ selectedEvent.metadata.gateway_reference }}</p>
              </div>
              <button
                @click="copyToClipboard(String(selectedEvent.metadata.gateway_reference), 'ref')"
                :aria-label="copiedField === 'ref' ? t('billing.copied') : t('billing.copyReference')"
                class="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors"
              >
                <svg v-if="copiedField === 'ref'" class="w-4 h-4 text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <!-- Checkout URL -->
            <div v-if="selectedEvent.metadata?.checkout_url" class="flex items-center justify-between gap-3 px-4 py-3">
              <div class="min-w-0">
                <p class="text-xs font-medium text-text-secondary mb-0.5">{{ t('billing.paymentLink') }}</p>
                <p class="text-xs font-mono text-text-secondary truncate">{{ selectedEvent.metadata.checkout_url }}</p>
              </div>
              <a
                :href="String(selectedEvent.metadata.checkout_url)"
                target="_blank"
                rel="noopener"
                :aria-label="t('billing.openPaymentLink')"
                class="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

          </div>
        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-t border-border px-6 py-4">
          <button
            @click="showEventDetail = false"
            type="button"
            class="w-full h-11 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {{ t('billing.close') }}
          </button>
        </div>
      </div>
    </Transition>
    </Teleport>

    <UiConfirmActionModal
      v-model="abandonConfirmOpen"
      :title="t('billing.abandonCheckoutTitle')"
      :message="t('billing.abandonCheckoutConfirm')"
      :confirm-label="t('billing.abandonCheckout')"
      :cancel-label="t('billing.close')"
      :loading-label="t('billing.validating')"
      variant="destructive"
      :loading="abandoningCheckout"
      @confirm="handleAbandonPendingCheckout"
    />
  </div>
</template>

<style scoped>
/* Mobile: slide up from bottom */
.billing-panel-enter-active,
.billing-panel-leave-active {
  transition: transform 0.3s ease;
}
.billing-panel-enter-from,
.billing-panel-leave-to {
  transform: translateY(100%);
}

/* Desktop: slide in from right */
@media (min-width: 768px) {
  .billing-panel-enter-from,
  .billing-panel-leave-to {
    transform: translateX(100%);
  }
}

/* Neutral gray table headers for payment history only.
   Compare matrix keeps the theme lavender (--data-table-header-bg → surface-secondary). */
.billing-neutral-tables {
  --data-table-header-bg: var(--titan-150);
}
</style>
