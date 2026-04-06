<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Mesas' })

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

      <!-- Stats strip -->
      <div class="flex items-center gap-4 mb-1 px-0.5 flex-wrap">
        <div class="flex items-center gap-1.5">
          <div class="w-2 h-2 rounded-full bg-border" />
          <span class="text-xs text-text-secondary tabular-nums">{{ freeCount }} libre{{ freeCount !== 1 ? 's' : '' }}</span>
        </div>
        <div v-if="openCount > 0" class="flex items-center gap-1.5">
          <div class="w-2 h-2 rounded-full bg-status-success-text" />
          <span class="text-xs text-status-success-text font-medium tabular-nums">{{ openCount }} ocupada{{ openCount !== 1 ? 's' : '' }}</span>
        </div>
        <div v-if="billCount > 0" class="flex items-center gap-1.5">
          <div class="w-2 h-2 rounded-full bg-status-warning-text" />
          <span class="text-xs text-status-warning-text font-medium tabular-nums">{{ billCount }} pidiendo cuenta</span>
        </div>
      </div>

      <!-- Table Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <button
          v-for="table in tables"
          :key="table.id"
          class="relative flex flex-col rounded-xl border bg-surface text-left overflow-hidden shadow-sm theme-transition focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
          :class="{
            'border-border hover:border-text-tertiary/40 hover:shadow-md active:scale-[0.98]': table.status === 'free',
            'border-status-success-text/25 bg-status-success-bg/50 hover:shadow-md active:scale-[0.98]': table.status === 'open',
            'border-status-warning-text/25 bg-status-warning-bg/50 hover:shadow-md active:scale-[0.98]': table.status === 'bill_requested',
          }"
          :disabled="openingTableId === table.id"
          :aria-label="`Mesa ${table.name} — ${badgeLabel(table.status)}`"
          @click="handleTableClick(table)"
        >
          <!-- Loading overlay -->
          <div v-if="openingTableId === table.id" class="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/80 z-10">
            <CommonsTheCustomLoader size="small" />
          </div>

          <!-- Status accent top bar -->
          <div
            class="h-1 w-full flex-shrink-0"
            :class="{
              'bg-transparent': table.status === 'free',
              'bg-status-success-text': table.status === 'open',
              'bg-status-warning-text': table.status === 'bill_requested',
            }"
          />

          <!-- Card content -->
          <div class="flex flex-col gap-1 p-3 flex-1">
            <!-- Table name -->
            <p class="text-sm font-bold text-text-primary leading-tight truncate">{{ table.name }}</p>

            <!-- Free: subtle availability hint -->
            <template v-if="table.status === 'free'">
              <p class="text-xs text-text-tertiary mt-auto pt-3">Disponible</p>
            </template>

            <!-- Open / bill_requested: financial info -->
            <template v-else-if="table.session">
              <p class="text-xl font-bold text-text-primary leading-tight tabular-nums mt-1">
                {{ formatCurrency(table.session.running_total ?? 0) }}
              </p>
              <div class="flex items-center gap-1 text-xs text-text-secondary tabular-nums mt-0.5">
                <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ formatDuration(table.session.opened_at) }}
              </div>
            </template>
          </div>

          <!-- Bill requested footer label -->
          <div v-if="table.status === 'bill_requested'" class="px-3 pb-2.5 flex items-center gap-1">
            <svg class="w-3 h-3 text-status-warning-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span class="text-xs font-medium text-status-warning-text">Pide la cuenta</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
