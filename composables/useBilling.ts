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
  | 'menu_products'
  | 'menu_categories'
  | 'tenant_ingredients'
  | 'tenant_suppliers'
  | 'direct_purchases_per_period'
  | 'stock_adjustments_per_period'
  | 'cash_closes_per_period'
  | 'active_open_cash_shifts'
  | 'expenses_per_period'
  | 'supplier_payments_per_period'
  | 'payment_methods'
  | 'api_tokens'
  | 'tenant_promotions'
  | 'accounting_period_closes_per_period'
  | 'manual_journal_entries_per_period'
  | 'modifier_groups'
  | 'recipe_bases'
  | 'recipe_lines_per_product'
  | 'modifier_options_per_group'

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
  status: 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired'
  billing_cycle: 'monthly' | 'annual'
  current_period_start: string
  current_period_end: string
  checkout_url: string | null
  scan_limit: number
  scans_used: number
  created_at: string
}

export interface AccessStatus {
  level: 'free' | 'starter' | 'full' | 'full_with_warning' | 'read_only' | 'blocked'
  grace_days_remaining: number | null
  subscription_status: string | null
  next_payment_date: string | null
  message: string
}

/** API sentinel from billing_service.CATALOG_UNLIMITED: limits at/above this mean "no cap". */
export const BILLING_UNLIMITED_SENTINEL = 1_000_000

export const STARTER_PLAN_SLUG = 'starter'
export const PRO_PLAN_SLUG = 'pro'

export function isStarterPlanSlug(slug?: string | null): boolean {
  return slug === STARTER_PLAN_SLUG
}

export function isStarterAccessLevel(level?: AccessStatus['level'] | null): boolean {
  return level === 'starter' || level === 'free'
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
  | 'menu_products'
  | 'menu_categories'
  | 'tenant_ingredients'
  | 'tenant_suppliers'
  | 'direct_purchases_per_period'
  | 'stock_adjustments_per_period'
  | 'cash_closes_per_period'
  | 'active_open_cash_shifts'
  | 'expenses_per_period'
  | 'supplier_payments_per_period'
  | 'payment_methods'
  | 'api_tokens'
  | 'tenant_promotions'
  | 'accounting_period_closes_per_period'
  | 'manual_journal_entries_per_period'
  | 'modifier_groups'
  | 'recipe_bases'
  | 'recipe_lines_per_product'
  | 'modifier_options_per_group'

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
  menu_products: {
    key: 'menu_products',
    label: 'Productos del menú',
    description: 'Productos activos en el catálogo',
    unit: 'productos',
    blockedMessage: 'Alcanzaste el límite de productos del menú de tu plan.',
    unlimitedMessage: 'Puedes crear productos sin límite por override.',
  },
  menu_categories: {
    key: 'menu_categories',
    label: 'Categorías del menú',
    description: 'Categorías propias del catálogo',
    unit: 'categorías',
    blockedMessage: 'Alcanzaste el límite de categorías del menú de tu plan.',
    unlimitedMessage: 'Puedes crear categorías sin límite por override.',
  },
  tenant_ingredients: {
    key: 'tenant_ingredients',
    label: 'Ingredientes propios',
    description: 'Ingredientes del almacén del establecimiento',
    unit: 'ingredientes',
    blockedMessage: 'Alcanzaste el límite de ingredientes de tu plan.',
    unlimitedMessage: 'Puedes crear ingredientes sin límite por override.',
  },
  tenant_suppliers: {
    key: 'tenant_suppliers',
    label: 'Proveedores',
    description: 'Proveedores activos del establecimiento',
    unit: 'proveedores',
    blockedMessage: 'Alcanzaste el límite de proveedores de tu plan.',
    unlimitedMessage: 'Puedes crear proveedores sin límite por override.',
  },
  direct_purchases_per_period: {
    key: 'direct_purchases_per_period',
    label: 'Compras directas por periodo',
    description: 'Compras directas registradas en el periodo de facturación',
    unit: 'compras en el periodo',
    blockedMessage: 'Alcanzaste el límite de compras directas de tu plan para este periodo. El cupo se reinicia con tu periodo de facturación.',
    unlimitedMessage: 'Puedes registrar compras directas sin límite por override.',
  },
  stock_adjustments_per_period: {
    key: 'stock_adjustments_per_period',
    label: 'Ajustes de stock por periodo',
    description: 'Ajustes de inventario registrados en el periodo de facturación',
    unit: 'ajustes en el periodo',
    blockedMessage: 'Alcanzaste el límite de ajustes de stock de tu plan para este periodo. El cupo se reinicia con tu periodo de facturación.',
    unlimitedMessage: 'Puedes registrar ajustes de stock sin límite por override.',
  },
  cash_closes_per_period: {
    key: 'cash_closes_per_period',
    label: 'Cierres de caja por periodo',
    description: 'Arqueos / cierres Z registrados en el periodo de facturación',
    unit: 'cierres en el periodo',
    blockedMessage: 'Alcanzaste el límite de cierres de caja de tu plan para este periodo. El cupo se reinicia con tu periodo de facturación.',
    unlimitedMessage: 'Puedes registrar cierres de caja sin límite por override.',
  },
  active_open_cash_shifts: {
    key: 'active_open_cash_shifts',
    label: 'Turnos de caja abiertos',
    description: 'Turnos de caja abiertos al mismo tiempo',
    unit: 'turnos abiertos',
    blockedMessage: 'Alcanzaste el límite de turnos de caja abiertos de tu plan.',
    unlimitedMessage: 'Puedes abrir turnos de caja sin límite por override.',
  },
  expenses_per_period: {
    key: 'expenses_per_period',
    label: 'Gastos por periodo',
    description: 'Gastos e instancias registrados en el periodo de facturación',
    unit: 'gastos en el periodo',
    blockedMessage: 'Alcanzaste el límite de gastos de tu plan para este periodo. El cupo se reinicia con tu periodo de facturación.',
    unlimitedMessage: 'Puedes registrar gastos sin límite por override.',
  },
  supplier_payments_per_period: {
    key: 'supplier_payments_per_period',
    label: 'Pagos a proveedores por periodo',
    description: 'Pagos de compras registrados en el periodo de facturación',
    unit: 'pagos en el periodo',
    blockedMessage: 'Alcanzaste el límite de pagos a proveedores de tu plan para este periodo. El cupo se reinicia con tu periodo de facturación.',
    unlimitedMessage: 'Puedes registrar pagos a proveedores sin límite por override.',
  },
  payment_methods: {
    key: 'payment_methods',
    label: 'Métodos de pago',
    description: 'Métodos de pago activos del establecimiento',
    unit: 'métodos',
    blockedMessage: 'Alcanzaste el límite de métodos de pago de tu plan.',
    unlimitedMessage: 'Puedes crear métodos de pago sin límite por override.',
  },
  api_tokens: {
    key: 'api_tokens',
    label: 'API keys',
    description: 'Claves de API activas para integraciones',
    unit: 'API keys',
    blockedMessage: 'Alcanzaste el límite de API keys de tu plan.',
    unlimitedMessage: 'Puedes crear API keys sin límite por override.',
  },
  tenant_promotions: {
    key: 'tenant_promotions',
    label: 'Promociones',
    description: 'Promociones configuradas en Operaciones',
    unit: 'promociones',
    blockedMessage: 'Alcanzaste el límite de promociones de tu plan.',
    unlimitedMessage: 'Puedes crear promociones sin límite por override.',
  },
  accounting_period_closes_per_period: {
    key: 'accounting_period_closes_per_period',
    label: 'Cierres contables mensuales por periodo',
    description: 'Cierres de mes contable en el periodo de facturación',
    unit: 'cierres mensuales',
    blockedMessage: 'Alcanzaste el límite de cierres contables mensuales de tu plan para este periodo.',
    unlimitedMessage: 'Puedes cerrar periodos contables sin límite por override.',
  },
  manual_journal_entries_per_period: {
    key: 'manual_journal_entries_per_period',
    label: 'Asientos manuales por periodo',
    description: 'Asientos de diario creados manualmente en el periodo',
    unit: 'asientos manuales',
    blockedMessage: 'Alcanzaste el límite de asientos manuales de tu plan para este periodo. El cupo se reinicia con tu periodo de facturación.',
    unlimitedMessage: 'Puedes crear asientos manuales sin límite por override.',
  },
  modifier_groups: {
    key: 'modifier_groups',
    label: 'Grupos de modificadores',
    description: 'Grupos de modificadores del menú',
    unit: 'grupos',
    blockedMessage: 'Alcanzaste el límite de grupos de modificadores de tu plan.',
    unlimitedMessage: 'Puedes crear grupos de modificadores sin límite por override.',
  },
  recipe_bases: {
    key: 'recipe_bases',
    label: 'Recetas base',
    description: 'Recetas base del catálogo',
    unit: 'recetas',
    blockedMessage: 'Alcanzaste el límite de recetas base de tu plan.',
    unlimitedMessage: 'Puedes crear recetas base sin límite por override.',
  },
  recipe_lines_per_product: {
    key: 'recipe_lines_per_product',
    label: 'Líneas de receta por producto',
    description: 'Ingredientes y bases por producto',
    unit: 'líneas',
    blockedMessage: 'Alcanzaste el límite de líneas de receta por producto de tu plan.',
    unlimitedMessage: 'Las líneas de receta no tienen límite por override.',
  },
  modifier_options_per_group: {
    key: 'modifier_options_per_group',
    label: 'Opciones por modificador',
    description: 'Opciones dentro de un grupo de modificadores',
    unit: 'opciones',
    blockedMessage: 'Alcanzaste el límite de opciones por modificador de tu plan.',
    unlimitedMessage: 'Las opciones por modificador no tienen límite por override.',
  },
}

export const STARTER_DISPLAY_QUOTA_KEYS: BillingQuotaKey[] = [
  'menu_products',
  'menu_categories',
  'tenant_ingredients',
  'modifier_groups',
  'recipe_bases',
  'completed_online_orders_per_month',
  'admin_users',
  'api_tokens',
  'tenant_promotions',
]

export const OPERATIONAL_QUOTA_KEYS: OperationalQuotaKey[] = [
  'admin_users',
  'active_kitchens',
  'active_tables_including_bar',
  'active_qr_tables',
  'completed_online_orders_per_month',
  'menu_products',
  'menu_categories',
  'tenant_ingredients',
  'tenant_suppliers',
  'direct_purchases_per_period',
  'stock_adjustments_per_period',
  'cash_closes_per_period',
  'active_open_cash_shifts',
  'expenses_per_period',
  'supplier_payments_per_period',
  'payment_methods',
  'api_tokens',
  'tenant_promotions',
  'accounting_period_closes_per_period',
  'manual_journal_entries_per_period',
  'modifier_groups',
  'recipe_bases',
  'recipe_lines_per_product',
  'modifier_options_per_group',
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
  const accessStore = useAccessStore()
  const tenantId = computed(() => currentTenant.value?.id ?? 'none')
  const loadOverview = options.overview !== false
  const canViewBilling = () => accessStore.can('mi_plan')
  const billingQueriesEnabled = () =>
    import.meta.client && !!currentTenant.value && canViewBilling()

  // ── Pagination state ──────────────────────────────────────────────────────────
  const eventsPage = ref(0)
  const eventsLimit = ref(20)
  const usageMonths = ref(12)

  // ── Queries ───────────────────────────────────────────────────────────────────

  const { data: plans, status: plansStatus, asyncStatus: plansAsyncStatus } = useQuery({
    key: ['billing', 'plans'],
    enabled: () => import.meta.client && loadOverview && canViewBilling(),
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
    enabled: () => billingQueriesEnabled() && loadOverview,
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
    enabled: () => billingQueriesEnabled(),
  })

  const { data: usageHistoryData, status: usageStatus, asyncStatus: usageAsyncStatus } = useQuery({
    key: () => ['billing', 'usage-history', tenantId.value, usageMonths.value],
    query: () => $fetch<ScanMonthlyEntry[]>(`/api/billing/usage-history?months=${usageMonths.value}`),
    enabled: () => billingQueriesEnabled() && loadOverview,
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
    enabled: () => billingQueriesEnabled() && loadOverview,
  })

  const { data: eventsData, status: eventsStatus, asyncStatus: eventsAsyncStatus } = useQuery({
    key: () => ['billing', 'events', tenantId.value, eventsPage.value, eventsLimit.value],
    query: () => $fetch<BillingEventsResponse>(
      `/api/billing/events?limit=${eventsLimit.value}&offset=${eventsPage.value * eventsLimit.value}`
    ),
    enabled: () => billingQueriesEnabled() && loadOverview,
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
  const fetchSubscription = () => {
    if (!canViewBilling()) return Promise.resolve()
    return cache.invalidateQueries({ key: ['billing', 'subscription', tenantId.value] })
  }

  const fetchPlans = () => {
    if (!canViewBilling()) return Promise.resolve()
    return cache.invalidateQueries({ key: ['billing', 'plans'] })
  }

  const fetchAccessStatus = () => {
    if (!canViewBilling()) return Promise.resolve()
    return cache.invalidateQueries({ key: ['billing', 'access-status', tenantId.value] })
  }

  const fetchUsageHistory = (months = 12) => {
    if (!canViewBilling()) return Promise.resolve()
    usageMonths.value = months
    return cache.invalidateQueries({ key: ['billing', 'usage-history'] })
  }

  const fetchMyEvents = (limit = 20, offset = 0) => {
    if (!canViewBilling()) return Promise.resolve()
    eventsLimit.value = limit
    eventsPage.value = Math.floor(offset / limit)
    return cache.invalidateQueries({ key: ['billing', 'events'] })
  }

  /** Invalidates all billing queries — replaces the old Promise.all pattern */
  const fetchBillingOverview = () => {
    if (!canViewBilling()) return Promise.resolve()
    return cache.invalidateQueries({ key: ['billing'] })
  }

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
