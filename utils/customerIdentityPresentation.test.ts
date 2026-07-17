import { describe, expect, it } from 'vitest'
import {
  buildCustomerIdentityPresentation,
  formatFiscalIdentityLabel,
} from './customerIdentityPresentation.ts'

describe('buildCustomerIdentityPresentation', () => {
  it('separates the mixed Rebel Rebel contact from its fiscal acquirer', () => {
    const identity = buildCustomerIdentityPresentation({
      name: 'Medicion y Control sas',
      phone_number: '6044482986',
      email: 'facturacion@medicionycontrol.com.co',
      fiscal_business_name: 'Jaime Torres',
      fiscal_id_type: 'NIT',
      fiscal_id: '860502327',
      fiscal_email: 'compras@jaimetorres.net',
    })

    expect(identity.contact).toMatchObject({
      name: 'Medicion y Control sas',
      phone: '6044482986',
      email: 'facturacion@medicionycontrol.com.co',
    })
    expect(identity.acquirer).toMatchObject({
      name: 'Jaime Torres',
      fiscalIdType: 'NIT',
      fiscalId: '860502327',
      email: 'compras@jaimetorres.net',
    })
    expect(identity.identitiesDiffer).toBe(true)
    expect(identity.showSeparateAcquirer).toBe(true)
  })

  it('does not duplicate equivalent operational and fiscal identities', () => {
    const identity = buildCustomerIdentityPresentation({
      name: '  Café ÁRBOL SAS ',
      email: 'contacto@arbol.co',
      fiscal_business_name: 'Cafe Arbol S.A.S.',
      fiscal_id_type: 'NIT',
      fiscal_id: '900123456',
      fiscal_email: 'facturas@arbol.co',
    })

    expect(identity.identitiesDiffer).toBe(false)
    expect(identity.showSeparateAcquirer).toBe(false)
  })

  it('keeps a customer without fiscal data as contact only', () => {
    const identity = buildCustomerIdentityPresentation({
      name: 'Ana Pérez',
      phone_number: '3001234567',
      email: 'ana@example.com',
    })

    expect(identity.hasContact).toBe(true)
    expect(identity.hasFiscalIdentity).toBe(false)
    expect(identity.showSeparateAcquirer).toBe(false)
  })

  it('hides consumidor final as an operational contact', () => {
    const identity = buildCustomerIdentityPresentation({
      name: 'Consumidor final',
      phone_number: '0000000000',
    })

    expect(identity.anonymous).toBe(true)
    expect(identity.hasContact).toBe(false)
    expect(identity.hasFiscalIdentity).toBe(false)
  })

  it('uses the immutable invoice presentation as the fiscal source', () => {
    const identity = buildCustomerIdentityPresentation(
      {
        name: 'Perfil cambiado',
        fiscal_business_name: 'Dato actual',
        fiscal_id: '111',
      },
      {
        name: 'Adquirente DIAN',
        fiscal_id_type: 'NIT',
        fiscal_id: '860502327',
        email: 'dian@example.com',
      },
    )

    expect(formatFiscalIdentityLabel(identity.acquirer))
      .toBe('Adquirente DIAN · NIT 860502327 · dian@example.com')
  })
})
