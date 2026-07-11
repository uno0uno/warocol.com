<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
/**
 * Pie de documento: software WARO + (si FE) facturador Matias.
 * Datos desde backend platform_legal (env). Nunca hardcode de NIT/PII.
 * Emisor de la venta = tenant (cabecera), no este pie.
 */
import {
  EMPTY_PLATFORM_LEGAL,
  type PlatformLegalPrint,
} from '~/constants/waroLegalEntity'

const props = withDefaults(defineProps<{
  documentKind?: 'prefactura' | 'sale' | 'fe'
  platformLegal?: PlatformLegalPrint | null
}>(), {
  documentKind: 'sale',
  platformLegal: null,
})

const legal = computed(() => props.platformLegal ?? EMPTY_PLATFORM_LEGAL)
const software = computed(() => legal.value.software)
const facturador = computed(() => legal.value.facturador)

const hasSoftware = computed(() =>
  !!(software.value.commercial_name || software.value.nit || software.value.legal_name),
)

const hasFacturador = computed(() =>
  !!(facturador.value.brand_name || facturador.value.nit || facturador.value.legal_name),
)

const showFacturador = computed(() =>
  props.documentKind === 'fe' && hasFacturador.value,
)

const softwareRoleLabel = computed(() => {
  void locale.value
  // Prefer i18n for known platform roles when UI is not Spanish.
  if (locale.value === 'en') return t('pos.receipt.softwareRole')
  return software.value.role_label || t('pos.receipt.softwareRole')
})
const softwareNotIssuer = computed(() => {
  void locale.value
  if (locale.value === 'en') return t('pos.receipt.notIssuer')
  return software.value.not_issuer_disclaimer || t('pos.receipt.notIssuer')
})
const softwareIvaLabel = computed(() => {
  void locale.value
  const raw = software.value.iva_responsibility_label
  if (!raw) return null
  if (locale.value === 'en' && /no responsable de iva/i.test(raw)) return t('pos.receipt.notResponsibleIva')
  return raw
})
const facturadorRoleLabel = computed(() => {
  void locale.value
  if (locale.value === 'en') return t('pos.receipt.facturadorRole')
  return facturador.value.role_label || t('pos.receipt.facturadorRole')
})
const facturadorNotIssuer = computed(() => {
  void locale.value
  if (locale.value === 'en') return t('pos.receipt.notIssuer')
  return facturador.value.not_issuer_disclaimer || t('pos.receipt.notIssuer')
})
</script>

<template>
  <div v-if="hasSoftware || showFacturador" class="receipt-platform-footer">
    <div class="receipt-divider">--------------------------------</div>

    <template v-if="hasSoftware">
      <div class="receipt-row receipt-small" style="font-weight:bold;">
        {{ softwareRoleLabel }}
      </div>
      <div v-if="software.commercial_name" class="receipt-row receipt-small">
        {{ software.commercial_name }}
      </div>
      <div v-if="software.nit" class="receipt-row receipt-small">
        {{ t('pos.receipt.nitBare', { nit: software.nit }) }}
      </div>
      <div v-if="software.legal_name" class="receipt-row receipt-small">
        {{ software.legal_name }}
      </div>
      <div v-if="softwareIvaLabel" class="receipt-row receipt-small">
        {{ softwareIvaLabel }}
      </div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">
        {{ softwareNotIssuer }}
      </div>
    </template>

    <template v-if="showFacturador">
      <div class="receipt-divider receipt-small">--------------------------------</div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">
        {{ facturadorRoleLabel }}
      </div>
      <div v-if="facturador.brand_name" class="receipt-row receipt-small">
        {{ facturador.brand_name }}
      </div>
      <div v-if="facturador.nit" class="receipt-row receipt-small">
        {{ t('pos.receipt.nitBare', { nit: facturador.nit }) }}
      </div>
      <div v-if="facturador.legal_name" class="receipt-row receipt-small">
        {{ facturador.legal_name }}
      </div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">
        {{ facturadorNotIssuer }}
      </div>
      <div class="receipt-row receipt-small">
        {{ t('pos.receipt.dianIssuerTenant') }}
      </div>
    </template>

    <div
      v-if="documentKind === 'prefactura'"
      class="receipt-row receipt-small"
    >
      {{ t('pos.receipt.prefacturaEstablishment') }}
    </div>
    <div
      v-else-if="documentKind === 'sale'"
      class="receipt-row receipt-small"
    >
      {{ t('pos.receipt.saleReceiptEstablishment') }}
    </div>
  </div>
</template>
