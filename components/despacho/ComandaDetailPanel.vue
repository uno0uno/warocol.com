<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { ClipboardList, X, MessageSquare } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  comanda: any | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'status-updated'): void
}>()

const close = () => emit('update:modelValue', false)

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:   ['preparing'],
  preparing: ['ready'],
  ready:     ['delivered'],
  delivered: [],
  cancelled: [],
}

const TRANSITION_LABELS: Record<string, string> = {
  preparing: 'Marcar en preparación',
  ready:     'Marcar como lista',
  delivered: 'Marcar entregada',
}

const availableTransitions = computed((): string[] =>
  ALLOWED_TRANSITIONS[props.comanda?.status ?? ''] ?? []
)

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
    useToast().error(err.data?.detail || 'Error al actualizar', { title: 'Error' })
  } finally {
    isUpdating.value = false
  }
}

const SOURCE_LABELS: Record<string, string> = {
  table:    'Mesa',
  pos:      'Mostrador',
  delivery: 'Domicilio',
  pickup:   'Recogida',
}

const COMANDA_STATUS_LABELS: Record<string, string> = {
  pending:   'Pendiente',
  preparing: 'En preparación',
  ready:     'Lista',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
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
        class="fixed inset-0 z-40 bg-black/40"
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
        :aria-label="`Detalle comanda #${String(comanda.comanda_number).padStart(3, '0')}`"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
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
                  Comanda #{{ String(comanda.comanda_number).padStart(3, '0') }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ SOURCE_LABELS[comanda.source_type] ?? comanda.source_type }}
                  · {{ comanda.table_display_name }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar panel"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="close"
            >
              <X :size="20" aria-hidden="true" />
            </button>
          </div>

          <!-- Status + time row -->
          <div class="flex items-center gap-2 mt-3">
            <UiStatusBadge :variant="getComandaStatusVariant(comanda.status)" size="sm" format="text">
              {{ COMANDA_STATUS_LABELS[comanda.status] ?? comanda.status }}
            </UiStatusBadge>
            <span
              class="text-xs font-bold tabular-nums"
              :class="comanda.alert_level >= 2 ? 'text-destructive' : comanda.alert_level >= 1 ? 'text-warning' : 'text-text-secondary'"
            >
              {{ formatElapsed(effectiveElapsed) }}
            </span>
            <span class="text-xs text-text-secondary ml-auto">
              {{ activeItems.filter(i => i.status !== 'cancelled').length }} item{{ activeItems.filter(i => i.status !== 'cancelled').length !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <!-- Items list -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="!activeItems.length" class="flex items-center justify-center h-32 text-sm text-text-secondary">
            Sin items activos
          </div>

          <ul v-else class="divide-y divide-border">
            <li
              v-for="item in activeItems"
              :key="item.id"
              class="px-5 py-5"
              :class="item.status === 'cancelled' ? 'opacity-50' : ''"
            >
              <div class="flex items-start gap-4">
                <!-- Quantity badge -->
                <span
                  class="flex-shrink-0 w-12 h-12 rounded-xl text-xl font-black flex items-center justify-center"
                  :class="item.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'"
                >
                  {{ item.quantity }}
                </span>

                <div class="flex-1 min-w-0 pt-1">
                  <p
                    class="text-base font-bold leading-snug"
                    :class="item.status === 'cancelled' ? 'line-through text-text-tertiary' : 'text-text-primary'"
                  >
                    {{ item.kitchen_name }}
                  </p>

                  <!-- Modifiers as pills -->
                  <div v-if="item.modifiers_snapshot?.length && item.status !== 'cancelled'" class="flex flex-wrap gap-1.5 mt-2">
                    <span
                      v-for="(mod, i) in item.modifiers_snapshot"
                      :key="i"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-secondary border border-border text-text-secondary"
                    >
                      <span class="text-primary font-black">+</span>{{ mod.name }}
                    </span>
                  </div>

                  <!-- Notes -->
                  <p v-if="item.notes && item.status !== 'cancelled'" class="mt-2 text-sm text-amber-600 font-medium flex items-center gap-1.5 bg-amber-50 rounded-lg px-2.5 py-1.5">
                    <MessageSquare :size="14" aria-hidden="true" />
                    {{ item.notes }}
                  </p>
                </div>

                <!-- Cancelled badge -->
                <span v-if="item.status === 'cancelled'" class="flex-shrink-0 px-2 py-1 text-xs font-black uppercase tracking-tight rounded-lg border bg-destructive/10 text-destructive border-destructive/30">
                  Anulado
                </span>
                <!-- Ready indicator -->
                <span v-else-if="item.status === 'ready'" class="flex-shrink-0 w-6 h-6 rounded-full bg-success/15 text-success flex items-center justify-center mt-1" title="Listo">
                  <svg viewBox="0 0 10 8" fill="none" class="w-3 h-2.5"><path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </div>
            </li>
          </ul>
        </div>

        <!-- Footer: status actions -->
        <div v-if="availableTransitions.length" class="flex-shrink-0 border-t border-border px-6 py-4 flex gap-2 bg-surface">
          <button
            v-for="status in availableTransitions"
            :key="status"
            type="button"
            :disabled="isUpdating"
            class="flex-1 h-11 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
            @click="updateStatus(status)"
          >
            <svg v-if="isUpdating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span v-else>{{ TRANSITION_LABELS[status] ?? status }}</span>
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
