<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
/**
 * Pie de documento: software WARO + (si FE) facturador Matias.
 * Compact thermal chrome (#2054) — legal fields kept, fewer blank lines.
 */
import {
  EMPTY_PLATFORM_LEGAL,
  type PlatformLegalPrint,
} from '~/constants/waroLegalEntity'
import { joinReceiptParts, receiptSectionSeparator } from '~/utils/receiptTicketPlainText'

const props = withDefaults(defineProps<{
  documentKind?: 'prefactura' | 'sale' | 'fe'
  platformLegal?: PlatformLegalPrint | null
  /** When true, show DIAN-specific footers (CO FE tenants). */
  matiasDian?: boolean
}>(), {
  documentKind: 'sale',
  platformLegal: null,
  matiasDian: false,
})

const sectionSeparator = receiptSectionSeparator()

const legal = computed(() => props.platformLegal ?? EMPTY_PLATFORM_LEGAL)
const software = computed(() => legal.value.software)
const facturador = computed(() => legal.value.facturador)

const hasSoftware = computed(() =>
  !!(software.value.commercial_name || software.value.nit || software.value.website),
)

const hasFacturador = computed(() =>
  !!(facturador.value.brand_name || facturador.value.nit || facturador.value.legal_name),
)

const showFacturador = computed(() =>
  props.documentKind === 'fe' && hasFacturador.value,
)

const softwareRoleLabel = computed(() => {
  void locale.value
  if (locale.value !== 'es') return t('pos.receipt.softwareRole')
  return software.value.role_label || t('pos.receipt.softwareRole')
})
const softwareNotIssuer = computed(() => {
  void locale.value
  if (locale.value !== 'es') return t('pos.receipt.notIssuer')
  return software.value.not_issuer_disclaimer || t('pos.receipt.notIssuer')
})
const softwareIvaLabel = computed(() => {
  void locale.value
  const raw = software.value.iva_responsibility_label
  if (!raw) return null
  if (locale.value !== 'es' && /no responsable de iva/i.test(raw)) return t('pos.receipt.notResponsibleIva')
  return raw
})
const facturadorRoleLabel = computed(() => {
  void locale.value
  if (locale.value !== 'es') return t('pos.receipt.facturadorRole')
  return facturador.value.role_label || t('pos.receipt.facturadorRole')
})
const facturadorNotIssuer = computed(() => {
  void locale.value
  if (locale.value !== 'es') return t('pos.receipt.notIssuer')
  return facturador.value.not_issuer_disclaimer || t('pos.receipt.notIssuer')
})

const softwareLine = computed(() => joinReceiptParts([
  softwareRoleLabel.value,
  software.value.commercial_name,
  software.value.nit ? t('pos.receipt.nitBare', { nit: software.value.nit }) : null,
  software.value.website,
  softwareIvaLabel.value,
  softwareNotIssuer.value,
]))

const facturadorLine = computed(() => joinReceiptParts([
  facturadorRoleLabel.value,
  facturador.value.brand_name,
  facturador.value.nit ? t('pos.receipt.nitBare', { nit: facturador.value.nit }) : null,
  facturador.value.legal_name,
  facturadorNotIssuer.value,
  t('pos.receipt.dianIssuerTenant'),
]))
</script>

<template>
  <div v-if="hasSoftware || showFacturador" class="receipt-platform-footer">
    <div class="receipt-plain-line receipt-small">{{ sectionSeparator }}</div>

    <div v-if="hasSoftware && softwareLine" class="receipt-row receipt-small">
      {{ softwareLine }}
    </div>

    <template v-if="showFacturador && facturadorLine">
      <div class="receipt-plain-line receipt-small">{{ sectionSeparator }}</div>
      <div class="receipt-row receipt-small">
        {{ facturadorLine }}
      </div>
    </template>

    <div
      v-if="documentKind === 'prefactura'"
      class="receipt-row receipt-small"
    >
      {{ matiasDian
        ? t('pos.receipt.prefacturaEstablishment')
        : t('pos.receipt.prefacturaEstablishmentNeutral') }}
    </div>
    <div
      v-else-if="documentKind === 'sale'"
      class="receipt-row receipt-small"
    >
      {{ t('pos.receipt.saleReceiptEstablishment') }}
    </div>
  </div>
</template>

<style scoped>
.receipt-platform-footer .receipt-row {
  text-align: start;
}
</style>
