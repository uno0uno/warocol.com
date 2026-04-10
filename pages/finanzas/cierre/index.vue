<template>
  <div class="page-layout">

    <!-- ── Filter bar ──────────────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-2 w-full">
      <input
        type="month"
        v-model="filterMonth"
        class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[140px]"
      />

      <div class="flex items-center gap-1.5">
        <input
          v-model="periodStart"
          type="date"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span class="text-text-tertiary text-sm">–</span>
        <input
          v-model="periodEnd"
          type="date"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div class="flex-1" />

      <button
        @click="navigateTo({ path: '/finanzas/cierre/x', query: { start: periodStart, end: periodEnd } })"
        class="h-10 px-4 rounded-lg border-2 border-border bg-background text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
      >
        Cierre X
      </button>
      <button
        @click="navigateTo({ path: '/finanzas/cierre/z', query: { start: periodStart, end: periodEnd } })"
        class="h-10 px-4 rounded-lg border-2 border-border bg-background text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
      >
        Cierre Z
      </button>
    </div>

    <!-- ── Historial ───────────────────────────────────────────────────────── -->
    <div v-if="isLoadingHistorial" class="flex justify-center py-12">
      <CommonsTheCustomLoader size="large" />
    </div>
    <template v-else>
      <UiResponsiveDataView
        :data="filteredHistorial"
        :columns="historialColumns"
        row-size="sm"
        empty-message="No hay cierres registrados."
      >
        <template #header>
          <h3 class="text-base font-bold text-text-primary">Historial de cierres</h3>
        </template>

        <template #cell-period="{ item }">
          <NuxtLink
            :to="`/finanzas/cierre/${item.id}`"
            class="text-sm text-text-primary hover:text-primary transition-colors"
          >
            {{ formatPeriod(item.periodStart, item.periodEnd) }}
          </NuxtLink>
        </template>
        <template #cell-totalSales="{ value }">
          <span class="text-sm font-medium text-text-primary">{{ formatCurrency(value) }}</span>
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

      <div v-if="filteredHistorial.length > 0" class="px-4 py-3 bg-surface border border-border rounded-lg flex items-center justify-between">
        <span class="text-sm text-text-secondary">Diferencia acumulada</span>
        <span class="text-sm font-semibold" :class="monthlyDiff >= 0 ? 'text-emerald-600' : 'text-destructive'">
          {{ monthlyDiff >= 0 ? '+' : '' }}{{ formatCurrency(monthlyDiff) }}
        </span>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Cierre - Warocol' })

const { currentTenant } = useTenantReactive()

const today       = new Date().toISOString().split('T')[0]
const periodStart = ref(today)
const periodEnd   = ref(today)
const filterMonth = ref(today.slice(0, 7))

const { data: rawHistorial, status: historialStatus } = useQuery({
  key: () => ['cierre', 'list', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/cierre'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const historialList      = computed(() => rawHistorial.value?.data ?? [])
const isLoadingHistorial = computed(() => historialStatus.value === 'pending' && !rawHistorial.value)

const filteredHistorial = computed(() => {
  if (!filterMonth.value) return historialList.value
  return historialList.value.filter((r: any) => r.periodStart?.slice(0, 7) === filterMonth.value)
})

const monthlyDiff = computed(() =>
  filteredHistorial.value.reduce((sum: number, r: any) => sum + (r.cashDifference ?? 0), 0)
)

const historialColumns = [
  { key: 'period',         title: 'Período',   sortable: false },
  { key: 'totalSales',     title: 'Ventas',     sortable: false },
  { key: 'cashDifference', title: 'Diferencia', sortable: false },
  { key: 'closedAt',       title: 'Registrado', sortable: false },
]

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const formatDate = (iso: string) => {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'America/Bogota',
  }).format(new Date(iso))
}

const formatPeriod = (start: string, end: string) => {
  if (!start) return ''
  const fmt = (d: string) => new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota',
  }).format(new Date(d + 'T12:00:00'))
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}
</script>
