import { computed, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WarehouseCategoryRow } from './useWarehouseCategorySearch'
import {
  useWarehouseCatalogEditMode,
  type WarehouseCatalogIngredient,
} from './useWarehouseCatalogEditMode'

const messages = {
  nameRequired: 'Nombre requerido',
  categoryRequired: 'Categoría requerida',
  saveFailed: 'No se pudo guardar',
}

function category(id: string, name: string): WarehouseCategoryRow {
  return {
    id,
    tenant_id: 'tenant-1',
    name,
    normalized_name: name.toLowerCase(),
    is_active: true,
    scope: 'tenant',
    can_manage: true,
    ingredient_count: 0,
    global_count: 0,
    tenant_count: 0,
  }
}

function ingredient(id: string, name: string, categoryId = 'category-1'): WarehouseCatalogIngredient {
  return {
    id,
    name,
    category: 'Carnes',
    warehouse_category_id: categoryId,
    is_active: true,
  }
}

function setup(rows: WarehouseCatalogIngredient[]) {
  const source = ref(rows)
  const refetch = vi.fn(async () => undefined)
  const edit = useWarehouseCatalogEditMode({
    ingredients: computed(() => source.value),
    refetch,
    messages,
    concurrency: 2,
  })
  return { source, refetch, edit }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useWarehouseCatalogEditMode', () => {
  it('does not patch untouched rows and sends only changed safe fields', async () => {
    const fetchMock = vi.fn(async () => ({ success: true }))
    vi.stubGlobal('$fetch', fetchMock)
    const row = ingredient('ingredient-1', 'Carne')
    const { edit, refetch } = setup([row])

    edit.ensureDraft(row)
    expect(await edit.saveChanges()).toEqual({ ok: 0, fail: 0, invalid: 0 })
    expect(fetchMock).not.toHaveBeenCalled()

    edit.ensureDraft(row).name = 'Carne premium'
    expect(await edit.saveChanges()).toEqual({ ok: 1, fail: 0, invalid: 0 })
    expect(fetchMock).toHaveBeenCalledWith('/api/suppliers/ingredients/ingredient-1', {
      method: 'PATCH',
      body: {
        name: 'Carne premium',
        warehouse_category_id: 'category-1',
      },
    })
    expect(edit.drafts.value).toEqual({})
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('applies a bulk category only to selected active rows', async () => {
    const fetchMock = vi.fn(async () => ({ success: true }))
    vi.stubGlobal('$fetch', fetchMock)
    const rows = [
      ingredient('ingredient-1', 'Carne'),
      ingredient('ingredient-2', 'Pollo'),
      { ...ingredient('ingredient-3', 'Archivado'), is_active: false },
    ]
    const { edit } = setup(rows)

    edit.toggleSelect('ingredient-1')
    edit.toggleSelect('ingredient-3')
    edit.bulkCategory.value = category('category-2', 'Proteínas')
    expect(edit.hasChanges.value).toBe(true)

    expect(await edit.saveChanges()).toEqual({ ok: 1, fail: 0, invalid: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/suppliers/ingredients/ingredient-1', {
      method: 'PATCH',
      body: { name: 'Carne', warehouse_category_id: 'category-2' },
    })
    expect(edit.selectedIds.value).toEqual([])
    expect(edit.bulkCategory.value).toBeNull()
  })

  it('keeps only failed drafts and row errors after a mixed save', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('ingredient-2')) {
        throw { data: { detail: 'Nombre duplicado' } }
      }
      return { success: true }
    })
    vi.stubGlobal('$fetch', fetchMock)
    const rows = [ingredient('ingredient-1', 'Carne'), ingredient('ingredient-2', 'Pollo')]
    const { edit, refetch } = setup(rows)
    edit.ensureDraft(rows[0]).name = 'Carne premium'
    edit.ensureDraft(rows[1]).name = 'Pollo premium'

    expect(await edit.saveChanges()).toEqual({ ok: 1, fail: 1, invalid: 0 })
    expect(edit.drafts.value['ingredient-1']).toBeUndefined()
    expect(edit.drafts.value['ingredient-2']?.name).toBe('Pollo premium')
    expect(edit.rowErrors.value).toEqual({ 'ingredient-2': 'Nombre duplicado' })
    expect(edit.displayIngredients.value.find(row => row.id === 'ingredient-2')?.name)
      .toBe('Pollo premium')
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('validates rows independently and can clear hidden selection', async () => {
    const fetchMock = vi.fn(async () => ({ success: true }))
    vi.stubGlobal('$fetch', fetchMock)
    const row = ingredient('ingredient-1', 'Carne')
    const { edit } = setup([row])
    edit.toggleSelect(row.id)
    edit.ensureDraft(row).name = '   '

    expect(await edit.saveChanges()).toEqual({ ok: 0, fail: 0, invalid: 1 })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(edit.rowErrors.value[row.id]).toBe('Nombre requerido')
    expect(edit.selectedIds.value).toEqual([row.id])

    edit.clearSelection()
    expect(edit.selectedIds.value).toEqual([])
  })

  it('keeps edits when cancel is rejected and clears them when confirmed', () => {
    const row = ingredient('ingredient-1', 'Carne')
    const { edit } = setup([row])
    edit.toggleEditMode()
    edit.ensureDraft(row).name = 'Carne premium'
    const rejectDiscard = vi.fn(() => false)

    expect(edit.cancelEditOperation(rejectDiscard)).toBe(false)
    expect(edit.editMode.value).toBe(true)
    expect(edit.drafts.value[row.id]?.name).toBe('Carne premium')

    expect(edit.cancelEditOperation(() => true)).toBe(true)
    expect(edit.editMode.value).toBe(false)
    expect(edit.drafts.value).toEqual({})
    expect(edit.rowErrors.value).toEqual({})
  })
})
