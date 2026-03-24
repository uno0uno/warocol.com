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

      <!-- Orders with anomalies -->
      <div v-if="ordersWithAnomalies.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <svg class="w-12 h-12 text-text-secondary/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-base font-semibold text-text-primary">Sin órdenes con anomalías</p>
        <p class="text-sm text-text-secondary mt-1">No se detectaron anomalías de precios en los últimos 30 días.</p>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="order in ordersWithAnomalies"
          :key="order.purchase_id"
          class="bg-white border border-border rounded-lg p-4"
        >
          <!-- Order header -->
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="font-bold text-text-primary text-sm">
                {{ order.purchase_number ?? formatDate(order.date) }}
              </p>
              <p class="text-xs text-text-secondary mt-0.5">
                {{ order.supplier_name ? `${order.supplier_name} · ` : '' }}{{ formatDate(order.purchase_date ?? order.date) }}
              </p>
            </div>
            <div class="flex gap-1.5">
              <UiStatusBadge
                v-if="order.critical > 0"
                :value="`${order.critical} crítico${order.critical > 1 ? 's' : ''}`"
                format="text"
                variant="destructive"
                size="sm"
              />
              <UiStatusBadge
                v-if="order.warning > 0"
                :value="`${order.warning} aviso${order.warning > 1 ? 's' : ''}`"
                format="text"
                variant="warning"
                size="sm"
              />
            </div>
          </div>

          <!-- Ingredient rows -->
          <div class="flex flex-col divide-y divide-border">
            <div
              v-for="alert in order.alerts"
              :key="alert.id"
              class="flex items-center justify-between py-2 gap-3"
            >
              <div class="flex items-center gap-2 min-w-0">
                <svg v-if="alert.alert_type === 'price_spike'" class="w-3.5 h-3.5 shrink-0 text-status-error-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <svg v-else class="w-3.5 h-3.5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span class="text-sm text-text-primary truncate">{{ alert.ingredient_name }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-xs text-text-secondary">${{ formatValue(alert.actual_value) }}</span>
                <UiStatusBadge
                  :value="alert.deviation_pct"
                  format="percentage"
                  variant="secondary"
                  size="sm"
                />
              </div>
            </div>
          </div>

          <!-- Action -->
          <div class="pt-3 mt-1 border-t border-border flex justify-end">
            <NuxtLink
              :to="`/abastecimiento/compras-directas/${order.purchase_id}/editar`"
              class="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg bg-primary/8 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
              :aria-label="`Editar orden del ${formatDate(order.date)}`"
            >
              Ver y corregir orden
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </NuxtLink>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
const { onTenantChange } = useTenantReactive()
const { setRefreshHandler } = useLayoutActions()

// Data fetching
const { data: qualityData, pending, error: fetchError, refresh } = useAsyncData(
  'data-quality',
  () => $fetch('/api/analytics/data-quality'),
  {
    server: false,
    lazy: true,
    default: () => null,
    transform: (r: any) => r?.data ?? r
  }
)

// Reload on tenant change
onTenantChange(() => refresh())

// Register refresh for layout header button
onMounted(() => {
  setRefreshHandler(refresh)
})

// Filters
const severityFilter = ref('')
const searchIngredient = ref('')

const clearFilters = () => {
  severityFilter.value = ''
  searchIngredient.value = ''
}

// Group alerts by purchase_id → one card per order
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

  // Critical orders first, then by date desc
  return orders.sort((a: any, b: any) => {
    if (a.critical > 0 && b.critical === 0) return -1
    if (b.critical > 0 && a.critical === 0) return 1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
})

// Helpers
const getSeverityVariant = (severity: string) => {
  if (severity === 'critical') return 'destructive'
  if (severity === 'warning') return 'warning'
  return 'success'
}

const formatValue = (value: number | null) => {
  if (value == null) return '—'
  return value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>
