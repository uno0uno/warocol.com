<script setup lang="ts">
import type { ComandaPrintPayload } from '~/composables/useComandaPrint'
import { formatComandaModifierLabel, formatComandaPrintTime } from '~/composables/useComandaPrint'

const props = defineProps<{
  comandas: ComandaPrintPayload[]
  businessName?: string
}>()

function modifierLines(item: ComandaPrintPayload['items'][0]) {
  return item.modifiers_snapshot ?? []
}
</script>

<template>
  <div id="pos-comanda-print" aria-hidden="true">
    <div
      v-for="(c, idx) in comandas"
      :key="c.id || `${c.comanda_number}-${idx}`"
      class="comanda-ticket"
    >
      <div class="receipt-header">{{ businessName || 'WARO' }}</div>
      <div class="receipt-row receipt-small">*** COMANDA COCINA ***</div>
      <div class="receipt-row receipt-small">{{ formatComandaPrintTime(c.fired_at) }}</div>
      <div v-if="c.table_display_name" class="receipt-row receipt-small">
        {{ c.table_display_name }}
      </div>
      <div v-if="c.station_name" class="receipt-row receipt-small">
        Estación: {{ c.station_name }}
      </div>
      <div class="receipt-row receipt-small">
        Comanda #{{ c.comanda_number }}
      </div>
      <div class="receipt-divider">--------------------------------</div>
      <div v-for="(item, i) in c.items" :key="i" class="receipt-item receipt-small">
        <span class="comanda-item-qty">{{ item.quantity }}×</span>
        <span class="comanda-item-name">{{ item.kitchen_name }}</span>
      </div>
      <template v-for="(item, i) in c.items" :key="`mod-${i}`">
        <div
          v-for="(mod, mi) in modifierLines(item)"
          :key="`${i}-${mi}`"
          class="receipt-row receipt-small"
          style="padding-left: 8px;"
        >
          ↳ {{ formatComandaModifierLabel(mod, { includePrice: true }) }}
        </div>
        <div v-if="item.notes" class="receipt-row receipt-small" style="padding-left: 8px;">
          Notas Especiales: {{ item.notes }}
        </div>
      </template>
    </div>
  </div>
</template>

<style>
#pos-comanda-print {
  display: none;
}

.comanda-ticket {
  margin-bottom: 4mm;
}

.comanda-ticket .receipt-header { font-size: 1.1em; font-weight: bold; text-align: center; margin-bottom: 4px; }
.comanda-ticket .receipt-row { text-align: center; margin: 2px 0; }
.comanda-ticket .receipt-divider { letter-spacing: 0; margin: 4px 0; text-align: center; }
.comanda-ticket .receipt-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 6px 0;
  font-size: 1.12em;
  font-weight: 700;
}
.comanda-ticket .receipt-footer { text-align: center; margin-top: 6px; }
.comanda-ticket .receipt-small { font-size: 0.9em; }
.comanda-ticket .comanda-item-qty {
  flex-shrink: 0;
  min-width: 9mm;
  font-size: 1.65em;
  font-weight: 900;
  line-height: 1;
  text-align: right;
}
.comanda-ticket .comanda-item-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media print {
  body.printing-comanda * { visibility: hidden; }
  body.printing-comanda #pos-comanda-print,
  body.printing-comanda #pos-comanda-print * { visibility: visible !important; }

  body.printing-comanda #pos-receipt,
  body.printing-comanda #pos-prefactura { display: none !important; }

  #pos-comanda-print {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    line-height: 1.25;
    width: 54mm;
    color: #000;
    background: #fff;
    padding: 2mm;
  }

  .comanda-ticket {
    page-break-after: always;
  }

  .comanda-ticket:last-child {
    page-break-after: auto;
  }

  @page {
    size: 58mm auto;
    margin: 2mm;
  }
}
</style>
