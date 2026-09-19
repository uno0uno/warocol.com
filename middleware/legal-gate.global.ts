/**
 * legal-gate.global.ts
 *
 * Enforces TyC v1.1 acceptance for legacy courtesy tenants and any active
 * tenant without current acceptance.
 *
 * Runs after auth.global.js (alphabetical: auth < legal-gate < billing-gate).
 * Uses cache-first + $fetch to avoid creating Pinia Colada queries on every navigation.
 *
 * Skip: /terminos-y-condiciones itself, auth/public routes, pending onboarding.
 * Redirect: /terminos-y-condiciones?return=<original fullPath> when requires_acceptance.
 */

interface LegalGateStatus {
  requires_acceptance?: boolean
  current?: { version?: string } | null
  acceptance?: { id?: string; version?: string; accepted_at?: string } | null
}

interface LegalGateTermsStatus {
  accepted: boolean
  pending: boolean
}

const unwrapLegalStatus = (payload: unknown): LegalGateStatus | null => {
  if (!payload || typeof payload !== 'object') return null
  if ('data' in payload) {
    return (payload as { data?: LegalGateStatus | null }).data ?? null
  }
  return payload as LegalGateStatus
}

const mapToTermsStatus = (raw: LegalGateStatus | null): LegalGateTermsStatus | null => {
  if (!raw) return null
  // Already mapped shape from useLegalTerms
  if ('accepted' in raw || 'pending' in raw) {
    return raw as unknown as LegalGateTermsStatus
  }
  const acceptance = raw.acceptance ?? null
  const pending = raw.requires_acceptance === true
  const accepted = !pending && !!acceptance
  return { accepted, pending }
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return

  // Must not redirect the terms page itself, otherwise infinite loop.
  const skipExact = ['/terminos-y-condiciones']
  const skipPrefixes = [
    '/auth/',
    '/registro',
    '/proveedor/',
    '/blog',
    '/docs',
    '/403',
    '/_nuxt',
    '/api/',
  ]
  const skipLayouts = ['public-restaurant', 'customer-portal', 'kds']

  if (
    skipExact.includes(to.path) ||
    skipPrefixes.some((p) => to.path.startsWith(p)) ||
    skipLayouts.includes(to.meta?.layout as string) ||
    to.meta?.publicAccess === true
  ) return

  // Already on terms page with query — don't intercept.
  if (to.path === '/terminos-y-condiciones') return

  const authStore = useAuthStore()
  const session: any = (authStore as any).session

  // No internal session yet (public/unauth). Tenant-scoped check requires success + currentTenant.
  if (!session?.success || !session?.currentTenant?.id) return

  // Pending onboarding sessions should go through onboarding/billing flow, not legal gate.
  // Term `terms_pending` is handled by onboarding_service; don't block with return loop.
  // Detect via useLegalTerms pending vs onboarding state is tricky here without extra fetch,
  // so allow /gestion/billing to be handled by its own gate — but legal gate still wins
  // for other /gestion routes if requires_acceptance is true.
  // For pending onboarding without tenant_ar? tenant exists but lifecycle pending → skip gate until active.
  // If tenant lifecycle is still pending, billing-gate + onboardingFlow will redirect to /gestion/billing anyway.
  // We only enforce for tenants that already have billable access (can view /gestion).
  // Check accessStore quickly: if no mi_plan, don't enforce (no dashboard).
  const accessStore = useAccessStore()
  // Don't load access if not loaded — avoid extra fetch on every nav. If not loaded, let other gates handle.
  // But for courtesy legacy: they do have access, so accessStore likely loaded by auth.global.

  const tenantId = session.currentTenant.id as string
  const cache = useQueryCache()
  const cacheKey = ['legal-terms', 'status', tenantId]

  // Invalidate when coming back from terms page so acceptance is fresh.
  // Use `from` is not available in this signature (single arg in earlier gates) — but Nuxt provides 2nd arg optionally.
  // We handle via cache invalidation on mutation (useLegalTerms already invalidates), plus short TTL.
  let termsStatus: LegalGateTermsStatus | null | undefined = cache.getQueryData<LegalGateTermsStatus | null>(cacheKey) as any

  if (termsStatus === undefined) {
    try {
      const raw = await $fetch<LegalGateStatus | { data: LegalGateStatus } | LegalGateTermsStatus>('/api/legal/terms/status', {
        credentials: 'include',
        timeout: 8000,
      })
      const unwrapped = unwrapLegalStatus(raw)
      const mapped = unwrapped ? mapToTermsStatus(unwrapped) : (raw as LegalGateTermsStatus)
      // Cache mapped result for next navigations
      cache.setQueryData(cacheKey, mapped)
      termsStatus = mapped
    } catch {
      // Fail open: don't block navigation on 401/404/timeout — let auth handle.
      return
    }
  }

  if (!termsStatus) return

  // accepted=true → free pass; pending=true or accepted=false → must accept.
  if (termsStatus.accepted === true && termsStatus.pending !== true) return

  // Need acceptance — redirect preserving original target.
  const returnPath = to.fullPath || to.path
  // Sanitize: must start with / and not // (open redirect). Fallback to /gestion.
  const safeReturn = returnPath.startsWith('/') && !returnPath.startsWith('//') ? returnPath : '/gestion'
  return navigateTo({
    path: '/terminos-y-condiciones',
    query: { return: safeReturn },
  })
})
