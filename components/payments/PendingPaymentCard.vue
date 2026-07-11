<template>
  <div class="bg-surface rounded-xl shadow-md hover:shadow-lg transition-shadow border border-border h-full flex flex-col">
    <div class="p-5 flex-1 flex flex-col">
      <!-- Main Content with Dashed Border -->
      <div class="border-2 border-dashed border-border rounded-lg p-5 mb-4 flex-1">
        <!-- Header with Checkbox and Badge -->
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <!-- Checkbox -->
            <input
              type="checkbox"
              :checked="isSelected"
              @change="$emit('toggle-selection', payment.purchaseData)"
              class="mt-1 h-4 w-4 text-primary focus:ring-primary border-border rounded cursor-pointer flex-shrink-0"
            />

            <!-- Order Info -->
            <div class="flex-1 min-w-0">
              <h3 class="text-[17px] font-semibold text-text-primary mb-1">{{ payment.orden }}</h3>
              <p class="text-sm font-normal text-text-primary opacity-50">{{ payment.proveedor }}</p>
              <p class="text-sm font-normal text-text-primary opacity-50 mt-0.5">{{ payment.fecha }}</p>
            </div>
          </div>

          <!-- Overdue Badge -->
          <span v-if="payment.estaVencido" class="flex-shrink-0 px-3 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive">
            {{ t('finanzas.pagos.overdue') }}
          </span>
          <span v-else-if="payment.vencimiento !== '-'" class="flex-shrink-0 px-3 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning">
            {{ t('finanzas.pagos.dueSoon') }}
          </span>
        </div>

        <!-- Invoice Info -->
        <div v-if="payment.factura" class="mb-3 pb-3 mt-4 border-b border-border">
          <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">{{ t('finanzas.pagos.colInvoice') }}</p>
          <p class="text-sm font-normal text-text-primary opacity-65">{{ payment.factura }}</p>
          <p class="text-sm font-normal text-text-primary opacity-65">{{ payment.fechaFactura }}</p>
        </div>

        <!-- Amount and Due Date -->
        <div class="flex items-end justify-between pt-3 mt-4 border-t border-border">
          <div>
            <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">{{ t('finanzas.pagos.colAmount') }}</p>
            <p class="text-[34px] font-bold text-text-primary leading-none">{{ formatCurrency(payment.monto) }}</p>
          </div>
          <div class="text-right">
            <p class="text-[13px] font-medium text-text-primary opacity-70 mb-1.5">{{ t('finanzas.pagos.colDue') }}</p>
            <p class="text-sm font-medium" :class="payment.estaVencido ? 'text-destructive' : 'text-text-primary opacity-65'">
              {{ payment.vencimiento }}
            </p>
          </div>
        </div>
      </div>

      <!-- Footer Action -->
      <button
        @click="$emit('pay', payment.purchaseData)"
        class="w-full btn-secondary px-4 py-3.5 rounded-lg text-base font-semibold text-center"
      >
        {{ t('finanzas.pagos.register') }}
      </button>
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
  monto: number
  vencimiento: string
  estaVencido: boolean
  purchaseData: any
}

interface Props {
  payment: Payment
  isSelected: boolean
}

interface Emits {
  (e: 'toggle-selection', purchase: any): void
  (e: 'pay', purchase: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n({ useScope: 'global' })
const { formatCurrency } = useFormatters()
</script>
