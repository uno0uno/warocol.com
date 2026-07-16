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
      options: { query: { search?: string } },
    ) => ({
      data: options.query.search === 'categoria'
        ? [
            {
              name: 'categoria de prueba',
              ingredient_count: 1,
              global_count: 0,
              tenant_count: 1,
            },
            {
              name: 'ingrediente categoria',
              ingredient_count: 1,
              global_count: 0,
              tenant_count: 1,
            },
          ]
        : [],
    }))
    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('useI18n', () => ({
      t: (key: string, params?: { name?: string }) => ({
        'abastecimiento.glossary.searchLoading': 'Buscando…',
        'abastecimiento.glossary.noSearchResults': 'Sin resultados',
        'abastecimiento.glossary.searchError': 'Error',
        'abastecimiento.glossary.createNamed': `Crear "${params?.name ?? ''}"`,
      }[key] ?? key),
    }))

    const Host = defineComponent({
      setup() {
        const value = ref('')
        return () => h(WarehouseCategorySearchInput, {
          modelValue: value.value,
          'onUpdate:modelValue': (nextValue: string) => {
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
      '/api/suppliers/ingredients/categories',
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
  })
})
