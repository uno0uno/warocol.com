import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  BILLING_QUOTA_RESOURCE_CONFIG,
  OPERATIONAL_QUOTA_KEYS,
  resolveOperationalQuota,
} from './useBilling.ts'

const metric = (overrides = {}) => ({
  used: 1,
  limit: 3,
  remaining: 2,
  period_start: '2026-07-01',
  period_end: '2026-07-31',
  ...overrides,
})

describe('resolveOperationalQuota', () => {
  it('allows finite quotas with remaining usage', () => {
    const result = resolveOperationalQuota('admin_users', metric({ used: 2, limit: 5, remaining: 3 }))

    assert.equal(result.status, 'allowed')
    assert.equal(result.allowed, true)
    assert.equal(result.blocked, false)
    assert.match(result.message, /3 usuarios administrativos disponibles/)
  })

  it('blocks finite quotas with no remaining usage', () => {
    const result = resolveOperationalQuota('active_kitchens', metric({ used: 2, limit: 2, remaining: 0 }))

    assert.equal(result.status, 'blocked')
    assert.equal(result.allowed, false)
    assert.equal(result.blocked, true)
    assert.equal(result.message, BILLING_QUOTA_RESOURCE_CONFIG.active_kitchens.blockedMessage)
  })

  it('treats null limits as unlimited and allowed', () => {
    const result = resolveOperationalQuota('active_tables_including_bar', metric({ limit: null, remaining: null }))

    assert.equal(result.status, 'unlimited')
    assert.equal(result.allowed, true)
    assert.equal(result.blocked, false)
    assert.equal(result.unlimited, true)
  })

  it('blocks finite quotas with zero or negative limits', () => {
    const zeroLimit = resolveOperationalQuota('active_qr_tables', metric({ used: 0, limit: 0, remaining: 0 }))
    const negativeLimit = resolveOperationalQuota('active_qr_tables', metric({ used: 0, limit: -1, remaining: 0 }))

    assert.equal(zeroLimit.status, 'blocked')
    assert.equal(zeroLimit.blocked, true)
    assert.equal(negativeLimit.status, 'blocked')
    assert.equal(negativeLimit.blocked, true)
  })

  it('does not block while loading or when a query errored', () => {
    const loading = resolveOperationalQuota('completed_online_orders_per_month', null, { loading: true })
    const error = resolveOperationalQuota('completed_online_orders_per_month', null, { error: true })

    assert.equal(loading.status, 'loading')
    assert.equal(loading.allowed, true)
    assert.equal(loading.blocked, false)
    assert.equal(loading.loading, true)
    assert.equal(error.status, 'error')
    assert.equal(error.allowed, true)
    assert.equal(error.blocked, false)
  })

  it('does not block when the metric is missing', () => {
    const result = resolveOperationalQuota('admin_users')

    assert.equal(result.status, 'unknown')
    assert.equal(result.allowed, true)
    assert.equal(result.blocked, false)
  })

  it('gates tenant_suppliers like other growth quotas (#1818)', () => {
    assert.ok(OPERATIONAL_QUOTA_KEYS.includes('tenant_suppliers'))

    const allowed = resolveOperationalQuota('tenant_suppliers', metric({ used: 2, limit: 3, remaining: 1 }))
    const blocked = resolveOperationalQuota('tenant_suppliers', metric({ used: 3, limit: 3, remaining: 0 }))
    const missing = resolveOperationalQuota('tenant_suppliers')

    assert.equal(allowed.blocked, false)
    assert.equal(blocked.blocked, true)
    assert.equal(blocked.message, BILLING_QUOTA_RESOURCE_CONFIG.tenant_suppliers.blockedMessage)
    // Fail open until the API metric ships (batch 1)
    assert.equal(missing.blocked, false)
  })

  it('gates direct_purchases_per_period as a period quota (#1818)', () => {
    assert.ok(OPERATIONAL_QUOTA_KEYS.includes('direct_purchases_per_period'))

    const allowed = resolveOperationalQuota('direct_purchases_per_period', metric({ used: 14, limit: 15, remaining: 1 }))
    const blocked = resolveOperationalQuota('direct_purchases_per_period', metric({ used: 15, limit: 15, remaining: 0 }))
    const missing = resolveOperationalQuota('direct_purchases_per_period')

    assert.equal(allowed.blocked, false)
    assert.equal(blocked.blocked, true)
    assert.match(blocked.message, /periodo/)
    assert.equal(missing.blocked, false)
  })

  it('gates stock_adjustments_per_period as a period quota (#1819)', () => {
    assert.ok(OPERATIONAL_QUOTA_KEYS.includes('stock_adjustments_per_period'))

    const allowed = resolveOperationalQuota('stock_adjustments_per_period', metric({ used: 19, limit: 20, remaining: 1 }))
    const blocked = resolveOperationalQuota('stock_adjustments_per_period', metric({ used: 20, limit: 20, remaining: 0 }))
    const missing = resolveOperationalQuota('stock_adjustments_per_period')

    assert.equal(allowed.blocked, false)
    assert.equal(blocked.blocked, true)
    assert.match(blocked.message, /periodo/)
    assert.equal(BILLING_QUOTA_RESOURCE_CONFIG.stock_adjustments_per_period.unit, 'ajustes en el periodo')
    // Fail open until the API metric ships (batch 1)
    assert.equal(missing.blocked, false)
  })

  it('gates Finanzas arqueo quotas (#1836)', () => {
    assert.ok(OPERATIONAL_QUOTA_KEYS.includes('cash_closes_per_period'))
    assert.ok(OPERATIONAL_QUOTA_KEYS.includes('active_open_cash_shifts'))

    const closeBlocked = resolveOperationalQuota(
      'cash_closes_per_period',
      metric({ used: 30, limit: 30, remaining: 0 }),
    )
    const shiftBlocked = resolveOperationalQuota(
      'active_open_cash_shifts',
      metric({ used: 1, limit: 1, remaining: 0 }),
    )
    const closeMissing = resolveOperationalQuota('cash_closes_per_period')

    assert.equal(closeBlocked.blocked, true)
    assert.equal(shiftBlocked.blocked, true)
    assert.equal(closeMissing.blocked, false)
    assert.match(BILLING_QUOTA_RESOURCE_CONFIG.cash_closes_per_period.blockedMessage, /cierres/)
  })

  it('defines reusable messages for every operational resource', () => {
    for (const resource of OPERATIONAL_QUOTA_KEYS) {
      const config = BILLING_QUOTA_RESOURCE_CONFIG[resource]

      assert.equal(typeof config.blockedMessage, 'string')
      assert.equal(typeof config.unlimitedMessage, 'string')
      assert.ok(config.blockedMessage.length > 0)
      assert.ok(config.unlimitedMessage.length > 0)
    }
  })
})
