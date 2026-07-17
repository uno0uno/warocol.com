import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SplitShell from './SplitShell.vue'

describe('AuthSplitShell', () => {
  it('keeps the auth content separate from a decorative image-only panel', () => {
    const wrapper = mount(SplitShell, {
      props: {
        imageSrc: '/brand/auth-login-trattoria.webp',
        imagePosition: '62% center',
      },
      slots: {
        default: '<form aria-label="Iniciar sesión"></form>',
      },
    })

    expect(wrapper.get('section form').attributes('aria-label')).toBe('Iniciar sesión')

    const imagePanel = wrapper.get('aside')
    expect(imagePanel.attributes('aria-hidden')).toBe('true')
    expect(imagePanel.text()).toBe('')

    const image = imagePanel.get('img')
    expect(image.attributes('src')).toBe('/brand/auth-login-trattoria.webp')
    expect(image.attributes('alt')).toBe('')
    expect(image.attributes('style')).toContain('object-position: 62% center')
  })
})
