/**
 * useBilling — Pinia Colada migration (Phase 3a)
 *
 * Replaces 9 module-level refs + manual fetch actions with:
 *   5 useQuery (plans, subscription, access-status, usage-history, events)
 *   2 useMutation (subscribe, cancelSubscription)
 *
 * Query keys include currentTenantId so data re-keys automatically on tenant switch.
 * Tenant switch invalidation is handled by stores/tenants.ts onSuccess.
 *
 * resetBilling() removed — replaced by cache.invalidateQueries in stores/tenants.ts.
 * subscriptionFetched removed — all callers updated to use cache.invalidateQueries.
 */

export type BillingQuotaKey =
  | 'admin_users'
  | 'active_sessions_per_admin_user'
  | 'active_kitchens'
  | 'active_tables_including_bar'
  | 'active_qr_tables'
  | 'completed_online_orders_per_month'
  | 'electronic_invoices_per_period'

export type BillingPlanQuotas = Partial<Record<BillingQuotaKey, number>>

export interface BillingPlan {
  id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number
  price_annual: number
  scan_limit: number
  features: Record<string, unknown>
  quotas?: BillingPlanQuotas
  is_active: boolean
}

export interface TenantSubscription {
  id: string
  tenant_id: string
  plan_id: string
  plan_name: string
  status: 'trialing' | 'trial_expired' | 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired'
  billing_cycle: 'monthly' | 'annual'
  current_period_start: string
  current_period_end: string
  checkout_url: string | null
  scan_limit: number
  scans_used: number
  created_at: string
  trial_started_at?: string | null
  trial_ends_at?: string | null
  trial_days_remaining?: number | null
}

export interface AccessStatus {
  level: 'free' | 'full' | 'full_with_warning' | 'read_only' | 'blocked'
  grace_days_remaining: number | null
  subscription_status: string | null
  next_payment_date: string | null
  message: string
  trial_started_at?: string | null
  trial_ends_at?: string | null
  trial_days_remaining?: number | null
}

export interface SubscribeResult {
  checkout_url: string
  status: string
}

export interface BillingEvent {
  id: string
  tenant_id: string
  tenant_name: string
  subscription_id: string | null
  event_type: string
  amount: string | null
  currency: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface BillingEventsResponse {
  events: BillingEvent[]
  total: number
  limit: number
  offset: number
}

export interface ScanMonthlyEntry {
  year_month: string  // ISO date: "2026-03-01"
  scans_count: number
}

export interface BillingUsageMetric {
  used: number
  limit: number | null
  remaining: number | null
  period_start: string
  period_end: string
  plan_limit?: number
  override?: {
    id: string
    disabled: boolean
    reason: string | null
  } | null
}

export type BillingQuotaUsage = Partial<Record<BillingQuotaKey, BillingUsageMetric>>

export interface BillingRemainingUsage {
  period_start: string
  period_end: string
  scan_usage: BillingUsageMetric
  electronic_invoice_usage: BillingUsageMetric
  quota_usage?: BillingQuotaUsage
}

export type OperationalQuotaKey =
  | 'admin_users'
  | 'active_kitchens'
  | 'active_tables_including_bar'
  | 'active_qr_tables'
  | 'completed_online_orders_per_month'

export type OperationalQuotaStatus = 'allowed' | 'blocked' | 'unlimited' | 'loading' | 'error' | 'unknown'

export interface BillingQuotaResourceConfig {
  key: BillingQuotaKey
  label: string
  description: string
  unit: string
  blockedMessage: string
  unlimitedMessage: string
  zeroLabel?: string
}

export interface OperationalQuotaResult {
  resource: OperationalQuotaKey
  status: OperationalQuotaStatus
  allowed: boolean
  blocked: boolean
  unlimited: boolean
  loading: boolean
  label: string
  unit: string
  message: string
  metric: BillingUsageMetric | null
}

export const BILLING_QUOTA_RESOURCE_CONFIG: Record<BillingQuotaKey, BillingQuotaResourceConfig> = {
  admin_users: {
    key: 'admin_users',
    label: 'Usuarios administrativos',
    description: 'Miembros internos activos del establecimiento',
    unit: 'usuarios administrativos',
    blockedMessage: 'Alcanzaste el límite de usuarios administrativos de tu plan.',
    unlimitedMessage: 'Puedes invitar usuarios administrativos sin límite por override.',
  },
  active_sessions_per_admin_user: {
    key: 'active_sessions_per_admin_user',
    label: 'Sesiones activas por usuario administrativo',
    description: 'Máximo de sesiones simultáneas por usuario interno',
    unit: 'sesiones',
    blockedMessage: 'Alcanzaste el límite de sesiones activas por usuario administrativo.',
    unlimitedMessage: 'Las sesiones activas no tienen límite por override.',
  },
  active_kitchens: {
    key: 'active_kitchens',
    label: 'Cocinas activas',
    description: 'Puntos de preparación activos',
    unit: 'cocinas',
    blockedMessage: 'Alcanzaste el límite de cocinas activas de tu plan.',
    unlimitedMessage: 'Puedes activar cocinas sin límite por override.',
  },
  active_tables_including_bar: {
    key: 'active_tables_including_bar',
    label: 'Mesas activas, incluida barra',
    description: 'Mesas operativas del establecimiento',
    unit: 'mesas',
    blockedMessage: 'Alcanzaste el límite de mesas activas de tu plan.',
    unlimitedMessage: 'Puedes activar mesas sin límite por override.',
  },
  active_qr_tables: {
    key: 'active_qr_tables',
    label: 'Mesas con QR activo',
    description: 'Mesas activas con venta por QR',
    unit: 'mesas QR',
    blockedMessage: 'Alcanzaste el límite de mesas con QR activo de tu plan.',
    unlimitedMessage: 'Puedes activar QR en mesas sin límite por override.',
  },
  completed_online_orders_per_month: {
    key: 'completed_online_orders_per_month',
    label: 'Pedidos en línea completados/mes',
    description: 'Pedidos públicos completados en el período actual',
    unit: 'pedidos',
    blockedMessage: 'Alcanzaste el límite de pedidos en línea completados de tu plan.',
    unlimitedMessage: 'Puedes recibir pedidos en línea sin límite por override.',
  },
  electronic_invoices_per_period: {
    key: 'electronic_invoices_per_period',
    label: 'Facturación electrónica',
    description: 'Facturas incluidas en el período actual',
    unit: 'facturas',
    blockedMessage: 'No tienes cupo disponible de facturación electrónica.',
    unlimitedMessage: 'La facturación electrónica no tiene límite por override.',
    zeroLabel: 'No incluido',
  },
}

export const OPERATIONAL_QUOTA_KEYS: OperationalQuotaKey[] = [
  'admin_users',
  'active_kitchens',
  'active_tables_including_bar',
  'active_qr_tables',
  'completed_online_orders_per_month',
]

const operationalQuotaFallbackMessage = 'No pudimos verificar esta cuota ahora. El sistema validará la acción al guardar.'

export const resolveOperationalQuota = (
  resource: OperationalQuotaKey,
  metric?: BillingUsageMetric | null,
  state: { loading?: boolean; error?: boolean } = {}
): OperationalQuotaResult => {
  const config = BILLING_QUOTA_RESOURCE_CONFIG[resource]
  const base = {
    resource,
    label: config.label,
    unit: config.unit,
    metric: metric ?? null,
  }

  if (state.loading) {
    return {
      ...base,
      status: 'loading',
      allowed: true,
      blocked: false,
      unlimited: false,
      loading: true,
      message: 'Estamos verificando tu cuota. Si continúas, el sistema validará la acción al guardar.',
    }
  }

  if (state.error) {
    return {
      ...base,
      status: 'error',
      allowed: true,
      blocked: false,
      unlimited: false,
      loading: false,
      message: operationalQuotaFallbackMessage,
    }
  }

  if (!metric) {
    return {
      ...base,
      status: 'unknown',
      allowed: true,
      blocked: false,
      unlimited: false,
      loading: false,
      message: operationalQuotaFallbackMessage,
    }
  }

  if (metric.limit === null) {
    return {
      ...base,
      status: 'unlimited',
      allowed: true,
      blocked: false,
      unlimited: true,
      loading: false,
      message: config.unlimitedMessage,
    }
  }

  const remaining = metric.remaining ?? Math.max(metric.limit - metric.used, 0)
  const isBlocked = metric.limit <= 0 || remaining <= 0

  return {
    ...base,
    status: isBlocked ? 'blocked' : 'allowed',
    allowed: !isBlocked,
    blocked: isBlocked,
    unlimited: false,
    loading: false,
    message: isBlocked
      ? config.blockedMessage
      : `Tienes ${remaining.toLocaleString('es-CO')} ${config.unit} disponibles.`,
  }
}

export const useBilling = (options: { overview?: boolean } = {}) => {
  const cache = useQueryCache()
  const { currentTenant } = useTenantReactive()
  const tenantId = computed(() => currentTenant.value?.id ?? 'none')
  const loadOverview = options.overview !== false

  // ── Pagination state ──────────────────────────────────────────────────────────
  const eventsPage = ref(0)
  const eventsLimit = ref(20)
  const usageMonths = ref(12)

  // ── Queries ───────────────────────────────────────────────────────────────────

  const { data: plans, status: plansStatus, asyncStatus: plansAsyncStatus } = useQuery({
    key: ['billing', 'plans'],
    enabled: () => import.meta.client && loadOverview,
    query: () => $fetch<BillingPlan[]>('/api/billing/plans'),
  })

  const { data: subscription, status: subscriptionStatus, asyncStatus: subscriptionAsyncStatus } = useQuery({
    key: () => ['billing', 'subscription', tenantId.value],
    query: async () => {
      try {
        return await $fetch<TenantSubscription>('/api/billing/subscription')
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) return null
        throw err
      }
    },
    enabled: () => import.meta.client && loadOverview && !!currentTenant.value,
  })

  const { data: accessStatus, status: accessStatus_status, asyncStatus: accessStatusAsyncStatus } = useQuery({
    key: () => ['billing', 'access-status', tenantId.value],
    query: async () => {
      try {
        return await $fetch<AccessStatus>('/api/billing/access-status')
      } catch (err: any) {
        if (err?.status === 403 || err?.statusCode === 403) return null
        throw err
      }
    },
    enabled: () => import.meta.client && !!currentTenant.value,
  })

  const { data: usageHistoryData, status: usageStatus, asyncStatus: usageAsyncStatus } = useQuery({
    key: () => ['billing', 'usage-history', tenantId.value, usageMonths.value],
    query: () => $fetch<ScanMonthlyEntry[]>(`/api/billing/usage-history?months=${usageMonths.value}`),
    enabled: () => import.meta.client && loadOverview && !!currentTenant.value,
  })

  const { data: remainingUsage, status: remainingUsageStatus, asyncStatus: remainingUsageAsyncStatus } = useQuery({
    key: () => ['billing', 'remaining-usage', tenantId.value],
    query: async () => {
      try {
        return await $fetch<BillingRemainingUsage>('/api/billing/remaining-usage')
      } catch (err: any) {
        if (err?.status === 404 || err?.statusCode === 404) return null
        throw err
      }
    },
    enabled: () => import.meta.client && loadOverview && !!currentTenant.value,
  })

  const { data: eventsData, status: eventsStatus, asyncStatus: eventsAsyncStatus } = useQuery({
    key: () => ['billing', 'events', tenantId.value, eventsPage.value, eventsLimit.value],
    query: () => $fetch<BillingEventsResponse>(
      `/api/billing/events?limit=${eventsLimit.value}&offset=${eventsPage.value * eventsLimit.value}`
    ),
    enabled: () => import.meta.client && loadOverview && !!currentTenant.value,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const subscribeMutation = useMutation({
    mutation: (payload: { plan_id: string; billing_cycle: 'annual'; payer_email?: string }) =>
      $fetch<SubscribeResult>('/api/billing/subscribe', { method: 'POST', body: payload }),
    onSettled: () => cache.invalidateQueries({ key: ['billing'] }),
  })

  const cancelMutation = useMutation({
    mutation: () => $fetch('/api/billing/subscription', { method: 'DELETE' }),
    onSettled: () => cache.invalidateQueries({ key: ['billing'] }),
  })

  // ── Derived data ──────────────────────────────────────────────────────────────
  const usageHistory = computed<ScanMonthlyEntry[]>(() => usageHistoryData.value ?? [])
  const events = computed<BillingEvent[]>(() => eventsData.value?.events ?? [])
  const eventsTotal = computed<number>(() => eventsData.value?.total ?? 0)
  const operationalQuotaLoading = computed(() =>
    remainingUsageAsyncStatus.value === 'loading' && remainingUsage.value == null
  )
  const operationalQuotaError = computed(() => remainingUsageStatus.value === 'error')
  const getOperationalQuota = (resource: OperationalQuotaKey) =>
    resolveOperationalQuota(
      resource,
      remainingUsage.value?.quota_usage?.[resource] ?? null,
      {
        loading: operationalQuotaLoading.value,
        error: operationalQuotaError.value,
      }
    )
  const operationalQuotas = computed<Record<OperationalQuotaKey, OperationalQuotaResult>>(() =>
    OPERATIONAL_QUOTA_KEYS.reduce((acc, resource) => {
      acc[resource] = getOperationalQuota(resource)
      return acc
    }, {} as Record<OperationalQuotaKey, OperationalQuotaResult>)
  )
  const canGrowOperationalResource = (resource: OperationalQuotaKey) =>
    getOperationalQuota(resource).allowed

  const loading = computed(() =>
    subscribeMutation.isLoading.value ||
    cancelMutation.isLoading.value
  )

  // True when any query is background-refreshing with existing cache data
  const isRefreshing = computed(() =>
    (plansAsyncStatus.value === 'loading' && plans.value != null) ||
    (subscriptionAsyncStatus.value === 'loading' && subscription.value != null) ||
    (accessStatusAsyncStatus.value === 'loading' && accessStatus.value != null) ||
    (usageAsyncStatus.value === 'loading' && usageHistoryData.value != null) ||
    (remainingUsageAsyncStatus.value === 'loading' && remainingUsage.value != null) ||
    (eventsAsyncStatus.value === 'loading' && eventsData.value != null)
  )

  const error = computed(() =>
    (plansStatus.value === 'error' ? 'Error al cargar planes' : null) ||
    (subscriptionStatus.value === 'error' ? 'Error al cargar suscripción' : null) ||
    (remainingUsageStatus.value === 'error' ? 'Error al cargar uso de facturación' : null) ||
    null
  )

  // ── Public action wrappers ────────────────────────────────────────────────────

  /** Awaitable — used by billing-gate middleware to block navigation */
  const fetchSubscription = () =>
    cache.invalidateQueries({ key: ['billing', 'subscription', tenantId.value] })

  const fetchPlans = () =>
    cache.invalidateQueries({ key: ['billing', 'plans'] })

  const fetchAccessStatus = () =>
    cache.invalidateQueries({ key: ['billing', 'access-status', tenantId.value] })

  const fetchUsageHistory = (months = 12) => {
    usageMonths.value = months
    return cache.invalidateQueries({ key: ['billing', 'usage-history'] })
  }

  const fetchMyEvents = (limit = 20, offset = 0) => {
    eventsLimit.value = limit
    eventsPage.value = Math.floor(offset / limit)
    return cache.invalidateQueries({ key: ['billing', 'events'] })
  }

  /** Invalidates all billing queries — replaces the old Promise.all pattern */
  const fetchBillingOverview = () =>
    cache.invalidateQueries({ key: ['billing'] })

  const subscribe = async (
    plan_id: string,
    billing_cycle: 'annual',
    payer_email?: string
  ): Promise<SubscribeResult | null> => {
    try {
      return await subscribeMutation.mutateAsync({ plan_id, billing_cycle, payer_email })
    } catch {
      return null
    }
  }

  const subscribeOrThrow = (
    plan_id: string,
    billing_cycle: 'annual',
    payer_email?: string
  ): Promise<SubscribeResult> =>
    subscribeMutation.mutateAsync({ plan_id, billing_cycle, payer_email })

  const cancelSubscription = async (): Promise<boolean> => {
    try {
      await cancelMutation.mutateAsync()
      return true
    } catch {
      return false
    }
  }

  return {
    plans,
    subscription,
    accessStatus,
    remainingUsage,
    usageHistory,
    events,
    eventsTotal,
    operationalQuotas,
    loading,
    isRefreshing,
    error,
    getOperationalQuota,
    canGrowOperationalResource,
    fetchPlans,
    fetchSubscription,
    fetchAccessStatus,
    fetchMyEvents,
    fetchUsageHistory,
    fetchBillingOverview,
    subscribe,
    subscribeOrThrow,
    cancelSubscription,
  }
}
