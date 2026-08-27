import {
  BILLING_QUOTA_RESOURCE_CONFIG,
  type BillingQuotaKey,
} from '~/composables/useBilling'

export const BILLING_UPGRADE_PATH = '/gestion/billing'

export interface QuotaExceededDetail {
  code?: string
  error?: string
  resource?: string
  used?: number
  limit?: number
  plan_slug?: string
  message?: string
  upgrade_url?: string
}

const QUOTA_ERROR_CODES = new Set([
  'quota_exceeded',
  'scan_quota_exceeded',
  'online_order_quota_exceeded',
])

export function normalizeUpgradePath(url?: string | null): string {
  if (!url || url === '/billing/planes') return BILLING_UPGRADE_PATH
  if (url.startsWith('/')) return url
  return BILLING_UPGRADE_PATH
}

export function extractQuotaExceededDetail(err: unknown): QuotaExceededDetail | null {
  const payload = err as {
    status?: number
    statusCode?: number
    data?: {
      code?: string
      error?: string | boolean
      detail?: QuotaExceededDetail | string
      details?: QuotaExceededDetail | Record<string, unknown>
      message?: string
    }
  } | null

  if (!payload) return null

  const rawDetail = payload.data?.detail ?? payload.data?.details
  const detail = typeof rawDetail === 'object' && rawDetail !== null
    ? rawDetail as QuotaExceededDetail
    : null

  const code = detail?.code
    ?? detail?.error
    ?? (typeof payload.data?.code === 'string' ? payload.data.code : undefined)
    ?? (typeof payload.data?.error === 'string' ? payload.data.error : undefined)

  if (
    payload.status !== 429
    && payload.statusCode !== 429
    && (!code || !QUOTA_ERROR_CODES.has(code))
  ) {
    return null
  }

  if (detail) return detail

  if (code && QUOTA_ERROR_CODES.has(code)) {
    return { code, error: code }
  }

  return payload.status === 429 || payload.statusCode === 429
    ? { code: 'quota_exceeded', error: 'quota_exceeded' }
    : null
}

export function isQuotaExceededError(err: unknown): boolean {
  return extractQuotaExceededDetail(err) !== null
}

function isBillingQuotaKey(resource: string): resource is BillingQuotaKey {
  return resource in BILLING_QUOTA_RESOURCE_CONFIG
}

export function useQuotaExceeded() {
  const { t, locale } = useI18n({ useScope: 'global' })
  const toast = useToast()

  const showUpgradeCta = ref(false)
  const upgradeMessage = ref('')

  const clearQuotaError = () => {
    showUpgradeCta.value = false
    upgradeMessage.value = ''
  }

  const quotaResourceLabel = (resource?: string | null) => {
    if (!resource) return t('billing.upgrade.resourceGeneric')
    if (isBillingQuotaKey(resource)) {
      return t(`billing.quota.${resource}`, BILLING_QUOTA_RESOURCE_CONFIG[resource].label)
    }
    return resource.replace(/_/g, ' ')
  }

  const getQuotaMessage = (err: unknown, fallbackResource?: string) => {
    const detail = extractQuotaExceededDetail(err)
    const resource = detail?.resource ?? fallbackResource ?? null
    const used = typeof detail?.used === 'number' ? detail.used : null
    const limit = typeof detail?.limit === 'number' ? detail.limit : null
    const numberLocale = toNumberLocaleTag(locale.value)

    if (typeof detail?.message === 'string' && detail.message.trim()) {
      return detail.message
    }

    if (used !== null && limit !== null) {
      return t('billing.upgrade.message', {
        resource: quotaResourceLabel(resource),
        used: used.toLocaleString(numberLocale),
        limit: limit.toLocaleString(numberLocale),
      })
    }

    return t('billing.upgrade.generic')
  }

  const handleQuotaError = (
    err: unknown,
    options?: { resource?: string; toastTitle?: string; showInline?: boolean },
  ) => {
    if (!isQuotaExceededError(err)) return false

    const message = getQuotaMessage(err, options?.resource)
    upgradeMessage.value = message

    if (options?.showInline !== false) {
      showUpgradeCta.value = true
    }

    toast.warning(message, {
      title: options?.toastTitle ?? t('billing.upgrade.quotaBlocked'),
    })

    return true
  }

  return {
    showUpgradeCta,
    upgradeMessage,
    clearQuotaError,
    getQuotaMessage,
    handleQuotaError,
    isQuotaExceededError,
    extractQuotaExceededDetail,
    normalizeUpgradePath,
  }
}
