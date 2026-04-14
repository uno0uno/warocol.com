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
  // Don't navigate if an action menu is open on this table
  if (actionMenuTableId.value === table.id) return

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

// ── Action menu state ───────────────────────────────────────────────────────
const actionMenuTableId = ref<string | null>(null)
const confirmDiscardTableId = ref<string | null>(null)
const confirmCloseTableId = ref<string | null>(null)
const isClosingTableId = ref<string | null>(null)
const isDiscardingTableId = ref<string | null>(null)
const isReopeningTableId = ref<string | null>(null)
const actionError = ref<string | null>(null)

const toggleActionMenu = (tableId: string, event: MouseEvent) => {
  event.stopPropagation()
  actionMenuTableId.value = actionMenuTableId.value === tableId ? null : tableId
  actionError.value = null
}

const closeActionMenu = () => {
  actionMenuTableId.value = null
  confirmDiscardTableId.value = null
  confirmCloseTableId.value = null
}

// Close menu when clicking outside
const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('[data-action-menu]')) {
    closeActionMenu()
  }
}

// ── Close without payment ───────────────────────────────────────────────────
const initiateCloseTable = (table: any, event: MouseEvent) => {
  event.stopPropagation()
  if (table.session?.running_total > 0) {
    confirmCloseTableId.value = table.id
    actionMenuTableId.value = null
  } else {
    handleCloseTable(table.id)
  }
}

const handleCloseTable = async (tableId: string) => {
  isClosingTableId.value = tableId
  confirmCloseTableId.value = null
  actionMenuTableId.value = null
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
  actionMenuTableId.value = null
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
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  clearRefreshHandler(refetch)
  if (pollInterval) clearInterval(pollInterval)
  document.removeEventListener('click', handleDocumentClick)
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
          <!-- Each table card is a relative div wrapper to allow absolute-positioned overflow menu button -->
          <div
            v-for="table in regularTables"
            :key="table.id"
            class="relative"
            data-action-menu
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
                <!-- Reopen chip for free tables with a recent closed session -->
                <template v-else-if="table.status === 'free' && table.last_closed_at">
                  <div class="h-full flex items-center justify-center" />
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

            <!-- Reopen button for free tables with a recent closed session -->
            <button
              v-if="table.status === 'free' && table.last_closed_at && !isReopeningTableId"
              class="mx-auto mb-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50 min-h-[44px]"
              :disabled="isReopeningTableId === table.id"
              :aria-label="`Reabrir sesión de ${table.name}`"
              @click="handleReopenTable(table.id, $event)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reabrir
            </button>

            <!-- Overflow menu button (only for occupied/bill_requested tables that are not bar) -->
            <button
              v-if="table.status !== 'free' && !table.is_bar"
              class="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none min-w-[44px] min-h-[44px]"
              :aria-label="`Acciones para ${table.name}`"
              :aria-expanded="actionMenuTableId === table.id"
              @click="toggleActionMenu(table.id, $event)"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>

            <!-- Dropdown action menu -->
            <div
              v-if="actionMenuTableId === table.id"
              class="absolute top-12 right-2 z-20 w-52 rounded-xl border border-border bg-surface shadow-lg py-1"
              role="menu"
              aria-label="Opciones de mesa"
            >
              <!-- Close without payment -->
              <button
                class="w-full flex items-center gap-2 px-4 py-3 text-sm text-text-primary hover:bg-slate-50 transition-colors text-left min-h-[44px]"
                role="menuitem"
                @click="initiateCloseTable(table, $event)"
              >
                <svg class="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Cerrar sin cobrar
              </button>

              <div class="border-t border-border my-1" />

              <!-- Discard session (destructive) -->
              <button
                class="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left min-h-[44px]"
                role="menuitem"
                @click="initiateDiscardTable(table.id, $event)"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Descartar sesión
              </button>
            </div>

            <!-- Confirmation modal: close without payment (has items) -->
            <div
              v-if="confirmCloseTableId === table.id"
              class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
              @click.self="confirmCloseTableId = null"
            >
              <div class="w-full max-w-sm rounded-2xl bg-surface border border-border shadow-xl p-6">
                <div class="flex items-start gap-3 mb-4">
                  <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 class="font-semibold text-text-primary text-base">Cerrar sin cobrar</h3>
                    <p class="text-sm text-text-secondary mt-1">
                      Esta mesa tiene <strong class="text-text-primary">${{ Math.round(table.session?.running_total ?? 0).toLocaleString('es-CO') }}</strong> en consumo.
                      ¿Cerrar sin cobrar?
                    </p>
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <button
                    class="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary border border-border hover:bg-slate-50 transition-colors min-h-[44px]"
                    @click="confirmCloseTableId = null"
                  >
                    Cancelar
                  </button>
                  <button
                    class="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 transition-colors min-h-[44px]"
                    @click="handleCloseTable(table.id)"
                  >
                    Cerrar sin cobrar
                  </button>
                </div>
              </div>
            </div>

            <!-- Confirmation modal: discard session -->
            <div
              v-if="confirmDiscardTableId === table.id"
              class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
              @click.self="confirmDiscardTableId = null"
            >
              <div class="w-full max-w-sm rounded-2xl bg-surface border border-border shadow-xl p-6">
                <div class="flex items-start gap-3 mb-4">
                  <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 class="font-semibold text-text-primary text-base">Descartar sesión</h3>
                    <p class="text-sm text-text-secondary mt-1">
                      ¿Descartar la sesión de <strong class="text-text-primary">{{ table.name }}</strong>?
                      Los pedidos pendientes se eliminarán permanentemente.
                    </p>
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <button
                    class="px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary border border-border hover:bg-slate-50 transition-colors min-h-[44px]"
                    @click="confirmDiscardTableId = null"
                  >
                    Cancelar
                  </button>
                  <button
                    class="px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors min-h-[44px]"
                    @click="handleDiscardTable(table.id)"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>

  </div>
</template>
