<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay-backdrop/50"
        @click.self="$emit('close')"
      >
        <div class="bg-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <div class="min-w-0">
              <h3 class="text-base font-bold text-text-primary truncate">Historial de mesero</h3>
              <p class="text-xs text-text-secondary truncate">{{ table.name }}</p>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              class="flex-shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
              @click="$emit('close')"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-5 py-4">
            <!-- Loading -->
            <div v-if="status === 'pending' && (!data || data.length === 0)" class="py-12 flex items-center justify-center">
              <CommonsTheCustomLoader size="medium" />
            </div>

            <!-- Empty -->
            <div v-else-if="!data || data.length === 0" class="py-12 flex flex-col items-center justify-center text-center">
              <div class="w-14 h-14 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
                <ClockIcon class="w-7 h-7 text-text-tertiary" />
              </div>
              <p class="text-sm font-semibold text-text-secondary">Sin historial</p>
              <p class="text-xs text-text-tertiary mt-1 max-w-[14rem]">
                {{ `Esta ${tableSingularLower} nunca ha tenido un mesero asignado.` }}
              </p>
            </div>

            <!-- List -->
            <ul v-else class="space-y-2">
              <li
                v-for="entry in data"
                :key="entry.id"
                class="rounded-lg border border-border bg-surface p-3"
              >
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {{ initials(entry.member_name) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-text-primary truncate">
                      {{ entry.member_name || t('operaciones.mesaAssign.unassigned') }}
                      <span v-if="entry.member_role" class="text-xs text-text-tertiary font-normal">
                        ({{ entry.member_role }})
                      </span>
                    </p>
                    <p class="text-xs text-text-secondary mt-0.5 tabular-nums">
                      <span>{{ formatDate(entry.assigned_at) }}</span>
                      <span class="mx-1.5">→</span>
                      <span v-if="entry.unassigned_at">{{ formatDate(entry.unassigned_at) }}</span>
                      <span v-else class="font-semibold text-primary">Actual</span>
                    </p>
                    <p v-if="entry.assigned_by_name" class="text-[11px] text-text-tertiary mt-0.5">
                      Asignado por {{ entry.assigned_by_name }}
                    </p>
                  </div>
                </div>
              </li>
            </ul>

            <!-- Error state -->
            <div v-if="error" class="mt-3 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              No se pudo cargar el historial.
            </div>
          </div>

          <!-- Footer -->
          <div class="flex-shrink-0 px-5 py-3 border-t border-border bg-surface-secondary/40">
            <button
              type="button"
              class="w-full min-h-[44px] rounded-lg bg-surface border border-border text-sm font-semibold text-text-primary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
              @click="$emit('close')"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { t } = useI18n()
import { computed, watch } from 'vue'
import { useQuery } from '@pinia/colada'
import { XMarkIcon, ClockIcon } from '@heroicons/vue/24/outline'

const { singular: tableSingular } = useTableLabel()
const tableSingularLower = computed(() => tableSingular.value.toLowerCase())

interface HistoryEntry {
  id: string
  member_id: string | null
  member_name: string | null
  member_role: string | null
  assigned_at: string
  unassigned_at: string | null
  assigned_by: string | null
  assigned_by_name: string | null
}

const props = defineProps<{
  open: boolean
  table: { id: string; name: string }
}>()

defineEmits<{ (e: 'close'): void }>()

const { state, refetch } = useQuery({
  key: () => ['operaciones', 'tables', props.table.id, 'assignment-history'],
  query: () => $fetch<{ success: boolean; data: HistoryEntry[] }>(
    `/api/operaciones/tables/${props.table.id}/assignment-history?limit=50`,
  ),
  enabled: () => props.open,
})

const data = computed(() => state.value?.data?.data ?? [])
const status = computed(() => state.value?.status)
const error = computed(() => state.value?.error)

// Refetch each time the modal opens to ensure fresh data
watch(() => props.open, (isOpen) => {
  if (isOpen) refetch()
})

const initials = (name: string | null | undefined): string => {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '—'
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
</script>
