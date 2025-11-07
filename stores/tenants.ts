import { defineStore } from 'pinia'

export interface Tenant {
  id: string
  name: string
  slug: string
}

export const useTenantsStore = defineStore('tenants', () => {
  // State
  const tenants = ref<Tenant[]>([])
  const selectedTenant = ref<Tenant | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Global tenant change counter - increments when tenant changes
  const tenantChangeCounter = ref(0)

  // Getters
  const hasTenants = computed(() => tenants.value.length > 0)
  const selectedTenantSlug = computed(() => selectedTenant.value?.slug || null)

  // Actions
  const fetchUserTenants = async () => {
    isLoading.value = true
    error.value = null
    
    
    try {
      // Get tenants and current session
      const [tenantsResponse, sessionResponse] = await Promise.all([
        $fetch('/api/tenants/user-tenants'),
        $fetch('/api/auth/session')
      ])
      
      
      if (tenantsResponse.success) {
        tenants.value = tenantsResponse.data
        
        // Set current tenant from session if available
        if (sessionResponse.success && sessionResponse.currentTenant) {
          const currentTenant = tenants.value.find(t => t.id === sessionResponse.currentTenant.id)
          if (currentTenant) {
            selectedTenant.value = currentTenant
          }
        }
        
        // Fallback to first tenant if none selected
        if (!selectedTenant.value && tenants.value.length > 0) {
          selectedTenant.value = tenants.value[0]
        }
      } else {
        error.value = tenantsResponse.message || 'Error loading tenants'
        console.error('❌ Tenants response not successful:', tenantsResponse)
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch tenants'
      console.error('❌ Error fetching user tenants:', err)
    } finally {
      isLoading.value = false
    }
  }

  const selectTenant = async (tenant: Tenant) => {
    // Check if already on the selected tenant
    if (selectedTenant.value?.slug === tenant.slug) {
      console.log(`✅ Already on tenant ${tenant.slug}, skipping switch`)
      return true
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      console.log(`🔄 Switching from ${selectedTenant.value?.slug || 'none'} to ${tenant.slug}`)
      
      // Import encryption utility
      const { getEncryptedOrigin } = await import('~/utils/encryption.js')
      const encryptedOrigin = getEncryptedOrigin()
      
      const response = await $fetch('/api/auth/switch-tenant', {
        method: 'POST',
        headers: {
          ...(encryptedOrigin && { 'X-Encrypted-Origin': encryptedOrigin })
        },
        body: { tenantSlug: tenant.slug }
      })
      
      if (response.success) {
        selectedTenant.value = tenant
        tenantChangeCounter.value++ // Increment counter to trigger reactivity globally
        console.log(`✅ Successfully switched to tenant ${tenant.slug}`)
        return true
      } else {
        error.value = response.message || 'Error switching tenant'
        return false
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to switch tenant'
      console.error('Error switching tenant:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const selectTenantBySlug = async (slug: string) => {
    const tenant = tenants.value.find(t => t.slug === slug)
    if (tenant) {
      return await selectTenant(tenant)
    }
    return false
  }

  const clearTenants = () => {
    tenants.value = []
    selectedTenant.value = null
    error.value = null
  }

  return {
    // State  
    tenants,
    selectedTenant,
    isLoading,
    error,
    tenantChangeCounter,
    
    // Getters
    hasTenants,
    selectedTenantSlug,
    
    // Actions
    fetchUserTenants,
    selectTenant,
    selectTenantBySlug,
    clearTenants
  }
})