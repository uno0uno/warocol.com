import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CustomerIdentificationModal from './CustomerIdentificationModal.vue'

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}))

vi.mock('ofetch', () => ({
  $fetch: fetchMock,
}))

type CustomerSummary = {
  id: string
  name: string | null
  phone_number: string | null
  email: string | null
  fiscal_id_type: string | null
  fiscal_id: string | null
  fiscal_business_name: string | null
}

const translations: Record<string, string> = {
  'pos.customer.contactLabel': 'Cliente/contacto',
  'pos.customer.fiscalAcquirerLabel': 'Razón social / adquirente fiscal',
  'pos.customer.noName': 'Sin nombre',
  'pos.customer.noPhone': 'Sin teléfono',
  'pos.customer.docType.doc': 'Documento',
}

const mountModal = () => {
  vi.stubGlobal('useI18n', () => ({
    t: (key: string) => translations[key] ?? key,
  }))
  vi.stubGlobal('useRoute', () => ({ path: '/ventas/crear' }))

  return mount(CustomerIdentificationModal, {
    attachTo: document.body,
    props: {
      modelValue: true,
    },
    global: {
      stubs: {
        CommonsTheCustomLoader: true,
        Transition: false,
      },
    },
  })
}

/** Teleported panel lives on document.body (#2004). */
const dialogEl = () => document.body.querySelector('[role="dialog"]') as HTMLElement | null
const bodyText = () => document.body.textContent || ''

const searchFor = async (
  _wrapper: VueWrapper,
  results: CustomerSummary[],
  query = 'cliente',
) => {
  fetchMock.mockResolvedValueOnce({ success: true, data: results })
  const inputEl = document.body.querySelector('input[type="text"]') as HTMLInputElement | null
  expect(inputEl).toBeTruthy()
  await new DOMWrapper(inputEl!).setValue(query)
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock.mockReset()
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('CustomerIdentificationModal shell', () => {
  it('docks as a right slideover on desktop (md:max-w-md)', () => {
    const wrapper = mountModal()
    const panel = dialogEl()
    expect(panel).toBeTruthy()
    const classes = panel!.className
    expect(classes).toContain('md:max-w-md')
    expect(classes).toContain('md:h-full')
    expect(classes.split(/\s+/)).not.toContain('h-full')
    wrapper.unmount()
  })

  it('teleports overlay to document.body for full-viewport coverage', () => {
    const wrapper = mountModal()
    const overlay = Array.from(document.body.querySelectorAll('.fixed.inset-0'))
      .find(el => el.className.includes('z-[80]'))
    expect(overlay).toBeTruthy()
    expect(document.body.contains(overlay!)).toBe(true)
    expect(wrapper.element.contains(overlay!)).toBe(false)
    wrapper.unmount()
  })
})

describe('CustomerIdentificationModal customer identities', () => {
  it('shows contact and a distinct fiscal acquirer in a compact result', async () => {
    const wrapper = mountModal()
    await searchFor(wrapper, [{
      id: 'mixed',
      name: 'Medición y Control SAS',
      phone_number: '6044482986',
      email: 'contacto@example.com',
      fiscal_id_type: 'NIT',
      fiscal_id: '860502327',
      fiscal_business_name: 'Jaime Torres',
    }])

    expect(bodyText()).toContain('Cliente/contacto')
    expect(bodyText()).toContain('Medición y Control SAS')
    expect(bodyText()).toContain('6044482986')
    expect(bodyText()).toContain('Razón social / adquirente fiscal')
    expect(bodyText()).toContain('Jaime Torres')
    expect(bodyText()).toContain('NIT 860502327')

    wrapper.unmount()
  })

  it('does not duplicate equivalent operational and fiscal names', async () => {
    const wrapper = mountModal()
    await searchFor(wrapper, [{
      id: 'equivalent',
      name: 'Café Árbol SAS',
      phone_number: '3001234567',
      email: 'hola@arbol.co',
      fiscal_id_type: 'NIT',
      fiscal_id: '900123456',
      fiscal_business_name: 'Cafe Arbol S.A.S.',
    }])

    expect(bodyText()).toContain('Café Árbol SAS')
    expect(bodyText()).toContain('NIT 900123456')
    expect(bodyText()).not.toContain('Razón social / adquirente fiscal')
    expect(bodyText()).not.toContain('Cafe Arbol S.A.S.')

    wrapper.unmount()
  })

  it('keeps fiscal summary fields when the detail request fails', async () => {
    const summary: CustomerSummary = {
      id: 'fallback',
      name: 'Contacto operativo',
      phone_number: '3007654321',
      email: 'contacto@example.com',
      fiscal_id_type: 'NIT',
      fiscal_id: '901234567',
      fiscal_business_name: 'Adquirente Fiscal SAS',
    }
    const wrapper = mountModal()
    await searchFor(wrapper, [summary])
    fetchMock.mockRejectedValueOnce(new Error('detail unavailable'))

    const result = Array.from(document.body.querySelectorAll('button'))
      .find(button => (button.textContent || '').includes('Contacto operativo'))
    expect(result).toBeTruthy()
    result!.click()
    await flushPromises()

    expect(wrapper.emitted('customer-identified')?.[0]?.[0]).toMatchObject({
      id: 'fallback',
      name: 'Contacto operativo',
      phone_number: '3007654321',
      fiscal_id_type: 'NIT',
      fiscal_id: '901234567',
      fiscal_business_name: 'Adquirente Fiscal SAS',
      fiscal_email: null,
    })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])

    wrapper.unmount()
  })
})
