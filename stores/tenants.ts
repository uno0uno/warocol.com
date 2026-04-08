/**
 * Tenants Store — Pinia Colada migration (Phase 2c / 4b)
 *
 * useQuery for user tenants (parallel fetch) and business profile (reactive on selectedTenant).
 * useMutation for tenant switch — fires bulk cache invalidation on success.
 */
import { defineStore } from 'pinia'
import { usePOSStore } from '~/stores/usePOSStore'

export interface BusinessHours {
  open?: string    // "HH:MM" — may be absent when closed: true
  close?: string   // "HH:MM" — may be absent when closed: true
  closed: boolean
}

export interface TenantBusinessProfile {
  id: string
  tenant_id: string
  slug: string
  display_name: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  phone_number: string | null
  email: string | null
  address: string | null
  city: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  business_hours: Record<string, BusinessHours> | null
  social_media: Record<string, string> | null
  accepts_online_orders: boolean
  min_order_amount: number
  estimated_preparation_time: number
  is_active: boolean
  is_currently_open: boolean | null
  is_manually_open: boolean | null
}

export interface Tenant {
  id: string
  name: string
  slug: string
}

export const useTenantsStore = defineStore('tenants', () => {
  const cache = useQueryCache()

  // ── UI state ──────────────────────────────────────────────────────────────────
  const selectedTenant = ref<Tenant | null>(null)
  const error = ref<string | null>(null)

  // ── User tenants query ────────────────────────────────────────────────────────
  const { data: tenantData, status } = useQuery({
    key: ['tenants', 'user'],
    query: async () => {
      const [tenantsRes, sessionRes] = await Promise.all([
        $fetch<{ success: boolean; data: Tenant[] }>('/api/tenants/user-tenants'),
        $fetch<{ success: boolean; currentTenant?: { id: string } }>('/api/auth/session'),
      ])
      return { tenants: tenantsRes.data ?? [], session: sessionRes }
    },
  })

  // Auto-select tenant from session (or first) when query loads
  watch(tenantData, (result) => {
    if (!result) return
    if (selectedTenant.value) return  // already selected — don't override on background refetch
    const { tenants, session } = result
    if (session?.success && session.currentTenant) {
      const fromSession = tenants.find(t => t.id === session.currentTenant!.id)
      if (fromSession) { selectedTenant.value = fromSession; return }
    }
    if (tenants.length > 0) selectedTenant.value = tenants[0]
  })

  const tenants = computed<Tenant[]>(() => tenantData.value?.tenants ?? [])

  // ── Business profile query (reactive on selectedTenant) ───────────────────────
  const { data: businessProfile, status: profileStatus } = useQuery({
    key: () => ['tenant', 'business-profile', selectedTenant.value?.slug],
    query: () => $fetch<{ success: boolean; data: TenantBusinessProfile }>(
      '/api/api/tenant/public-profile'
    ).then(r => r.data ?? null),
    enabled: () => !!selectedTenant.value,
  })

  // ── selectTenant mutation ─────────────────────────────────────────────────────
  const switchMutation = useMutation({
    mutation: async (tenant: Tenant) => {
      const { getEncryptedOrigin } = await import('~/utils/encryption.js')
      const encryptedOrigin = getEncryptedOrigin()
      return $fetch<{ success: boolean; message?: string }>('/api/auth/switch-tenant', {
        method: 'POST',
        headers: { ...(encryptedOrigin && { 'X-Encrypted-Origin': encryptedOrigin }) },
        body: { tenantSlug: tenant.slug },
      })
    },
    onSuccess: (response, tenant) => {
      if (!response.success) {
        error.value = response.message ?? 'Error switching tenant'
        return
      }
      // Nuke the entire cache BEFORE updating selectedTenant.
      // - No args = invalidates all entries (Pinia Colada: find() with no key yields everything).
      // - Order matters: invalidating first avoids a race where the old query key
      //   re-fetches with the new session and stores the result under the wrong entry.
      cache.invalidateQueries()
      // Reset POS feature flags — new tenant may have different settings
      usePOSStore().tablesEnabled = null
      console.log('[TENANTS] tablesEnabled → null, switching to tenant:', tenant.slug)
      // Update AFTER so the reactive key change triggers a clean fetch on the new tenant.
      selectedTenant.value = tenant
      console.log('[TENANTS] selectedTenant set to:', tenant.slug)
    },
    onError: (err: any) => {
      error.value = err?.message ?? 'Failed to switch tenant'
    },
  })

  // ── Derived state ─────────────────────────────────────────────────────────────
  const hasTenants = computed(() => tenants.value.length > 0)
  const selectedTenantSlug = computed(() => selectedTenant.value?.slug ?? null)
  const isLoading = computed(() => status.value === 'loading' || switchMutation.isLoading.value)
  const isBusinessProfileLoading = computed(() => profileStatus.value === 'loading')

  // ── Public action wrappers ────────────────────────────────────────────────────

  /** Trigger a fresh fetch of user tenants (awaitable — resolves when data is loaded) */
  const fetchUserTenants = () =>
    cache.invalidateQueries({ key: ['tenants', 'user'] })

  /** Force-refresh the business profile (e.g. after PATCH to public-profile) */
  const fetchBusinessProfile = () =>
    cache.invalidateQueries({ key: ['tenant', 'business-profile', selectedTenant.value?.slug] })

  const selectTenant = async (tenant: Tenant): Promise<boolean> => {
    if (selectedTenant.value?.slug === tenant.slug) return true
    if (switchMutation.isLoading.value) return false
    error.value = null
    const res = await switchMutation.mutateAsync(tenant).catch((err: any) => {
      error.value = err?.message ?? 'Failed to switch tenant'
      return null
    })
    return !!res?.success
  }

  const selectTenantBySlug = async (slug: string): Promise<boolean> => {
    const tenant = tenants.value.find(t => t.slug === slug)
    if (tenant) return selectTenant(tenant)
    return false
  }

  const clearTenants = () => {
    selectedTenant.value = null
    error.value = null
    cache.invalidateQueries({ key: ['tenants'] })
    cache.invalidateQueries({ key: ['tenant'] })
  }

  return {
    // State
    tenants,
    selectedTenant,
    isLoading,
    error,
    businessProfile,
    isBusinessProfileLoading,

    // Getters
    hasTenants,
    selectedTenantSlug,

    // Actions
    fetchUserTenants,
    fetchBusinessProfile,
    selectTenant,
    selectTenantBySlug,
    clearTenants,
  }
})
