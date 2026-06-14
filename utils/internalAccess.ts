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

export const INTERNAL_APP_HOME = '/ventas'
export const CUSTOMER_PORTAL_LOGIN = '/auth/customer-verify?redirect=/mis-pedidos'

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
