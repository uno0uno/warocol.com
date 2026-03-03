<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat, formatDistanceToNow } from 'date-fns'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText } = useLayoutActions()
const { onTenantChange } = useTenantReactive()

const lastUpdate = ref<Date>(new Date())
const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es }))

const dateRangeDates = ref<Date[] | null>(null)

const presetDates = ref([
  { label: 'Hoy', value: [new Date(), new Date()] },
  { label: 'Ayer', value: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d] })() },
  { label: 'Última semana', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()] },
  { label: 'Últimos 15 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 15); return d })(), new Date()] },
  { label: 'Último mes', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()] },
  { label: 'Últimos 90 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d })(), new Date()] },
])

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })}`
}

const dateRange = computed(() => {
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null, to: null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return { from: fnsFormat(from, 'yyyy-MM-dd'), to: fnsFormat(to, 'yyyy-MM-dd') }
})

const { data: foodCostData, pending: foodCostLoading, refresh: refreshFoodCost } = useAsyncData(
  'rentabilidad-food-cost',
  () => $fetch('/api/analytics/food-cost', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined
    }
  }),
  { server: false, lazy: true, default: () => ({ data: null }) }
)

const { data: menuAnalysisData, pending: menuLoading, refresh: refreshMenuAnalysis } = useAsyncData(
  'rentabilidad-menu-analysis',
  () => $fetch('/api/analytics/menu-analysis', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      limit: 200
    }
  }),
  { server: false, lazy: true, default: () => ({ data: null }) }
)

const isLoading = computed(() => foodCostLoading.value || menuLoading.value)

const isUnlocked = computed(() => !!(foodCostData.value?.data || menuAnalysisData.value?.data))

const handleRefresh = async () => {
  await Promise.all([refreshFoodCost(), refreshMenuAnalysis()])
  lastUpdate.value = new Date()
}

watch(dateRangeDates, async (val) => {
  if (!val || (val.length === 2 && val[0] && val[1])) {
    await Promise.all([refreshFoodCost(), refreshMenuAnalysis()])
    lastUpdate.value = new Date()
  }
})

watch(lastUpdate, () => {
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})

onTenantChange(handleRefresh)

onMounted(() => {
  if (setRefreshHandler) setRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})
onUnmounted(() => {
  if (setRefreshHandler) clearRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(undefined)
})
</script>

<template>
  <div class="space-y-4 pb-20">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Date Filter -->
      <ClientOnly>
      <div class="flex items-center gap-2 w-full overflow-x-auto pb-2">
        <VueDatePicker
          v-model="dateRangeDates"
          range
          :preset-dates="presetDates"
          :enable-time-picker="false"
          :locale="es"
          placeholder="Rango de fechas"
          auto-apply
          :teleport="true"
          :max-date="new Date()"
          :format="formatDateRange"
          input-class-name="dp-custom-input"
          menu-class-name="dp-custom-menu"
          calendar-cell-class-name="dp-custom-cell"
        />
        <button
          v-if="dateRangeDates"
          @click="dateRangeDates = null"
          class="h-10 px-3 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-500 hover:text-slate-700 hover:border-indigo-500 transition-colors"
          title="Limpiar filtro"
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
      />
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
