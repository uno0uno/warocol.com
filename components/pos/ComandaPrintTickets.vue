<script setup lang="ts">
import { computed } from 'vue'
import type { ComandaPrintPayload } from '~/composables/useComandaPrint'
import { formatComandaModifierLabel, formatComandaPrintTime } from '~/composables/useComandaPrint'

const props = defineProps<{
  comandas: ComandaPrintPayload[]
  businessName?: string
}>()

const { timezone } = useTenantTimezone()

function modifierLines(item: ComandaPrintPayload['items'][0]) {
  return item.modifiers_snapshot ?? []
}

function formatTicketTime(firedAt?: string | null) {
  return formatComandaPrintTime(firedAt, timezone.value)
}

const printTicket = computed(() => {
  const first = props.comandas[0]
  if (!first) return null

  const comandaNumbers = [
    ...new Set(props.comandas.map(c => String(c.comanda_number ?? '—'))),
  ]

  const sections: Array<{
    key: string
    stationName: string
    items: ComandaPrintPayload['items']
  }> = []
  const sectionByStation = new Map<string, (typeof sections)[number]>()

  for (const comanda of props.comandas) {
    const stationName = comanda.station_name || 'Sin cocina asignada'
    let section = sectionByStation.get(stationName)
    if (!section) {
      section = {
        key: `${stationName}-${sections.length}`,
        stationName,
        items: [],
      }
      sectionByStation.set(stationName, section)
      sections.push(section)
    }
    section.items.push(...comanda.items)
  }

  return {
    firedAt: first.fired_at,
    tableDisplayName: first.table_display_name,
    comandaNumbers,
    sections,
  }
})
</script>

<template>
  <Teleport to="body">
    <div id="pos-comanda-print" aria-hidden="true">
      <div
        v-if="printTicket"
        class="comanda-ticket"
      >
        <div class="receipt-header">{{ businessName || 'WARO' }}</div>
        <div class="receipt-row receipt-small">*** COMANDA POS ***</div>
        <div class="receipt-row receipt-small">{{ formatTicketTime(printTicket.firedAt) }}</div>
        <div v-if="printTicket.tableDisplayName" class="receipt-row receipt-small">
          {{ printTicket.tableDisplayName }}
        </div>
        <div class="receipt-row receipt-small">
          Comanda #{{ printTicket.comandaNumbers.join(', ') }}
        </div>
        <div class="receipt-divider">--------------------------------</div>

        <section
          v-for="section in printTicket.sections"
          :key="section.key"
          class="comanda-station-section"
        >
          <div class="receipt-row receipt-small station-title">
            Estación: {{ section.stationName }}
          </div>
          <template v-for="(item, i) in section.items" :key="`${section.key}-${i}`">
            <div class="receipt-item receipt-small">
              <span class="comanda-item-qty">{{ item.quantity }}×</span>
              <span class="comanda-item-name">{{ item.kitchen_name }}</span>
            </div>
            <div
              v-for="(mod, mi) in modifierLines(item)"
              :key="`${section.key}-${i}-${mi}`"
              class="receipt-row receipt-small item-detail"
            >
              ↳ {{ formatComandaModifierLabel(mod, { includePrice: true }) }}
            </div>
            <div v-if="item.notes" class="receipt-row receipt-small item-detail">
              Notas Especiales: {{ item.notes }}
            </div>
          </template>
        </section>
      </div>
    </div>
  </Teleport>
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
.comanda-ticket .comanda-station-section {
  margin-top: 7px;
  padding-top: 5px;
  border-top: 1px dashed #000;
}
.comanda-ticket .comanda-station-section:first-of-type {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}
.comanda-ticket .station-title {
  font-weight: 900;
  text-align: left;
}
.comanda-ticket .item-detail {
  padding-left: 8px;
}
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
  body.printing-comanda > :not(#pos-comanda-print) {
    display: none !important;
  }

  body.printing-comanda * { visibility: hidden !important; }
  body.printing-comanda #pos-comanda-print,
  body.printing-comanda #pos-comanda-print * { visibility: visible !important; }

  body.printing-comanda #pos-receipt,
  body.printing-comanda #pos-prefactura { display: none !important; }

  #pos-comanda-print {
    display: block !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    line-height: 1.25;
    width: 54mm;
    color: #000;
    background: #fff;
    padding: 2mm;
    margin: 0 !important;
  }

  @page {
    size: 58mm auto;
    margin: 2mm;
  }
}
</style>
