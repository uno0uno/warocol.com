import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  defaultPaymentMethodParentCode,
  suggestSubAccountSuffix,
} from './useChartOfAccounts.ts'

describe('suggestSubAccountSuffix', () => {
  it('starts at 05 when parent has no children', () => {
    assert.equal(suggestSubAccountSuffix('1110', [{ code: '1110' }]), '05')
  })

  it('increments by 5 under existing children', () => {
    assert.equal(
      suggestSubAccountSuffix('1110', [
        { code: '1110' },
        { code: '111005' },
        { code: '111010' },
      ]),
      '15',
    )
  })
})

describe('defaultPaymentMethodParentCode', () => {
  it('prefers group GL when it is a leaf', () => {
    assert.equal(defaultPaymentMethodParentCode('1105', ['1110', '1105']), '1105')
  })

  it('falls back to first leaf when group GL missing or not a leaf', () => {
    assert.equal(defaultPaymentMethodParentCode(null, ['1110', '1105']), '1110')
    assert.equal(defaultPaymentMethodParentCode('9999', ['1110', '1105']), '1110')
    assert.equal(defaultPaymentMethodParentCode('1110', []), '')
  })
})
