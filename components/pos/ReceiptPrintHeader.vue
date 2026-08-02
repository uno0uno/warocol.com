<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { buildReceiptLogoStyle } from '~/utils/receiptPrintConfig'
import { joinReceiptParts } from '~/utils/receiptTicketPlainText'

const props = defineProps<{
  fiscalData?: {
    business_name?: string | null
    nit?: string | null
    fiscal_address?: string | null
    city?: string | null
    phone?: string | null
    email?: string | null
  } | null
  displayName?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
  logoUrl?: string | null
}>()

/**
 * Cabecera del establecimiento (tenant) — emisor comercial / vendedor.
 * Compact thermal chrome: fewer blank lines (#2054).
 */
const headerName = computed(() =>
  props.fiscalData?.business_name?.trim()
  || props.displayName?.trim()
  || '—',
)

const displayAddress = computed(() =>
  props.fiscalData?.fiscal_address || props.address || null,
)

const displayCity = computed(() =>
  props.fiscalData?.city || props.city || null,
)

const displayPhone = computed(() =>
  props.fiscalData?.phone || props.phone || null,
)

const sellerNit = computed(() => props.fiscalData?.nit?.trim() || null)

const addressLine = computed(() => {
  const address = String(displayAddress.value ?? '').trim()
  const city = String(displayCity.value ?? '').trim()
  if (address && city) return `${address}, ${city}`
  return address || city || null
})

/** Role + NIT + tel + email on one dense line. */
const metaLine = computed(() => joinReceiptParts([
  t('pos.receipt.establishmentSeller'),
  sellerNit.value ? t('pos.receipt.nit', { nit: sellerNit.value }) : null,
  displayPhone.value ? t('pos.receipt.tel', { phone: displayPhone.value }) : null,
  props.fiscalData?.email?.trim() || null,
]))

const logoStyle = computed(() => buildReceiptLogoStyle())
</script>

<template>
  <div class="receipt-print-header">
    <img
      v-if="logoUrl"
      :src="logoUrl"
      alt=""
      class="receipt-logo"
      :style="logoStyle"
    >
    <div class="receipt-header">{{ headerName }}</div>
    <div v-if="metaLine" class="receipt-row receipt-small">{{ metaLine }}</div>
    <div v-if="addressLine" class="receipt-row receipt-small">{{ addressLine }}</div>
  </div>
</template>

<style>
.receipt-print-header .receipt-logo {
  max-width: min(var(--receipt-logo-max-width, 42mm), 100%);
  max-height: var(--receipt-logo-max-height, 24mm);
  display: block;
  margin: var(--receipt-logo-margin, 0 auto 1mm);
  object-fit: contain;
  object-position: center top;
  filter: grayscale(100%);
  -webkit-filter: grayscale(100%);
}
.receipt-print-header .receipt-header {
  margin-bottom: 1px;
}
</style>
