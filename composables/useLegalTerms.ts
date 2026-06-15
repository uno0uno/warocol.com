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
  display_mode?: string | null
  body_html?: string | null
  sections?: LegalTermsSection[]
  annexes?: LegalTermsAnnex[]
}

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
}

interface ApiLegalTermsAnnex {
  id?: string
  code?: string
  title: string
  version?: string | null
  content_url?: string | null
  metadata?: Record<string, any> | null
}

interface ApiLegalTermsDocument {
  version_id?: string
  version: string
  document_title?: string
  title?: string
  effective_at?: string | null
  effective_date?: string | null
  published_at?: string | null
  content_url?: string | null
  source_url?: string | null
  metadata?: Record<string, any> | null
  annexes?: ApiLegalTermsAnnex[]
}

interface ApiLegalTermsAcceptance {
  id?: string
  accepted_at?: string | null
  version?: string | null
}

interface ApiLegalTermsStatus {
  requires_acceptance?: boolean
  current?: ApiLegalTermsDocument | null
  acceptance?: ApiLegalTermsAcceptance | null
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

const unwrapApiData = <T>(response: ApiEnvelope<T> | T | null | undefined): T | null => {
  if (!response) return null
  if (typeof response === 'object' && 'data' in response) {
    return (response as ApiEnvelope<T>).data ?? null
  }
  return response as T
}

const mapApiDocument = (apiDocument: ApiLegalTermsDocument | LegalTermsDocument | null): LegalTermsDocument | null => {
  if (!apiDocument) return null
  const documentPayload = apiDocument as ApiLegalTermsDocument & LegalTermsDocument
  const metadata = documentPayload.metadata ?? {}
  return {
    id: documentPayload.version_id ?? documentPayload.id,
    version: documentPayload.version,
    status: (metadata.status as string | undefined) ?? 'published',
    title: documentPayload.document_title || documentPayload.title || 'Terminos y Condiciones WARO',
    effective_date: documentPayload.effective_at ?? documentPayload.effective_date ?? null,
    published_at: documentPayload.published_at ?? null,
    privacy_policy_url: (metadata.privacy_policy_url as string | undefined) ?? null,
    source_url: documentPayload.content_url ?? documentPayload.source_url ?? null,
    display_mode: (metadata.display_mode as string | undefined) ?? null,
    body_html: (metadata.body_html as string | undefined) ?? null,
    sections: Array.isArray(metadata.sections) ? metadata.sections as LegalTermsSection[] : [],
    annexes: (documentPayload.annexes ?? []).map((annex: ApiLegalTermsAnnex & LegalTermsAnnex) => ({
      id: annex.id ?? annex.code,
      title: annex.title,
      version: annex.version,
      description: annex.metadata?.description ?? null,
      applies: true,
    })),
  }
}

const mapApiStatus = (apiStatus: ApiLegalTermsStatus | LegalTermsStatus | null): LegalTermsStatus | null => {
  if (!apiStatus) return null
  if ('accepted' in apiStatus) return apiStatus
  const acceptance = apiStatus.acceptance ?? null
  const current = apiStatus.current ?? null
  const accepted = !apiStatus.requires_acceptance && !!acceptance
  return {
    authenticated: true,
    accepted,
    pending: apiStatus.requires_acceptance === true,
    accepted_version: acceptance?.version ?? (accepted ? current?.version ?? null : null),
    accepted_at: acceptance?.accepted_at ?? null,
    current_version: current?.version ?? null,
    evidence_id: acceptance?.id ?? null,
  }
}

const mapAcceptResponseToStatus = (response: ApiEnvelope<{ current?: ApiLegalTermsDocument | null; acceptance?: ApiLegalTermsAcceptance | null }> | LegalTermsStatus | null): LegalTermsStatus | null => {
  if (!response) return null
  if ('accepted' in response) return response
  const data = unwrapApiData(response)
  return mapApiStatus({
    requires_acceptance: !data?.acceptance,
    current: data?.current ?? null,
    acceptance: data?.acceptance ?? null,
  })
}

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
        const response = await $fetch<ApiEnvelope<ApiLegalTermsDocument | null> | ApiLegalTermsDocument | null>('/api/legal/terms/current', { credentials: 'include', timeout: 4000 })
        return mapApiDocument(unwrapApiData(response))
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
        const response = await $fetch<ApiEnvelope<ApiLegalTermsStatus> | ApiLegalTermsStatus | null>('/api/legal/terms/status', { credentials: 'include', timeout: 4000 })
        return mapApiStatus(unwrapApiData(response))
      } catch (err: any) {
        if (isAuthError(err) || err?.status === 404 || err?.statusCode === 404) return null
        return null
      }
    },
  })

  const acceptMutation = useMutation({
    mutation: (payload?: { document_id?: string; version?: string }) =>
      $fetch<ApiEnvelope<{ current?: ApiLegalTermsDocument | null; acceptance?: ApiLegalTermsAcceptance | null }> | LegalTermsStatus>('/api/legal/terms/accept', {
        method: 'POST',
        credentials: 'include',
        timeout: 10000,
        body: {
          source: 'terms_page',
        },
      }).then(mapAcceptResponseToStatus),
    onSuccess: (result) => {
      cache.setQueryData(['legal-terms', 'status', tenantId.value], result)
    },
    onSettled: () => {
      cache.invalidateQueries({ key: ['legal-terms'] })
      cache.invalidateQueries({ key: ['billing', 'access-status'] })
      cache.invalidateQueries({ key: ['notifications'] })
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
    const response = await $fetch<ApiEnvelope<ApiLegalTermsStatus> | ApiLegalTermsStatus | null>('/api/legal/terms/status', { credentials: 'include', timeout: 4000 })
    const result = mapApiStatus(unwrapApiData(response))
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
