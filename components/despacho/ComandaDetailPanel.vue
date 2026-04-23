<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  comanda: any | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const close = () => emit('update:modelValue', false)

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

const ITEM_STATUS_LABELS: Record<string, string> = {
  pending:   'Pendiente',
  preparing: 'Preparando',
  ready:     'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
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

const getItemStatusVariant = (status: string) => {
  const map: Record<string, string> = {
    pending:   'warning',
    preparing: 'info',
    ready:     'success',
    delivered: 'default',
    cancelled: 'error',
  }
  return map[status] ?? 'default'
}

const formatElapsed = (seconds: number | null): string => {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

const activeItems = computed(() =>
  (props.comanda?.items ?? []).filter((i: any) => i.status !== 'cancelled')
)
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
                <Icon name="lucide:clipboard-list" size="20" aria-hidden="true" />
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
              <Icon name="lucide:x" size="20" aria-hidden="true" />
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
              {{ formatElapsed(comanda.elapsed_seconds) }}
            </span>
            <span class="text-xs text-text-secondary ml-auto">
              {{ activeItems.length }} item{{ activeItems.length !== 1 ? 's' : '' }}
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
              class="px-6 py-4"
            >
              <div class="flex items-start gap-3">
                <!-- Quantity badge -->
                <span class="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary text-sm font-black flex items-center justify-center">
                  {{ item.quantity }}
                </span>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-text-primary leading-tight">
                    {{ item.kitchen_name }}
                  </p>

                  <!-- Modifiers -->
                  <ul v-if="item.modifiers_snapshot?.length" class="mt-1 space-y-0.5">
                    <li
                      v-for="(mod, i) in item.modifiers_snapshot"
                      :key="i"
                      class="text-xs text-text-secondary"
                    >
                      + {{ mod.name }}
                    </li>
                  </ul>

                  <!-- Notes -->
                  <p v-if="item.notes" class="mt-1.5 text-xs text-amber-600 font-medium flex items-center gap-1">
                    <Icon name="lucide:message-square" size="12" aria-hidden="true" />
                    {{ item.notes }}
                  </p>
                </div>

                <!-- Item status -->
                <UiStatusBadge :variant="getItemStatusVariant(item.status)" size="sm" format="text" class="flex-shrink-0">
                  {{ ITEM_STATUS_LABELS[item.status] ?? item.status }}
                </UiStatusBadge>
              </div>
            </li>
          </ul>
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
