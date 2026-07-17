export type CustomerIdentitySource = {
  name?: string | null
  phone_number?: string | null
  phone?: string | null
  email?: string | null
  fiscal_business_name?: string | null
  fiscal_id_type?: string | null
  fiscal_id?: string | null
  fiscal_email?: string | null
}

export type InvoiceAcquirerSource = {
  name?: string | null
  fiscal_id_type?: string | null
  fiscal_id?: string | null
  email?: string | null
}

export type PresentedIdentity = {
  name: string | null
  phone: string | null
  email: string | null
  fiscalIdType: string | null
  fiscalId: string | null
}

const clean = (value?: string | null) => {
  const trimmed = String(value ?? '').trim()
  return trimmed || null
}

const comparisonKey = (value?: string | null) =>
  clean(value)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLocaleLowerCase() ?? null

const isAnonymousPhone = (phone?: string | null) =>
  String(phone ?? '').replace(/\D/g, '') === '0000000000'

export function areIdentityValuesEquivalent(
  operational: Pick<PresentedIdentity, 'name' | 'email'>,
  fiscal: Pick<PresentedIdentity, 'name' | 'email'>,
) {
  const operationalName = comparisonKey(operational.name)
  const fiscalName = comparisonKey(fiscal.name)
  if (operationalName && fiscalName) return operationalName === fiscalName

  const operationalEmail = comparisonKey(operational.email)
  const fiscalEmail = comparisonKey(fiscal.email)
  if (operationalEmail && fiscalEmail) return operationalEmail === fiscalEmail

  return false
}

export function buildCustomerIdentityPresentation(
  customer?: CustomerIdentitySource | null,
  invoiceAcquirer?: InvoiceAcquirerSource | null,
) {
  const phone = clean(customer?.phone_number ?? customer?.phone)
  const anonymous = isAnonymousPhone(phone)
  const contact: PresentedIdentity = {
    name: anonymous ? null : clean(customer?.name),
    phone: anonymous ? null : phone,
    email: anonymous ? null : clean(customer?.email),
    fiscalIdType: null,
    fiscalId: null,
  }

  const hasInvoiceAcquirer = Boolean(invoiceAcquirer)
  const hasCustomerFiscalData = Boolean(
    clean(customer?.fiscal_business_name)
      || clean(customer?.fiscal_id)
      || clean(customer?.fiscal_email),
  )
  const hasFiscalIdentity = hasInvoiceAcquirer || hasCustomerFiscalData
  const acquirer: PresentedIdentity = {
    name: hasInvoiceAcquirer
      ? clean(invoiceAcquirer?.name)
      : (hasCustomerFiscalData ? clean(customer?.fiscal_business_name) || contact.name : null),
    phone: null,
    email: hasInvoiceAcquirer
      ? clean(invoiceAcquirer?.email)
      : (hasCustomerFiscalData ? clean(customer?.fiscal_email) : null),
    fiscalIdType: hasInvoiceAcquirer
      ? clean(invoiceAcquirer?.fiscal_id_type)
      : (hasCustomerFiscalData ? clean(customer?.fiscal_id_type) : null),
    fiscalId: hasInvoiceAcquirer
      ? clean(invoiceAcquirer?.fiscal_id)
      : (hasCustomerFiscalData ? clean(customer?.fiscal_id) : null),
  }
  const equivalent = hasFiscalIdentity && areIdentityValuesEquivalent(contact, acquirer)

  return {
    contact,
    acquirer,
    anonymous,
    hasContact: Boolean(contact.name || contact.phone || contact.email),
    hasFiscalIdentity,
    identitiesDiffer: hasFiscalIdentity && !equivalent,
    showSeparateAcquirer: hasFiscalIdentity && !equivalent,
  }
}

export function formatFiscalIdentityLabel(identity: PresentedIdentity) {
  const fiscalId = [identity.fiscalIdType, identity.fiscalId].filter(Boolean).join(' ')
  return [identity.name, fiscalId, identity.email].filter(Boolean).join(' · ') || null
}
