import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WarehouseCategoryIngredientSelector from './WarehouseCategoryIngredientSelector.vue'

const category = {
  id: 'category-1',
  tenant_id: 'tenant-1',
  name: 'Granos',
  normalized_name: 'granos',
  is_active: true,
  scope: 'tenant',
  can_manage: true,
  ingredient_count: 1,
  global_count: 0,
  tenant_count: 1,
}

const WarehouseCategorySearchInputStub = defineComponent({
  emits: ['change', 'update:modelValue'],
  setup(_, { emit }) {
    return () => h('button', {
      type: 'button',
      'data-test': 'select-category',
      onClick: () => emit('change', category),
    }, 'Select category')
  },
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('WarehouseCategoryIngredientSelector', () => {
  it('prepares editable local rows once and never calls a persistence endpoint', async () => {
    const fetchMock = vi.fn(async (_url: string, _options?: unknown) => ({
      data: {
        ingredients: [{
          ingredient_id: 'ingredient-1',
          name: 'Arroz',
          unit: 'gr',
          warehouse_category_id: 'category-1',
        }],
        empty_category_ids: [],
        unavailable_category_ids: [],
      },
    }))
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('useI18n', () => ({
      t: (key: string, params?: Record<string, string>) => ({
        'abastecimiento.glossary.categoryIngredientSelectorTitle': 'Agregar ingredientes por categoría',
        'abastecimiento.glossary.categoryIngredientSelectorPlaceholder': 'Buscar categoría',
        'abastecimiento.glossary.warehouseCategorySearchResults': 'Categorías',
        'abastecimiento.glossary.removeWarehouseCategorySelection': `Quitar ${params?.name}`,
        'abastecimiento.glossary.categoryIngredientsLoading': 'Cargando',
        'abastecimiento.glossary.categoryIngredientsError': 'Error',
        'abastecimiento.glossary.categoryIngredientsRetry': 'Reintentar',
        'abastecimiento.glossary.categoryIngredientsEmpty': `Vacías: ${params?.categories}`,
        'abastecimiento.glossary.categoryIngredientsPartial': `No disponibles: ${params?.categories}`,
        'abastecimiento.glossary.categoryIngredientQuantity': 'Cantidad',
        'abastecimiento.glossary.categoryIngredientUnit': 'Unidad',
        'abastecimiento.glossary.removePreparedIngredient': `Quitar ${params?.name}`,
        'abastecimiento.glossary.removePreparedIngredientAction': 'Quitar',
      }[key] ?? key),
    }))
    const wrapper = mount(WarehouseCategoryIngredientSelector, {
      props: { existingIngredientIds: ['manual-ingredient'] },
      global: {
        components: {
          UiWarehouseCategorySearchInput: WarehouseCategorySearchInputStub,
        },
      },
    })

    await wrapper.get('[data-test="select-category"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="select-category"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Granos')
    expect(wrapper.text()).toContain('Arroz')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/suppliers/ingredients/resolve-by-warehouse-categories',
      {
        method: 'POST',
        body: {
          category_ids: ['category-1'],
          exclude_ingredient_ids: ['manual-ingredient'],
        },
      },
    )

    const inputs = wrapper.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('')
    expect((inputs[1].element as HTMLInputElement).value).toBe('gr')
    await inputs[0].setValue('2.5')
    await wrapper.find('button[aria-label="Quitar Arroz"]').trigger('click')

    const emittedRows = wrapper.emitted('update:preparedRows') ?? []
    expect(emittedRows.some(event => (event[0] as any[])[0]?.quantity === 2.5)).toBe(true)
    expect(wrapper.text()).not.toContain('Arroz')
    expect(fetchMock.mock.calls.every(([url]) => url === '/api/suppliers/ingredients/resolve-by-warehouse-categories')).toBe(true)
  })

  it('shows partial states and retries recoverable failures without clearing selections', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        data: {
          ingredients: [],
          empty_category_ids: ['category-1'],
          unavailable_category_ids: [],
        },
      })
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({
        data: {
          ingredients: [],
          empty_category_ids: ['category-1'],
          unavailable_category_ids: [],
        },
      })
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('useI18n', () => ({
      t: (key: string, params?: Record<string, string>) => ({
        'abastecimiento.glossary.categoryIngredientSelectorTitle': 'Selector',
        'abastecimiento.glossary.categoryIngredientSelectorPlaceholder': 'Buscar',
        'abastecimiento.glossary.warehouseCategorySearchResults': 'Categorías',
        'abastecimiento.glossary.removeWarehouseCategorySelection': `Quitar ${params?.name}`,
        'abastecimiento.glossary.categoryIngredientsLoading': 'Cargando',
        'abastecimiento.glossary.categoryIngredientsError': 'No se pudo cargar',
        'abastecimiento.glossary.categoryIngredientsRetry': 'Reintentar',
        'abastecimiento.glossary.categoryIngredientsEmpty': `Sin nuevos: ${params?.categories}`,
        'abastecimiento.glossary.categoryIngredientsPartial': `Parcial: ${params?.categories}`,
      }[key] ?? key),
    }))
    const wrapper = mount(WarehouseCategoryIngredientSelector, {
      global: {
        components: { UiWarehouseCategorySearchInput: WarehouseCategorySearchInputStub },
      },
    })

    await wrapper.get('[data-test="select-category"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Sin nuevos: Granos')

    await wrapper.setProps({ existingIngredientIds: ['manual-ingredient'] })
    await flushPromises()
    expect(wrapper.text()).toContain('Granos')
    expect(wrapper.text()).toContain('No se pudo cargar')

    await wrapper.findAll('button').find(button => button.text() === 'Reintentar')?.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Sin nuevos: Granos')
  })

  it('uses caller-provided compatible unit options when available', async () => {
    vi.stubGlobal('$fetch', vi.fn(async () => ({
      data: {
        ingredients: [{
          ingredient_id: 'ingredient-1',
          name: 'Arroz',
          unit: 'gr',
          warehouse_category_id: 'category-1',
        }],
        empty_category_ids: [],
        unavailable_category_ids: [],
      },
    })))
    vi.stubGlobal('useI18n', () => ({
      t: (key: string) => key,
    }))
    const wrapper = mount(WarehouseCategoryIngredientSelector, {
      props: {
        unitOptions: () => [
          { value: 'gr', label: 'Gramos' },
          { value: 'kg', label: 'Kilogramos' },
        ],
      },
      global: {
        components: { UiWarehouseCategorySearchInput: WarehouseCategorySearchInputStub },
      },
    })

    await wrapper.get('[data-test="select-category"]').trigger('click')
    await flushPromises()

    const select = wrapper.find('select')
    expect(select.exists()).toBe(true)
    expect(select.findAll('option').map(option => option.attributes('value'))).toEqual(['gr', 'kg'])
  })
})
