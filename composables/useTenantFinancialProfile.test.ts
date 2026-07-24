import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canSubmitFinancialProfile,
  createFinancialProfileDraft,
  financialProfileQueryKey,
  getCompatibleCurrencyCodes,
  getCurrencyMinorUnits,
  hasFinancialProfileChanges,
  isColombiaPucProfile,
  isIntegratedFiscalProfile,
  type TenantFinancialProfileResponse,
} from './useTenantFinancialProfile.ts'

const response: TenantFinancialProfileResponse = {
  profile: {
    tenant_id: 'tenant-co',
    country_code: 'CO',
    base_currency_code: 'COP',
    accounting_localization: 'WARO_CO_PUC_V1',
    document_mode: 'fiscal_integrated',
    fiscal_provider: 'matias',
  },
  catalog: [
    { country_code: 'CO', currency_codes: ['COP'] },
    { country_code: 'PA', currency_codes: ['USD', 'PAB'] },
    { country_code: 'CL', currency_codes: ['CLP'] },
  ],
  currencies: [
    { currency_code: 'COP', minor_units: 2 },
    { currency_code: 'USD', minor_units: 2 },
    { currency_code: 'CLP', minor_units: 0 },
  ],
  capabilities: {
    colombia_puc: true,
    colombia_payroll: true,
    matias_dian: true,
    cop_wallet: true,
    wompi: true,
    fixed_cop_discounts: true,
  },
  eligibility: { eligible: true, lock_type: 'none', reason_codes: [] },
}

describe('tenant financial-profile helpers', () => {
  it('keys cached data by tenant to prevent cross-tenant reuse', () => {
    assert.deepEqual(financialProfileQueryKey('tenant-a'), ['tenant', 'financial-profile', 'tenant-a'])
    assert.deepEqual(financialProfileQueryKey('tenant-b'), ['tenant', 'financial-profile', 'tenant-b'])
    assert.notDeepEqual(financialProfileQueryKey('tenant-a'), financialProfileQueryKey('tenant-b'))
  })

  it('creates an isolated draft and keeps compatibility server-driven', () => {
    assert.deepEqual(createFinancialProfileDraft(response.profile), {
      country_code: 'CO',
      base_currency_code: 'COP',
    })
    assert.deepEqual(getCompatibleCurrencyCodes(response.catalog, 'PA'), ['USD', 'PAB'])
    assert.deepEqual(getCompatibleCurrencyCodes(response.catalog, 'XX'), [])
  })

  it('never submits country/currency changes after hard lock', () => {
    const unchanged = { country_code: 'CO', base_currency_code: 'COP' }
    const panama = { country_code: 'PA', base_currency_code: 'PAB' }
    const invalid = { country_code: 'PA', base_currency_code: 'COP' }

    assert.equal(hasFinancialProfileChanges(response.profile, unchanged), false)
    assert.equal(canSubmitFinancialProfile(response, unchanged), false)
    assert.equal(canSubmitFinancialProfile(response, panama), false)
    assert.equal(canSubmitFinancialProfile(response, invalid), false)
    assert.equal(canSubmitFinancialProfile({
      ...response,
      eligibility: { eligible: false, lock_type: 'permanent', reason_codes: ['permanent_orders'] },
    }, panama), false)
  })

  it('uses server minor units with a safe fallback', () => {
    assert.equal(getCurrencyMinorUnits(response.currencies, 'CLP'), 0)
    assert.equal(getCurrencyMinorUnits(response.currencies, 'USD'), 2)
    assert.equal(getCurrencyMinorUnits(response.currencies, 'XXX', 0), 0)
  })

  it('derives fiscal and PUC gates from the trusted tenant response', () => {
    assert.equal(isIntegratedFiscalProfile(response, 'tenant-co'), true)
    assert.equal(isColombiaPucProfile(response, 'tenant-co'), true)
    assert.equal(isIntegratedFiscalProfile(response, 'another-tenant'), false)
    assert.equal(isIntegratedFiscalProfile({
      ...response,
      profile: { ...response.profile, document_mode: 'waro_commercial', fiscal_provider: null },
      capabilities: { ...response.capabilities, matias_dian: false },
    }, 'tenant-co'), false)
  })
})
