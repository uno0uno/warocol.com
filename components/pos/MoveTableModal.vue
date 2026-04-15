<script setup lang="ts">
/**
 * MoveTableModal — destination picker for moving a table's open tab to another table.
 *
 * Issue: https://github.com/uno0uno/warocol.com/issues/314
 */
import { ref, computed } from 'vue'
import { useMoveTable } from '~/composables/useMoveTable'

const props = defineProps<{
  show: boolean
  sourceTable: { tableId: string; sessionId: string; tableName: string } | null
  tables: any[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'moved', result: { targetTableId: string; targetSessionId: string; targetTableName: string }): void
}>()

const selectedTableId = ref<string | null>(null)
const { isMoving, moveError, moveTable } = useMoveTable()

// Tables available as destinations: exclude source table and bar tables.
// Free tables are selectable; occupied tables are disabled.
const destinationTables = computed(() =>
  props.tables.filter((t: any) => !t.is_bar && t.id !== props.sourceTable?.tableId),
)

const handleSelectTable = (table: any) => {
  if (table.status !== 'free') return
  selectedTableId.value = table.id
}

const handleConfirm = async () => {
  if (!props.sourceTable || !selectedTableId.value || isMoving.value) return
  const result = await moveTable(props.sourceTable.tableId, selectedTableId.value)
  if (result) {
    selectedTableId.value = null
    emit('moved', {
      targetTableId: result.targetTableId,
      targetSessionId: result.targetSessionId,
      targetTableName: result.targetTableName,
    })
  }
}

const handleClose = () => {
  if (isMoving.value) return
  selectedTableId.value = null
  emit('close')
}

// Extract display number from table name ("Mesa 3" → "3"), else first 3 chars
const tableShortId = (name: string) => {
  const match = name.match(/\d+/)
  return match ? match[0] : name.slice(0, 3).toUpperCase()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
      :aria-label="`Mover ${sourceTable?.tableName ?? 'mesa'} a otra mesa`"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-sm"
        @click="handleClose"
      />

      <!-- Panel -->
      <div class="relative z-10 w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-2xl border border-border shadow-xl flex flex-col max-h-[90vh]">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div>
            <h2 class="text-base font-bold text-text-primary">
              Mover {{ sourceTable?.tableName ?? 'mesa' }} a...
            </h2>
            <p class="text-xs text-text-secondary mt-0.5">Selecciona una mesa libre como destino</p>
          </div>
          <button
            type="button"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-secondary transition-colors text-text-secondary"
            aria-label="Cerrar"
            :disabled="isMoving"
            @click="handleClose"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Table grid -->
        <div class="overflow-y-auto flex-1 px-5 py-4">
          <!-- Error message -->
          <div
            v-if="moveError"
            class="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
          >
            {{ moveError }}
          </div>

          <div v-if="destinationTables.length === 0" class="py-8 text-center text-sm text-text-secondary">
            No hay otras mesas disponibles
          </div>

          <div v-else class="grid grid-cols-3 gap-3">
            <button
              v-for="table in destinationTables"
              :key="table.id"
              type="button"
              class="flex flex-col items-center rounded-xl border p-3 transition-colors outline-none"
              :class="[
                table.status !== 'free'
                  ? 'opacity-50 cursor-not-allowed border-border bg-surface-secondary'
                  : selectedTableId === table.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-surface hover:border-primary/40 cursor-pointer',
              ]"
              :disabled="table.status !== 'free' || isMoving"
              :title="table.status !== 'free' ? 'Ocupada' : `Seleccionar ${table.name}`"
              :aria-label="`${table.name} — ${table.status === 'free' ? 'libre' : 'ocupada'}`"
              :aria-pressed="selectedTableId === table.id"
              @click="handleSelectTable(table)"
            >
              <!-- Table square -->
              <div
                class="w-10 h-10 flex items-center justify-center rounded-lg font-black text-xl tabular-nums mb-1.5"
                :class="
                  table.status !== 'free'
                    ? 'bg-surface-secondary text-text-secondary'
                    : selectedTableId === table.id
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface-secondary text-text-primary'
                "
              >
                {{ tableShortId(table.name) }}
              </div>
              <span class="text-[10px] font-semibold text-text-secondary text-center leading-tight truncate w-full text-center">
                {{ table.name }}
              </span>
              <span
                v-if="table.status !== 'free'"
                class="text-[9px] font-bold text-amber-600 uppercase tracking-wide mt-0.5"
              >
                Ocupada
              </span>
              <span
                v-else-if="selectedTableId === table.id"
                class="text-[9px] font-bold text-primary uppercase tracking-wide mt-0.5"
              >
                Seleccionada
              </span>
              <span
                v-else
                class="text-[9px] font-semibold text-status-success-text uppercase tracking-wide mt-0.5"
              >
                Libre
              </span>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 pb-6 pt-4 border-t border-border flex-shrink-0 flex gap-3">
          <button
            type="button"
            class="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors disabled:opacity-50"
            :disabled="isMoving"
            @click="handleClose"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="!selectedTableId || isMoving"
            @click="handleConfirm"
          >
            <UiLoadingDots v-if="isMoving" size="11px" color="white" aria-hidden="true" />
            <span>{{ isMoving ? 'Moviendo…' : 'Confirmar traslado' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
