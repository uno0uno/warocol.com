<template>
  <div class="page-layout">

    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- ── Back link + selector bar ──────────────────────────────────────── -->
      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink
          to="/finanzas/cierre"
          class="inline-flex min-h-[44px] items-center px-4 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
        >
          ← Historial
        </NuxtLink>

        <div class="flex items-center gap-2 flex-shrink-0">
          <select
            v-model.number="selectedMonth"
            class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
          >
            <option v-for="(name, idx) in monthNames" :key="idx + 1" :value="idx + 1">{{ name }}</option>
          </select>
          <select
            v-model.number="selectedYear"
            class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
          >
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>

      <!-- ── Coverage indicator ─────────────────────────────────────────────── -->
      <div v-if="mensualData" class="bg-surface border-2 border-border rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-text-primary">
            {{ mensualData.totals.daysClosed }} de {{ mensualData.totals.daysInMonth }} días cerrados en
            {{ monthNames[selectedMonth - 1] }} {{ selectedYear }}
          </span>
          <span class="text-sm font-semibold text-primary">
            {{ Math.round((mensualData.totals.daysClosed / mensualData.totals.daysInMonth) * 100) }}%
          </span>
        </div>
        <div class="w-full h-2 rounded-full bg-border overflow-hidden">
          <div
            class="h-full rounded-full bg-primary transition-all duration-500"
            :style="{ width: `${(mensualData.totals.daysClosed / mensualData.totals.daysInMonth) * 100}%` }"
          />
        </div>
      </div>

      <!-- ── MetricCards ────────────────────────────────────────────────────── -->
      <div v-if="mensualData && mensualData.totals.daysClosed > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        <MetricCard title="Total ventas"    :value="mensualData.totals.totalSales"     format="currency" variant="primary" />
        <MetricCard title="Efectivo"        :value="mensualData.totals.totalCash"       format="currency" variant="primary" />
        <MetricCard title="Tarjeta"         :value="mensualData.totals.totalCard"       format="currency" variant="primary" />
        <MetricCard title="Gastos"          :value="mensualData.totals.gastosEfectivo"  format="currency" variant="primary" />
        <MetricCard title="Diferencia"      :value="mensualData.totals.cashDifference"  format="currency" variant="primary" class="col-span-2 md:col-span-1" />
      </div>

      <!-- ── Daily closes table ─────────────────────────────────────────────── -->
      <UiResponsiveDataView
        :data="dailyList"
        :columns="dailyColumns"
        row-size="sm"
        empty-message="No hay cierres registrados en este mes."
      >
        <template #header>
          <h3 class="text-base font-bold text-text-primary">
            Cierres de {{ monthNames[selectedMonth - 1] }} {{ selectedYear }}
          </h3>
        </template>

        <template #cell-periodStart="{ row }">
          <NuxtLink
            :to="`/finanzas/cierre/${row.id}`"
            class="text-sm text-text-primary hover:text-primary transition-colors"
          >
            {{ formatDay(row.periodStart) }}
          </NuxtLink>
        </template>
        <template #cell-periodEnd="{ row }">
          <span class="text-sm text-text-secondary">{{ formatDay(row.periodEnd) }}</span>
        </template>
        <template #cell-totalSales="{ value }">
          <span class="text-sm font-medium text-text-primary">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-gastosEfectivo="{ value }">
          <span class="text-sm text-destructive">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-cashDifference="{ value }">
          <span class="text-sm font-semibold" :class="value >= 0 ? 'text-emerald-600' : 'text-destructive'">
            {{ value >= 0 ? '+' : '' }}{{ formatCurrency(value) }}
          </span>
        </template>
        <template #cell-closedAt="{ value }">
          <span class="text-xs text-text-secondary">{{ formatDate(value) }}</span>
        </template>
      </UiResponsiveDataView>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import MetricCard from '~/components/shared/MetricCard.vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Cierre Mensual - Warocol' })

const route = useRoute()
const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

const now = new Date()

const selectedYear  = ref<number>(route.query.year  ? Number(route.query.year)  : now.getFullYear())
const selectedMonth = ref<number>(route.query.month ? Number(route.query.month) : now.getMonth() + 1)

const yearOptions = computed(() => {
  const base = now.getFullYear()
  return [base - 2, base - 1, base, base + 1, base + 2]
})

const monthNames = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const { data: rawData, status, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['cierre', 'mensual', currentTenant.value?.id, selectedYear.value, selectedMonth.value],
  query: () => $fetch<{ success: boolean; data: { totals: Record<string, any>; daily: any[] } }>(
    '/api/cierre/mensual',
    { params: { year: selectedYear.value, month: selectedMonth.value } },
  ),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const mensualData  = computed(() => rawData.value?.data ?? null)
const dailyList    = computed(() => mensualData.value?.daily ?? [])
const isLoading    = computed(() => !rawData.value && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && rawData.value != null)

registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
setRefreshHandler(refetch)

const dailyColumns = [
  { key: 'periodStart',    title: 'Período inicial', sortable: false },
  { key: 'periodEnd',      title: 'Período final',   sortable: false },
  { key: 'totalSales',     title: 'Ventas',          sortable: false },
  { key: 'gastosEfectivo', title: 'Gastos',          sortable: false },
  { key: 'cashDifference', title: 'Diferencia',      sortable: false },
  { key: 'closedAt',       title: 'Registrado',      sortable: false },
]

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const formatDay = (d: string) => {
  if (!d) return ''
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota',
  }).format(new Date(d + 'T12:00:00'))
}

const formatDate = (iso: string) => {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'America/Bogota',
  }).format(new Date(iso))
}
</script>
