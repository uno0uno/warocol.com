import { mount } from '@vue/test-utils'
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
  it('shows searching feedback before presenting local category matches', async () => {
    vi.useFakeTimers()
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

    await input.setValue('ace')

    expect(wrapper.text()).toContain('Buscando…')
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Aceites')
    expect(wrapper.text()).not.toContain('Sin resultados')

    await vi.advanceTimersByTimeAsync(300)

    expect(wrapper.text()).not.toContain('Buscando…')
    expect(wrapper.text()).toContain('Aceites')

    await input.setValue('holanda')

    expect(wrapper.text()).toContain('Buscando…')
    expect(wrapper.text()).not.toContain('Aceites')
    expect(wrapper.text()).not.toContain('Sin resultados')
    expect(wrapper.text()).not.toContain('Crear "holanda"')

    await vi.advanceTimersByTimeAsync(300)

    expect(wrapper.text()).not.toContain('Buscando…')
    expect(wrapper.text()).toContain('Sin resultados')
    expect(wrapper.text()).toContain('Crear "holanda"')
  })
})
