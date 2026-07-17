import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CatalogSearchCombobox from './CatalogSearchCombobox.vue'
import WarehouseCategorySearchInput from './WarehouseCategorySearchInput.vue'

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('WarehouseCategorySearchInput', () => {
  it('searches tenant warehouse categories through the API', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async (
      _url: string,
      options: { query?: { search?: string }, method?: string, body?: { name?: string } },
    ) => {
      if (options.method === 'POST') {
        return {
          data: {
            id: 'created-category',
            tenant_id: 'tenant-1',
            name: options.body?.name ?? '',
            normalized_name: options.body?.name ?? '',
            is_active: true,
            scope: 'tenant',
            can_manage: true,
            ingredient_count: 0,
            global_count: 0,
            tenant_count: 0,
          },
        }
      }
      if (options.method === 'PATCH') {
        const archived = _url.endsWith('/archive')
        return {
          data: {
            id: 'created-category',
            tenant_id: 'tenant-1',
            name: options.body?.name ?? 'holanda',
            normalized_name: options.body?.name ?? 'holanda',
            is_active: !archived,
            scope: 'tenant',
            can_manage: true,
            ingredient_count: 0,
            global_count: 0,
            tenant_count: 0,
          },
        }
      }
      return {
        data: options.query?.search === 'categoria'
          ? [
              {
                id: 'category-1',
                tenant_id: 'tenant-1',
                name: 'categoria de prueba',
                normalized_name: 'categoria de prueba',
                is_active: true,
                scope: 'tenant',
                can_manage: true,
                ingredient_count: 1,
                global_count: 0,
                tenant_count: 1,
              },
              {
                id: 'category-2',
                tenant_id: 'tenant-1',
                name: 'ingrediente categoria',
                normalized_name: 'ingrediente categoria',
                is_active: true,
                scope: 'tenant',
                can_manage: true,
                ingredient_count: 1,
                global_count: 0,
                tenant_count: 1,
              },
            ]
          : [],
      }
    })
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('useI18n', () => ({
      t: (key: string, params?: { name?: string }) => ({
        'abastecimiento.glossary.searchLoading': 'Buscando…',
        'abastecimiento.glossary.noSearchResults': 'Sin resultados',
        'abastecimiento.glossary.searchError': 'Error',
        'abastecimiento.glossary.createNamed': `Crear "${params?.name ?? ''}"`,
        'abastecimiento.glossary.warehouseCategoryPrivate': 'Privada',
        'abastecimiento.glossary.renameWarehouseCategory': 'Renombrar',
        'abastecimiento.glossary.archiveWarehouseCategory': 'Archivar',
        'abastecimiento.glossary.archiveWarehouseCategoryConfirm': '¿Archivar?',
        'abastecimiento.glossary.saveChanges': 'Guardar',
        'abastecimiento.glossary.cancel': 'Cancelar',
      }[key] ?? key),
    }))

    const Host = defineComponent({
      setup() {
        const value = ref<any>(null)
        return () => h(WarehouseCategorySearchInput, {
          modelValue: value.value,
          'onUpdate:modelValue': (nextValue: any) => {
            value.value = nextValue
          },
        })
      },
    })
    const wrapper = mount(Host, {
      attachTo: document.body,
      global: {
        components: {
          UiCatalogSearchCombobox: CatalogSearchCombobox,
        },
        stubs: {
          Teleport: true,
        },
      },
    })
    const input = wrapper.get('input')

    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    await input.setValue('categoria')

    expect(wrapper.text()).toContain('Buscando…')
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Sin resultados')

    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Buscando…')
    expect(wrapper.text()).toContain('categoria de prueba')
    expect(wrapper.text()).toContain('ingrediente categoria')
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/suppliers/warehouse-categories',
      { query: { search: 'categoria', limit: 100 } },
    )

    await input.setValue('holanda')

    expect(wrapper.text()).toContain('Buscando…')
    expect(wrapper.text()).not.toContain('categoria de prueba')
    expect(wrapper.text()).not.toContain('Sin resultados')
    expect(wrapper.text()).not.toContain('Crear "holanda"')

    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Buscando…')
    expect(wrapper.text()).toContain('Sin resultados')
    expect(wrapper.text()).toContain('Crear "holanda"')

    await wrapper.findAll('[role="option"]').at(-1)?.trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/suppliers/warehouse-categories',
      { method: 'POST', body: { name: 'holanda' } },
    )
    expect(wrapper.text()).toContain('Privada')

    await wrapper.findAll('button').find(button => button.text() === 'Renombrar')?.trigger('click')
    const renameInput = wrapper.get('input[aria-label="Renombrar"]')
    await renameInput.setValue('Holanda refrigerada')
    await wrapper.findAll('button').find(button => button.text() === 'Guardar')?.trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/suppliers/warehouse-categories/created-category',
      { method: 'PATCH', body: { name: 'Holanda refrigerada' } },
    )

    await wrapper.findAll('button').find(button => button.text() === 'Archivar')?.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === 'Archivar')?.trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/suppliers/warehouse-categories/created-category/archive',
      { method: 'PATCH' },
    )
    expect(wrapper.text()).not.toContain('Privada')
  })

  it('keeps compact assignment mode free of create and management actions', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => ({ data: [] }))
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('useI18n', () => ({
      t: (key: string, params?: { name?: string }) => ({
        'abastecimiento.glossary.searchLoading': 'Buscando…',
        'abastecimiento.glossary.noSearchResults': 'Sin resultados',
        'abastecimiento.glossary.searchError': 'Error',
        'abastecimiento.glossary.createNamed': `Crear "${params?.name ?? ''}"`,
        'abastecimiento.glossary.warehouseCategoryPrivate': 'Privada',
        'abastecimiento.glossary.renameWarehouseCategory': 'Renombrar',
        'abastecimiento.glossary.archiveWarehouseCategory': 'Archivar',
      }[key] ?? key),
    }))

    const selected = {
      id: 'category-1',
      tenant_id: 'tenant-1',
      name: 'Carnes',
      normalized_name: 'carnes',
      is_active: true,
      scope: 'tenant' as const,
      can_manage: true,
      ingredient_count: 1,
      global_count: 0,
      tenant_count: 1,
    }
    const wrapper = mount(WarehouseCategorySearchInput, {
      attachTo: document.body,
      props: {
        modelValue: selected,
        compact: true,
        allowCreate: false,
        placement: 'bottom',
      },
      global: {
        components: { UiCatalogSearchCombobox: CatalogSearchCombobox },
        stubs: { Teleport: true },
      },
    })

    expect(wrapper.text()).not.toContain('Privada')
    expect(wrapper.text()).not.toContain('Renombrar')
    expect(wrapper.text()).not.toContain('Archivar')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(fetchMock).not.toHaveBeenCalled()

    await wrapper.get('input').setValue('Nueva categoría')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(wrapper.text()).toContain('Sin resultados')
    expect(wrapper.text()).not.toContain('Crear "Nueva categoría"')
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/suppliers/warehouse-categories',
      { query: { search: 'Nueva categoría', limit: 100 } },
    )
  })
})
