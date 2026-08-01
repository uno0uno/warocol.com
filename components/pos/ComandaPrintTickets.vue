<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { computed } from 'vue'
import type { ComandaPrintPayload } from '~/composables/useComandaPrint'
import { buildComandaTicketPlainText } from '~/composables/useComandaPrint'

const props = defineProps<{
  comandas: ComandaPrintPayload[]
  businessName?: string
}>()

const { formatDateTime } = useFormatters()

const ticketPlainText = computed(() => {
  if (!props.comandas.length) return ''
  return buildComandaTicketPlainText(props.comandas, {
    businessName: props.businessName || 'WARO',
    title: `*** ${t('pos.printTicket.title')} ***`,
    comandaLabel: (numbers) => t('pos.printTicket.comanda', { numbers }),
    stationLabel: (name) => t('pos.printTicket.station', { name }),
    noStationLabel: t('pos.printTicket.noStation'),
    specialNotesLabel: t('pos.printTicket.specialNotes'),
    // Kitchen tickets: name/qty only — no modifier prices (#1977)
    formatTime: (firedAt) => formatDateTime(firedAt ?? new Date().toISOString()),
  })
})
</script>

<template>
  <Teleport to="body">
    <div id="pos-comanda-print" aria-hidden="true">
      <!--
        Plain <pre> with explicit newlines (#1975). Thermal Windows drivers often
        concatenate adjacent HTML blocks (19:05Mesa) and turn ↳/× into "?".
      -->
      <pre
        v-if="ticketPlainText"
        class="comanda-ticket-pre"
      >{{ ticketPlainText }}</pre>
    </div>
  </Teleport>
</template>

<style>
#pos-comanda-print {
  display: none;
}

.comanda-ticket-pre {
  margin: 0;
  padding: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  font-family: 'Courier New', Courier, monospace;
  font-size: 9pt;
  line-height: 1.3;
  color: #000;
  background: #fff;
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
    width: 54mm;
    color: #000;
    background: #fff;
    padding: 2mm;
    margin: 0 !important;
  }

  #pos-comanda-print .comanda-ticket-pre {
    display: block !important;
    width: 100%;
  }

  @page {
    size: 58mm auto;
    margin: 2mm;
  }
}
</style>
