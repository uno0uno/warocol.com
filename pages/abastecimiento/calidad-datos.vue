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
        <!-- Search -->
        <div class="relative flex-1 min-w-[160px]">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchIngredient"
            type="search"
            placeholder="Buscar ingrediente..."
            aria-label="Buscar ingrediente"
            class="h-10 w-full pl-9 pr-4 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          />
        </div>

        <!-- Severity select -->
        <select
          v-model="severityFilter"
          aria-label="Filtrar por severidad"
          class="h-10 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer min-w-[130px] transition-colors"
        >
          <option value="">Todas</option>
          <option v-for="opt in severityOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <!-- Clear button -->
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

      <!-- Alert List -->
      <UiResponsiveDataView
        :columns="alertTableColumns"
        :data="filteredAlerts"
        title="Anomalías de Precios"
        empty-message="Sin anomalías detectadas"
        empty-sub-message="No se detectaron anomalías de precios en los últimos 30 días."
        variant="default"
        row-size="sm"
      >
        <!-- Mobile Card Slot -->
        <template #card="{ item }">
          <div class="bg-white border border-border rounded-lg p-4">
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1 min-w-0 pr-3">
                <p class="font-bold text-text-primary truncate">{{ item.ingredient_name }}</p>
                <span class="inline-flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                  <svg v-if="item.alert_type === 'price_spike'" class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  {{ item.alert_type === 'price_spike' ? 'Subida' : 'Bajada' }}
                </span>
              </div>
              <UiStatusBadge
                :value="getSeverityLabel(item.severity)"
                format="text"
                :variant="getSeverityVariant(item.severity)"
                size="sm"
              />
            </div>
            <div class="grid grid-cols-3 gap-2 text-sm mb-3">
              <div>
                <p class="text-text-secondary text-xs mb-0.5">Registrado</p>
                <p class="font-semibold text-text-primary">${{ formatValue(item.actual_value) }}</p>
              </div>
              <div>
                <p class="text-text-secondary text-xs mb-0.5">Promedio</p>
                <p class="font-semibold text-text-primary">${{ formatValue(item.rolling_avg) }}</p>
              </div>
              <div>
                <p class="text-text-secondary text-xs mb-0.5">Desviación</p>
                <UiStatusBadge
                  :value="item.deviation_pct"
                  format="percentage"
                  :variant="getSeverityVariant(item.severity)"
                  size="sm"
                  class="mt-0.5"
                />
              </div>
            </div>
            <div class="flex gap-4 pt-2 border-t border-border justify-end">
              <button
                :disabled="validatingId === item.id"
                :aria-label="`Marcar ${item.ingredient_name} como válido`"
                class="min-h-[44px] min-w-[44px] flex items-center justify-center
                       text-text-secondary hover:text-success transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
                @click="markAsValid(item.id)"
              >
                <svg v-if="validatingId !== item.id" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </button>
              <button
                :aria-label="`Corregir precio de ${item.ingredient_name}`"
                class="min-h-[44px] min-w-[44px] flex items-center justify-center
                       text-text-secondary hover:text-primary transition-colors"
                @click="openCorrectModal(item)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- Desktop Header -->
        <template #header>
          <h3 class="text-base sm:text-lg font-bold text-text-primary">Anomalías de Precios</h3>
        </template>

        <!-- Desktop Cell Slots -->
        <template #cell-ingredient_name="{ value }">
          <span class="text-sm font-medium text-text-primary">{{ value }}</span>
        </template>

        <template #cell-alert_type="{ value }">
          <span class="inline-flex items-center gap-1 text-xs text-text-secondary">
            <svg v-if="value === 'price_spike'" class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <svg v-else class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {{ value === 'price_spike' ? 'Subida' : 'Bajada' }}
          </span>
        </template>

        <template #cell-severity="{ value }">
          <UiStatusBadge
            :value="getSeverityLabel(value)"
            format="text"
            :variant="getSeverityVariant(value)"
            size="sm"
          />
        </template>

        <template #cell-actual_value="{ value }">
          <span class="text-sm font-medium text-text-primary">${{ formatValue(value) }}</span>
        </template>

        <template #cell-rolling_avg="{ value }">
          <span class="text-sm text-text-secondary">${{ formatValue(value) }}</span>
        </template>

        <template #cell-deviation_pct="{ value, row }">
          <div class="flex justify-end">
            <UiStatusBadge
              :value="value"
              format="percentage"
              :variant="getSeverityVariant(row.severity)"
              size="sm"
            />
          </div>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center gap-2">
            <button
              :disabled="validatingId === row.id"
              :aria-label="`Marcar ${row.ingredient_name} como válido`"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center
                     text-text-secondary hover:text-success transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
              @click="markAsValid(row.id)"
            >
              <svg v-if="validatingId !== row.id" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </button>
            <button
              :aria-label="`Corregir precio de ${row.ingredient_name}`"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center
                     text-text-secondary hover:text-primary transition-colors"
              @click="openCorrectModal(row)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>

    </div>

    <!-- Correct Alert Modal -->
    <DataQualityCorrectAlertModal
      v-model="showCorrectModal"
      :alert="selectedAlertForCorrection"
      @resolved="onAlertCorrected"
    />

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

const severityOptions = [
  { value: 'critical', label: 'Críticos' },
  { value: 'warning', label: 'Avisos' },
  { value: 'resolved', label: 'Resueltos' }
]

const filteredAlerts = computed(() => {
  const alerts = qualityData.value?.alerts ?? []
  const search = searchIngredient.value.toLowerCase().trim()
  const sev = severityFilter.value

  return alerts
    .filter((alert: any) => {
      if (sev === 'resolved') return alert.resolved
      if (!sev) return !alert.resolved
      return !alert.resolved && alert.severity === sev
    })
    .filter((alert: any) => {
      if (!search) return true
      return alert.ingredient_name.toLowerCase().includes(search)
    })
    .sort((a: any, b: any) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1
      if (b.severity === 'critical' && a.severity !== 'critical') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
})

const clearFilters = () => {
  severityFilter.value = ''
  searchIngredient.value = ''
}

// Table columns
const alertTableColumns = [
  { key: 'ingredient_name', title: 'Ingrediente', sortable: true, align: 'left' as const },
  { key: 'alert_type', title: 'Tipo', sortable: false, align: 'left' as const },
  { key: 'severity', title: 'Severidad', sortable: true, align: 'center' as const },
  { key: 'actual_value', title: 'Valor Reg.', sortable: false, align: 'right' as const },
  { key: 'rolling_avg', title: 'Prom. Histórico', sortable: false, align: 'right' as const },
  { key: 'deviation_pct', title: 'Desviación', sortable: true, align: 'right' as const },
  { key: 'actions', title: '', sortable: false, align: 'center' as const }
]

// Helpers
const getAlertTypeLabel = (type: string) => {
  if (type === 'price_spike') return 'Subida de precio'
  if (type === 'price_drop') return 'Bajada de precio'
  return type
}

const getSeverityLabel = (severity: string) => {
  if (severity === 'critical') return 'Crítico'
  if (severity === 'warning') return 'Aviso'
  if (severity === 'resolved') return 'Resuelto'
  return severity
}

const getSeverityVariant = (severity: string) => {
  if (severity === 'critical') return 'destructive'
  if (severity === 'warning') return 'warning'
  return 'success'
}

const formatValue = (value: number | null) => {
  if (value == null) return '—'
  return value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// Mark as valid action
const validatingId = ref<string | null>(null)

const markAsValid = async (alertId: string) => {
  validatingId.value = alertId
  try {
    await $fetch(`/api/analytics/data-quality/${alertId}/resolve`, {
      method: 'PATCH',
      body: { resolution_type: 'valid' }
    })
    await refresh()
    useDataQualityStatus().refresh()
  } catch (e) {
    console.error('Error marking alert as valid:', e)
  } finally {
    validatingId.value = null
  }
}

// Correct modal
const selectedAlertForCorrection = ref<any>(null)

const showCorrectModal = computed({
  get: () => selectedAlertForCorrection.value !== null,
  set: (value) => { if (!value) selectedAlertForCorrection.value = null }
})

const openCorrectModal = (alert: any) => {
  selectedAlertForCorrection.value = alert
}

const onAlertCorrected = () => {
  selectedAlertForCorrection.value = null
  refresh()
  useDataQualityStatus().refresh()
}
</script>
