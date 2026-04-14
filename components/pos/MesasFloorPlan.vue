<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { $fetch } from 'ofetch'

const emit = defineEmits<{
  (e: 'enter-table', ctx: { tableId: string; sessionId: string; tableName: string; isBar?: boolean; gotoCheckout?: boolean }): void
  (e: 'no-tables'): void
}>()

const { currentTenant } = useTenantReactive()

// ── Tables data ────────────────────────────────────────────────────────────
const { data: tablesData, status: tablesStatus, asyncStatus: tablesAsyncStatus, error: tablesError, refetch } = useQuery({
  key: () => ['tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/tables'),
  enabled: () => !!currentTenant.value,
  staleTime: 0,
})

const loadingTables = computed(() => tablesStatus.value === 'pending')
const isRefreshing = computed(() => tablesAsyncStatus.value === 'loading' && tablesData.value != null)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

const tables = computed(() => tablesData.value?.data ?? [])

// Bar tile is always-on — separate from regular tables
const barTable = computed(() => tables.value.find((t: any) => t.is_bar))
const regularTables = computed(() => tables.value.filter((t: any) => !t.is_bar))

// When data loads and there are 0 *regular* tables, tell the parent to fall back to POS view.
// The bar alone does not count as a configured table for this purpose.
watch(tablesStatus, (status) => {
  if (status === 'success' && regularTables.value.length === 0) emit('no-tables')
}, { immediate: true })

watch(() => currentTenant.value?.id, () => { refetch() })

// ── 30-second polling ──────────────────────────────────────────────────────
let pollInterval: ReturnType<typeof setInterval> | null = null

// ── Open session ───────────────────────────────────────────────────────────
const openingTableId = ref<string | null>(null)

const handleTableClick = async (table: any) => {
  // Don't navigate if a confirmation dialog is open on this table
  if (confirmCloseTableId.value === table.id || confirmDiscardTableId.value === table.id) return

  if (table.status === 'free') {
    if (openingTableId.value) return
    openingTableId.value = table.id
    try {
      const result = await $fetch<{ success: boolean; data: { session_id: string } }>(
        `/api/tables/${table.id}/open`, { method: 'POST' }
      )
      await refetch()
      emit('enter-table', {
        tableId: table.id,
        sessionId: result?.data?.session_id,
        tableName: table.name,
      })
    } catch {
      await refetch()
      emit('enter-table', {
        tableId: table.id,
        sessionId: table.session?.id,
        tableName: table.name,
      })
    } finally {
      openingTableId.value = null
    }
  } else if (table.status === 'open') {
    emit('enter-table', {
      tableId: table.id,
      sessionId: table.session?.id,
      tableName: table.name,
    })
  } else if (table.status === 'bill_requested') {
    emit('enter-table', {
      tableId: table.id,
      sessionId: table.session?.id,
      tableName: table.name,
      gotoCheckout: true,
    })
  }
}

// ── Bar click — session is always open, fetch current and enter ─────────────
const isEnteringBar = ref(false)

const handleBarClick = async () => {
  if (!barTable.value || isEnteringBar.value) return
  isEnteringBar.value = true
  try {
    emit('enter-table', {
      tableId: barTable.value.id,
      sessionId: barTable.value.session?.id ?? '',
      tableName: barTable.value.name,
      isBar: true,
    })
  } finally {
    isEnteringBar.value = false
  }
}

// ── Action state ────────────────────────────────────────────────────────────
const confirmDiscardTableId = ref<string | null>(null)
const confirmCloseTableId = ref<string | null>(null)
const isClosingTableId = ref<string | null>(null)
const isDiscardingTableId = ref<string | null>(null)
const isReopeningTableId = ref<string | null>(null)
const actionError = ref<string | null>(null)

// ── Close without payment ───────────────────────────────────────────────────
const initiateCloseTable = (table: any, event: MouseEvent) => {
  event.stopPropagation()
  if (table.session?.running_total > 0) {
    confirmCloseTableId.value = table.id
  } else {
    handleCloseTable(table.id)
  }
}

const handleCloseTable = async (tableId: string) => {
  isClosingTableId.value = tableId
  confirmCloseTableId.value = null
  actionError.value = null
  try {
    await $fetch(`/api/tables/${tableId}/close`, { method: 'POST' })
    await refetch()
  } catch (err: any) {
    actionError.value = err?.data?.detail ?? 'Error al cerrar la mesa'
  } finally {
    isClosingTableId.value = null
  }
}

// ── Discard session ─────────────────────────────────────────────────────────
const initiateDiscardTable = (tableId: string, event: MouseEvent) => {
  event.stopPropagation()
  confirmDiscardTableId.value = tableId
}

const handleDiscardTable = async (tableId: string) => {
  isDiscardingTableId.value = tableId
  confirmDiscardTableId.value = null
  actionError.value = null
  try {
    await $fetch(`/api/tables/${tableId}/session`, { method: 'DELETE' })
    await refetch()
  } catch (err: any) {
    actionError.value = err?.data?.detail ?? 'Error al descartar la sesión'
  } finally {
    isDiscardingTableId.value = null
  }
}

// ── Reopen session ──────────────────────────────────────────────────────────
const handleReopenTable = async (tableId: string, event: MouseEvent) => {
  event.stopPropagation()
  isReopeningTableId.value = tableId
  actionError.value = null
  try {
    await $fetch(`/api/tables/${tableId}/session/reopen`, { method: 'POST' })
    await refetch()
  } catch (err: any) {
    actionError.value = err?.data?.detail ?? 'Error al reabrir la sesión'
  } finally {
    isReopeningTableId.value = null
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDuration = (openedAt: string): string => {
  const diffMs = Date.now() - new Date(openedAt).getTime()
  const totalMins = Math.floor(diffMs / 60_000)
  if (totalMins < 60) return `${totalMins}m`
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const badgeLabel = (status: string) => {
  if (status === 'open') return 'En servicio'
  if (status === 'bill_requested') return 'Cuenta'
  return 'Libre'
}

// Extract number from name ("Mesa 3" → "3"), else first 3 chars
const tableShortId = (name: string) => {
  const match = name.match(/\d+/)
  return match ? match[0] : name.slice(0, 3).toUpperCase()
}

const tableColorClass = (status: string) => {
  if (status === 'open') return 'bg-green-100 border-green-500 text-green-900'
  if (status === 'bill_requested') return 'bg-amber-100 border-amber-500 text-amber-900'
  // Free: white bg + slate-500 border = 4.48:1 on white (passes WCAG 1.4.11)
  return 'bg-surface border-slate-400 text-text-primary'
}

const chairColorClass = (status: string) => {
  if (status === 'open') return 'bg-green-400'
  if (status === 'bill_requested') return 'bg-amber-400'
  return 'bg-slate-300'
}

const pillClass = (status: string) => {
  if (status === 'open') return 'text-green-700 border-green-300 bg-green-50'
  if (status === 'bill_requested') return 'text-amber-700 border-amber-300 bg-amber-50'
  return 'text-slate-600 border-slate-400 bg-transparent'
}

const freeCount = computed(() => regularTables.value.filter((t: any) => t.status === 'free').length)
const openCount = computed(() => regularTables.value.filter((t: any) => t.status === 'open').length)
const billCount = computed(() => regularTables.value.filter((t: any) => t.status === 'bill_requested').length)

const totalVentas = computed(() =>
  regularTables.value
    .filter((t: any) => t.status !== 'free' && t.session?.running_total)
    .reduce((sum: number, t: any) => sum + (t.session.running_total ?? 0), 0)
)

onMounted(() => {
  setRefreshHandler(refetch)
  pollInterval = setInterval(refetch, 30_000)
})

onUnmounted(() => {
  clearRefreshHandler(refetch)
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loadingTables || openingTableId" class="flex items-center justify-center min-h-[70vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="tablesError" />

    <!-- Content -->
    <div v-else>
        <!-- Legend -->
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
          <p class="text-sm text-text-secondary">Vista de planta principal</p>
          <div class="flex gap-2 flex-wrap">
            <div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm">
              <div class="w-3 h-3 rounded-sm bg-amber-300" />
              <span class="text-xs font-medium text-text-secondary">Barra</span>
            </div>
            <div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm">
              <div class="w-3 h-3 rounded-sm bg-green-400" />
              <span class="text-xs font-medium text-text-secondary">Ocupada</span>
            </div>
            <div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm">
              <div class="w-3 h-3 rounded-sm bg-amber-400" />
              <span class="text-xs font-medium text-text-secondary">Cuenta</span>
            </div>
            <div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm">
              <div class="w-3 h-3 rounded-sm bg-surface border-2 border-slate-400" />
              <span class="text-xs font-medium text-text-secondary">Libre</span>
            </div>
          </div>
        </div>

        <!-- Inline action error banner -->
        <div v-if="actionError" class="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ actionError }}</span>
          <button class="ml-auto text-red-500 hover:text-red-700 min-w-[44px] min-h-[44px] flex items-center justify-center" @click="actionError = null" aria-label="Cerrar error">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Barra tile — always visible, pinned before regular tables -->
        <div v-if="barTable" class="mb-4">
          <button
            class="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 border-amber-500 bg-amber-50 text-amber-800 focus:outline-none hover:brightness-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="isEnteringBar"
            aria-label="Barra — siempre abierta"
            @click="handleBarClick"
          >
            <!-- Bar icon -->
            <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-amber-100 border border-amber-200">
              <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 3h18v2l-7 9v7l-4-2v-5L3 5V3z" />
              </svg>
            </div>
            <!-- Info -->
            <div class="flex-1 min-w-0 text-left">
              <div class="flex items-center gap-2">
                <span class="text-base font-black text-amber-900 uppercase tracking-wide">Barra</span>
                <span class="text-[10px] font-bold bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Siempre abierta</span>
              </div>
              <p class="text-xs text-amber-700 mt-0.5 tabular-nums">
                <template v-if="barTable.session?.running_total > 0">
                  ${{ Math.round(barTable.session.running_total).toLocaleString('es-CO') }} acumulado ·
                  {{ formatDuration(barTable.session.opened_at) }}
                </template>
                <template v-else>
                  Sin consumo activo
                </template>
              </p>
            </div>
            <!-- Arrow -->
            <svg class="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <!-- Table grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pb-32">
          <div
            v-for="table in regularTables"
            :key="table.id"
            class="flex flex-col items-center"
          >
            <!-- Primary table button -->
            <button
              class="group w-full flex flex-col items-center py-6 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="openingTableId === table.id || isClosingTableId === table.id || isDiscardingTableId === table.id || isReopeningTableId === table.id"
              :aria-label="`${table.name} — ${badgeLabel(table.status)}`"
              @click="handleTableClick(table)"
            >
              <!-- Table + chairs -->
              <div class="relative mb-4">
                <!-- Chair: top -->
                <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-3 rounded-t-sm opacity-75 transition-colors duration-200" :class="chairColorClass(table.status)" />
                <!-- Chair: bottom -->
                <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-3 rounded-b-sm opacity-75 transition-colors duration-200" :class="chairColorClass(table.status)" />
                <!-- Chair: left -->
                <div class="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-8 rounded-l-sm opacity-75 transition-colors duration-200" :class="chairColorClass(table.status)" />
                <!-- Chair: right -->
                <div class="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-8 rounded-r-sm opacity-75 transition-colors duration-200" :class="chairColorClass(table.status)" />

                <!-- Table square -->
                <div
                  class="w-24 h-24 flex items-center justify-center rounded-xl border-2 transition-colors duration-150 group-hover:brightness-95"
                  :class="tableColorClass(table.status)"
                >
                  <!-- Loading spinner when actioning this table -->
                  <svg v-if="isClosingTableId === table.id || isDiscardingTableId === table.id || isReopeningTableId === table.id" class="w-8 h-8 animate-spin text-current opacity-60" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span v-else class="text-4xl font-black leading-none tabular-nums">{{ tableShortId(table.name) }}</span>
                </div>
              </div>

              <!-- Info below table -->
              <div class="text-center h-[52px] flex flex-col items-center justify-center gap-0.5">
                <template v-if="table.status !== 'free' && table.session">
                  <div class="flex items-baseline justify-center gap-0.5 font-bold text-text-primary">
                    <span class="text-sm">$</span>
                    <span class="text-lg tabular-nums leading-tight">{{ Math.round(table.session.running_total ?? 0).toLocaleString('es-CO') }}</span>
                  </div>
                  <div class="flex items-center justify-center gap-1 text-sm text-text-secondary">
                    <svg class="w-3.5 h-3.5 text-status-warning-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="font-medium tabular-nums">{{ formatDuration(table.session.opened_at) }}</span>
                  </div>
                </template>
              </div>

              <!-- Status pill -->
              <div
                class="mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                :class="pillClass(table.status)"
              >
                {{ badgeLabel(table.status) }}
              </div>
            </button>

            <!-- ── Inline action buttons row ──────────────────────────────── -->

            <!-- open / bill_requested: show Cerrar + Descartar -->
            <div
              v-if="(table.status === 'open' || table.status === 'bill_requested') && confirmCloseTableId !== table.id && confirmDiscardTableId !== table.id"
              class="flex gap-1 justify-center mb-3 mt-1"
            >
              <!-- Cerrar -->
              <button
                class="flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[44px] min-h-[36px] rounded-lg transition-colors text-slate-500 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isClosingTableId === table.id || isDiscardingTableId === table.id"
                :aria-label="`Cerrar mesa ${table.name}`"
                @click.stop="initiateCloseTable(table, $event)"
              >
                <svg v-if="isClosingTableId === table.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-[10px] uppercase tracking-wide leading-none">Cerrar</span>
              </button>

              <!-- Descartar -->
              <button
                class="flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[44px] min-h-[36px] rounded-lg transition-colors text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isClosingTableId === table.id || isDiscardingTableId === table.id"
                :aria-label="`Descartar sesión de mesa ${table.name}`"
                @click.stop="initiateDiscardTable(table.id, $event)"
              >
                <svg v-if="isDiscardingTableId === table.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span class="text-[10px] uppercase tracking-wide leading-none">Descartar</span>
              </button>
            </div>

            <!-- free + last_closed_at: show Reabrir -->
            <div
              v-if="table.status === 'free' && table.last_closed_at && confirmCloseTableId !== table.id && confirmDiscardTableId !== table.id"
              class="flex gap-1 justify-center mb-3 mt-1"
            >
              <button
                class="flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[44px] min-h-[36px] rounded-lg transition-colors text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isReopeningTableId === table.id"
                :aria-label="`Reabrir mesa ${table.name}`"
                @click.stop="handleReopenTable(table.id, $event)"
              >
                <svg v-if="isReopeningTableId === table.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="text-[10px] uppercase tracking-wide leading-none">Reabrir</span>
              </button>
            </div>

            <!-- Inline confirm: close without payment (has items) -->
            <div
              v-if="confirmCloseTableId === table.id"
              class="w-full px-2 pb-3"
            >
              <p class="text-[11px] text-text-secondary text-center mb-2 leading-snug">
                Esta mesa tiene <strong class="text-text-primary">${{ Math.round(table.session?.running_total ?? 0).toLocaleString('es-CO') }}</strong> en consumo.<br>¿Cerrar sin cobrar?
              </p>
              <div class="flex gap-1 justify-center">
                <button
                  class="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary border border-border hover:bg-slate-50 transition-colors min-h-[36px]"
                  @click.stop="confirmCloseTableId = null"
                >
                  Cancelar
                </button>
                <button
                  class="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-700 hover:bg-slate-800 transition-colors min-h-[36px]"
                  @click.stop="handleCloseTable(table.id)"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <!-- Inline confirm: discard session -->
            <div
              v-if="confirmDiscardTableId === table.id"
              class="w-full px-2 pb-3"
            >
              <p class="text-[11px] text-text-secondary text-center mb-2 leading-snug">
                ¿Eliminar esta sesión?<br>Los pedidos pendientes se borrarán.
              </p>
              <div class="flex gap-1 justify-center">
                <button
                  class="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary border border-border hover:bg-slate-50 transition-colors min-h-[36px]"
                  @click.stop="confirmDiscardTableId = null"
                >
                  Cancelar
                </button>
                <button
                  class="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors min-h-[36px]"
                  @click.stop="handleDiscardTable(table.id)"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>

  </div>
</template>
