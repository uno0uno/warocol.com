<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  (e: 'enter-table', ctx: { tableId: string; sessionId: string; tableName: string; gotoCheckout?: boolean }): void
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

// When data loads and there are 0 tables, tell the parent to fall back to POS view
watch(tablesStatus, (status) => {
  if (status === 'success' && tables.value.length === 0) emit('no-tables')
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
  if (status === 'open') return 'bg-crocus-100 border-crocus-300 text-crocus-700'
  if (status === 'bill_requested') return 'bg-status-success-bg border-status-success-text text-status-success-text'
  return 'bg-surface-secondary border-border text-text-secondary'
}

const chairColorClass = (status: string) => {
  if (status === 'open') return 'bg-crocus-300'
  if (status === 'bill_requested') return 'bg-titan-300'
  return 'bg-titan-300'
}

const pillClass = (status: string) => {
  if (status === 'open') return 'text-crocus-700 border-crocus-200 bg-crocus-50'
  if (status === 'bill_requested') return 'text-status-success-text border-status-success-text bg-status-success-bg'
  return 'text-text-tertiary border-border bg-transparent'
}

const freeCount = computed(() => tables.value.filter((t: any) => t.status === 'free').length)
const openCount = computed(() => tables.value.filter((t: any) => t.status === 'open').length)
const billCount = computed(() => tables.value.filter((t: any) => t.status === 'bill_requested').length)

const totalVentas = computed(() =>
  tables.value
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
      <!-- Floor plan -->
      <template>
        <!-- Legend -->
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
          <p class="text-sm text-text-secondary">Vista de planta principal</p>
          <div class="flex gap-2 flex-wrap">
            <div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm">
              <div class="w-3 h-3 rounded-sm bg-crocus-300" />
              <span class="text-xs font-medium text-text-secondary">Ocupada</span>
            </div>
            <div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm">
              <div class="w-3 h-3 rounded-sm bg-status-success-bg border border-status-success-text" />
              <span class="text-xs font-medium text-text-secondary">Cuenta</span>
            </div>
            <div class="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm">
              <div class="w-3 h-3 rounded-sm bg-surface-secondary border border-border" />
              <span class="text-xs font-medium text-text-secondary">Libre</span>
            </div>
          </div>
        </div>

        <!-- Table grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pb-32">
          <button
            v-for="table in tables"
            :key="table.id"
            class="group flex flex-col items-center py-6 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="openingTableId === table.id"
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
                class="w-24 h-24 flex flex-col items-center justify-center rounded-xl border-2 transition-colors duration-150 group-hover:brightness-95"
                :class="tableColorClass(table.status)"
              >
                <span class="text-[9px] uppercase tracking-widest font-bold opacity-50 leading-none mb-1">Mesa</span>
                <span class="text-3xl font-black leading-none">{{ tableShortId(table.name) }}</span>
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
        </div>
      </template>
    </div>

  </div>
</template>
