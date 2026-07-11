<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { ClipboardList, X, MessageSquare } from 'lucide-vue-next'
import { formatComandaModifierLabel } from '~/composables/useComandaPrint'

const props = defineProps<{
  modelValue: boolean
  comanda: any | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'status-updated'): void
}>()

const close = () => emit('update:modelValue', false)
const { t } = useI18n({ useScope: 'global' })

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:   ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready:     ['delivered'],
  delivered: [],
  cancelled: [],
}

// POS/counter: skip preparing, go straight to ready (auto-delivers on backend)
const ALLOWED_TRANSITIONS_POS: Record<string, string[]> = {
  pending:   ['ready', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready:     [],
  delivered: [],
  cancelled: [],
}

const transitionLabel = (status: string) => {
  const labels: Record<string, string> = {
    preparing: t('despacho.transitions.markPreparing'),
    ready:     t('despacho.transitions.ready'),
    delivered: t('despacho.transitions.markDelivered'),
    cancelled: t('despacho.transitions.cancelled'),
  }
  return labels[status] ?? status
}

const availableTransitions = computed((): string[] => {
  const map = props.comanda?.source_type === 'pos'
    ? ALLOWED_TRANSITIONS_POS
    : ALLOWED_TRANSITIONS
  return map[props.comanda?.status ?? ''] ?? []
})

const isUpdating = ref(false)

const updateStatus = async (status: string) => {
  if (!props.comanda?.id || isUpdating.value) return
  isUpdating.value = true
  try {
    await $fetch(`/api/api/comandas/${props.comanda.id}/status`, {
      method: 'PATCH',
      body: { status },
    })
    emit('status-updated')
    close()
  } catch (err: any) {
    useToast().error(err.data?.detail || t('despacho.comandas.updateError'), { title: t('despacho.comandas.updateError') })
  } finally {
    isUpdating.value = false
  }
}

const { singular: tableSingular } = useTableLabel()

const SOURCE_LABELS = computed<Record<string, string>>(() => ({
  table:    tableSingular.value,
  pos:      t('despacho.orderTypes.counter'),
  delivery: t('despacho.orderTypes.delivery'),
  pickup:   t('despacho.orderTypes.pickup'),
}))

const comandaStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending:   t('despacho.orderStatuses.pending'),
    preparing: t('despacho.orderStatuses.preparing'),
    ready:     t('despacho.transitions.ready'),
    delivered: t('despacho.transitions.delivered'),
    cancelled: t('despacho.orderStatuses.cancelled'),
  }
  return labels[status] ?? status
}

const getComandaStatusVariant = (status: string) => {
  const map: Record<string, string> = {
    pending:   'warning',
    preparing: 'info',
    ready:     'success',
    delivered: 'default',
    cancelled: 'error',
  }
  return map[status] ?? 'default'
}

// ── Live ticker ──────────────────────────────────────────────────────────────
const now = ref(Date.now())
const openedAt = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | null = null

watch(() => props.modelValue, (open) => {
  if (open) {
    openedAt.value = Date.now()
    tickInterval = setInterval(() => { now.value = Date.now() }, 1000)
  } else {
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
  }
})

onUnmounted(() => { if (tickInterval) clearInterval(tickInterval) })

const effectiveElapsed = computed((): number | null => {
  const base = props.comanda?.elapsed_seconds
  if (base === null || base === undefined) return null
  return base + Math.floor((now.value - openedAt.value) / 1000)
})

const formatElapsed = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined || seconds < 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const totalMin = Math.floor(seconds / 60)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const activeItems = computed(() => props.comanda?.items ?? [])
const itemCountLabel = (count: number) =>
  t(count === 1 ? 'despacho.comandas.itemCountOne' : 'despacho.comandas.itemCountMany', { count })
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-40 bg-overlay-backdrop/40"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <!-- Panel -->
    <Transition name="panel">
      <div
        v-if="modelValue && comanda"
        role="dialog"
        aria-modal="true"
        :aria-label="`${t('despacho.common.viewDetail')} #${comanda.comanda_number}-${String(comanda.comanda_index).padStart(2, '0')}`"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-sheet-border" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 border-b border-border px-6 py-4 bg-surface-secondary/40">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ClipboardList :size="20" aria-hidden="true" />
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  {{ t('despacho.comandas.comanda') }} {{ comanda.comanda_number }}-{{ String(comanda.comanda_index).padStart(2, '0') }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ SOURCE_LABELS[comanda.source_type] ?? comanda.source_type }}
                  · {{ comanda.table_display_name }}
                </p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="t('common.close')"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
              @click="close"
            >
              <X :size="20" aria-hidden="true" />
            </button>
          </div>

          <!-- Status + time row -->
          <div class="flex items-center gap-2 mt-3">
            <UiStatusBadge :variant="getComandaStatusVariant(comanda.status)" size="sm" format="text">
              {{ comandaStatusLabel(comanda.status) }}
            </UiStatusBadge>
            <span
              class="text-xs font-bold tabular-nums"
              :class="comanda.alert_level >= 2 ? 'text-destructive' : comanda.alert_level >= 1 ? 'text-warning' : 'text-text-secondary'"
            >
              {{ formatElapsed(effectiveElapsed) }}
            </span>
            <span class="text-xs text-text-secondary ml-auto">
              {{ itemCountLabel(activeItems.filter(i => i.status !== 'cancelled').length) }}
            </span>
          </div>
        </div>

        <!-- Items list -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="!activeItems.length" class="flex items-center justify-center h-32 text-sm text-text-secondary">
            {{ t('despacho.comandas.emptyTitle') }}
          </div>

          <div v-else class="grid gap-3 p-4">
            <div
              v-for="item in activeItems"
              :key="item.id"
              class="flex flex-col gap-2 rounded-xl border-2 px-4 py-3 transition-all"
              :class="item.status === 'cancelled'
                ? 'border-destructive/20 bg-destructive/5 opacity-60'
                : item.status === 'ready'
                  ? 'border-success/40 bg-success/5'
                  : 'border-border bg-background'"
            >
              <!-- Top row: qty + name + status indicator -->
              <div class="flex items-start gap-3">
                <span
                  class="flex-shrink-0 w-10 h-10 rounded-lg text-lg font-black flex items-center justify-center"
                  :class="item.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : item.status === 'ready' ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'"
                >
                  {{ item.quantity }}
                </span>
                <p
                  class="flex-1 text-base font-bold leading-snug pt-1.5"
                  :class="item.status === 'cancelled' ? 'line-through text-text-tertiary' : 'text-text-primary'"
                >
                  {{ item.kitchen_name }}
                </p>
                <span v-if="item.status === 'cancelled'" class="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-tight rounded bg-destructive/10 text-destructive">
                  {{ t('despacho.comandas.voidedBadge') }}
                </span>
                <span v-else-if="item.status === 'ready'" class="flex-shrink-0 w-5 h-5 rounded-full bg-success/15 text-success flex items-center justify-center mt-1">
                  <svg viewBox="0 0 10 8" fill="none" class="w-2.5 h-2"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </div>

              <!-- Modifiers — each as its own card -->
              <div v-if="item.modifiers_snapshot?.length && item.status !== 'cancelled'" class="grid grid-cols-2 gap-2 pt-1">
                <div
                  v-for="(mod, i) in item.modifiers_snapshot"
                  :key="i"
                  class="flex items-center gap-2 rounded-xl border-2 border-primary/20 bg-primary/5 px-3 py-2"
                >
                  <span class="text-primary font-black text-sm leading-none flex-shrink-0">+</span>
                  <span class="text-xs font-semibold text-primary leading-tight">{{ formatComandaModifierLabel(mod) }}</span>
                </div>
              </div>

              <!-- Notes -->
              <p v-if="item.notes && item.status !== 'cancelled'" class="flex items-center gap-1.5 text-xs text-state-warning-text font-medium bg-state-warning-bg rounded-lg px-2.5 py-1.5 pl-1">
                <MessageSquare :size="12" aria-hidden="true" class="flex-shrink-0" />
                {{ item.notes }}
              </p>
            </div>
          </div>
        </div>

        <!-- Footer: status actions -->
        <div v-if="availableTransitions.length" class="flex-shrink-0 border-t border-border px-6 py-4 flex gap-2 bg-surface">
          <button
            v-for="status in availableTransitions"
            :key="status"
            type="button"
            :disabled="isUpdating"
            class="h-11 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :class="status === 'cancelled'
              ? 'px-4 border border-border text-text-secondary hover:bg-destructive/10 hover:text-destructive hover:border-destructive'
              : 'flex-1 bg-action-primary-bg text-action-primary-text hover:bg-action-primary-hover-bg'"
            @click="updateStatus(status)"
          >
            <UiLoadingDots v-if="isUpdating && status !== 'cancelled'" size="9px" color="currentColor" />
            <span v-else>{{ transitionLabel(status) }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

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
