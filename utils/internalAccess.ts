// Legacy fallback for API responses that predate has_internal_access.
const TEAM_ROLES = new Set([
  'owner',
  'superuser',
  'admin',
  'supervisor',
  'cashier',
  'employee',
  'member',
  'promotor',
  'kitchen',
])

const CUSTOMER_ONLY_CODES = new Set([
  'customer_only',
  'customer-only',
  'no_team_access',
  'no-team-access',
  'no_internal_access',
  'no-internal-access',
  'internal_access_denied',
  'internal-access-denied',
  'team_access_required',
  'team-access-required',
])

const CUSTOMER_ONLY_TEXT = [
  'customer only',
  'customer-only',
  'solo cliente',
  'solo para clientes',
  'no team access',
  'no internal access',
  'internal platform access',
  'team access required',
  'requiere acceso interno',
  'requiere pertenecer al equipo',
]

export const INTERNAL_APP_HOME = '/pos'
export const CUSTOMER_PORTAL_LOGIN = '/auth/customer-verify?redirect=/mis-pedidos'

export const MODULE_HOMES: Record<string, string> = {
  pos: '/pos',
  ventas: '/ventas',
  despacho: '/despacho/domicilios',
  analitica: '/analitica',
  crm: '/crm/clientes',
  finanzas: '/finanzas/arqueo',
  facturacion: '/facturacion',
  menu: '/menu/productos',
  operaciones: '/operaciones/comandas',
  abastecimiento: '/abastecimiento/compras-directas',
  equipo: '/equipo/miembros',
  integraciones: '/integraciones',
  mi_negocio: '/negocio',
  mi_plan: '/gestion/billing',
}

export const HOME_PRIORITY = [
  'pos',
  'ventas',
  'despacho',
  'crm',
  'analitica',
  'finanzas',
  'menu',
  'operaciones',
  'abastecimiento',
  'facturacion',
  'equipo',
  'integraciones',
  'mi_negocio',
  'mi_plan',
] as const

type AccessAwareStore = {
  modules?: readonly string[]
  can?: (module: any) => boolean
}

type RouteResolver = {
  resolve: (target: string) => {
    matched?: Array<{ meta?: Record<string, any> }>
    meta?: Record<string, any>
  }
}

const MODULE_PATH_PREFIXES: Array<[string, string]> = [
  ['/gestion/billing', 'mi_plan'],
  ['/pos', 'pos'],
  ['/ventas', 'ventas'],
  ['/despacho', 'despacho'],
  ['/crm', 'crm'],
  ['/analitica', 'analitica'],
  ['/finanzas', 'finanzas'],
  ['/facturacion', 'facturacion'],
  ['/menu', 'menu'],
  ['/operaciones', 'operaciones'],
  ['/abastecimiento', 'abastecimiento'],
  ['/equipo', 'equipo'],
  ['/integraciones', 'integraciones'],
  ['/negocio', 'mi_negocio'],
]

const normalizeRole = (role: unknown) =>
  typeof role === 'string' ? role.trim().toLowerCase() : null

export const getInternalSessionRole = (session: any) =>
  normalizeRole(
    session?.user?.team_role
    ?? session?.user?.internal_role
    ?? session?.user?.role
    ?? session?.currentTenant?.team_role
    ?? session?.currentTenant?.role
    ?? session?.team_role
    ?? session?.role,
  )

export const hasExplicitInternalAccessDenial = (session: any) =>
  session?.internal_access === false
  || session?.can_access_internal === false
  || session?.has_internal_access === false
  || session?.user?.internal_access === false
  || session?.user?.can_access_internal === false
  || session?.user?.has_internal_access === false
  || session?.user?.is_customer_only === true
  || session?.customer_only === true
  || session?.is_customer_only === true

export const hasExplicitInternalAccessAllow = (session: any) =>
  session?.internal_access === true
  || session?.can_access_internal === true
  || session?.has_internal_access === true
  || session?.user?.internal_access === true
  || session?.user?.can_access_internal === true
  || session?.user?.has_internal_access === true

export const isCustomerOnlySession = (session: any) => {
  if (!session?.user) return false
  if (hasExplicitInternalAccessDenial(session)) return true
  return getInternalSessionRole(session) === 'customer'
}

export const canUseInternalSession = (session: any) => {
  if (!session?.user) return false
  if (isCustomerOnlySession(session)) return false
  if (hasExplicitInternalAccessAllow(session)) return true

  const role = getInternalSessionRole(session)
  if (role) return TEAM_ROLES.has(role)

  // Backwards-compatible: older API responses did not expose role/access fields.
  return true
}

const collectErrorValues = (input: any): string[] => {
  const data = input?.data ?? input?.response?._data ?? input
  return [
    input?.statusCode,
    input?.status,
    data?.code,
    data?.error,
    data?.reason,
    data?.message,
    data?.detail,
    input?.message,
  ]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value).trim().toLowerCase())
}

export const isInternalAccessDeniedError = (input: any) => {
  const values = collectErrorValues(input)
  if (values.some((value) => CUSTOMER_ONLY_CODES.has(value))) return true
  if (values.some((value) => CUSTOMER_ONLY_TEXT.some((needle) => value.includes(needle)))) return true

  const status = Number(input?.statusCode ?? input?.status ?? input?.response?.status)
  if (status !== 403) return false

  return values.some((value) =>
    value.includes('customer')
    || value.includes('cliente')
    || value.includes('team')
    || value.includes('equipo')
    || value.includes('internal')
    || value.includes('interno')
  )
}

export const getInternalAccessDeniedMessage = () =>
  'Tu cuenta esta registrada como cliente de este negocio. Para entrar a tus pedidos usa el portal de clientes; para acceder al panel interno pide una invitacion del equipo.'

export const getSafeInternalRedirect = (redirect: unknown) => {
  const target = Array.isArray(redirect) ? redirect[0] : redirect
  if (typeof target !== 'string') return INTERNAL_APP_HOME
  if (!target.startsWith('/') || target.startsWith('//')) return INTERNAL_APP_HOME
  if (target.startsWith('/auth/customer-verify')) return INTERNAL_APP_HOME
  return target
}

export const getFirstAccessibleHome = (modules: readonly string[] | undefined | null) => {
  const mods = new Set(modules ?? [])
  for (const module of HOME_PRIORITY) {
    if (mods.has(module)) return MODULE_HOMES[module]
  }
  return '/'
}

export const getDashboardHome = (
  modules: readonly string[] | undefined | null,
  options?: { isLoaded?: boolean },
) => {
  if (options?.isLoaded === false) return INTERNAL_APP_HOME
  return getFirstAccessibleHome(modules)
}

export const getModuleAccessDenialRedirect = (accessStore: {
  planSlug: string | null
  can: (module: string) => boolean
}) => {
  if (accessStore.planSlug === 'starter' && accessStore.can('mi_plan')) {
    return '/gestion/billing'
  }
  return '/403'
}

const getSafeRedirectTarget = (redirect: unknown) => {
  const target = Array.isArray(redirect) ? redirect[0] : redirect
  if (typeof target !== 'string') return null
  if (!target.startsWith('/') || target.startsWith('//')) return null
  if (target.startsWith('/auth/customer-verify')) return null
  return target
}

const resolvePathModule = (target: string) => {
  const path = target.split(/[?#]/, 1)[0] || '/'
  const match = MODULE_PATH_PREFIXES.find(([prefix]) =>
    path === prefix || path.startsWith(`${prefix}/`)
  )
  return match?.[1] ?? null
}

const resolveRouteModule = (router: RouteResolver, target: string) => {
  const pathModule = resolvePathModule(target)
  if (pathModule) return pathModule

  const resolved = router.resolve(target)
  const matched = resolved.matched ?? []
  for (let i = matched.length - 1; i >= 0; i -= 1) {
    const module = matched[i]?.meta?.module
    if (typeof module === 'string') return module
  }

  const module = resolved.meta?.module
  return typeof module === 'string' ? module : null
}

export const getAccessAwareRedirect = (
  redirect: unknown,
  accessStore: AccessAwareStore,
  router: RouteResolver,
) => {
  const fallback = getFirstAccessibleHome(accessStore.modules)
  const safeTarget = getSafeRedirectTarget(redirect)

  if (!safeTarget) return fallback

  const module = resolveRouteModule(router, safeTarget)
  if (!module) return safeTarget

  if (accessStore.can?.(module) === false) return fallback
  return safeTarget
}
