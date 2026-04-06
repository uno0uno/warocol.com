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

const handleTableClick = async (table: any) => {
  if (table.status === 'free') {
    if (openingTableId.value) return // prevent double-tap
    openingTableId.value = table.id
    try {
      await $fetch(`/api/tables/${table.id}/open`, { method: 'POST' })
      await refetch()
      sessionStorage.setItem('posNavigation', 'true')
      router.push('/pos')
    } catch (e) {
      // If session already open (race), still navigate
      await refetch()
      sessionStorage.setItem('posNavigation', 'true')
      router.push('/pos')
    } finally {
      openingTableId.value = null
    }
  } else if (table.status === 'open') {
    sessionStorage.setItem('posNavigation', 'true')
    router.push('/pos')
  } else if (table.status === 'bill_requested') {
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

      <!-- Table Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <button
          v-for="table in tables"
          :key="table.id"
          class="relative flex flex-col gap-2 p-4 rounded-xl border bg-surface text-left theme-transition focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
          :class="{
            'border-border hover:border-primary/40 hover:shadow-sm active:scale-[0.98]': table.status === 'free',
            'border-status-success-text/30 bg-status-success-bg/40 hover:shadow-sm active:scale-[0.98]': table.status === 'open',
            'border-status-warning-text/30 bg-status-warning-bg/40 hover:shadow-sm active:scale-[0.98]': table.status === 'bill_requested',
          }"
          :disabled="openingTableId === table.id"
          :aria-label="`Mesa ${table.name} — ${badgeLabel(table.status)}`"
          @click="handleTableClick(table)"
        >
          <!-- Loading spinner when opening -->
          <div v-if="openingTableId === table.id" class="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/80">
            <CommonsTheCustomLoader size="small" />
          </div>

          <!-- Table name -->
          <p class="text-base font-bold text-text-primary leading-tight">{{ table.name }}</p>

          <!-- Status badge -->
          <UiStatusBadge :variant="badgeVariant(table.status)" size="sm">
            {{ badgeLabel(table.status) }}
          </UiStatusBadge>

          <!-- Open session details -->
          <template v-if="table.session && table.status !== 'free'">
            <div class="mt-1 flex flex-col gap-0.5">
              <p v-if="table.session.running_total != null" class="text-sm font-semibold text-text-primary">
                {{ formatCurrency(table.session.running_total) }}
              </p>
              <p v-if="table.session.opened_at" class="text-xs text-text-secondary">
                {{ formatDuration(table.session.opened_at) }}
              </p>
            </div>
          </template>
        </button>
      </div>
    </div>
  </div>
</template>
