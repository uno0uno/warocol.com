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
  it('always uses group GL when set, even if not in the leaf list', () => {
    assert.equal(defaultPaymentMethodParentCode('1105', ['1110', '1105']), '1105')
    assert.equal(defaultPaymentMethodParentCode('9999', ['1110', '1105']), '9999')
    assert.equal(defaultPaymentMethodParentCode(' 1110 ', ['1105']), '1110')
  })

  it('falls back to first leaf only when group GL is missing', () => {
    assert.equal(defaultPaymentMethodParentCode(null, ['1110', '1105']), '1110')
    assert.equal(defaultPaymentMethodParentCode('', ['1110', '1105']), '1110')
    assert.equal(defaultPaymentMethodParentCode(undefined, []), '')
  })
})
