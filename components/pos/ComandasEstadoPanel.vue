<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })

const PANEL_FALLBACK = {
  es: {
    title: 'Estado de comandas',
    readyTab: 'Listas',
    preparingTab: 'En preparación',
    soundLabel: 'Aviso sonoro',
    ticketOne: 'comanda',
    ticketMany: 'comandas',
    selectAll: 'Seleccionar todas',
    deselectAll: 'Deseleccionar todas',
    markReady: 'Marcar como listas',
    markDelivered: 'Marcar como entregadas',
    closePanelAria: 'Cerrar panel',
  },
  en: {
    title: 'Ticket status',
    readyTab: 'Ready',
    preparingTab: 'Preparing',
    soundLabel: 'Sound alert',
    ticketOne: 'ticket',
    ticketMany: 'tickets',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',
    markReady: 'Mark as ready',
    markDelivered: 'Mark as delivered',
    closePanelAria: 'Close panel',
  },
} as const

function uiLoc(): 'es' | 'en' {
  return locale.value === 'en' ? 'en' : 'es'
}

function panelLabel<K extends keyof typeof PANEL_FALLBACK['en']>(key: K): string {
  void locale.value
  const full = `pos.comandasPanel.${key}`
  try {
    const v = String(t(full))
    if (v && v !== full) {
      // If EN UI but value matches ES fallback pack, force EN dict
      if (uiLoc() === 'en' && v === PANEL_FALLBACK.es[key]) return PANEL_FALLBACK.en[key]
      return v
    }
  } catch { /* ignore */ }
  return PANEL_FALLBACK[uiLoc()][key]
}
import { ref, computed, watch, onUnmounted } from 'vue'
import { formatComandaModifierLabel } from '~/composables/useComandaPrint'

const { singular: tableSingular } = useTableLabel()
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  BellAlertIcon,
  BellSlashIcon,
  ClockIcon,
  MapPinIcon,
} from '@heroicons/vue/24/outline'

interface ComandaItem {
  id: string
  kitchen_name: string
  quantity: number
  notes?: string | null
  modifiers_snapshot?: Array<{ name: string; price?: number; quantity?: number }> | null
}

interface Comanda {
  id: string
  comanda_number: number
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  source_type: 'table' | 'pos' | 'delivery' | 'pickup'
  table_display_name?: string | null
  fired_at: string
  preparing_at?: string | null
  ready_at?: string | null
  items?: ComandaItem[]
}

const props = defineProps<{
  modelValue: boolean
  tableSessionId?: string | null
  tableDisplayName?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
}>()

const close = () => emit('update:modelValue', false)

const toast = useToast()
const { enabled: audioEnabled, setEnabled: setAudioEnabled, playReadyChime } = useExpediterAudio()

// ── Fetch comandas — only while panel is open, polling every 10s ─────────
const comandas = ref<Comanda[]>([])
const isLoading = ref(false)
const submitting = ref(false)
let pollInterval: ReturnType<typeof setInterval> | null = null
let previousReadyIds = new Set<string>()

const fetchComandas = async () => {
  if (!props.modelValue) return
  try {
    const res = await $fetch<{ success: boolean; data: Comanda[] }>(
      '/api/api/comandas',
      { params: { status: 'pending,preparing,ready' } },
    )
    let list = (res?.data ?? []).filter(c => c.source_type === 'table' || c.source_type === 'pos')
    if (props.tableSessionId) {
      list = list.filter(c => (c as any).table_session_id === props.tableSessionId
        || (c.source_type === 'table' && c.table_display_name === props.tableDisplayName))
    }
    const currentReady = new Set(list.filter(c => c.status === 'ready').map(c => c.id))
    const newReady = [...currentReady].filter(id => !previousReadyIds.has(id))
    if (newReady.length > 0 && previousReadyIds.size > 0) {
      playReadyChime()
      flashIds.value = new Set(newReady)
      setTimeout(() => { flashIds.value = new Set() }, 2000)
    }
    previousReadyIds = currentReady
    comandas.value = list
  } catch {
    // Silent — non-critical, will retry on next poll
  }
}

const flashIds = ref<Set<string>>(new Set())

watch(() => props.modelValue, (open) => {
  if (open) {
    selectedIds.value = new Set()
    activeTab.value = 'ready'
    isLoading.value = true
    previousReadyIds = new Set()
    fetchComandas().finally(() => { isLoading.value = false })
    pollInterval = setInterval(fetchComandas, 10_000)
  } else {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

// ── Tabs ─────────────────────────────────────────────────────────────────
const activeTab = ref<'ready' | 'preparing'>('ready')
const readyComandas = computed(() => comandas.value.filter(c => c.status === 'ready'))
const preparingComandas = computed(() =>
  comandas.value.filter(c => c.status === 'preparing' || c.status === 'pending'),
)
const visibleComandas = computed(() =>
  activeTab.value === 'ready' ? readyComandas.value : preparingComandas.value,
)

// ── Selection ────────────────────────────────────────────────────────────
const selectedIds = ref<Set<string>>(new Set())
watch(activeTab, () => { selectedIds.value = new Set() })

const toggleSelected = (id: string) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}
const allSelected = computed(() =>
  visibleComandas.value.length > 0
  && visibleComandas.value.every(c => selectedIds.value.has(c.id)),
)
const toggleAll = () => {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(visibleComandas.value.map(c => c.id))
  }
}

// ── Aging tier (3-tier intensity scale) ──────────────────────────────────
type AgingTier = 'fresh' | 'warning' | 'urgent'
const ageMinutes = (firedAt: string): number => {
  const t = new Date(firedAt).getTime()
  if (Number.isNaN(t)) return 0
  return Math.floor((Date.now() - t) / 60_000)
}
const agingTier = (firedAt: string): AgingTier => {
  const m = ageMinutes(firedAt)
  if (m >= 10) return 'urgent'
  if (m >= 5)  return 'warning'
  return 'fresh'
}
// 60-30-10: fresh stays neutral, warning gets a soft tint, urgent pops with bg + chip
const cardClass = (firedAt: string, selected: boolean): string => {
  const tier = agingTier(firedAt)
  if (selected) return 'bg-primary/5 border-primary'
  if (tier === 'urgent')  return 'bg-destructive/5 border-destructive'
  if (tier === 'warning') return 'bg-state-warning-bg/60 border-state-warning-border'
  return 'bg-surface border-state-success-border'
}
const chipClass = (firedAt: string): string => {
  const tier = agingTier(firedAt)
  if (tier === 'urgent')  return 'bg-destructive/10 text-destructive'
  if (tier === 'warning') return 'bg-state-warning-bg text-state-warning-text'
  return 'bg-state-success-bg text-state-success-text'
}
const ageLabel = (firedAt: string): string => {
  const m = ageMinutes(firedAt)
  if (m < 1) return uiLoc() === 'en' ? 'just now' : 'recién'
  if (m === 1) return '1 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h} h` : `${h} h ${r} min`
}

// ── Submit (bulk advance) ────────────────────────────────────────────────
const submitTarget = computed<'ready' | 'delivered'>(() =>
  activeTab.value === 'preparing' ? 'ready' : 'delivered',
)
const submitLabel = computed(() => {
  const n = selectedIds.value.size
  if (n === 0) {
    return activeTab.value === 'preparing' ? panelLabel('markReady') : panelLabel('markDelivered')
  }
  if (activeTab.value === 'preparing') return `Marcar ${n} como ${n === 1 ? 'lista' : 'listas'}`
  return `Marcar ${n} como ${n === 1 ? 'entregada' : 'entregadas'}`
})

const submit = async () => {
  if (submitting.value || selectedIds.value.size === 0) return
  submitting.value = true
  const ids = [...selectedIds.value]
  const target = submitTarget.value
  try {
    const res = await $fetch<{ success_count: number; failed: any[] }>(
      '/api/api/comandas/bulk-status',
      { method: 'PATCH', body: { comanda_ids: ids, status: target } },
    )
    const ok = res.success_count ?? ids.length
    const failed = (res.failed ?? []).length
    if (failed === 0) {
      toast.success(
        `${ok} ${ok === 1 ? t('pos.comandasPanel.updatedOne') : t('pos.comandasPanel.updatedMany')}`,
        { title: t('pos.comandasPanel.statusUpdated') },
      )
    } else {
      toast.success(t('pos.comandasPanel.partialBody', { ok, failed }), { title: t('pos.comandasPanel.partialResult') })
    }
    selectedIds.value = new Set()
    await fetchComandas()
    emit('success')
  } catch (err: any) {
    toast.error(err?.data?.detail || err?.message || t('pos.comandasPanel.updateError'), { title: t('pos.banner.error') })
  } finally {
    submitting.value = false
  }
}
</script>

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
        :aria-label="panelLabel('title')"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-lg md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-sheet-border" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-5 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <ClipboardDocumentListIcon class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">{{ panelLabel('title') }}</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5 truncate">
                  {{ tableDisplayName || panelLabel('title') }}
                  · {{ comandas.length }}
                  {{ comandas.length === 1 ? panelLabel('ticketOne') : panelLabel('ticketMany') }}
                </p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="panelLabel('closePanelAria')"
              class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
              @click="close"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex-shrink-0 border-b border-border bg-surface px-2">
          <div class="flex">
            <button
              type="button"
              class="flex-1 min-h-[44px] px-3 py-2 text-sm font-semibold transition-colors border-b-2 flex items-center justify-center gap-2"
              :class="activeTab === 'ready'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'"
              @click="activeTab = 'ready'"
            >
              <span>{{ panelLabel('readyTab') }}</span>
              <span
                class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums"
                :class="activeTab === 'ready'
                  ? 'bg-action-primary-bg text-action-primary-text'
                  : 'bg-surface-secondary text-text-tertiary'"
              >{{ readyComandas.length }}</span>
            </button>
            <button
              type="button"
              class="flex-1 min-h-[44px] px-3 py-2 text-sm font-semibold transition-colors border-b-2 flex items-center justify-center gap-2"
              :class="activeTab === 'preparing'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'"
              @click="activeTab = 'preparing'"
            >
              <span>{{ panelLabel('preparingTab') }}</span>
              <span
                class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums"
                :class="activeTab === 'preparing'
                  ? 'bg-action-primary-bg text-action-primary-text'
                  : 'bg-surface-secondary text-text-tertiary'"
              >{{ preparingComandas.length }}</span>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          <div v-if="isLoading && comandas.length === 0" class="flex items-center justify-center py-12">
            <CommonsTheCustomLoader size="medium" />
          </div>

          <div v-else-if="visibleComandas.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-14 h-14 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
              <CheckCircleIcon class="w-7 h-7 text-text-tertiary" />
            </div>
            <p class="text-sm font-semibold text-text-secondary">
              {{ activeTab === 'ready' ? t('pos.comandasPanel.nothingReady') : t('pos.comandasPanel.noComandas') }}
            </p>
            <p class="text-xs text-text-tertiary mt-1 max-w-[14rem]">
              {{ activeTab === 'ready'
                ? t('pos.comandasPanel.readyHint')
                : t('pos.comandasPanel.emptyHint') }}
            </p>
          </div>

          <template v-else>
            <button
              v-for="c in visibleComandas"
              :key="c.id"
              type="button"
              :aria-pressed="selectedIds.has(c.id)"
              class="w-full text-left rounded-xl border-2 p-3.5 transition-all"
              :class="[
                cardClass(c.fired_at, selectedIds.has(c.id)),
                flashIds.has(c.id) ? 'animate-pulse ring-2 ring-state-success-border' : '',
              ]"
              @click="toggleSelected(c.id)"
            >
              <div class="flex items-start gap-3">
                <input
                  type="checkbox"
                  :checked="selectedIds.has(c.id)"
                  class="mt-1 h-4 w-4 rounded text-primary focus:ring-2 focus:ring-action-primary-focus-ring/30 cursor-pointer"
                  @click.stop
                  @change="toggleSelected(c.id)"
                />
                <div class="flex-1 min-w-0">
                  <!-- Row 1 — Comanda # + aging chip -->
                  <div class="flex items-center justify-between gap-2 mb-1.5">
                    <span class="text-base font-bold text-text-primary tabular-nums leading-none">
                      #{{ c.comanda_number }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
                      :class="chipClass(c.fired_at)"
                    >
                      <ClockIcon class="w-3 h-3" />
                      {{ ageLabel(c.fired_at) }}
                    </span>
                  </div>

                  <!-- Row 2 — Destination (mesa) -->
                  <div v-if="c.table_display_name" class="flex items-center gap-1 text-sm font-semibold text-text-primary mb-1.5 capitalize">
                    <MapPinIcon class="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                    {{ c.table_display_name }}
                  </div>

                  <!-- Row 3 — Items -->
                  <ul v-if="c.items?.length" class="text-xs text-text-secondary leading-snug space-y-1">
                    <li v-for="i in c.items" :key="i.id" class="min-w-0">
                      <div class="flex gap-1.5">
                        <span class="font-semibold text-text-primary tabular-nums flex-shrink-0">{{ i.quantity }}×</span>
                        <span class="truncate">{{ i.kitchen_name }}</span>
                      </div>
                      <div v-if="i.modifiers_snapshot?.length" class="mt-0.5 ml-5 flex flex-wrap gap-1">
                        <span
                          v-for="(mod, idx) in i.modifiers_snapshot"
                          :key="idx"
                          class="min-w-0 max-w-full truncate rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-tertiary"
                        >
                          + {{ formatComandaModifierLabel(mod) }}
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </button>
          </template>
        </div>

        <!-- Sticky footer -->
        <div class="flex-shrink-0 border-t border-border bg-surface px-4 py-3 space-y-2">
          <!-- Audio + select-all row -->
          <div v-if="visibleComandas.length > 0" class="flex items-center justify-between gap-3">
            <button
              type="button"
              class="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              @click="toggleAll"
            >
              {{ allSelected ? panelLabel('deselectAll') : panelLabel('selectAll') }}
            </button>
            <button
              type="button"
              :aria-pressed="audioEnabled"
              :aria-label="audioEnabled ? t('pos.comandasPanel.soundOffAria') : t('pos.comandasPanel.soundOnAria')"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
              :class="audioEnabled
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-border bg-surface text-text-tertiary hover:text-text-secondary'"
              @click="setAudioEnabled(!audioEnabled)"
            >
              <BellAlertIcon v-if="audioEnabled" class="w-3.5 h-3.5" />
              <BellSlashIcon v-else class="w-3.5 h-3.5" />
              {{ panelLabel('soundLabel') }}
            </button>
          </div>

          <!-- Primary action -->
          <button
            type="button"
            :disabled="selectedIds.size === 0 || submitting"
            class="w-full min-h-[52px] rounded-xl bg-action-primary-bg text-action-primary-text text-base font-bold transition-all hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            @click="submit"
          >
            <UiLoadingDots v-if="submitting" size="9px" color="currentColor" />
            <template v-else>
              <CheckCircleIcon class="w-5 h-5" />
              {{ submitLabel }}
            </template>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
