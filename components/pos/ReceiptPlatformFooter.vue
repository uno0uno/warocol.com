<script setup lang="ts">
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
</script>

<template>
  <div v-if="hasSoftware || showFacturador" class="receipt-platform-footer">
    <div class="receipt-divider">--------------------------------</div>

    <template v-if="hasSoftware">
      <div class="receipt-row receipt-small" style="font-weight:bold;">
        {{ software.role_label }}
      </div>
      <div v-if="software.commercial_name" class="receipt-row receipt-small">
        {{ software.commercial_name }}
      </div>
      <div v-if="software.nit" class="receipt-row receipt-small">
        NIT {{ software.nit }}
      </div>
      <div v-if="software.legal_name" class="receipt-row receipt-small">
        {{ software.legal_name }}
      </div>
      <div v-if="software.iva_responsibility_label" class="receipt-row receipt-small">
        {{ software.iva_responsibility_label }}
      </div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">
        {{ software.not_issuer_disclaimer }}
      </div>
    </template>

    <template v-if="showFacturador">
      <div class="receipt-divider receipt-small">--------------------------------</div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">
        {{ facturador.role_label }}
      </div>
      <div v-if="facturador.brand_name" class="receipt-row receipt-small">
        {{ facturador.brand_name }}
      </div>
      <div v-if="facturador.nit" class="receipt-row receipt-small">
        NIT {{ facturador.nit }}
      </div>
      <div v-if="facturador.legal_name" class="receipt-row receipt-small">
        {{ facturador.legal_name }}
      </div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">
        {{ facturador.not_issuer_disclaimer }}
      </div>
      <div class="receipt-row receipt-small">
        Emisor DIAN: establecimiento (tenant)
      </div>
    </template>

    <div
      v-if="documentKind === 'prefactura'"
      class="receipt-row receipt-small"
    >
      Prefactura del establecimiento (no es documento fiscal DIAN)
    </div>
    <div
      v-else-if="documentKind === 'sale'"
      class="receipt-row receipt-small"
    >
      Comprobante de venta del establecimiento
    </div>
  </div>
</template>
