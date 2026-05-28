import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  displayTableCode,
  inferTableCode,
  tableCodeTypographyClass,
} from './useTableDisplayCode.ts'

describe('useTableDisplayCode', () => {
  it('inferTableCode caps digits at 4', () => {
    assert.equal(inferTableCode('Mesa 12345'), '1234')
  })

  it('inferTableCode uses 3 letters when no digits', () => {
    assert.equal(inferTableCode('Terraza VIP'), 'TER')
  })

  it('displayTableCode prefers explicit code', () => {
    assert.equal(displayTableCode({ code: 'M111', name: 'mesa 1' }), 'M111')
  })

  it('tableCodeTypographyClass scales by length', () => {
    assert.match(tableCodeTypographyClass('1'), /text-3xl/)
    assert.match(tableCodeTypographyClass('12'), /text-3xl/)
    assert.match(tableCodeTypographyClass('M11'), /text-2xl/)
    assert.match(tableCodeTypographyClass('M111'), /text-xl/)
  })
})
