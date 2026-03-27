<script setup lang="ts">
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import { useBilling } from '~/composables/useBilling'

definePageMeta({})
useHead({ title: 'Uso de IA — WaRo Admin' })

const { subscription, usageHistory, loading, isRefreshing, fetchUsageHistory } = useBilling()

const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

const usageHistoryReady = ref(false)
const isInitialLoading = computed(() =>
  !!currentTenant.value &&
  (!usageHistoryReady.value || subscription.value === undefined)
)

const loadAll = async () => {
  usageHistoryReady.value = false
  await fetchUsageHistory(24)
  usageHistoryReady.value = true
}

onMounted(() => { loadAll(); setRefreshHandler(loadAll) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => clearRefreshHandler(loadAll))
watch(() => currentTenant.value?.id, loadAll)

const scanLimit = computed(() => subscription.value?.scan_limit ?? 1000)

const columns: Column[] = [
  { key: 'year_month',  title: 'Mes',       sortable: false },
  { key: 'scans_count', title: 'Usados',    sortable: false, align: 'right' },
  { key: 'scan_limit',  title: 'Límite',    sortable: false, align: 'right' },
  { key: 'percentage',  title: '% Uso',     sortable: false, align: 'right' },
]

const tableData = computed(() =>
  usageHistory.value.map(entry => ({
    year_month:  entry.year_month,
    scans_count: entry.scans_count,
    scan_limit:  scanLimit.value,
    percentage:  Math.min(Math.round((entry.scans_count / scanLimit.value) * 100), 100),
  }))
)

const formatMonth = (yearMonth: string) =>
  new Date(yearMonth + 'T12:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
</script>

<template>
  <div class="page-layout">
    <div v-if="isInitialLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <UiResponsiveDataView
      v-else
      :columns="columns"
      :data="tableData"
      empty-message="No hay registros de uso aún"
      empty-sub-message="Los datos aparecerán aquí después del primer escaneo"
      variant="default"
    >
      <template #card="{ item }">
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="flex justify-between items-start">
            <p class="text-sm font-medium text-text-primary capitalize">{{ formatMonth(item.year_month) }}</p>
            <span class="text-xs text-text-secondary">{{ item.percentage }}%</span>
          </div>
          <p class="text-xs text-text-secondary mt-1">
            {{ item.scans_count.toLocaleString('es-CO') }} de {{ item.scan_limit.toLocaleString('es-CO') }}
          </p>
        </div>
      </template>

      <template #cell-year_month="{ value }">
        <span class="text-sm font-medium text-text-primary capitalize">{{ formatMonth(value) }}</span>
      </template>

      <template #cell-scans_count="{ value }">
        <span class="text-sm font-semibold text-text-primary">{{ value.toLocaleString('es-CO') }}</span>
      </template>

      <template #cell-scan_limit="{ value }">
        <span class="text-sm text-text-secondary">{{ value.toLocaleString('es-CO') }}</span>
      </template>

      <template #cell-percentage="{ value }">
        <span class="text-sm font-semibold text-text-primary">{{ value }}%</span>
      </template>
    </UiResponsiveDataView>
  </div>
</template>
