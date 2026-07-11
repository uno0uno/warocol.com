<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => t('analitica.head.rentabilidad') })
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { enUS, es } from 'date-fns/locale'
import { formatDistanceToNow } from 'date-fns'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import MetricCard from '~/components/shared/MetricCard.vue'

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const { locale } = useI18n({ useScope: 'global' })

const lastUpdate = ref<Date>(new Date())
const dateFnsLocale = computed(() => locale.value === 'en' ? enUS : es)
const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: dateFnsLocale.value }))

const { dateRangeDates, presetDates, maxDate, formatDateRange, dateRange } = useDateRangePresets()
const { timezone } = useTenantTimezone()

const { data: foodCostData, status: foodCostStatus, asyncStatus: foodCostAsyncStatus, error: foodCostError, refetch: refetchFoodCost } = useQuery({
  key: () => ['analytics', 'food-cost', currentTenant.value?.id, { from: dateRange.value.from, to: dateRange.value.to }],
  query: () => $fetch('/api/analytics/food-cost', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const { data: menuAnalysisData, status: menuStatus, asyncStatus: menuAsyncStatus, refetch: refetchMenuAnalysis } = useQuery({
  key: () => ['analytics', 'menu-analysis', currentTenant.value?.id, { from: dateRange.value.from, to: dateRange.value.to }],
  query: () => $fetch('/api/analytics/menu-analysis', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      limit: 200
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const fetchError = computed(() => foodCostError.value)
const isLoading = computed(() => (!foodCostData.value || !menuAnalysisData.value) && !fetchError.value)
const isRefreshing = computed(() =>
  (foodCostAsyncStatus.value === 'loading' && foodCostData.value != null) ||
  (menuAsyncStatus.value === 'loading' && menuAnalysisData.value != null)
)

const isUnlocked = computed(() => !!(foodCostData.value?.data || menuAnalysisData.value?.data))

const foodCostCurrent = computed(() => foodCostData.value?.data?.current_period ?? null)
const foodCostPrevious = computed(() => foodCostData.value?.data?.previous_period ?? null)
const foodCostComparison = computed(() => foodCostData.value?.data?.comparison ?? null)
const foodCostBenchmark = computed(() => foodCostData.value?.data?.benchmark ?? null)
const menuSummary = computed(() => menuAnalysisData.value?.data?.summary ?? {
  total_items: 0,
  stars: 0,
  plowhorses: 0,
  puzzles: 0,
  dogs: 0,
  avg_profit_margin_pct: 0,
})

const hasOperativeFoodCost = computed(() => foodCostCurrent.value?.food_cost_operativo_pct != null)

const foodCostVariant = computed(() =>
  foodCostBenchmark.value?.status === 'good' ? 'success' : 'warning'
)

const avgMarginVariant = computed(() => {
  const margin = menuSummary.value.avg_profit_margin_pct ?? 0
  if (margin >= 40) return 'success'
  if (margin >= 25) return 'warning'
  return 'destructive'
})

const foodCostSubtitle = computed(() => {
  const previous = foodCostPrevious.value?.food_cost_pct
  const change = foodCostComparison.value?.change_pct
  if (previous == null || change == null) return t('analitica.rentabilidad.healthyRange')

  const direction = change > 0 ? '+' : change < 0 ? '-' : ''
  return t('analitica.rentabilidad.previousChange', {
    previous: previous.toFixed(1),
    change: `${direction}${Math.abs(change).toFixed(1)}`,
  })
})

const operativeFoodCostSubtitle = computed(() => {
  const operative = foodCostCurrent.value?.food_cost_operativo_pct
  if (operative == null) return ''
  return t('analitica.rentabilidad.operatingCostVsSales', { pct: operative.toFixed(1) })
})

const totalItemsSubtitle = computed(() => {
  const total = menuSummary.value.total_items ?? 0
  return t(total === 1 ? 'analitica.rentabilidad.productsWithSalesOne' : 'analitica.rentabilidad.productsWithSalesMany', { count: total })
})

const starsSubtitle = computed(() => {
  const total = menuSummary.value.total_items ?? 0
  const stars = menuSummary.value.stars ?? 0
  if (!total) return t('analitica.rentabilidad.noPeriodData')
  return t('analitica.rentabilidad.menuAnalyzedPct', { pct: Math.round((stars / total) * 100) })
})

const dogsSubtitle = computed(() => {
  const total = menuSummary.value.total_items ?? 0
  const dogs = menuSummary.value.dogs ?? 0
  if (!total) return t('analitica.rentabilidad.noPeriodData')
  return t('analitica.rentabilidad.menuAnalyzedPct', { pct: Math.round((dogs / total) * 100) })
})

const handleRefresh = async () => {
  await Promise.all([refetchFoodCost(), refetchMenuAnalysis()])
  lastUpdate.value = new Date()
}

// Update lastUpdate when date changes (reactive key handles the actual refetch)
watch(dateRangeDates, (val) => {
  if (!val || (val.length === 2 && val[0] && val[1])) {
    lastUpdate.value = new Date()
  }
})

watch(lastUpdate, () => {
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})

onMounted(() => {
  if (setRefreshHandler) setRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  if (clearRefreshHandler) clearRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(undefined)
})
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4 pb-20">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Content -->
    <template v-else>
      <section>
        <div :class="['grid grid-cols-2 gap-3 md:gap-4 mb-6', hasOperativeFoodCost ? 'md:grid-cols-5' : 'md:grid-cols-4']">
          <MetricCard
            :title="t('analitica.rentabilidad.foodCostReal')"
            :value="foodCostCurrent?.food_cost_pct ?? 0"
            format="percentage"
            :precision="1"
            :variant="foodCostVariant"
            :subtitle="foodCostSubtitle"
          />
          <MetricCard
            v-if="hasOperativeFoodCost"
            :title="t('analitica.rentabilidad.foodCostOp')"
            :value="foodCostCurrent?.food_cost_operativo_pct ?? 0"
            format="percentage"
            :precision="1"
            variant="primary"
            :subtitle="operativeFoodCostSubtitle"
          />
          <MetricCard
            :title="t('analitica.rentabilidad.avgMargin')"
            :value="menuSummary.avg_profit_margin_pct ?? 0"
            format="percentage"
            :precision="1"
            :variant="avgMarginVariant"
            :subtitle="totalItemsSubtitle"
          />
          <MetricCard
            :title="t('analitica.rentabilidad.starProducts')"
            :value="menuSummary.stars ?? 0"
            format="number"
            variant="success"
            :subtitle="starsSubtitle"
          />
          <MetricCard
            :title="t('analitica.rentabilidad.criticalProducts')"
            :value="menuSummary.dogs ?? 0"
            format="number"
            variant="destructive"
            :subtitle="dogsSubtitle"
          />
        </div>

        <!-- Date Filter -->
        <ClientOnly>
          <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide mb-6">
            <VueDatePicker
              v-model="dateRangeDates"
              range
              :preset-dates="presetDates"
              :enable-time-picker="false"
              :locale="dateFnsLocale"
              :placeholder="t('analitica.common.dateRange')"
              auto-apply
              :teleport="true"
              :timezone="timezone"
              :max-date="maxDate"
              :format="formatDateRange"
              input-class-name="dp-custom-input"
              menu-class-name="dp-custom-menu"
              calendar-cell-class-name="dp-custom-cell"
            />
            <button
              v-if="dateRangeDates"
              @click="dateRangeDates = null"
              class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
              :title="t('analitica.rentabilidad.clearFilter')"
              :aria-label="t('analitica.rentabilidad.clearFilter')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </ClientOnly>

        <!-- Rentabilidad Real -->
        <HealthSemaphore
          :isUnlocked="isUnlocked"
          :foodCostData="foodCostData?.data"
          :menuData="menuAnalysisData?.data"
          hide-header
          hide-food-cost-summary
        />
      </section>
    </template>
  </div>
</template>

<style>
.dp-custom-input {
  height: 40px !important;
  border: 2px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  background: hsl(var(--background)) !important;
  font-size: 0.875rem !important;
  color: hsl(var(--foreground)) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
  min-width: 220px;
}
.dp-custom-input:focus {
  outline: none !important;
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2) !important;
}
.dp-custom-input::placeholder { color: hsl(var(--muted-foreground)) !important; }
.dp__theme_light {
  --dp-primary-color: hsl(var(--primary));
  --dp-primary-text-color: hsl(var(--primary-foreground));
  --dp-background-color: hsl(var(--card));
  --dp-text-color: hsl(var(--foreground));
  --dp-border-color: hsl(var(--border));
  --dp-menu-border-color: hsl(var(--border));
  --dp-hover-color: hsl(var(--accent));
  --dp-hover-text-color: hsl(var(--foreground));
  --dp-secondary-color: hsl(var(--muted));
  --dp-border-color-hover: hsl(var(--primary));
}
.dp-custom-menu {
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
}
</style>
