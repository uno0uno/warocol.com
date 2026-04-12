<template>
  <div class="bg-surface rounded-xl transition-shadow border border-border h-full flex flex-col">
    <!-- Card Content -->
    <div class="p-5 flex-1 flex flex-col">

      <!-- Main Content with Dashed Border -->
      <div class="border-2 border-dashed border-border rounded-lg p-5 mb-4 flex-1">

        <!-- Header with Badges -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex-1 min-w-0">
            <h3 class="text-[17px] font-semibold text-text-primary mb-1">{{ invoice.numero }}</h3>
            <p class="text-sm font-normal text-text-primary opacity-50 truncate">{{ invoice.proveedor }}</p>
            <p class="text-sm font-normal text-text-primary opacity-50 mt-0.5">
              OC: {{ invoice.purchaseNumber }}
            </p>
            <p v-if="invoice.legalInvoiceNumber" class="text-sm font-normal text-success mt-1">
              Factura Legal: {{ invoice.legalInvoiceNumber }}
            </p>
          </div>

          <!-- Badges -->
          <div class="flex flex-col gap-2 items-end">
            <UiStatusBadge :value="invoice.tipo" format="text" variant="info" size="sm" class="flex-shrink-0" />
            <UiStatusBadge :value="statusText" format="text" :variant="statusVariant" size="sm" class="flex-shrink-0" />
          </div>
        </div>

        <!-- Value Info -->
        <div class="flex items-end justify-between pt-3 mt-4 border-t border-border">
          <div>
            <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">Monto Total</p>
            <p class="text-[34px] font-bold text-text-primary leading-none">{{ formatCurrency(invoice.monto) }}</p>
            <p class="text-sm font-normal text-text-primary opacity-50 mt-1">{{ formatTax(invoice.taxAmount) }}</p>
          </div>
          <div class="text-right">
            <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">Fecha</p>
            <p class="text-sm font-medium text-text-primary opacity-65">
              {{ formatDateShort(invoice.fecha) }}
            </p>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between">
        <!-- Checkbox for Remisiones -->
        <div v-if="invoice.documentType === 'remision'">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="isSelected"
              @change="$emit('toggle-selection', invoice)"
              class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
            />
            <span class="text-sm text-text-primary opacity-70">Seleccionar</span>
          </label>
        </div>
        <div v-else></div>

        <!-- View Button -->
        <button @click="$emit('view', invoice)"
          class="w-8 h-8 flex items-center justify-center bg-surface-secondary rounded-md text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          title="Ver factura">
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useFormatters } from '~/composables/useFormatters'

interface Invoice {
  id: string
  numero: string
  proveedor: string
  purchaseNumber: string
  tipo: string
  documentType: string
  fecha: string
  monto: number
  taxAmount: number
  estado: string
  legalInvoiceNumber?: string
  legalInvoiceDate?: string
}

interface Props {
  invoice: Invoice
  isSelected?: boolean
}

interface Emits {
  (e: 'view', invoice: Invoice): void
  (e: 'toggle-selection', invoice: Invoice): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Use composable for status
const { getStatusText, getStatusVariant } = usePurchaseStatus()

const statusText = computed(() => getStatusText(props.invoice.estado))
const statusVariant = computed(() => getStatusVariant(props.invoice.estado))

// Format helpers
const formatCurrency = (value: number): string => {
  const thousands = value / 1000
  return `$${thousands.toFixed(1)}K`
}

const formatTax = (value: number): string => {
  const thousands = value / 1000
  return `+$${thousands.toFixed(1)}K IVA`
}

const { formatDate: formatDateShort } = useFormatters()
</script>
