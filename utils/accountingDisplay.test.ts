import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getAccountIndentClass,
  getAccountLevel,
  getAccountLevelKey,
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
