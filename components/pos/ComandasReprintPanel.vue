<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-40 bg-overlay-backdrop/40" aria-hidden="true" @click="close" />
    </Transition>

    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        :aria-label="labels.title"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-lg md:max-h-none md:h-full"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-sheet-border" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-5 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.7" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3.75h10.5A2.25 2.25 0 0 1 19.5 6v14.25l-2.625-1.5-2.625 1.5-2.625-1.5-2.625 1.5-2.625-1.5-2.625 1.5V6a2.25 2.25 0 0 1 2.25-2.25Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 8.25h7.5M8.25 12h7.5M8.25 15.75h4.5" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">{{ labels.title }}</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5 truncate">
                  {{ tableDisplayName || labels.sessionCurrent }}
                  · {{ comandas.length }}
                  {{ comandas.length === 1 ? labels.ticketOne : labels.ticketMany }}
                </p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="labels.closePanelAria"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4">
          <div v-if="loading" class="space-y-2.5">
            <div v-for="i in 4" :key="i" class="h-20 rounded-xl bg-surface-secondary animate-pulse" />
          </div>

          <div
            v-else-if="comandas.length === 0"
            class="rounded-xl border border-border bg-surface-secondary/50 px-4 py-6 text-center"
          >
            <p class="text-sm font-semibold text-text-primary">{{ labels.emptyTitle }}</p>
            <p class="text-xs text-text-secondary mt-1">{{ labels.emptySub }}</p>
          </div>

          <div v-else class="space-y-2.5">
            <label
              v-for="comanda in comandas"
              :key="comanda.id"
              class="flex items-start gap-3 rounded-xl border bg-surface px-3 py-3 cursor-pointer transition-colors"
              :class="isSelected(comanda.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-secondary/60'"
            >
              <input
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-action-primary-focus-ring/30 flex-shrink-0"
                :checked="isSelected(comanda.id)"
                :aria-label="selectComandaAria(comanda.comandaNumber)"
                @change="$emit('toggle-comanda', comanda.id)"
              />
              <span class="min-w-0 flex-1">
                <span class="flex items-start justify-between gap-2">
                  <span class="min-w-0">
                    <span class="block text-sm font-bold text-text-primary truncate">
                      #{{ comanda.comandaNumber }} · {{ comanda.stationName }}
                    </span>
                    <span class="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-text-secondary">
                      <span class="font-medium">{{ comanda.itemCount }} {{ comanda.itemCount === 1 ? labels.itemOne : labels.itemMany }}</span>
                      <span v-if="statusLabel(comanda.status)" class="text-text-tertiary">· {{ statusLabel(comanda.status) }}</span>
                      <span v-if="comanda.itemPreview" class="truncate max-w-full">· {{ comanda.itemPreview }}</span>
                    </span>
                  </span>
                  <span class="text-[10px] font-semibold text-text-tertiary whitespace-nowrap pt-0.5">
                    {{ formatComandaTime(comanda.firedAt) }}
                  </span>
                </span>
              </span>
            </label>
          </div>
        </div>

        <div class="flex-shrink-0 border-t border-border bg-surface-secondary/40 px-5 py-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="loading || comandas.length === 0"
                class="min-h-[36px] px-3 rounded-lg border border-border text-[11px] font-semibold text-text-secondary hover:bg-surface hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                @click="$emit('select-all')"
              >{{ labels.selectAll }}</button>
              <button
                type="button"
                :disabled="loading || selectedIds.length === 0"
                class="min-h-[36px] px-3 rounded-lg border border-border text-[11px] font-semibold text-text-secondary hover:bg-surface hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                @click="$emit('clear-selection')"
              >{{ labels.clear }}</button>
            </div>
            <button
              type="button"
              :disabled="loading"
              class="min-h-[36px] px-3 rounded-lg text-[11px] font-semibold text-text-secondary hover:bg-surface hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              @click="$emit('refresh')"
            >{{ labels.refresh }}</button>
          </div>
          <button
            type="button"
            :disabled="loading || selectedIds.length === 0"
            class="w-full min-h-[46px] rounded-xl bg-action-primary-bg text-action-primary-text text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
            @click="$emit('print-selected')"
          >
            <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.75A2.25 2.25 0 0 1 5.25 7.5h13.5A2.25 2.25 0 0 1 21 9.75v6A2.25 2.25 0 0 1 18.75 18h-1.09M6.34 18h11.32" />
            </svg>
            {{ selectedIds.length > 0 ? labels.printSelectedCount(selectedIds.length) : labels.printSelected }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Teleport + lazy locale packs: resolve chrome with global i18n and an
 * explicit EN/ES dictionary so missing lazy keys never show the wrong language.
 */
const { locale } = useI18n({ useScope: 'global' })

interface ReprintComanda {
  id: string
  comandaNumber: string
  stationName: string
  status?: string
  firedAt?: string | null
  itemCount: number
  itemPreview?: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  comandas: ReprintComanda[]
  selectedIds: string[]
  loading?: boolean
  tableDisplayName?: string | null
}>(), {
  comandas: () => [],
  selectedIds: () => [],
  loading: false,
  tableDisplayName: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'toggle-comanda': [id: string]
  'select-all': []
  'clear-selection': []
  'print-selected': []
  'refresh': []
}>()

const FALLBACK = {
  es: {
    title: 'Reimprimir comandas',
    closePanelAria: 'Cerrar panel',
    emptyTitle: 'No hay comandas enviadas',
    emptySub: 'Esta sesión todavía no tiene comandas para reimprimir.',
    selectAll: 'Seleccionar todas',
    clear: 'Limpiar',
    refresh: 'Actualizar',
    printSelected: 'Reimprimir seleccionadas',
    printSelectedCount: (n: number) => `Reimprimir seleccionadas (${n})`,
    sessionCurrent: 'Sesión actual',
    ticketOne: 'comanda',
    ticketMany: 'comandas',
    itemOne: 'ítem',
    itemMany: 'ítems',
    status: {
      pending: 'Pendiente',
      sent: 'Enviada',
      preparing: 'Preparando',
      ready: 'Lista',
      delivered: 'Entregada',
      cancelled: 'Cancelada',
    },
  },
  en: {
    title: 'Reprint tickets',
    closePanelAria: 'Close panel',
    emptyTitle: 'No tickets sent',
    emptySub: 'This session has no tickets to reprint yet.',
    selectAll: 'Select all',
    clear: 'Clear',
    refresh: 'Refresh',
    printSelected: 'Reprint selected',
    printSelectedCount: (n: number) => `Reprint selected (${n})`,
    sessionCurrent: 'Current session',
    ticketOne: 'ticket',
    ticketMany: 'tickets',
    itemOne: 'item',
    itemMany: 'items',
    status: {
      pending: 'Pending',
      sent: 'Sent',
      preparing: 'Preparing',
      ready: 'Ready',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    },
  },
} as const

function uiLoc(): 'es' | 'en' {
  return locale.value === 'en' ? 'en' : 'es'
}

/** Chrome labels: always follow UI locale via local dict (Teleport-safe). */
const labels = computed(() => {
  void locale.value
  return FALLBACK[uiLoc()]
})

const selectedSet = computed(() => new Set(props.selectedIds))
const close = () => emit('update:modelValue', false)
const isSelected = (id: string) => selectedSet.value.has(id)

function formatComandaTime(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(uiLoc() === 'en' ? 'en-US' : 'es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function selectComandaAria(number: string | number): string {
  void locale.value
  if (uiLoc() === 'en') return `Select ticket ${number}`
  return `Seleccionar comanda ${number}`
}

function statusLabel(status?: string): string | null {
  if (!status) return null
  void locale.value
  const fb = FALLBACK[uiLoc()].status as Record<string, string>
  return fb[status] ?? status
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
