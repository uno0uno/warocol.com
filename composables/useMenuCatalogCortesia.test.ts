import { describe, expect, it } from 'vitest'
import {
  createDraftFromProduct,
  draftHasChanges,
} from './useMenuCatalogEditMode'

const base = {
  id: 'p1',
  name: 'Cortesia',
  price: 0,
  es_cortesia: true,
  category_id: 'c1',
}

const resolveCategoryId = () => 'c1'

describe('cortesia drafts', () => {
  it('carries the flag from product to draft', () => {
    const draft = createDraftFromProduct(base as never, resolveCategoryId)
    expect(draft.es_cortesia).toBe(true)
    expect(draft.originalEsCortesia).toBe(true)
    expect(draftHasChanges(draft)).toBe(false)
  })

  it('detects flag changes', () => {
    const draft = createDraftFromProduct(base as never, resolveCategoryId)
    draft.es_cortesia = false
    expect(draftHasChanges(draft)).toBe(true)
  })

  it('defaults flag off when missing', () => {
    const draft = createDraftFromProduct(
      { ...base, es_cortesia: undefined } as never,
      resolveCategoryId,
    )
    expect(draft.es_cortesia).toBe(false)
  })
})
