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

      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <!-- Severity filter pills -->
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in severityOptions"
            :key="option.value"
            :class="[
              'min-h-[44px] px-4 py-2 rounded-full text-sm font-medium border transition-colors',
              severityFilter === option.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-text-secondary border-border hover:bg-surface-secondary'
            ]"
            :aria-pressed="severityFilter === option.value"
            @click="severityFilter = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <!-- Ingredient search -->
        <input
          v-model="searchIngredient"
          type="search"
          placeholder="Buscar ingrediente..."
          class="min-h-[44px] flex-1 sm:max-w-xs px-4 py-2 border border-border rounded-lg text-sm
                 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
          aria-label="Filtrar por ingrediente"
        />
      </div>

      <!-- Alert List -->
      <div v-if="filteredAlerts.length > 0" class="flex flex-col gap-3">
        <DataQualityAlertCard
          v-for="alert in filteredAlerts"
          :key="alert.id"
          :alert="alert"
          :validating="validatingId === alert.id"
          @mark-valid="markAsValid"
          @correct="openCorrectModal"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="flex flex-col items-center justify-center py-16 text-center">
        <p class="text-4xl mb-3" aria-hidden="true">✓</p>
        <p class="text-lg font-semibold text-text-primary mb-1">
          {{ hasActiveAlerts ? 'Sin resultados para este filtro' : 'Sin anomalías detectadas' }}
        </p>
        <p class="text-sm text-text-secondary">
          {{ hasActiveAlerts ? 'Prueba otro filtro o búsqueda.' : 'No se detectaron anomalías de precios en los últimos 30 días.' }}
        </p>
        <button
          v-if="hasActiveAlerts"
          class="mt-4 min-h-[44px] px-4 py-2 text-sm text-primary hover:underline"
          @click="clearFilters"
        >
          Limpiar filtros
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const { onTenantChange } = useTenantReactive()
const { setRefreshHandler } = useLayoutActions()

// Data fetching
const { data: qualityData, pending, error: fetchError, refresh } = useAsyncData(
  'data-quality',
  () => $fetch('/api/analytics/data-quality'),
  { server: false, lazy: true, default: () => null }
)

// Reload on tenant change
onTenantChange(() => refresh())

// Register refresh for layout header button
onMounted(() => {
  setRefreshHandler(refresh)
})

// Filters
type SeverityFilter = 'all' | 'critical' | 'warning' | 'resolved'
const severityFilter = ref<SeverityFilter>('all')
const searchIngredient = ref('')

const severityOptions: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'critical', label: 'Críticos' },
  { value: 'warning', label: 'Avisos' },
  { value: 'resolved', label: 'Resueltos' }
]

const filteredAlerts = computed(() => {
  const alerts = qualityData.value?.alerts ?? []
  const search = searchIngredient.value.toLowerCase().trim()

  return alerts
    .filter(alert => {
      if (severityFilter.value === 'resolved') return alert.resolved
      if (severityFilter.value === 'all') return !alert.resolved
      return !alert.resolved && alert.severity === severityFilter.value
    })
    .filter(alert => {
      if (!search) return true
      return alert.ingredient_name.toLowerCase().includes(search)
    })
    .sort((a, b) => {
      // Critical before warning, then by date desc
      if (a.severity === 'critical' && b.severity !== 'critical') return -1
      if (b.severity === 'critical' && a.severity !== 'critical') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
})

const hasActiveAlerts = computed(() => {
  const alerts = qualityData.value?.alerts ?? []
  return alerts.some(a => !a.resolved)
})

const clearFilters = () => {
  severityFilter.value = 'all'
  searchIngredient.value = ''
}

// Score card variant based on score value
const scoreVariant = computed(() => {
  const score = qualityData.value?.score ?? 0
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'destructive'
})

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
  } catch (e) {
    console.error('Error marking alert as valid:', e)
  } finally {
    validatingId.value = null
  }
}

// Correct modal — placeholder for #238
const selectedAlertForCorrection = ref<any>(null)

const openCorrectModal = (alert: any) => {
  // Modal implemented in #238 — store selected alert for future modal slot
  selectedAlertForCorrection.value = alert
}
</script>
