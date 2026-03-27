<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar los datos de calidad.</p>
        <p class="text-sm text-text-secondary">{{ fetchError.message }}</p>
        <button
          class="mt-4 min-h-[44px] px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          @click="refresh"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Score Header — 4 KPI cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <SharedMetricCard
          title="Score de Calidad"
          :value="qualityData?.score ?? 0"
          subtitle="/ 100"
          variant="primary"
          format="number"
          :show-icon="false"
        />
        <SharedMetricCard
          title="Críticos"
          :value="qualityData?.critical ?? 0"
          subtitle="anomalías críticas"
          variant="primary"
          format="number"
          :show-icon="false"
        />
        <SharedMetricCard
          title="Avisos"
          :value="qualityData?.warning ?? 0"
          subtitle="advertencias"
          variant="primary"
          format="number"
          :show-icon="false"
        />
        <SharedMetricCard
          title="Resueltos"
          :value="qualityData?.resolved ?? 0"
          subtitle="últimos 30 días"
          variant="primary"
          format="number"
          :show-icon="false"
        />
      </div>

      <!-- Filters Bar -->
      <div class="flex items-center gap-2 w-full overflow-x-auto pb-1">
        <div class="relative flex-1 min-w-[160px]">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchIngredient"
            type="search"
            placeholder="Buscar por ingrediente..."
            aria-label="Buscar por ingrediente"
            class="h-10 w-full pl-9 pr-4 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          />
        </div>

        <select
          v-model="severityFilter"
          aria-label="Filtrar por severidad"
          class="h-10 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer min-w-[130px] transition-colors"
        >
          <option value="">Activas</option>
          <option value="critical">Solo críticas</option>
          <option value="warning">Solo avisos</option>
        </select>

        <button
          v-if="searchIngredient || severityFilter"
          aria-label="Limpiar filtros"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex items-center justify-center"
          @click="clearFilters"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Orders Table -->
      <HealthSemaphore :is-unlocked="true" title="Órdenes con Anomalías">
      <UiResponsiveDataView
        :columns="tableColumns"
        :data="ordersWithAnomalies"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        @row-click="viewOrder"
        title="Órdenes con Anomalías"
        empty-message="Sin órdenes con anomalías"
        empty-sub-message="No se detectaron anomalías de precios en los últimos 30 días."
        variant="default"
        row-size="sm"
      >
        <!-- Mobile Card -->
        <template #card="{ item }">
          <div
            class="bg-white border border-border rounded-lg p-4 cursor-pointer hover:bg-surface-secondary transition-colors"
            @click="viewOrder(item)"
          >
            <div class="flex justify-between items-start mb-2">
              <div class="min-w-0">
                <p class="font-bold text-text-primary text-sm truncate">
                  {{ item.purchase_number ?? formatDate(item.date) }}
                </p>
                <p class="text-xs text-text-secondary mt-0.5">
                  {{ item.supplier_name ?? 'Sin proveedor' }}
                </p>
              </div>
              <div class="flex gap-1.5 shrink-0 ml-2">
                <UiStatusBadge
                  v-if="item.critical > 0"
                  :value="`${item.critical} crít.`"
                  format="text"
                  variant="destructive"
                  size="sm"
                />
                <UiStatusBadge
                  v-if="item.warning > 0"
                  :value="`${item.warning} aviso${item.warning > 1 ? 's' : ''}`"
                  format="text"
                  variant="warning"
                  size="sm"
                />
              </div>
            </div>
            <div class="flex justify-between items-center text-xs text-text-secondary mt-2">
              <span>{{ formatDate(item.purchase_date ?? item.date) }}</span>
              <span>{{ item.alerts.length }} ingrediente{{ item.alerts.length !== 1 ? 's' : '' }} afectado{{ item.alerts.length !== 1 ? 's' : '' }}</span>
            </div>
          </div>
        </template>

        <!-- Desktop Cell Customizations -->
        <template #cell-purchase_number="{ value, row }">
          <span class="text-sm font-medium text-ebony-800">{{ value ?? formatDate(row.date) }}</span>
        </template>

        <template #cell-supplier_name="{ value }">
          <span class="text-sm font-bold text-ebony-800">{{ value ?? 'Sin proveedor' }}</span>
        </template>

        <template #cell-purchase_date="{ value, row }">
          <span class="text-sm text-ebony-800">{{ formatDate(value ?? row.date) }}</span>
        </template>

        <template #cell-critical="{ value }">
          <UiStatusBadge
            v-if="value > 0"
            :value="`${value} crítico${value > 1 ? 's' : ''}`"
            format="text"
            variant="destructive"
            size="sm"
          />
        </template>

        <template #cell-warning="{ value }">
          <UiStatusBadge
            v-if="value > 0"
            :value="`${value} aviso${value > 1 ? 's' : ''}`"
            format="text"
            variant="warning"
            size="sm"
          />
        </template>

        <template #cell-alerts="{ value }">
          <UiStatusBadge
            :value="`${value.length} ingrediente${value.length !== 1 ? 's' : ''}`"
            format="text"
            variant="secondary"
            size="sm"
          />
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center">
            <NuxtLink
              :to="`/abastecimiento/compras-directas/${row.purchase_id}/editar`"
              :aria-label="`Ver y corregir orden ${row.purchase_number ?? ''}`"
              target="_blank"
              rel="noopener noreferrer"
              class="min-h-[36px] px-3 inline-flex items-center gap-1.5 rounded-lg bg-primary/8 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
              @click.stop
            >
              Corregir
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </NuxtLink>
          </div>
        </template>
      </UiResponsiveDataView>
      </HealthSemaphore>

    </div>
  </div>
</template>

<script setup lang="ts">
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// Data fetching
const { data: qualityData, status: queryStatus, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['analytics', 'data-quality', currentTenant.value?.id],
  query: () => $fetch('/api/analytics/data-quality').then((r: any) => r?.data ?? r),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const pending = computed(() => queryStatus.value === 'loading')
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && qualityData.value != null)

onMounted(() => {
  setRefreshHandler(refetch)
})
useMenuReturnRefresh(
  '/abastecimiento/calidad-datos',
  refetch,
  'abastecimiento-last-path',
  ['/abastecimiento/calidad-datos/']
)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})

// Filters
const severityFilter = ref('')
const searchIngredient = ref('')

const clearFilters = () => {
  severityFilter.value = ''
  searchIngredient.value = ''
}

// Sort state
const sortField = ref('critical')
const sortDirection = ref<'asc' | 'desc'>('desc')

const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
}

// Table columns
const tableColumns = [
  { key: 'purchase_number', title: 'Orden', sortable: true },
  { key: 'supplier_name', title: 'Proveedor', sortable: true },
  { key: 'purchase_date', title: 'Fecha', sortable: true },
  { key: 'critical', title: 'Críticos', sortable: true },
  { key: 'warning', title: 'Avisos', sortable: true },
  { key: 'alerts', title: 'Ingredientes', sortable: false },
  { key: 'actions', title: '', sortable: false }
]

// Group alerts by purchase_id → one row per order
const ordersWithAnomalies = computed(() => {
  const alerts = qualityData.value?.alerts ?? []
  const search = searchIngredient.value.toLowerCase().trim()
  const sev = severityFilter.value

  // Only unresolved alerts with a linked purchase
  let active = alerts.filter((a: any) => !a.resolved && a.purchase_id)

  if (sev) {
    active = active.filter((a: any) => a.severity === sev)
  }

  // Group by purchase_id
  const map = new Map<string, any>()
  for (const alert of active) {
    if (!map.has(alert.purchase_id)) {
      map.set(alert.purchase_id, {
        purchase_id: alert.purchase_id,
        purchase_number: alert.purchase_number ?? null,
        purchase_date: alert.purchase_date ?? null,
        supplier_name: alert.supplier_name ?? null,
        date: alert.created_at,
        alerts: [],
        critical: 0,
        warning: 0,
      })
    }
    const group = map.get(alert.purchase_id)
    group.alerts.push(alert)
    if (alert.severity === 'critical') group.critical++
    else group.warning++
  }

  let orders = Array.from(map.values())

  // Filter by ingredient search
  if (search) {
    orders = orders.filter((o: any) =>
      o.alerts.some((a: any) => a.ingredient_name.toLowerCase().includes(search))
    )
  }

  // Sort by selected field
  return orders.sort((a: any, b: any) => {
    let aVal: any = a[sortField.value]
    let bVal: any = b[sortField.value]

    if (sortField.value === 'purchase_date') {
      aVal = new Date(aVal ?? a.date).getTime()
      bVal = new Date(bVal ?? b.date).getTime()
    } else if (sortField.value === 'alerts') {
      aVal = a.alerts.length
      bVal = b.alerts.length
    }

    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
    // Tiebreak: critical first, then by date desc
    if (a.critical > 0 && b.critical === 0) return -1
    if (b.critical > 0 && a.critical === 0) return 1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
})

// Navigation
const viewOrder = (order: any) => {
  window.open(`/abastecimiento/compras-directas/${order.purchase_id}/editar`, '_blank', 'noopener,noreferrer')
}

// Helpers
const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>
