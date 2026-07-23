/**
 * Country-aware supplier tax/document labels.
 * CO → NIT/Cédula, MX → RFC/CURP, else → Tax ID / Documento fiscal.
 */
export const useSupplierTaxIdLabel = () => {
  const { t } = useI18n({ useScope: 'global' })
  const { profile } = useTenantFinancialProfile()

  const countryCode = computed(() =>
    (profile.value?.country_code || '').toUpperCase(),
  )

  const taxIdLabel = computed(() => {
    if (countryCode.value === 'CO') {
      return t('abastecimiento.common.taxIdLabel.co')
    }
    if (countryCode.value === 'MX') {
      return t('abastecimiento.common.taxIdLabel.mx')
    }
    return t('abastecimiento.common.taxIdLabel.fallback')
  })

  const taxIdPlaceholder = computed(() =>
    t('abastecimiento.proveedorDetalle.taxIdPlaceholder'),
  )

  const noTaxIdLabel = computed(() => t('abastecimiento.proveedorDetalle.noTaxId'))

  return {
    countryCode,
    taxIdLabel,
    taxIdPlaceholder,
    noTaxIdLabel,
  }
}

/** Normalize optional contact/tax fields so empty strings become null for the API. */
export const normalizeOptionalSupplierFields = <T extends {
  tax_id?: string | null
  email?: string | null
  phone?: string | null
}>(payload: T): T => ({
  ...payload,
  tax_id: payload.tax_id?.trim() ? payload.tax_id.trim() : null,
  email: payload.email?.trim() ? payload.email.trim() : null,
  phone: payload.phone?.trim() ? payload.phone.trim() : null,
})
