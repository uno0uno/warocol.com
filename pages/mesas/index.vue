<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'


const { currentTenant } = useTenantReactive()
const router = useRouter()

// ── Module guard — redirect to /pos if tables are disabled ─────────────────
const { data: settingsData } = useQuery({
  key: () => ['tenant', 'negocio-profile', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/public-profile'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

watch(
  () => settingsData.value?.data?.tables_enabled,
  (enabled) => {
    if (enabled === false) navigateTo('/pos')
  },
  { immediate: true }
)

// ── Tables data ────────────────────────────────────────────────────────────
const { data: tablesData, status: tablesStatus, asyncStatus: tablesAsyncStatus, error: tablesError, refetch } = useQuery({
  key: () => ['tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/tables'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const loadingTables = computed(() => tablesStatus.value === 'loading' && !tablesData.value)
const isRefreshing = computed(() => tablesAsyncStatus.value === 'loading' && tablesData.value != null)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

const tables = computed(() => tablesData.value?.data ?? [])

// Clear data when tenant changes
watch(() => currentTenant.value?.id, () => { refetch() })

// ── 30-second polling ──────────────────────────────────────────────────────
let pollInterval: ReturnType<typeof setInterval> | null = null

// ── Open session ───────────────────────────────────────────────────────────
const openingTableId = ref<string | null>(null)

const writeMesaContext = (table: any, sessionId?: string) => {
  const sid = sessionId ?? table.session?.id
  if (sid) {
    sessionStorage.setItem('mesaContext', JSON.stringify({
      tableId: table.id,
      sessionId: sid,
      tableName: table.name,
    }))
  }
}

const handleTableClick = async (table: any) => {
  if (table.status === 'free') {
    if (openingTableId.value) return // prevent double-tap
    openingTableId.value = table.id
    try {
      const result = await $fetch<{ success: boolean; data: { session_id: string } }>(
        `/api/tables/${table.id}/open`, { method: 'POST' }
      )
      await refetch()
      writeMesaContext(table, result?.data?.session_id)
      sessionStorage.setItem('posNavigation', 'true')
      router.push('/pos')
    } catch (e) {
      // If session already open (race), still navigate — context from table.session
      await refetch()
      writeMesaContext(table)
      sessionStorage.setItem('posNavigation', 'true')
      router.push('/pos')
    } finally {
      openingTableId.value = null
    }
  } else if (table.status === 'open') {
    writeMesaContext(table)
    sessionStorage.setItem('posNavigation', 'true')
    router.push('/pos')
  } else if (table.status === 'bill_requested') {
    writeMesaContext(table)
    sessionStorage.setItem('posNavigation', 'true')
    router.push('/pos/checkout')
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

const formatCurrency = (amount: number): string => {
  return `$${Math.round(amount).toLocaleString('es-CO')}`
}

const badgeVariant = (status: string) => {
  if (status === 'open') return 'success'
  if (status === 'bill_requested') return 'warning'
  return 'secondary'
}

const badgeLabel = (status: string) => {
  if (status === 'open') return 'Ocupada'
  if (status === 'bill_requested') return 'Pidiendo cuenta'
  return 'Libre'
}

const freeCount = computed(() => tables.value.filter(t => t.status === 'free').length)
const openCount = computed(() => tables.value.filter(t => t.status === 'open').length)
const billCount = computed(() => tables.value.filter(t => t.status === 'bill_requested').length)

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
      <!-- Empty State — no tables configured -->
      <div v-if="tables.length === 0" class="flex flex-col items-center justify-center min-h-[60vh] text-text-secondary gap-4">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M3 14h18M10 10V6m4 4V6m-9 8v4m14-4v4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
        </svg>
        <div class="text-center">
          <p class="text-lg font-semibold text-text-primary">No tienes mesas configuradas</p>
          <p class="text-sm mt-1">Agrega mesas desde la configuración de tu negocio</p>
        </div>
        <NuxtLink
          to="/mesas/gestionar"
          class="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Configurar mesas
        </NuxtLink>
      </div>

      <!-- Floor plan (only when tables exist) -->
      <template v-else>
        <!-- Stats strip -->
        <div class="flex items-center gap-3 mb-6 flex-wrap">
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-border" />
            <span class="text-xs text-text-secondary tabular-nums">{{ freeCount }} libre{{ freeCount !== 1 ? 's' : '' }}</span>
          </div>
          <template v-if="openCount > 0">
            <span class="text-text-tertiary/50 text-xs">·</span>
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-text-primary" />
              <span class="text-xs text-text-primary font-medium tabular-nums">{{ openCount }} ocupada{{ openCount !== 1 ? 's' : '' }}</span>
            </div>
          </template>
          <template v-if="billCount > 0">
            <span class="text-text-tertiary/50 text-xs">·</span>
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full bg-status-warning-text" />
              <span class="text-xs text-status-warning-text font-medium tabular-nums">{{ billCount }} pidiendo cuenta</span>
            </div>
          </template>
        </div>

        <!-- Floor plan grid — circular table layout (à la Toast / The Great Table) -->
        <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
          <button
            v-for="table in tables"
            :key="table.id"
            class="flex flex-col items-center gap-2 focus:outline-none group disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="openingTableId === table.id"
            :aria-label="`${table.name} — ${badgeLabel(table.status)}`"
            @click="handleTableClick(table)"
          >
            <!-- Circle + chair marks -->
            <div class="relative p-[14px]">
              <!-- Chair marks: 4 cardinal positions -->
              <div
                class="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-2 rounded-sm transition-colors duration-200"
                :class="{
                  'bg-text-tertiary/20': table.status === 'free',
                  'bg-text-primary/70': table.status === 'open',
                  'bg-status-warning-text/70': table.status === 'bill_requested',
                }"
              />
              <div
                class="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-2 rounded-sm transition-colors duration-200"
                :class="{
                  'bg-text-tertiary/20': table.status === 'free',
                  'bg-text-primary/70': table.status === 'open',
                  'bg-status-warning-text/70': table.status === 'bill_requested',
                }"
              />
              <div
                class="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-5 rounded-sm transition-colors duration-200"
                :class="{
                  'bg-text-tertiary/20': table.status === 'free',
                  'bg-text-primary/70': table.status === 'open',
                  'bg-status-warning-text/70': table.status === 'bill_requested',
                }"
              />
              <div
                class="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-5 rounded-sm transition-colors duration-200"
                :class="{
                  'bg-text-tertiary/20': table.status === 'free',
                  'bg-text-primary/70': table.status === 'open',
                  'bg-status-warning-text/70': table.status === 'bill_requested',
                }"
              />

              <!-- Circle -->
              <div
                class="relative w-[68px] h-[68px] rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-active:scale-95"
                :class="{
                  'bg-surface-secondary border-2 border-border/50': table.status === 'free',
                  'bg-text-primary shadow-lg shadow-black/20': table.status === 'open',
                  'bg-status-warning-text shadow-lg shadow-status-warning-text/30': table.status === 'bill_requested',
                }"
              >
                <CommonsTheCustomLoader v-if="openingTableId === table.id" size="small" />
                <span
                  v-else
                  class="text-sm font-bold leading-tight text-center px-2 line-clamp-2"
                  :class="table.status === 'free' ? 'text-text-secondary' : 'text-white'"
                >
                  {{ table.name }}
                </span>
              </div>
            </div>

            <!-- Info below circle -->
            <div class="flex flex-col items-center gap-0.5 text-center" style="min-height:28px">
              <template v-if="table.status !== 'free' && table.session">
                <p class="text-xs font-bold text-text-primary tabular-nums leading-tight">
                  {{ formatCurrency(table.session.running_total ?? 0) }}
                </p>
                <p class="flex items-center gap-0.5 text-[10px] text-text-secondary tabular-nums">
                  <svg class="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ formatDuration(table.session.opened_at) }}
                </p>
              </template>
            </div>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
