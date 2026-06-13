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

  const authStore = useAuthStore()
  const accessStore = useAccessStore()

  // If user already has a valid session and tries to access login, redirect to ventas
  if (authStore.isSessionValid && to.path === '/auth/login') {
    try {
      const sessionResponse = await $fetch('/api/auth/session', {
        credentials: 'include',
      })
      if (sessionResponse?.user) return navigateTo('/ventas')
    } catch {
      authStore.expireSession()
      accessStore.clear()
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

    if (!sessionResponse?.user) {
      authStore.expireSession()
      accessStore.clear()
      return navigateTo('/auth/login')
    }

    authStore.initializeFromMiddleware({
      session: sessionResponse,
      profileData: null,
      user: {
        name: sessionResponse.user.name || 'Anonymous User',
        email: sessionResponse.user.email,
      }
    })

    await accessStore.load()
  } catch (err) {
    console.error('Auth middleware error:', err)
    authStore.expireSession()
    accessStore.clear()
    return navigateTo('/auth/login')
  } finally {
    authStore.setLoading(false)
  }
})
