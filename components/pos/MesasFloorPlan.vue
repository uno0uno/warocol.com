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

// ── Reopen session (subtle text link on free tables with last_closed_at) ────
const isReopeningTableId = ref<string | null>(null)

const handleReopenTable = async (tableId: string, event: Event) => {
  event.stopPropagation()
  isReopeningTableId.value = tableId
  try {
    await $fetch(`/api/tables/${tableId}/session/reopen`, { method: 'POST' })
    await refetch()
  } catch {
    // Non-critical — table state unchanged
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
  return 'bg-surface border-slate-400 text-text-primary'
}

const chairColorClass = (status: string) => {
  if (status === 'open') return 'bg-green-400'
  if (status === 'bill_requested') return 'bg-amber-400'
  return 'bg-slate-300'
}

const cardBorderClass = (status: string) => {
  if (status === 'open') return 'border-green-200 bg-green-50/30'
  if (status === 'bill_requested') return 'border-amber-200 bg-amber-50/30'
  return 'border-slate-200 bg-surface'
}

const stripBorderClass = (status: string) => {
  if (status === 'open') return 'border-green-200 divide-green-200'
  if (status === 'bill_requested') return 'border-amber-200 divide-amber-200'
  return 'border-slate-100 divide-slate-100'
}

const dotClass = (status: string) => {
  if (status === 'open') return 'bg-green-500'
  if (status === 'bill_requested') return 'bg-amber-500'
  return 'bg-slate-300'
}

const pillTextClass = (status: string) => {
  if (status === 'open') return 'text-green-700'
  if (status === 'bill_requested') return 'text-amber-600'
  return 'text-slate-500'
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
    <div v-if="loadingTables" class="flex items-center justify-center min-h-[70vh]">
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
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-32">
        <button
          v-for="table in regularTables"
          :key="table.id"
          class="group flex flex-col w-full rounded-2xl border overflow-hidden bg-surface hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          :class="cardBorderClass(table.status)"
          :disabled="openingTableId === table.id"
          :aria-label="`${table.name} — ${badgeLabel(table.status)}`"
          @click="handleTableClick(table)"
        >
          <!-- Top area: table graphic -->
          <div class="flex-1 flex items-center justify-center py-6">
            <div class="relative">
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
                class="w-20 h-20 flex items-center justify-center rounded-xl border-2 transition-colors duration-150 group-hover:brightness-95"
                :class="tableColorClass(table.status)"
              >
                <CommonsTheCustomLoader v-if="openingTableId === table.id" size="small" />
                <span v-else class="text-4xl font-black leading-none tabular-nums">{{ tableShortId(table.name) }}</span>
              </div>
            </div>
          </div>

          <!-- Bottom strip: 3 cells -->
          <div class="grid grid-cols-3 border-t divide-x text-center" :class="stripBorderClass(table.status)">
            <!-- Cell 1: name + dot -->
            <div class="flex flex-col items-center justify-center py-2 gap-0.5">
              <span class="w-2 h-2 rounded-full" :class="dotClass(table.status)" />
              <span class="text-[10px] font-bold text-text-secondary uppercase tracking-wide leading-none">{{ table.name }}</span>
            </div>
            <!-- Cell 2: time -->
            <div class="flex flex-col items-center justify-center py-2 gap-0.5">
              <template v-if="table.status !== 'free' && table.session">
                <svg class="w-3 h-3 text-status-warning-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-[10px] font-semibold tabular-nums text-text-secondary leading-none">{{ formatDuration(table.session.opened_at) }}</span>
              </template>
              <!-- Reabrir — free tables with last_closed_at -->
              <span
                v-else-if="table.status === 'free' && table.last_closed_at"
                role="button"
                tabindex="0"
                class="text-[10px] text-blue-600 underline cursor-pointer select-none leading-tight"
                :class="{ 'opacity-50 pointer-events-none': isReopeningTableId === table.id }"
                :aria-label="`Reabrir ${table.name}`"
                @click.stop="handleReopenTable(table.id, $event)"
                @keydown.enter.stop="handleReopenTable(table.id, $event)"
              >{{ isReopeningTableId === table.id ? '…' : '↩ Reabrir' }}</span>
              <span v-else class="text-[10px] text-text-tertiary leading-none">—</span>
            </div>
            <!-- Cell 3: amount -->
            <div class="flex flex-col items-center justify-center py-2 gap-0.5">
              <template v-if="table.status !== 'free' && table.session">
                <span class="text-[10px] text-text-secondary leading-none">$</span>
                <span class="text-[11px] font-black tabular-nums text-text-primary leading-none">{{ Math.round(table.session.running_total ?? 0).toLocaleString('es-CO') }}</span>
              </template>
              <span v-else class="text-[10px] text-text-tertiary leading-none">—</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
