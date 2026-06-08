import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canIncrementModifierSelection,
  modifierGroupSelectionCount,
  modifierSelectionQty,
} from './modifierSelection.ts'

describe('modifierSelectionQty', () => {
  it('returns selected modifier quantity', () => {
    assert.equal(modifierSelectionQty([{ id: 'extra-cheese', quantity: 2 }], 'extra-cheese'), 2)
  })

  it('treats missing quantity as unselected for storefront steppers', () => {
    assert.equal(modifierSelectionQty([{ id: 'extra-cheese' }], 'extra-cheese'), 0)
  })
})

describe('modifierGroupSelectionCount', () => {
  it('counts distinct selected options in a modifier group', () => {
    const selections = [
      { id: 'cheese', quantity: 2 },
      { id: 'bacon', quantity: 1 },
      { id: 'note-only', quantity: 0 },
    ]

    assert.equal(modifierGroupSelectionCount(selections, ['cheese', 'bacon', 'avocado']), 2)
  })
})

describe('canIncrementModifierSelection', () => {
  it('allows increasing an already selected option up to max_limit', () => {
    assert.equal(
      canIncrementModifierSelection({
        selections: [{ id: 'cheese', quantity: 1 }],
        modifierId: 'cheese',
        modifierMaxLimit: 2,
        groupOptionIds: ['cheese', 'bacon'],
        groupMaxSelections: 1,
      }),
      true,
    )
  })

  it('blocks an option at its max_limit', () => {
    assert.equal(
      canIncrementModifierSelection({
        selections: [{ id: 'cheese', quantity: 2 }],
        modifierId: 'cheese',
        modifierMaxLimit: 2,
        groupOptionIds: ['cheese', 'bacon'],
        groupMaxSelections: 2,
      }),
      false,
    )
  })

  it('blocks a new distinct option when group max selections is reached', () => {
    assert.equal(
      canIncrementModifierSelection({
        selections: [{ id: 'cheese', quantity: 1 }],
        modifierId: 'bacon',
        modifierMaxLimit: 3,
        groupOptionIds: ['cheese', 'bacon'],
        groupMaxSelections: 1,
      }),
      false,
    )
  })
})
