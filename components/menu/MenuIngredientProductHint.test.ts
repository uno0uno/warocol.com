import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MenuIngredientProductHint from './MenuIngredientProductHint.vue'

beforeEach(() => {
  vi.stubGlobal('useWarehouseCopy', () => ({
    warehouseItem: 'Artículo de bodega',
    menuProduct: 'Producto de menú',
    recipeWarehouseHint: '— materia prima en bodega.',
    recipeMenuProductHint: '— lo que vendes en caja.',
  }))
})

describe('MenuIngredientProductHint', () => {
  it('keeps help collapsed until the comparison button is used', async () => {
    const wrapper = mount(MenuIngredientProductHint, {
      global: {
        stubs: {
          Icon: true,
        },
      },
    })

    const button = wrapper.get('button')
    expect(button.text()).toContain('Artículo de bodega / Producto de menú')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).not.toContain('materia prima en bodega')

    await button.trigger('click')

    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('materia prima en bodega')
    expect(wrapper.text()).toContain('lo que vendes en caja')
  })
})
