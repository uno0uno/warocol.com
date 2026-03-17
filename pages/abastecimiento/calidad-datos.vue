<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-ebony-800 mb-2">Error al cargar los datos de calidad.</p>
        <p class="text-sm text-ebony-600">{{ fetchError.message }}</p>
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
          :variant="scoreVariant"
          format="number"
          :show-icon="false"
        />
        <SharedMetricCard
          title="Críticos"
          :value="qualityData?.critical ?? 0"
          subtitle="anomalías críticas"
          variant="destructive"
          format="number"
          :show-icon="false"
        />
        <SharedMetricCard
          title="Avisos"
          :value="qualityData?.warning ?? 0"
          subtitle="advertencias"
          variant="warning"
          format="number"
          :show-icon="false"
        />
        <SharedMetricCard
          title="Resueltos"
          :value="qualityData?.resolved ?? 0"
          subtitle="últimos 30 días"
          variant="success"
          format="number"
          :show-icon="false"
        />
      </div>

      <!-- Filters Bar -->
      <SharedFiltersBar
        v-model:search="searchIngredient"
        v-model:status-filter="severityFilter"
        :status-options="severityOptions"
        status-label="Severidad"
        status-placeholder="Todas"
        show-status-filter
        @search="() => {}"
        @clear-filters="clearFilters"
      />

      <!-- Alert List -->
      <UiResponsiveDataView
        :columns="alertTableColumns"
        :data="filteredAlerts"
        title="Anomalías de Precios"
        empty-message="Sin anomalías detectadas"
        empty-sub-message="No se detectaron anomalías de precios en los últimos 30 días."
        variant="default"
      >
        <!-- Mobile Card Slot -->
        <template #card="{ item }">
          <div class="bg-white border border-border rounded-lg p-4">
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1 min-w-0 pr-3">
                <p class="font-bold text-text-primary truncate">{{ item.ingredient_name }}</p>
                <p class="text-sm text-text-secondary mt-0.5">{{ getAlertTypeLabel(item.alert_type) }}</p>
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
                <p
                  class="font-semibold"
                  :class="item.deviation_pct > 50 ? 'text-destructive' : 'text-warning'"
                >
                  {{ item.deviation_pct?.toFixed(1) }}%
                </p>
              </div>
            </div>
            <div class="flex gap-2 pt-2 border-t border-border">
              <button
                :disabled="validatingId === item.id"
                class="flex-1 min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm font-medium
                       text-text-primary hover:bg-surface-secondary transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
                @click="markAsValid(item.id)"
              >
                {{ validatingId === item.id ? 'Validando...' : 'Marcar válido' }}
              </button>
              <button
                class="flex-1 min-h-[44px] px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium
                       hover:bg-primary/90 transition-colors"
                @click="openCorrectModal(item)"
              >
                Corregir
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
          <span class="text-sm font-medium text-ebony-800">{{ value }}</span>
        </template>

        <template #cell-alert_type="{ value }">
          <span class="text-sm text-text-secondary">{{ getAlertTypeLabel(value) }}</span>
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

        <template #cell-deviation_pct="{ value }">
          <span
            class="text-sm font-semibold"
            :class="value > 50 ? 'text-destructive' : 'text-warning'"
          >
            {{ value?.toFixed(1) }}%
          </span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center gap-2">
            <button
              :disabled="validatingId === row.id"
              :aria-label="`Marcar ${row.ingredient_name} como válido`"
              class="min-h-[44px] px-3 py-1.5 border border-border rounded-lg text-xs font-medium
                     text-text-primary hover:bg-surface-secondary transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              @click="markAsValid(row.id)"
            >
              {{ validatingId === row.id ? '...' : 'Válido' }}
            </button>
            <button
              :aria-label="`Corregir precio de ${row.ingredient_name}`"
              class="min-h-[44px] px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium
                     hover:bg-primary/90 transition-colors whitespace-nowrap"
              @click="openCorrectModal(row)"
            >
              Corregir
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

// Score card variant
const scoreVariant = computed(() => {
  const score = qualityData.value?.score ?? 0
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'destructive'
})

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
