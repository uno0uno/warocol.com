import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getAccountIndentClass,
  getAccountLevel,
  getAccountLevelKey,
  localizeSystemAccountName,
} from './accountingDisplay.ts'

describe('accounting display metadata', () => {
  it('uses authoritative levels instead of account-code length', () => {
    const account = { level: 3, isDetail: false }
    assert.equal(getAccountLevel(account), 3)
    assert.equal(getAccountLevelKey(account), 'account')
    assert.equal(getAccountIndentClass(account), 'ps-8')
  })

  it('falls back to detail metadata without inspecting a code', () => {
    assert.equal(getAccountLevel({ isDetail: true }), 4)
    assert.equal(getAccountLevelKey({ isDetail: true }), 'subaccount')
  })
})

describe('localizeSystemAccountName', () => {
  const t = (key: string) => {
    if (key === 'finanzas.contabilidad.systemAccounts.cash') return 'Efectivo'
    if (key === 'finanzas.contabilidad.systemAccounts.taxPayable') return 'Impuestos por pagar'
    if (key === 'finanzas.contabilidad.systemAccounts.assets') return 'Activos'
    if (key === 'finanzas.contabilidad.systemAccounts.currentAssets') return 'Activos corrientes'
    return key
  }

  it('maps known global managerial codes via i18n', () => {
    assert.equal(localizeSystemAccountName({ code: '1000', name: 'Cash' }, t), 'Efectivo')
    assert.equal(localizeSystemAccountName({ code: '2100', name: 'Tax payable' }, t), 'Impuestos por pagar')
  })

  it('maps GLOBAL class and group header codes via i18n (#2137)', () => {
    assert.equal(localizeSystemAccountName({ code: '1', name: 'Assets' }, t), 'Activos')
    assert.equal(
      localizeSystemAccountName({ code: '10', name: 'Current assets' }, t),
      'Activos corrientes',
    )
  })

  it('keeps CO PUC / custom stored names when code is not in the global map', () => {
    assert.equal(
      localizeSystemAccountName({ code: '1105', name: 'Caja general' }, t),
      'Caja general',
    )
    assert.equal(
      localizeSystemAccountName({ code: '100005', name: 'Caja secundaria' }, t),
      'Caja secundaria',
    )
    assert.equal(
      localizeSystemAccountName({ code: '101005', name: 'NEQUI' }, t),
      'NEQUI',
    )
  })
})