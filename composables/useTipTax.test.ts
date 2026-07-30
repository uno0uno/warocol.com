import assert from 'node:assert/strict'
import test from 'node:test'

import {
  shortTaxNameFromLabel,
  tipHelpTaxNames,
  tipPreselectUsesColombiaLaw,
} from './useTipTax.ts'

test('shortTaxNameFromLabel strips rates', () => {
  assert.equal(shortTaxNameFromLabel('IVA 16%'), 'IVA')
  assert.equal(shortTaxNameFromLabel('ITBMS 7%'), 'ITBMS')
  assert.equal(shortTaxNameFromLabel('IVA'), 'IVA')
})

test('tipHelpTaxNames keeps IVA o INC for Colombia defaults', () => {
  assert.equal(tipHelpTaxNames({ countryCode: 'CO' }), 'IVA o INC')
  assert.equal(
    tipHelpTaxNames({ countryCode: 'CO', taxConfig: { inc_applicable: true } }),
    'INC',
  )
  assert.equal(
    tipHelpTaxNames({
      countryCode: 'CO',
      taxConfig: { iva_applicable: true, inc_applicable: true },
    }),
    'IVA o INC',
  )
})

test('tipHelpTaxNames never uses IVA o INC for Mexico', () => {
  assert.equal(
    tipHelpTaxNames({ countryCode: 'MX', primaryTaxLabel: 'IVA 16%' }),
    'IVA',
  )
  assert.equal(tipHelpTaxNames({ countryCode: 'MX' }), 'IVA')
  assert.doesNotMatch(
    tipHelpTaxNames({ countryCode: 'mx', taxConfig: { inc_applicable: true } }),
    /INC/i,
  )
})

test('tipPreselectUsesColombiaLaw only for CO', () => {
  assert.equal(tipPreselectUsesColombiaLaw('CO'), true)
  assert.equal(tipPreselectUsesColombiaLaw('MX'), false)
  assert.equal(tipPreselectUsesColombiaLaw(null), false)
})
