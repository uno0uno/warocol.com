import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWarehouseCategoryIngredientSelector } from './useWarehouseCategoryIngredientSelector'
import type { WarehouseCategoryRow } from './useWarehouseCategorySearch'

function category(id: string, name: string): WarehouseCategoryRow {
  return {
    id,
    tenant_id: 'tenant-1',
    name,
    normalized_name: name.toLowerCase(),
    is_active: true,
    scope: 'tenant',
    can_manage: true,
    ingredient_count: 1,
    global_count: 0,
    tenant_count: 1,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useWarehouseCategoryIngredientSelector', () => {
  it('keeps category order, ignores repeats, and excludes existing ingredient rows', async () => {
    const fetchMock = vi.fn(async (_url: string, options: any) => ({
      data: {
        ingredients: options.body.category_ids.map((categoryId: string, index: number) => ({
          ingredient_id: `ingredient-${index + 1}`,
          name: index ? 'Yogur' : 'Arroz',
          unit: index ? 'ml' : 'gr',
          warehouse_category_id: categoryId,
        })),
        empty_category_ids: [],
        unavailable_category_ids: [],
      },
    }))
    vi.stubGlobal('$fetch', fetchMock)
    const selector = useWarehouseCategoryIngredientSelector({
      getExistingIngredientIds: () => ['manual-ingredient'],
    })

    expect(await selector.addCategory(category('category-1', 'Granos'))).toBe(true)
    selector.updatePreparedRow('ingredient-1', { quantity: 2, unit: 'kg' })
    expect(await selector.addCategory(category('category-1', 'Granos'))).toBe(false)
    expect(await selector.addCategory(category('category-2', 'Lácteos'))).toBe(true)

    expect(selector.selectedCategories.value.map(item => item.id)).toEqual([
      'category-1',
      'category-2',
    ])
    expect(selector.preparedRows.value).toEqual([
      {
        ingredient_id: 'ingredient-1',
        name: 'Arroz',
        quantity: 2,
        unit: 'kg',
        warehouse_category_id: 'category-1',
      },
      {
        ingredient_id: 'ingredient-2',
        name: 'Yogur',
        quantity: null,
        unit: 'ml',
        warehouse_category_id: 'category-2',
      },
    ])
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/suppliers/ingredients/resolve-by-warehouse-categories',
      {
        method: 'POST',
        body: {
          category_ids: ['category-1', 'category-2'],
          exclude_ingredient_ids: ['manual-ingredient'],
          exclude_resale: false,
        },
      },
    )
  })

  it('keeps prepared rows on failure and supports local removal plus retry', async () => {
    const responses = [
      {
        data: {
          ingredients: [{
            ingredient_id: 'ingredient-1',
            name: 'Arroz',
            unit: '',
            warehouse_category_id: 'category-1',
          }],
          empty_category_ids: ['category-empty'],
          unavailable_category_ids: ['category-missing'],
        },
      },
      new Error('network down'),
      {
        data: {
          ingredients: [],
          empty_category_ids: ['category-1'],
          unavailable_category_ids: [],
        },
      },
    ]
    const fetchMock = vi.fn(async () => {
      const response = responses.shift()
      if (response instanceof Error) throw response
      return response
    })
    vi.stubGlobal('$fetch', fetchMock)
    const selector = useWarehouseCategoryIngredientSelector()

    await selector.addCategory(category('category-1', 'Granos'))
    expect(selector.preparedRows.value[0]?.unit).toBeNull()
    expect(selector.emptyCategoryIds.value).toEqual(['category-empty'])
    expect(selector.unavailableCategoryIds.value).toEqual(['category-missing'])

    await selector.resolve()
    expect(selector.error.value?.message).toBe('network down')
    expect(selector.preparedRows.value).toHaveLength(1)

    selector.removePreparedRow('ingredient-1')
    expect(selector.preparedRows.value).toEqual([])
    await selector.retry()
    expect(selector.error.value).toBeNull()
    expect(fetchMock.mock.calls.at(-1)?.[1].body.exclude_ingredient_ids).toEqual(['ingredient-1'])
  })

  it('ignores stale responses after the selected categories change', async () => {
    let finishFirst: ((value: any) => void) | undefined
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
      .mockResolvedValueOnce({
        data: {
          ingredients: [{
            ingredient_id: 'ingredient-new',
            name: 'Nuevo',
            unit: 'und',
            warehouse_category_id: 'category-2',
          }],
          empty_category_ids: [],
          unavailable_category_ids: [],
        },
      })
    vi.stubGlobal('$fetch', fetchMock)
    const selector = useWarehouseCategoryIngredientSelector()

    const firstRequest = selector.addCategory(category('category-1', 'Primera'))
    const secondRequest = selector.addCategory(category('category-2', 'Segunda'))
    await secondRequest
    finishFirst?.({
      data: {
        ingredients: [{
          ingredient_id: 'ingredient-old',
          name: 'Viejo',
          unit: 'gr',
          warehouse_category_id: 'category-1',
        }],
        empty_category_ids: [],
        unavailable_category_ids: [],
      },
    })
    await firstRequest

    expect(selector.preparedRows.value.map(row => row.ingredient_id)).toEqual(['ingredient-new'])
  })

  it('hydrates selected categories and prepared rows from a snapshot', async () => {
    const selector = useWarehouseCategoryIngredientSelector()
    const category = {
      id: 'category-1',
      tenant_id: 'tenant-1',
      name: 'Granos',
      normalized_name: 'granos',
      is_active: true,
      scope: 'tenant' as const,
      can_manage: true,
      ingredient_count: 1,
      global_count: 0,
      tenant_count: 1,
    }

    await selector.hydrateFromSnapshot([category], [{
      ingredient_id: 'ingredient-1',
      name: 'Arroz',
      quantity: 2,
      unit: 'kg',
      warehouse_category_id: 'category-1',
    }])

    expect(selector.selectedCategories.value).toEqual([category])
    expect(selector.preparedRows.value).toEqual([{
      ingredient_id: 'ingredient-1',
      name: 'Arroz',
      quantity: 2,
      unit: 'kg',
      warehouse_category_id: 'category-1',
    }])
  })

  it('preserves quantities across 3 sequential category adds (regression #2436)', async () => {
    // Simula backend que filtra por exclude_ingredient_ids (caso real que causaba pérdida silenciosa)
    const fetchMock = vi.fn(async (_url: string, options: any) => {
      const allByCategory: Record<string, { ingredient_id: string, name: string, unit: string, warehouse_category_id: string }[]> = {
        'category-1': [{ ingredient_id: 'ing-1', name: 'Cebolla', unit: 'gr', warehouse_category_id: 'category-1' }],
        'category-2': [{ ingredient_id: 'ing-2', name: 'Aceite', unit: 'ml', warehouse_category_id: 'category-2' }],
        'category-3': [{ ingredient_id: 'ing-3', name: 'Sal', unit: 'gr', warehouse_category_id: 'category-3' }],
      }
      const excluded = new Set<string>(options.body.exclude_ingredient_ids ?? [])
      const ingredients = (options.body.category_ids as string[]).flatMap(cid =>
        (allByCategory[cid] ?? []).filter(ing => !excluded.has(ing.ingredient_id)),
      )
      return { data: { ingredients, empty_category_ids: [], unavailable_category_ids: [] } }
    })
    vi.stubGlobal('$fetch', fetchMock)
    const selector = useWarehouseCategoryIngredientSelector({
      // Intencionalmente manda IDs preparados como exclude para simular el bug antiguo;
      // el composable defensivo debe conservar filas aunque el backend las excluya.
      getExistingIngredientIds: () => selector.preparedRows.value.map(r => r.ingredient_id),
    })

    await selector.addCategory(category('category-1', 'Verduras'))
    selector.updatePreparedRow('ing-1', { quantity: 150, unit: 'gr' })
    await selector.addCategory(category('category-2', 'Grasas'))
    selector.updatePreparedRow('ing-2', { quantity: 20, unit: 'ml' })
    expect(selector.preparedRows.value.find(r => r.ingredient_id === 'ing-1')?.quantity).toBe(150)
    expect(selector.preparedRows.value.find(r => r.ingredient_id === 'ing-2')?.quantity).toBe(20)

    await selector.addCategory(category('category-3', 'Especias'))
    expect(selector.preparedRows.value).toEqual(expect.arrayContaining([
      expect.objectContaining({ ingredient_id: 'ing-1', quantity: 150, warehouse_category_id: 'category-1' }),
      expect.objectContaining({ ingredient_id: 'ing-2', quantity: 20, warehouse_category_id: 'category-2' }),
      expect.objectContaining({ ingredient_id: 'ing-3', quantity: null, warehouse_category_id: 'category-3' }),
    ]))
    expect(selector.preparedRows.value).toHaveLength(3)
    // Orden respeta selección
    expect(selector.preparedRows.value.map(r => r.warehouse_category_id)).toEqual(['category-1', 'category-2', 'category-3'])
  })
})
