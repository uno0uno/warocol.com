export const useAuthStore = defineStore('auth', () => {
  // Auth state
  const user = ref(null)
  const session = ref(null)
  const profileData = ref(null)
  const isLoading = ref(false)

  // Computed properties for profile data
  const profile = computed(() => {
    if (!profileData.value?.data) return null
    
    // Handle base_profile structure from API
    if (profileData.value.data.base_profile) {
      return profileData.value.data.base_profile.profile
    }
    
    // Handle direct profile data
    return profileData.value.data
  })

  const roleSpecificData = computed(() => {
    return profileData.value?.data?.role_specific_data || null
  })

  const sessionProfile = computed(() => session.value?.user || null)

  const hasProfile = computed(() => {
    return !!profile.value
  })

  // Profile tags computed property
  const profileTags = computed(() => {
    if (!profile.value) return ['Web3', 'DeFi', 'Innovation']
    
    const tags = []
    if (profile.value.category) tags.push(profile.value.category)
    if (profileData.value?.data?.role) {
      const role = profileData.value.data.role
      tags.push(role.charAt(0).toUpperCase() + role.slice(1))
    }
    
    return tags.length > 0 ? tags : ['Web3', 'DeFi', 'Innovation']
  })

  // Display user data
  const displayUser = computed(() => {
    const hasCurrentProfile = !!(sessionProfile.value || profile.value || user.value)
    const currentProfile = {
      ...(profile.value || {}),
      ...(user.value || {}),
      ...(sessionProfile.value || {}),
    }

    if (!hasCurrentProfile) {
      return {
        name: 'Usuario',
        email: null,
        avatar: null,
        description: '',
        role: null,
        hasProfile: false,
      }
    }

    return {
      name: currentProfile.name || currentProfile.user_name || 'Usuario',
      email: currentProfile.email || session.value?.user?.email || null,
      avatar: currentProfile.logo_avatar || currentProfile.avatar || null,
      description: currentProfile.description || '',
      website: currentProfile.website,
      city: currentProfile.city,
      category: currentProfile.category,
      role: currentProfile.role || profileData.value?.data?.role || session.value?.user?.role,
      hasProfile: !!(sessionProfile.value || profile.value),
    }
  })

  // Check if current session is valid (not expired)
  const isSessionValid = computed(() => {
    if (!session.value || !user.value) return false

    // Check if session has expiration data
    const expiresAt = session.value.session?.expiresAt || session.value.expiresAt
    if (!expiresAt) return false

    // Check if session has expired
    const expirationDate = new Date(expiresAt)
    const now = new Date()

    return expirationDate > now
  })

  // Actions
  function setUser(userData) {
    user.value = userData
  }

  function setSession(sessionData) {
    session.value = sessionData
  }

  function hydrateSession(sessionData) {
    setSession(sessionData)

    const sessionUser = sessionData?.user
    if (!sessionUser) {
      setUser(null)
      return
    }

    setUser({
      ...sessionUser,
      name: sessionUser.name || sessionUser.user_name || 'Usuario',
    })
  }

  function patchSessionUser(patch) {
    if (!session.value?.user) return
    hydrateSession({
      ...session.value,
      user: {
        ...session.value.user,
        ...patch,
      },
    })
  }

  async function refreshSession() {
    const sessionData = await $fetch('/api/auth/session', {
      credentials: 'include',
    })
    hydrateSession(sessionData)
    return sessionData
  }

  function setProfileData(data) {
    profileData.value = data
  }

  function setLoading(loading) {
    isLoading.value = loading
  }

  function clearAuth() {
    user.value = null
    session.value = null
    profileData.value = null
    isLoading.value = false
  }

  function expireSession() {
    clearAuth()

    if (import.meta.client) {
      const cache = useQueryCache()
      cache.invalidateQueries()
    }
  }

  // Initialize from middleware data
  function initializeFromMiddleware(middlewareData) {
    if (middlewareData.session) {
      hydrateSession(middlewareData.session)
    }
    
    if (middlewareData.profileData) {
      setProfileData(middlewareData.profileData)
    }
    
    if (middlewareData.user && !middlewareData.session) {
      setUser(middlewareData.user)
    }
  }

  return {
    // State
    user: readonly(user),
    session: readonly(session),
    profileData: readonly(profileData),
    isLoading: readonly(isLoading),

    // Computed
    profile,
    sessionProfile,
    roleSpecificData,
    hasProfile,
    profileTags,
    displayUser,
    isSessionValid,

    // Actions
    setUser,
    setSession,
    hydrateSession,
    patchSessionUser,
    refreshSession,
    setProfileData,
    setLoading,
    clearAuth,
    expireSession,
    initializeFromMiddleware
  }
})
