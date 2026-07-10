<script setup lang="ts">
import { buildReceiptLogoStyle } from '~/utils/receiptPrintConfig'

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
 * Según práctica Colombia: nombre o razón social + NIT del establecimiento.
 * WARO no va aquí (ver ReceiptPlatformFooter).
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
    <div class="receipt-row receipt-small" style="font-weight:bold;">
      Establecimiento / vendedor
    </div>
    <div v-if="sellerNit" class="receipt-row receipt-small">
      NIT: {{ sellerNit }}
    </div>
    <div v-if="displayAddress" class="receipt-row receipt-small">
      {{ displayAddress }}<span v-if="displayCity">, {{ displayCity }}</span>
    </div>
    <div v-if="displayPhone" class="receipt-row receipt-small">
      Tel: {{ displayPhone }}
    </div>
    <div v-if="fiscalData?.email" class="receipt-row receipt-small">
      {{ fiscalData.email }}
    </div>
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
</style>
