import { describe, expect, it } from 'bun:test'
import {
  extractQuotaExceededDetail,
  isQuotaExceededError,
  normalizeUpgradePath,
} from '~/composables/useQuotaExceeded'

describe('useQuotaExceeded helpers', () => {
  it('detects quota_exceeded detail payloads', () => {
    const err = {
      status: 429,
      data: {
        detail: {
          code: 'quota_exceeded',
          error: 'quota_exceeded',
          resource: 'menu_products',
          used: 10,
          limit: 10,
        },
      },
    }

    expect(isQuotaExceededError(err)).toBe(true)
    expect(extractQuotaExceededDetail(err)?.resource).toBe('menu_products')
  })

  it('normalizes legacy upgrade URLs to Mi Plan', () => {
    expect(normalizeUpgradePath('/billing/planes')).toBe('/gestion/billing')
    expect(normalizeUpgradePath('/gestion/billing')).toBe('/gestion/billing')
  })

  it('returns false for unrelated errors', () => {
    expect(isQuotaExceededError({ status: 400, data: { detail: 'Bad request' } })).toBe(false)
    expect(isQuotaExceededError({
      status: 400,
      data: { detail: 'Failed to send invitation' },
    })).toBe(false)
  })

  it('detects admin_users quota 429 from invitations', () => {
    const err = {
      status: 429,
      data: {
        detail: {
          code: 'quota_exceeded',
          resource: 'admin_users',
          used: 2,
          limit: 1,
        },
      },
    }
    expect(isQuotaExceededError(err)).toBe(true)
    expect(extractQuotaExceededDetail(err)?.resource).toBe('admin_users')
  })

  it('reads WARO APIError envelope with details (plural)', () => {
    const err = {
      status: 429,
      data: {
        error: true,
        message: 'Límite del plan alcanzado',
        details: {
          code: 'quota_exceeded',
          resource: 'admin_users',
          used: 2,
          limit: 1,
        },
      },
    }
    expect(isQuotaExceededError(err)).toBe(true)
    expect(extractQuotaExceededDetail(err)?.used).toBe(2)
    expect(extractQuotaExceededDetail(err)?.resource).toBe('admin_users')
  })
})
