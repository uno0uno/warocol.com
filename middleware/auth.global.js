import {
  CUSTOMER_PORTAL_LOGIN,
  canUseInternalSession,
  getAccessAwareRedirect,
  isInternalAccessDeniedError,
} from '~/utils/internalAccess'
import { isSessionAuthError } from '~/composables/useSessionExpiry'
import { ONBOARDING_PATH, isPendingOnboardingSession } from '~/utils/onboardingFlow'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server-side rendering
  if (process.server) return

  // Define public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/verify', '/', '/bogota'] // Add other public routes as needed

  // Check if route uses a layout that doesn't require operator auth
  const isPublicRestaurant = to.meta?.layout === 'public-restaurant'
  const isPublicAccess = to.meta?.publicAccess === true
  const isCustomerPortal = to.meta?.layout === 'customer-portal'
  const isKds = to.meta?.layout === 'kds'
  const isOnboardingAccess = to.meta?.onboardingAccess === true

  const authStore = useAuthStore()
  const accessStore = useAccessStore()
  const tenantsStore = useTenantsStore()

  const clearInternalState = () => {
    authStore.expireSession()
    accessStore.clear()
    tenantsStore.clearTenants()
  }

  // If user already has a valid internal session and tries login, redirect home.
  if (authStore.isSessionValid && to.path === '/auth/login') {
    try {
      const sessionResponse = await $fetch('/api/auth/session', {
        credentials: 'include',
      })
      if (isPendingOnboardingSession(sessionResponse)) {
        authStore.hydrateSession(sessionResponse)
        return navigateTo(ONBOARDING_PATH)
      }
      if (canUseInternalSession(sessionResponse)) {
        await accessStore.load()
        return navigateTo(getAccessAwareRedirect(to.query.redirect, accessStore, useRouter()))
      }
      if (sessionResponse?.user) {
        clearInternalState()
        return navigateTo(CUSTOMER_PORTAL_LOGIN)
      }
    } catch (err) {
      if (isInternalAccessDeniedError(err)) {
        clearInternalState()
        return navigateTo(CUSTOMER_PORTAL_LOGIN)
      }
      clearInternalState()
    }
  }

  // If the user is trying to access a public route, do nothing.
  // Also, allow access to any route starting with /auth/, /proveedor/ (supplier portal), or /blog/
  // Or if the route uses the public-restaurant layout
  if (publicRoutes.includes(to.path) ||
      to.path.startsWith('/auth/') ||
      to.path.startsWith('/proveedor/') ||
      to.path.startsWith('/blog') ||
      to.path.startsWith('/docs') ||
      isPublicRestaurant ||
      isPublicAccess ||
      isCustomerPortal ||
      isKds) {
    return
  }

  authStore.setLoading(true)

  try {
    const sessionResponse = await $fetch('/api/auth/session', {
      credentials: 'include',
    })

    if (isPendingOnboardingSession(sessionResponse)) {
      authStore.initializeFromMiddleware({ session: sessionResponse, profileData: null })
      if (isOnboardingAccess) return
      return navigateTo(ONBOARDING_PATH)
    }

    if (isOnboardingAccess) {
      if (canUseInternalSession(sessionResponse)) {
        authStore.initializeFromMiddleware({ session: sessionResponse, profileData: null })
        await accessStore.load()
        return navigateTo(getAccessAwareRedirect(undefined, accessStore, useRouter()))
      }
      clearInternalState()
      return navigateTo(sessionResponse?.user ? CUSTOMER_PORTAL_LOGIN : '/auth/login')
    }

    if (!canUseInternalSession(sessionResponse)) {
      clearInternalState()
      if (sessionResponse?.user || isInternalAccessDeniedError(sessionResponse)) {
        return navigateTo(CUSTOMER_PORTAL_LOGIN)
      }
      return navigateTo('/auth/login')
    }

    authStore.initializeFromMiddleware({
      session: sessionResponse,
      profileData: null,
    })

    try {
      await accessStore.load()
    } catch (err) {
      if (isInternalAccessDeniedError(err)) {
        clearInternalState()
        return navigateTo(CUSTOMER_PORTAL_LOGIN)
      }
      throw err
    }
  } catch (err) {
    if (!isSessionAuthError(err)) {
      console.error('Auth middleware error:', err)
    }
    clearInternalState()
    if (isInternalAccessDeniedError(err)) {
      return navigateTo(CUSTOMER_PORTAL_LOGIN)
    }
    const redirect = to.fullPath ? `?redirect=${encodeURIComponent(to.fullPath)}` : ''
    return navigateTo(`/auth/login${redirect}`)
  } finally {
    authStore.setLoading(false)
  }
})
