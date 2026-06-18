<script setup lang="ts">
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

const headerName = computed(() =>
  props.fiscalData?.business_name || props.displayName || 'WARO',
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
</script>

<template>
  <div class="receipt-print-header">
    <img
      v-if="logoUrl"
      :src="logoUrl"
      alt=""
      class="receipt-logo"
    >
    <div class="receipt-header">{{ headerName }}</div>
    <div v-if="fiscalData?.nit" class="receipt-row receipt-small">
      NIT: {{ fiscalData.nit }}
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
  max-width: 66mm;
  max-height: 54mm;
  display: block;
  margin: 0 auto 4px;
  object-fit: contain;
  filter: grayscale(100%);
  -webkit-filter: grayscale(100%);
}
</style>
