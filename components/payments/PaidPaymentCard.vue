<template>
  <div class="bg-surface rounded-xl shadow-md transition-shadow border border-border h-full"
    :class="payment.isHighlighted ? 'shadow-success/20 border-success animate-pulse' : 'hover:shadow-lg'">
    <div class="p-5 h-full">
      <!-- Main Content with Dashed Border -->
      <div class="border-2 border-dashed border-border rounded-lg p-5">
        <!-- Header with Badge -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex-1 min-w-0">
            <h3 class="text-[17px] font-semibold text-text-primary mb-1">{{ payment.orden }}</h3>
            <p class="text-sm font-normal text-text-primary opacity-50">{{ payment.proveedor }}</p>
            <p class="text-sm font-normal text-text-primary opacity-50 mt-0.5">{{ payment.fecha }}</p>
          </div>

          <!-- Paid Badge -->
          <span :class="[
            'flex-shrink-0 px-3 py-1 rounded-md text-xs font-medium',
            payment.isHighlighted
              ? 'bg-success/30 text-success border-2 border-success'
              : 'bg-success/10 text-success'
          ]">
            {{ payment.isHighlighted ? '✓ Pagado' : 'Pagado' }}
          </span>
        </div>

        <!-- Invoice Info -->
        <div v-if="payment.factura" class="mb-3 pb-3 mt-4 border-b border-border">
          <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">Factura</p>
          <p class="text-sm font-normal text-text-primary opacity-65">{{ payment.factura }}</p>
          <p class="text-sm font-normal text-text-primary opacity-65">{{ payment.fechaFactura }}</p>
        </div>

        <!-- Payment Details -->
        <div class="space-y-3">
          <div class="flex items-end justify-between pt-3 mt-4 border-t border-border">
            <div>
              <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">Monto Pagado</p>
              <p class="text-[34px] font-bold text-text-primary leading-none">{{ formatCurrency(payment.montoPagado) }}</p>
            </div>
            <div class="text-right">
              <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">Fecha de Pago</p>
              <p class="text-sm font-medium text-text-primary opacity-65">{{ payment.fechaPago }}</p>
            </div>
          </div>

          <!-- Payment Method -->
          <div v-if="payment.metodo" class="pt-3 border-t border-border">
            <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">Método de Pago</p>
            <p class="text-sm font-medium text-text-primary opacity-65 capitalize">{{ payment.metodo }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Payment {
  orden: string
  fecha: string
  proveedor: string
  factura?: string
  fechaFactura?: string
  montoPagado: number
  fechaPago: string
  metodo?: string
  isHighlighted: boolean
  purchaseData: any
}

interface Props {
  payment: Payment
}

const props = defineProps<Props>()

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}
</script>
