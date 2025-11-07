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
    if (!profile.value) {
      return {
        name: 'Warocol',
        policyId: 'b558ea...60eb60',
        avatar: null,
        description: 'Warocol is a community-led Web3 platform designed to add utility to decentralized projects. Build, connect, and grow with the future of digital innovation...'
      }
    }

    return {
      name: profile.value.name || 'Anonymous User',
      email: session.value?.user?.email,
      avatar: profile.value.logo_avatar,
      description: profile.value.description || 'Welcome to Warocol! Complete your profile to get started.',
      website: profile.value.website,
      city: profile.value.city,
      category: profile.value.category,
      role: profileData.value?.data?.role,
      policyId: 'b558ea...60eb60',
      hasProfile: hasProfile.value
    }
  })

  // Actions
  function setUser(userData) {
    user.value = userData
  }

  function setSession(sessionData) {
    session.value = sessionData
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

  // Initialize from middleware data
  function initializeFromMiddleware(middlewareData) {
    if (middlewareData.session) {
      setSession(middlewareData.session)
    }
    
    if (middlewareData.profileData) {
      setProfileData(middlewareData.profileData)
    }
    
    if (middlewareData.user) {
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
    roleSpecificData,
    hasProfile,
    profileTags,
    displayUser,
    
    // Actions
    setUser,
    setSession,
    setProfileData,
    setLoading,
    clearAuth,
    initializeFromMiddleware
  }
})