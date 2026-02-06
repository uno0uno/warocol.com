export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server-side rendering
  if (process.server) return

  // Define public routes that don't require authentication
  const publicRoutes = ['/auth/login', '/auth/verify', '/'] // Add other public routes as needed

  // Check if route uses public-restaurant layout (for tenant public pages)
  const isPublicRestaurant = to.meta?.layout === 'public-restaurant'

  const authStore = useAuthStore()

  // If user already has a valid session and tries to access login, redirect to ventas
  if (authStore.isSessionValid && to.path === '/auth/login') {
    return navigateTo('/ventas')
  }

  // If the user is trying to access a public route, do nothing.
  // Also, allow access to any route starting with /auth/, /proveedor/ (supplier portal), or /blog/
  // Or if the route uses the public-restaurant layout
  if (publicRoutes.includes(to.path) ||
      to.path.startsWith('/auth/') ||
      to.path.startsWith('/proveedor/') ||
      to.path.startsWith('/blog') ||
      isPublicRestaurant) {
    return
  }

  // ✅ Check if we already have a valid session in the store
  if (authStore.isSessionValid) {
    return
  }

  authStore.setLoading(true)

  try {
    // Only fetch if session is invalid or missing
    const { data: sessionResponse, error } = await useFetch('/api/auth/session', {
      key: 'auth-session',
      getCachedData: (key) => {
        return useNuxtApp().payload.data[key] || useNuxtApp().static.data[key]
      }
    })

    if (error.value || !sessionResponse.value?.user) {
      // No valid session
      authStore.clearAuth()

      // If not on a public route, redirect to login

      return navigateTo('/auth/login')

    } else if (sessionResponse.value.user) {
      // Valid session, populate store
      authStore.initializeFromMiddleware({
        session: sessionResponse.value,
        profileData: null, // This can be fetched separately if needed
        user: {
          name: sessionResponse.value.user.name || 'Anonymous User',
          email: sessionResponse.value.user.email,
          // ... other user properties
        }
      })
    }
  } catch (err) {
    console.error('Auth middleware error:', err)
    authStore.clearAuth()
    return navigateTo('/auth/login')
  } finally {
    authStore.setLoading(false)
  }
})