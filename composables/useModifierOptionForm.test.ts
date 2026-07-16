import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createEmptyModifier,
  mapModifierFromApi,
  serializeModifierForApi,
  validateModifierOption,
} from './useModifierOptionForm.ts'

describe('included modifier quantity form contract', () => {
  it('defaults legacy options to zero and serializes the field', () => {
    const row = mapModifierFromApi({
      name: 'Salsa',
      option_type: 'NONE',
      max_limit: 3,
    })
    assert.equal(row.included_quantity, 0)

    row.included_quantity = 1
    assert.equal(serializeModifierForApi(row).included_quantity, 1)
  })

  it('rejects included quantity above max_limit with the option name', () => {
    const row = createEmptyModifier(0)
    row.name = 'Queso'
    row.option_type = 'NONE'
    row.max_limit = 1
    row.included_quantity = 2

    assert.match(validateModifierOption(row) ?? '', /Queso/)
    assert.match(validateModifierOption(row) ?? '', /no puede superar/)
  })

  it('requires integer thresholds', () => {
    const row = createEmptyModifier(0)
    row.name = 'Tocineta'
    row.option_type = 'NONE'
    row.included_quantity = 0.5

    assert.match(validateModifierOption(row) ?? '', /número entero/)
  })
})
