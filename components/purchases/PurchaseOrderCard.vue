<template>
  <div class="bg-surface rounded-xl shadow-md hover:shadow-lg transition-shadow border border-border">
    <!-- Card Content -->
    <div class="p-4">

      <!-- Main Content with Dashed Border -->
      <div class="border-2 border-dashed border-border rounded-lg p-3 mb-3">

        <!-- Header with Badge -->
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-bold text-text-primary mb-1">{{ order.numero }}</h3>
            <p class="text-text-secondary text-xs truncate">{{ order.proveedor }}</p>
            <p v-if="order.invoice_number" class="text-xs text-muted-foreground mt-0.5">
              Factura: {{ order.invoice_number }}
            </p>
          </div>

          <!-- Status Badge -->
          <UiStatusBadge
            :value="statusText"
            format="text"
            :variant="statusVariant"
            size="sm"
            class="flex-shrink-0"
          />
        </div>

        <!-- Value Info -->
        <div class="flex items-end justify-between pt-2 border-t border-border">
          <div>
            <p class="text-xs text-muted-foreground mb-0.5">Valor Total</p>
            <p class="text-xl font-bold text-text-primary">{{ formatCurrency(order.valorTotal) }}</p>
            <p class="text-xs text-muted-foreground">{{ formatTax(order.impuestos) }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-muted-foreground mb-0.5">Entrega</p>
            <p class="text-xs font-medium text-text-secondary">
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
          <div class="flex items-center gap-1">
            <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            <span class="text-text-primary font-semibold text-xs">{{ order.totalItems }}</span>
          </div>

          <!-- Created Date -->
          <div class="flex items-center gap-1">
            <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span class="text-text-secondary text-xs">{{ formatDateShort(order.fecha) }}</span>
          </div>

        </div>

        <!-- Edit Action -->
        <button
          @click="$emit('edit', order)"
          class="flex items-center gap-1 px-2 py-1 text-primary hover:bg-accent rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          title="Editar orden"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          <span class="text-xs font-medium">Editar</span>
        </button>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
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
    quotation: 'info',
    pending: 'warning',
    confirmed: 'success',
    preparing: 'info',
    shipped: 'info',
    received: 'success',
    verified: 'success',
    invoiced: 'secondary',
    paid: 'success',
    cancelled: 'destructive'
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

const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric'
  })
}
</script>
