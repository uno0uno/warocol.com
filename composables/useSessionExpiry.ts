type FetchErrorLike = {
  status?: number
  statusCode?: number
  response?: { status?: number }
  data?: { detail?: string; message?: string }
  message?: string
}

let lastSessionExpiryHandledAt = 0

const INTERNAL_PUBLIC_PREFIXES = [
  '/auth/',
  '/proveedor/',
  '/blog',
  '/docs',
  '/public/',
  '/403',
]

function getErrorStatus(err: unknown): number | undefined {
  const error = err as FetchErrorLike
  return error?.status ?? error?.statusCode ?? error?.response?.status
}

function getErrorMessage(err: unknown): string {
  const error = err as FetchErrorLike
  return String(error?.data?.detail ?? error?.data?.message ?? error?.message ?? '')
}

export function isSessionAuthError(err: unknown): boolean {
  if (getErrorStatus(err) !== 401) return false

  const message = getErrorMessage(err).toLowerCase()
  if (!message) return true

  return (
    message.includes('session') ||
    message.includes('auth') ||
    message.includes('valid session') ||
    message.includes('no valid session') ||
    message.includes('no session') ||
    message.includes('token expired')
  )
}

function isInternalRecoveryRoute(route: ReturnType<typeof useRoute>): boolean {
  if (route.path === '/' || route.path.startsWith('/auth/login')) return false
  if (INTERNAL_PUBLIC_PREFIXES.some(prefix => route.path.startsWith(prefix))) return false

  const layout = route.meta?.layout
  if (layout === 'public-restaurant' || layout === 'customer-portal' || layout === 'kds') {
    return false
  }

  return route.meta?.publicAccess !== true
}

export function useSessionExpiry() {
  const handleSessionExpiry = async (err: unknown): Promise<boolean> => {
    if (!import.meta.client || !isSessionAuthError(err)) return false

    const route = useRoute()
    if (!isInternalRecoveryRoute(route)) return false

    const now = Date.now()
    const shouldNotify = now - lastSessionExpiryHandledAt > 3000
    lastSessionExpiryHandledAt = now

    const authStore = useAuthStore()
    const accessStore = useAccessStore()
    const tenantsStore = useTenantsStore()

    authStore.expireSession()
    accessStore.clear()
    tenantsStore.clearTenants()

    if (shouldNotify) {
      useToast().warning('Tu sesion expiro. Inicia sesion de nuevo para continuar.', {
        title: 'Sesion expirada',
        duration: 7000,
      })
    }

    const redirect = route.fullPath && route.path !== '/auth/login'
      ? `?redirect=${encodeURIComponent(route.fullPath)}`
      : ''

    await navigateTo(`/auth/login${redirect}`)
    return true
  }

  return {
    handleSessionExpiry,
    isSessionAuthError,
  }
}
