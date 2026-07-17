import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import SearchableSelect from './SearchableSelect.vue'

const longLabel = 'Taste Of The Wild Prey Angus Beef Feline 15 Lb Alimento Para Gatos Premium A Base De Res Angus Lenteja Y Grasa De Pollo'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SearchableSelect', () => {
  it('keeps the complete selected value and wraps long option labels', async () => {
    const wrapper = mount(SearchableSelect, {
      attachTo: document.body,
      props: {
        modelValue: 'long',
        options: [{ value: 'long', label: longLabel }],
      },
    })

    const input = wrapper.get('input:not([tabindex="-1"])')
    expect(input.attributes('title')).toBe(longLabel)

    await input.trigger('focus')
    const option = wrapper.get('button[title]')
    expect(option.attributes('title')).toBe(longLabel)
    expect(option.text()).toBe(longLabel)
    expect(option.get('span').classes()).toContain('[overflow-wrap:anywhere]')
  })
})
