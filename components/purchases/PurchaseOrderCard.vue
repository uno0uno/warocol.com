<template>
  <div class="bg-surface rounded-xl only:transition-shadow border border-border h-full flex flex-col">
    <!-- Card Content -->
    <div class="p-5 flex-1 flex flex-col">

      <!-- Main Content with Dashed Border -->
      <div class="border-2 border-dashed border-border rounded-lg p-5 mb-4 flex-1">

        <!-- Header with Badge -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex-1 min-w-0">
            <h3 class="text-[17px] font-semibold text-text-primary mb-1">{{ order.numero }}</h3>
            <p class="text-sm font-normal text-text-primary opacity-50 truncate">{{ order.proveedor }}</p>
            <p v-if="order.invoice_number" class="text-sm font-normal text-text-primary opacity-50 mt-0.5">
              Factura: {{ order.invoice_number }}
            </p>
          </div>

          <!-- Status Badge -->
          <UiStatusBadge :value="statusText" format="text" :variant="statusVariant" size="sm" class="flex-shrink-0" />
        </div>

        <!-- Value Info -->
        <div class="flex items-end justify-between pt-3 mt-4 border-t border-border">
          <div>
            <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">Valor Total</p>
            <p class="text-[34px] font-bold text-text-primary leading-none">{{ formatCurrency(order.valorTotal) }}</p>
            <p class="text-sm font-normal text-text-primary opacity-50 mt-1">{{ formatTax(order.impuestos) }}</p>
          </div>
          <div class="text-right">
            <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">Entrega</p>
            <p class="text-sm font-medium text-text-primary opacity-65">
              {{ order.fechaEntrega ? formatDateShort(order.fechaEntrega) : 'Sin fecha' }}
            </p>
          </div>
        </div>

      </div>

      <!-- Footer Stats -->
      <div class="flex items-center justify-between">

        <!-- Stats Icons -->
        <div class="flex items-center gap-3">

          <!-- Items Count -->
          <div class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-text-primary opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span class="text-text-primary font-medium text-sm opacity-70">{{ order.totalItems }}</span>
          </div>

          <!-- Created Date -->
          <div class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-text-primary opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-text-primary text-sm opacity-65">{{ formatDateShort(order.fecha) }}</span>
          </div>

        </div>

        <!-- Edit Action -->
        <button @click="$emit('edit', order)"
          class="w-8 h-8 flex items-center justify-center bg-surface-secondary rounded-md text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          title="Editar orden">
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useFormatters } from '~/composables/useFormatters'

interface PurchaseOrder {
  id: string
  numero: string
  proveedor: string
  fecha: string
  fechaEntrega?: string
  valorTotal: number
  impuestos: number
  totalItems: number
  estado: string
  invoice_number?: string
}

interface Props {
  order: PurchaseOrder
}

interface Emits {
  (e: 'edit', order: PurchaseOrder): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Status mapping
const statusText = computed(() => {
  const texts: Record<string, string> = {
    quotation: 'Cotización',
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    preparing: 'En Preparación',
    shipped: 'Enviada',
    received: 'Recibida',
    verified: 'Verificada',
    invoiced: 'Facturada',
    paid: 'Pagada',
    cancelled: 'Cancelada'
  }
  return texts[props.order.estado] || 'Desconocido'
})

const statusVariant = computed(() => {
  const variants: Record<string, string> = {
    // 📋 Pre-compra (Gris - Neutral)
    quotation: 'secondary',
    // ⏳ Requiere acción (Amarillo/Naranja - Atención)
    pending: 'warning',
    // ✅ Confirmada (Primario - Importante pero en proceso)
    confirmed: 'primary',
    // 🔄 En preparación/tránsito (Azul - Informativo)
    preparing: 'info',
    shipped: 'info',
    // 📦 Recibida/Verificada (Verde - Éxito)
    received: 'success',
    verified: 'success',
    // 📄 Facturada (Gris - Neutral, esperando pago)
    invoiced: 'secondary',
    // 💰 Pagada (Verde - Completado)
    paid: 'success',
    // ❌ Problemas (Rojo - Destructivo)
    cancelled: 'destructive',
    overdue: 'destructive'
  }
  return variants[props.order.estado] || 'secondary'
})

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
