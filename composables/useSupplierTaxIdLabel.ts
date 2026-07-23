/**
 * Country-aware supplier tax/document labels for WARO-supported countries
 * (see api COUNTRY_CURRENCY_PAIRS).
 *
 * Names follow local fiscal identifiers used for suppliers/businesses.
 */
export const useSupplierTaxIdLabel = () => {
  const { t, te } = useI18n({ useScope: 'global' })
  const { profile } = useTenantFinancialProfile()

  const countryCode = computed(() =>
    (profile.value?.country_code || '').toUpperCase(),
  )

  const taxIdLabel = computed(() => {
    const key = countryCode.value.toLowerCase()
    const path = `abastecimiento.common.taxIdLabel.${key}`
    if (key && te(path)) return t(path)
    return t('abastecimiento.common.taxIdLabel.fallback')
  })

  const taxIdPlaceholder = computed(() => {
    const key = countryCode.value.toLowerCase()
    const path = `abastecimiento.proveedorDetalle.taxIdPlaceholderByCountry.${key}`
    if (key && te(path)) return t(path)
    return t('abastecimiento.proveedorDetalle.taxIdPlaceholder')
  })

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
