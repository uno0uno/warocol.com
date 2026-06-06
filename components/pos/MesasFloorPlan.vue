<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { $fetch } from 'ofetch'
import { displayTableCode, tableCodeTypographyClass } from '~/composables/useTableDisplayCode'

const { singular: tableSingular } = useTableLabel()
const tableSingularLower = computed(() => tableSingular.value.toLowerCase())

const props = defineProps<{
  comandasEnabled?: boolean
  /** Issue #574 — when true, render the effective-waiter line under each mesa card */
  waiterAttributionEnabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'enter-table', ctx: { tableId: string; sessionId: string; tableName: string; isBar?: boolean; gotoCheckout?: boolean }): void
  (e: 'no-tables'): void
  (e: 'move-table', ctx: { tableId: string; sessionId: string; tableName: string }): void
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
    // Open the session directly; mesero assignment happens from the
    // banner chip in /pos (no pre-open prompt). If the mesa has a
    // default `assigned_member_id`, the resolver carries it through
    // automatically (#573 → #574 fallback chain).
    await doOpenTable(table, null)
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

const doOpenTable = async (table: any, attendedByMemberId: string | null) => {
  openingTableId.value = table.id
  try {
    const result = await $fetch<{ success: boolean; data: { session_id: string } }>(
      `/api/tables/${table.id}/open`,
      {
        method: 'POST',
        body: attendedByMemberId ? { attended_by_member_id: attendedByMemberId } : undefined,
      },
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

// ── Move table ────────────────────────────────────────────────────────────
const handleMoveTable = (table: any, event: Event) => {
  event.stopPropagation()
  emit('move-table', {
    tableId: table.id,
    sessionId: table.session?.id ?? '',
    tableName: table.name,
  })
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


/** Una sola familia de color por card (sin mezclar verde + gris/morado en el mismo bloque). */
const tableStatusTheme = (status: string) => {
  if (status === 'open') {
    return {
      card: 'border-2 border-status-success-text/45 bg-status-success-bg hover:shadow-md',
      focus: 'focus-visible:ring-status-success-text/50 focus-visible:ring-offset-status-success-bg',
      square: 'bg-status-success-text/12 border-status-success-text text-status-success-text',
      chair: 'bg-status-success-text/55',
      strip: 'border-t border-status-success-text/30',
      footer: 'border-t border-status-success-text/30',
      text: 'text-status-success-text',
      footerText: 'text-status-success-text',
      name: 'text-status-success-text/75',
      divider: 'bg-status-success-text/22',
      dot: 'bg-status-success-text',
      moveHover: 'hover:bg-status-success-text/10 focus-visible:ring-status-success-text/40',
    }
  }
  if (status === 'bill_requested') {
    return {
      card: 'border-2 border-status-warning-text/45 bg-status-warning-bg hover:shadow-md',
      focus: 'focus-visible:ring-status-warning-text/50 focus-visible:ring-offset-status-warning-bg',
      square: 'bg-status-warning-text/12 border-status-warning-text text-status-warning-text',
      chair: 'bg-status-warning-text/55',
      strip: 'border-t border-status-warning-text/30',
      footer: 'border-t border-status-warning-text/30',
      text: 'text-status-warning-text',
      footerText: 'text-status-warning-text',
      name: 'text-status-warning-text/75',
      divider: 'bg-status-warning-text/22',
      dot: 'bg-status-warning-text',
      moveHover: 'hover:bg-status-warning-text/10 focus-visible:ring-status-warning-text/40',
    }
  }
  return {
    card: 'border-2 border-border bg-surface hover:shadow-md hover:border-border/80',
    focus: 'focus-visible:ring-border focus-visible:ring-offset-surface',
    square: 'bg-surface border-border text-text-primary',
    chair: 'bg-border',
    strip: 'border-t border-border',
    footer: 'border-t border-border',
    text: 'text-text-secondary',
    footerText: 'text-text-secondary',
    name: 'text-text-secondary',
    divider: 'bg-border',
    dot: 'bg-text-tertiary',
    moveHover: 'hover:bg-surface-secondary/50 focus-visible:ring-border/60',
  }
}

const cardClass = (status: string) => tableStatusTheme(status).card
const focusRingClass = (status: string) => tableStatusTheme(status).focus
const squareClass = (status: string) => tableStatusTheme(status).square
const chairClass = (status: string) => tableStatusTheme(status).chair
const stripClass = (status: string) => tableStatusTheme(status).strip
const stripTextClass = (status: string) => tableStatusTheme(status).text
const stripDividerClass = (status: string) => tableStatusTheme(status).divider
const dotClass = (status: string) => tableStatusTheme(status).dot
const tableNameClass = (status: string) => tableStatusTheme(status).name
const footerClass = (status: string) => tableStatusTheme(status).footer
const footerTextClass = (status: string) => tableStatusTheme(status).footerText ?? tableStatusTheme(status).text
const moveButtonClass = (status: string) => tableStatusTheme(status).moveHover

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
            <div class="w-3 h-3 rounded-sm bg-status-warning-bg border border-status-warning-text/40" />
            <span class="text-xs font-medium text-text-secondary">Barra</span>
          </div>
          <div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm">
            <div class="w-3 h-3 rounded-sm bg-status-success-bg border border-status-success-text/40" />
            <span class="text-xs font-medium text-text-secondary">Ocupada</span>
          </div>
          <div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm">
            <div class="w-3 h-3 rounded-sm bg-status-warning-bg border border-status-warning-text/40" />
            <span class="text-xs font-medium text-text-secondary">Cuenta</span>
          </div>
          <div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm">
            <div class="w-3 h-3 rounded-sm bg-surface border-2 border-border" />
            <span class="text-xs font-medium text-text-secondary">Libre</span>
          </div>
        </div>
      </div>

      <!-- Barra tile — always visible, pinned before regular tables -->
      <div v-if="barTable" class="mb-4">
        <button
          class="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 border-status-warning-text bg-status-warning-bg text-status-warning-text focus:outline-none focus-visible:ring-2 focus-visible:ring-status-warning-text/45 focus-visible:ring-offset-2 hover:brightness-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="isEnteringBar"
          aria-label="Barra — siempre abierta"
          @click="handleBarClick"
        >
          <!-- Bar icon -->
          <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-status-warning-text/12 border border-status-warning-text/30">
            <svg class="w-6 h-6 text-status-warning-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 3h18v2l-7 9v7l-4-2v-5L3 5V3z" />
            </svg>
          </div>
          <!-- Info -->
          <div class="flex-1 min-w-0 text-left">
            <div class="flex items-center gap-2">
              <span class="text-base font-black uppercase tracking-wide">Barra</span>
              <span class="text-[10px] font-bold bg-status-warning-text/12 text-status-warning-text px-2 py-0.5 rounded-full uppercase tracking-widest">Siempre abierta</span>
            </div>
            <p class="text-xs opacity-90 mt-0.5 tabular-nums">
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
          <svg class="w-5 h-5 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Table grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-32">
        <div v-for="table in regularTables" :key="table.id" class="flex flex-col gap-1">

          <!-- Card -->
          <button
            class="group w-full flex flex-col rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            :class="[cardClass(table.status), focusRingClass(table.status)]"
            :disabled="openingTableId === table.id"
            :aria-label="`${table.name} — ${badgeLabel(table.status)}`"
            @click="handleTableClick(table)"
          >
            <!-- Top: table graphic -->
            <div class="flex flex-col items-center justify-center py-4 px-3 gap-3">
              <div class="relative">
                <!-- Chairs -->
                <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-3 rounded-t-sm transition-colors duration-200" :class="chairClass(table.status)" />
                <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-3 rounded-b-sm transition-colors duration-200" :class="chairClass(table.status)" />
                <div class="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-8 rounded-l-sm transition-colors duration-200" :class="chairClass(table.status)" />
                <div class="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-8 rounded-r-sm transition-colors duration-200" :class="chairClass(table.status)" />
                <!-- Table square with short code -->
                <div
                  class="w-20 h-20 min-w-[5rem] flex items-center justify-center rounded-xl border-2 transition-colors duration-150 group-hover:brightness-95 px-1.5 overflow-hidden"
                  :class="squareClass(table.status)"
                >
                  <span :class="tableCodeTypographyClass(displayTableCode(table))">{{ displayTableCode(table) }}</span>
                </div>
              </div>
              <span class="text-xs sm:text-sm font-medium text-center leading-snug line-clamp-2 w-full min-h-[2.5rem]" :class="tableNameClass(table.status)">
                {{ table.name }}
              </span>
            </div>

            <!-- Bottom strip: occupied → time + amount / reabrir → single action / libre → label -->
            <template v-if="table.status !== 'free'">
              <div class="flex items-center justify-around px-1 min-h-11 border-t" :class="stripClass(table.status)">
                <!-- Cell 1: dot + time + unfired indicator -->
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" :class="dotClass(table.status)" />
                  <span class="text-xs font-semibold tabular-nums" :class="stripTextClass(table.status)">
                    {{ formatDuration(table.session.opened_at) }}
                  </span>
                  <!-- Pulsing red dot when there are unfired items (KDS enabled) -->
                  <template v-if="props.comandasEnabled && table.session?.unfired_count > 0">
                    <span class="relative flex h-2 w-2 flex-shrink-0">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-state-danger-icon" />
                    </span>
                  </template>
                </div>
                <span class="w-px h-4" :class="stripDividerClass(table.status)" />
                <!-- Cell 2: running total -->
                <span class="text-xs font-black tabular-nums" :class="stripTextClass(table.status)">
                  ${{ Math.round(table.session?.running_total ?? 0).toLocaleString('es-CO') }}
                </span>
                <span class="w-px h-4" :class="stripDividerClass(table.status)" />
                <!-- Cell 3: move/transfer button -->
                <button
                  type="button"
                  class="min-h-11 min-w-11 flex items-center justify-center rounded transition-colors focus:outline-none focus-visible:ring-2"
                  :class="[stripTextClass(table.status), moveButtonClass(table.status)]"
                  :aria-label="`Mover ${table.name} a otra ${tableSingularLower}`"
                  @click.stop="handleMoveTable(table, $event)"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>
            </template>
            <template v-else>
              <!-- Free table — "Libre" label (Reabrir UI removed; endpoint /session/reopen still exists) -->
              <div class="flex items-center justify-center px-3 min-h-11" :class="footerClass(table.status)">
                <span class="text-xs font-semibold" :class="stripTextClass(table.status)">Libre</span>
              </div>
            </template>

            <!-- Issue #574 — Waiter line (below strip). Always rendered when the
                 feature is on so every card has the same height; centered text
                 only (no icon) — shows the effective waiter (session override >
                 table default) or a "Sin asignar" placeholder when null. -->
            <div
              v-if="waiterAttributionEnabled"
              class="flex items-center justify-center px-3 h-7"
              :class="footerClass(table.status)"
            >
              <span
                class="text-xs font-medium truncate text-center"
                :class="[footerTextClass(table.status), !table.effective_waiter_member_name && 'italic']"
              >
                {{ table.effective_waiter_member_name || 'Sin asignar' }}
              </span>
            </div>
          </button>

        </div>
      </div>
    </div>

  </div>
</template>
