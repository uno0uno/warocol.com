export interface LegalTermsAnnex {
  id?: string
  title: string
  version?: string | null
  description?: string | null
  applies?: boolean
}

export interface LegalTermsSection {
  id?: string
  title: string
  body: string
}

export interface LegalTermsDocument {
  id?: string
  version: string
  status?: string | null
  title: string
  effective_date?: string | null
  published_at?: string | null
  privacy_policy_url?: string | null
  source_url?: string | null
  body_html?: string | null
  sections?: LegalTermsSection[]
  annexes?: LegalTermsAnnex[]
}

export interface LegalTermsStatus {
  authenticated: boolean
  accepted: boolean
  pending: boolean
  accepted_version?: string | null
  accepted_at?: string | null
  current_version?: string | null
  evidence_id?: string | null
}

interface AuthSessionResponse {
  success?: boolean
  currentTenant?: { id?: string | null; slug?: string | null } | null
}

const isAuthError = (err: any) =>
  err?.status === 401 ||
  err?.statusCode === 401 ||
  err?.status === 403 ||
  err?.statusCode === 403

export const useLegalTerms = () => {
  const cache = useQueryCache()

  const { data: sessionData, status: sessionStatus } = useQuery({
    key: ['legal-terms', 'session'],
    enabled: () => import.meta.client,
    query: async () => {
      try {
        return await $fetch<AuthSessionResponse>('/api/auth/session', { credentials: 'include', timeout: 3000 })
      } catch (err: any) {
        if (isAuthError(err)) return { success: false, currentTenant: null }
        return { success: false, currentTenant: null }
      }
    },
  })

  const tenantId = computed(() => sessionData.value?.currentTenant?.id ?? 'public')
  const hasTenantSession = computed(() => !!sessionData.value?.success && !!sessionData.value?.currentTenant?.id)

  const { data: currentDocument, status: documentStatus, asyncStatus: documentAsyncStatus } = useQuery({
    key: ['legal-terms', 'current'],
    enabled: () => import.meta.client,
    query: async () => {
      try {
        return await $fetch<LegalTermsDocument>('/api/legal/terms/current', { credentials: 'include', timeout: 4000 })
      } catch (err: any) {
        if (isAuthError(err) || err?.status === 404 || err?.statusCode === 404) return null
        return null
      }
    },
  })

  const { data: statusData, status: termsStatus, asyncStatus: termsAsyncStatus } = useQuery({
    key: () => ['legal-terms', 'status', tenantId.value],
    enabled: () => import.meta.client && hasTenantSession.value,
    query: async () => {
      try {
        return await $fetch<LegalTermsStatus>('/api/legal/terms/status', { credentials: 'include', timeout: 4000 })
      } catch (err: any) {
        if (isAuthError(err) || err?.status === 404 || err?.statusCode === 404) return null
        return null
      }
    },
  })

  const acceptMutation = useMutation({
    mutation: (payload?: { document_id?: string; version?: string }) =>
      $fetch<LegalTermsStatus>('/api/legal/terms/accept', {
        method: 'POST',
        credentials: 'include',
        timeout: 10000,
        body: {
          document_id: payload?.document_id ?? currentDocument.value?.id,
          version: payload?.version ?? currentDocument.value?.version,
        },
      }),
    onSuccess: (result) => {
      cache.setQueryData(['legal-terms', 'status', tenantId.value], result)
    },
    onSettled: () => {
      cache.invalidateQueries({ key: ['legal-terms'] })
      cache.invalidateQueries({ key: ['billing', 'access-status'] })
    },
  })

  const isInitialLoading = computed(() =>
    documentStatus.value === 'pending' ||
    sessionStatus.value === 'pending' ||
    (hasTenantSession.value && termsStatus.value === 'pending')
  )

  const isRefreshing = computed(() =>
    documentAsyncStatus.value === 'loading' ||
    termsAsyncStatus.value === 'loading'
  )

  const acceptTerms = async (payload?: { document_id?: string; version?: string }) => {
    return await acceptMutation.mutateAsync(payload)
  }

  const refreshTermsStatus = async (): Promise<LegalTermsStatus | null> => {
    const result = await $fetch<LegalTermsStatus>('/api/legal/terms/status', { credentials: 'include', timeout: 4000 })
    cache.setQueryData(['legal-terms', 'status', tenantId.value], result)
    return result
  }

  return {
    currentDocument,
    statusData,
    hasTenantSession,
    isInitialLoading,
    isRefreshing,
    isAccepting: acceptMutation.isLoading,
    acceptError: acceptMutation.error,
    acceptTerms,
    refreshTermsStatus,
  }
}
