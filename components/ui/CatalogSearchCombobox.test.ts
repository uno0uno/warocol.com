import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CatalogSearchCombobox from './CatalogSearchCombobox.vue'
import { resolveCatalogSearchOpenUpward, resolveCatalogSearchPanelWidth } from '~/composables/useCatalogSearchDropdownPlacement'

const options = [
  { id: 'one', label: 'Primera' },
  { id: 'header', label: 'Grupo', kind: 'presentation' as const },
  { id: 'two', label: 'Segunda' },
]

function mountCombobox(props: Record<string, unknown> = {}) {
  return mount(CatalogSearchCombobox, {
    attachTo: document.body,
    props: {
      modelValue: '',
      options,
      loadingLabel: 'Cargando',
      emptyLabel: 'Vacío',
      errorLabel: 'Error',
      ...props,
    },
    global: {
      stubs: {
        Teleport: true,
      },
    },
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('CatalogSearchCombobox', () => {
  it('opens upward when preferred and when auto placement would overflow below', () => {
    expect(resolveCatalogSearchOpenUpward({
      placement: 'top',
      spaceAbove: 300,
      spaceBelow: 80,
      dropdownHeight: 192,
    })).toBe(true)
    expect(resolveCatalogSearchOpenUpward({
      placement: 'auto',
      spaceAbove: 300,
      spaceBelow: 150,
      dropdownHeight: 192,
    })).toBe(true)
    expect(resolveCatalogSearchOpenUpward({
      placement: 'auto',
      spaceAbove: 100,
      spaceBelow: 240,
      dropdownHeight: 192,
    })).toBe(false)
  })

  it('grows panel width with content while keeping input minWidth (#1832)', () => {
    expect(resolveCatalogSearchPanelWidth({
      inputWidth: 280,
      viewportWidth: 1200,
      left: 100,
    })).toEqual({
      minWidth: '280px',
      width: 'max-content',
      maxWidth: `${1200 - 100 - 8}px`,
    })
    expect(resolveCatalogSearchPanelWidth({
      inputWidth: 400,
      viewportWidth: 420,
      left: 40,
    }).minWidth).toBe('400px')
  })

  it('creates unique combobox/listbox relationships per instance', async () => {
    const Pair = defineComponent(() => () => h('div', [
      h(CatalogSearchCombobox, { modelValue: '', options }),
      h(CatalogSearchCombobox, { modelValue: '', options }),
    ]))
    const wrapper = mount(Pair, {
      attachTo: document.body,
      global: { stubs: { Teleport: true } },
    })
    const [firstInput, secondInput] = wrapper.findAll('input')

    await firstInput.trigger('focus')
    await secondInput.trigger('focus')

    expect(firstInput.attributes('id')).not.toBe(secondInput.attributes('id'))
    expect(firstInput.attributes('aria-controls')).not.toBe(secondInput.attributes('aria-controls'))
  })

  it('skips presentation rows and selects with arrow keys plus Enter', async () => {
    const wrapper = mountCombobox()
    const input = wrapper.get('input')

    await input.trigger('focus')
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(input.attributes('aria-activedescendant')).toContain('one')

    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(input.attributes('aria-activedescendant')).toContain('two')

    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(input.attributes('aria-activedescendant')).toContain('one')

    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ id: 'two', label: 'Segunda' })
    expect(input.attributes('aria-expanded')).toBe('false')
  })

  it('supports mouse selection without losing the option click on blur', async () => {
    const wrapper = mountCombobox()
    await wrapper.get('input').trigger('focus')
    const option = wrapper.get('[role="option"]')

    await option.trigger('mousedown')
    await option.trigger('click')

    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ id: 'one' })
  })

  it('creates the typed value with Enter and closes with Escape', async () => {
    const wrapper = mountCombobox({
      modelValue: 'Nueva categoría',
      options: [],
      allowCreate: true,
      createLabel: 'Crear categoría',
    })
    const input = wrapper.get('input')

    await input.trigger('focus')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('create')?.[0]).toEqual(['Nueva categoría'])

    await input.trigger('focus')
    await input.trigger('keydown', { key: 'Escape' })
    expect(input.attributes('aria-expanded')).toBe('false')
  })

  it('closes after the input loses focus', async () => {
    vi.useFakeTimers()
    const wrapper = mountCombobox()
    const input = wrapper.get('input')

    await input.trigger('focus')
    expect(input.attributes('aria-expanded')).toBe('true')
    await input.trigger('blur')
    vi.runAllTimers()
    await wrapper.vm.$nextTick()

    expect(input.attributes('aria-expanded')).toBe('false')
    vi.useRealTimers()
  })

  it('renders loading, error, and empty feedback states', async () => {
    const loading = mountCombobox({
      modelValue: 'cate',
      loading: true,
      allowCreate: true,
    })
    await loading.get('input').trigger('focus')
    expect(loading.text()).toContain('Cargando')
    expect(loading.find('.animate-spin').exists()).toBe(true)
    expect(loading.text()).not.toContain('Primera')
    expect(loading.text()).not.toContain('Vacío')
    expect(loading.text()).not.toContain('Create "cate"')

    const error = mountCombobox({ error: new Error('boom') })
    await error.get('input').trigger('focus')
    expect(error.get('[role="alert"]').text()).toBe('Error')
    expect(error.text()).not.toContain('Primera')

    const empty = mountCombobox({ modelValue: 'zzz', options: [] })
    await empty.get('input').trigger('focus')
    expect(empty.text()).toContain('Vacío')
  })

  it('keeps the empty feedback visible when creating the typed value is allowed', async () => {
    const wrapper = mountCombobox({
      modelValue: 'cate',
      options: [],
      allowCreate: true,
    })

    await wrapper.get('input').trigger('focus')

    expect(wrapper.text()).toContain('Vacío')
    expect(wrapper.text()).toContain('Create "cate"')
  })

  it('keeps long values available on a single nowrap line (#1832)', async () => {
    const longLabel = 'Taste Of The Wild Prey Angus Beef Feline 15 Lb Alimento Para Gatos Premium A Base De Res Angus Lenteja Y Grasa De Pollo'
    const wrapper = mountCombobox({
      modelValue: longLabel,
      options: [{ id: 'long', label: longLabel }],
    })

    const input = wrapper.get('input')
    expect(input.attributes('title')).toBe(longLabel)

    await input.trigger('focus')
    const option = wrapper.get('[role="option"]')
    expect(option.attributes('title')).toBe(longLabel)
    expect(option.text()).toBe(longLabel)
    expect(option.classes()).toContain('whitespace-nowrap')
    expect(option.get('span').classes()).toContain('whitespace-nowrap')
    expect(option.get('span').classes()).not.toContain('truncate')
  })
})
