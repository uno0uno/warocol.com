import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canIncrementModifierSelection,
  firstMissingRequiredModifierGroup,
  modifierGroupSelectionCount,
  modifierSelectionQty,
  requiredModifierGroupMinQty,
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

describe('requiredModifierGroupMinQty', () => {
  it('requires one selection when a group is marked required without min quantity', () => {
    assert.equal(
      requiredModifierGroupMinQty({
        id: 'sauces',
        name: 'Salsas',
        isRequired: true,
        optionIds: ['bbq'],
      }),
      1,
    )
  })

  it('uses explicit min_qty when present', () => {
    assert.equal(
      requiredModifierGroupMinQty({
        id: 'toppings',
        name: 'Adiciones',
        min_qty: 2,
        optionIds: ['cheese', 'bacon'],
      }),
      2,
    )
  })

  it('does not require optional groups with zero min quantity', () => {
    assert.equal(
      requiredModifierGroupMinQty({
        id: 'extras',
        name: 'Extras',
        isRequired: false,
        min_qty: 0,
        optionIds: ['cheese'],
      }),
      0,
    )
  })
})

describe('firstMissingRequiredModifierGroup', () => {
  it('returns the first required group with too few selected options', () => {
    const missing = firstMissingRequiredModifierGroup(
      [{ id: 'cheese', quantity: 1 }],
      [
        {
          id: 'sauce',
          name: 'Salsa',
          isRequired: true,
          optionIds: ['bbq', 'garlic'],
        },
        {
          id: 'extras',
          name: 'Extras',
          min_qty: 2,
          optionIds: ['cheese', 'bacon'],
        },
      ],
    )

    assert.equal(missing?.id, 'sauce')
  })

  it('counts distinct quantity selections toward min_qty', () => {
    const missing = firstMissingRequiredModifierGroup(
      [
        { id: 'cheese', quantity: 2 },
        { id: 'bacon', quantity: 1 },
      ],
      [
        {
          id: 'extras',
          name: 'Extras',
          minQty: 2,
          optionIds: ['cheese', 'bacon', 'avocado'],
        },
      ],
    )

    assert.equal(missing, null)
  })

  it('allows optional groups to be cleared', () => {
    const missing = firstMissingRequiredModifierGroup(
      [],
      [
        {
          id: 'extras',
          name: 'Extras',
          required: false,
          min_qty: 0,
          optionIds: ['cheese'],
        },
      ],
    )

    assert.equal(missing, null)
  })
})
