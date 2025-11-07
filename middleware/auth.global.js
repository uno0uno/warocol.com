export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server-side rendering
  if (process.server) return

  // Skip on public profile pages (format: /username) but not special routes
  const isPublicProfile = /^\/[^\/]+$/.test(to.path) && 
    !to.path.startsWith('/auth') && 
    !to.path.startsWith('/profile') &&
    to.path !== '/api'
  if (isPublicProfile) return

  // Use Pinia store
  const authStore = useAuthStore()

  // Skip if already loaded and not navigating to/from auth pages
  if (authStore.user && !to.path.startsWith('/auth') && !from?.path?.startsWith('/auth')) {
    return
  }

  authStore.setLoading(true)

  try {
    // Get session data using useLazyFetch for better Nuxt integration
    const { data: sessionResponse, error } = await useLazyFetch('/api/auth/session', {
      server: false
    })
    
    if (error.value) {
      console.error('Session fetch error:', error.value)
      authStore.clearAuth()
      return
    }
    authStore.setSession(sessionResponse.value)

    if (sessionResponse.value.success && sessionResponse.value.user) {
      // Initialize the store with session data only
      authStore.initializeFromMiddleware({
        session: sessionResponse.value,
        profileData: null,
        user: {
          name: sessionResponse.value.user.name || 'Anonymous User',
          email: sessionResponse.value.user.email,
          avatar: null,
          description: 'Welcome to Warocol! Complete your profile to get started.',
          website: null,
          city: null,
          category: null,
          role: null,
          policyId: 'b558ea...60eb60',
          hasProfile: false
        }
      })
    } else {
      // No valid session - clear user data
      authStore.clearAuth()
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    // Clear auth state on error
    authStore.clearAuth()
  } finally {
    authStore.setLoading(false)
  }
})