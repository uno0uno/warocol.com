<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Props ─────────────────────────────────────────────────────────────────────
const props = withDefaults(defineProps<{
  year: number
  month: number
  compact?: boolean
}>(), {
  compact: false,
})

// ── Tenant ───────────────────────────────────────────────────────────────────
const { currentTenant } = useTenantReactive()

// ── Types ────────────────────────────────────────────────────────────────────
interface PLRevenue {
  foodBeverageSales: number
  total: number
}

interface PLCogs {
  foodCost: number
  total: number
}

interface PLOperatingExpenses {
  payroll: number
  rent: number
  utilities: number
  maintenance: number
  other: number
  total: number
}

interface PLProvisions {
  cesantias: number
  prima: number
  vacaciones: number
  interesesCesantias: number
  total: number
}

interface PLPrimeCost {
  foodCostPct: number
  laborPct: number
  totalPct: number
  benchmarkPct: number
  status: 'ok' | 'warning'
}

interface PLPeriodData {
  period: string
  revenue: PLRevenue
  cogs: PLCogs
  grossProfit: number
  grossMarginPct: number
  operatingExpenses: PLOperatingExpenses
  ebitda: number
  ebitdaMarginPct: number
  provisions: PLProvisions
  netIncome: number
  primeCost: PLPrimeCost
}

interface PLResponse {
  success: boolean
  current: PLPeriodData
  previous: PLPeriodData | null
}

// ── Compare toggle ────────────────────────────────────────────────────────────
const showComparison = ref(false)

// ── Query ─────────────────────────────────────────────────────────────────────
const { data: plData, asyncStatus, error: fetchError } = useQuery({
  key: () => ['pl-statement', currentTenant.value?.id, props.year, props.month, props.compact],
  query: () => $fetch<PLResponse>('/api/accounting/pl-statement', {
    params: {
      year: props.year,
      month: props.month,
      comparePrevious: !props.compact,
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const isLoading = computed(() => plData.value == null && !fetchError.value)
const current = computed<PLPeriodData | null>(() => plData.value?.current ?? null)
const previous = computed<PLPeriodData | null>(() => plData.value?.previous ?? null)
const hasPrevious = computed(() => showComparison.value && previous.value != null)

// ── Formatters ────────────────────────────────────────────────────────────────
const formatCurrency = (value: number): string => {
  if (value < 0) {
    return `(${new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Math.abs(value))})`
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatPct = (pct: number): string => `${pct.toFixed(1)}%`

const isNegative = (value: number) => value < 0

// ── Month label helper ────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const periodLabel = computed(() => {
  const name = MONTH_NAMES[props.month - 1] ?? ''
  return `${name} ${props.year}`
})

const prevPeriodLabel = computed(() => {
  if (!previous.value) return ''
  const [y, m] = previous.value.period.split('-').map(Number)
  return `${MONTH_NAMES[(m ?? 1) - 1] ?? ''} ${y}`
})
</script>

<template>
  <!-- ── Loading ──────────────────────────────────────────────────────────── -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-[200px]">
    <CommonsTheCustomLoader size="large" />
  </div>

  <!-- ── Error ────────────────────────────────────────────────────────────── -->
  <CommonsTheErrorState v-else-if="fetchError" />

  <!-- ── Empty ────────────────────────────────────────────────────────────── -->
  <div
    v-else-if="plData && !current"
    class="flex flex-col items-center justify-center py-16 text-center"
  >
    <svg class="w-12 h-12 text-text-secondary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    <p class="text-sm font-medium text-text-primary">Sin actividad registrada en este período</p>
    <p class="text-xs text-text-secondary mt-1">No hay datos de P&amp;L para {{ periodLabel }}.</p>
  </div>

  <!-- ── Compact mode ─────────────────────────────────────────────────────── -->
  <div v-else-if="compact && current" class="flex flex-col gap-3">

    <!-- 4 metric cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- Ingresos -->
      <div class="flex flex-col gap-1 p-3 rounded-xl border border-border bg-surface">
        <span class="text-xs font-medium text-text-secondary">Ingresos</span>
        <span
          class="text-base font-bold tabular-nums"
          :class="isNegative(current.revenue.total) ? 'text-destructive' : 'text-text-primary'"
        >
          {{ formatCurrency(current.revenue.total) }}
        </span>
      </div>

      <!-- Margen bruto -->
      <div class="flex flex-col gap-1 p-3 rounded-xl border border-border bg-surface">
        <span class="text-xs font-medium text-text-secondary">Margen bruto</span>
        <span
          class="text-base font-bold tabular-nums"
          :class="isNegative(current.grossMarginPct) ? 'text-destructive' : 'text-text-primary'"
        >
          {{ formatPct(current.grossMarginPct) }}
        </span>
      </div>

      <!-- EBITDA -->
      <div class="flex flex-col gap-1 p-3 rounded-xl border border-border bg-surface">
        <span class="text-xs font-medium text-text-secondary">EBITDA</span>
        <span
          class="text-base font-bold tabular-nums"
          :class="isNegative(current.ebitdaMarginPct) ? 'text-destructive' : 'text-text-primary'"
        >
          {{ formatPct(current.ebitdaMarginPct) }}
        </span>
      </div>

      <!-- Ingreso neto -->
      <div class="flex flex-col gap-1 p-3 rounded-xl border border-border bg-surface">
        <span class="text-xs font-medium text-text-secondary">Ingreso neto</span>
        <span
          class="text-base font-bold tabular-nums"
          :class="isNegative(current.netIncome) ? 'text-destructive' : 'text-text-primary'"
        >
          {{ formatCurrency(current.netIncome) }}
        </span>
      </div>
    </div>

    <!-- Prime Cost card -->
    <div class="flex flex-col gap-2 p-4 rounded-xl border border-border bg-surface">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Prime Cost</span>
        <UiStatusBadge
          :value="current.primeCost.status === 'ok' ? 'OK' : 'Atención'"
          format="text"
          :variant="current.primeCost.status === 'ok' ? 'success' : 'warning'"
          size="sm"
        />
      </div>
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <div class="flex items-center gap-1">
          <span class="text-text-secondary">Alimentos:</span>
          <span class="font-semibold text-text-primary tabular-nums">{{ formatPct(current.primeCost.foodCostPct) }}</span>
        </div>
        <div class="w-px h-4 bg-border" aria-hidden="true" />
        <div class="flex items-center gap-1">
          <span class="text-text-secondary">Nómina:</span>
          <span class="font-semibold text-text-primary tabular-nums">{{ formatPct(current.primeCost.laborPct) }}</span>
        </div>
        <div class="w-px h-4 bg-border" aria-hidden="true" />
        <div class="flex items-center gap-1">
          <span class="text-text-secondary">Total:</span>
          <span
            class="font-bold tabular-nums"
            :class="current.primeCost.status === 'ok' ? 'text-emerald-600' : 'text-amber-600'"
          >
            {{ formatPct(current.primeCost.totalPct) }}
          </span>
        </div>
      </div>
      <p class="text-xs text-text-secondary">
        Benchmark: {{ formatPct(current.primeCost.benchmarkPct) }}
      </p>
    </div>

    <!-- Link to full report -->
    <NuxtLink
      :to="`/finanzas/reportes/pl-mensual?year=${year}&month=${month}`"
      class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
      aria-label="Ver reporte completo de P&amp;L"
    >
      Ver reporte completo
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </NuxtLink>
  </div>

  <!-- ── Full mode ─────────────────────────────────────────────────────────── -->
  <div v-else-if="!compact && current" class="flex flex-col gap-4">

    <!-- Header row: title + compare toggle + refreshing indicator -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-sm font-semibold text-text-primary">
          Estado de Resultados
          <span class="font-normal text-text-secondary ml-1">{{ periodLabel }}</span>
        </h2>
        <p v-if="asyncStatus === 'loading'" class="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
          <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Actualizando...
        </p>
      </div>

      <!-- Compare toggle -->
      <button
        v-if="previous"
        type="button"
        class="min-h-[44px] px-4 rounded-lg border-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        :class="showComparison
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary'"
        :aria-pressed="showComparison"
        :aria-label="showComparison ? 'Ocultar mes anterior' : 'Comparar mes anterior'"
        @click="showComparison = !showComparison"
      >
        Comparar mes anterior
      </button>
    </div>

    <!-- P&L Table -->
    <div class="rounded-xl border border-border overflow-hidden">

      <!-- Column headers (when comparing) -->
      <div v-if="hasPrevious" class="flex items-center bg-surface-secondary/60 border-b border-border px-4 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
        <span class="flex-1">Concepto</span>
        <span class="w-36 text-right">{{ periodLabel }}</span>
        <span class="w-36 text-right">{{ prevPeriodLabel }}</span>
      </div>

      <!-- ── Revenue ──────────────────────────────────────────────────────── -->
      <div class="border-b border-border">
        <div class="flex items-center gap-2 px-4 py-2 bg-surface-secondary/60">
          <span class="text-xs font-bold text-text-secondary uppercase tracking-wider">Ingresos</span>
        </div>
        <div class="divide-y divide-border/60">
          <!-- Ventas alimentos/bebidas -->
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Ventas alimentos / bebidas</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.revenue.foodBeverageSales) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.revenue.foodBeverageSales) }}
            </span>
            <span
              v-if="hasPrevious"
              class="w-36 text-right tabular-nums text-text-secondary"
            >
              {{ formatCurrency(previous!.revenue.foodBeverageSales) }}
            </span>
          </div>
          <!-- Total ingresos -->
          <div class="flex items-center px-4 py-2.5 text-sm font-semibold bg-surface-secondary/20">
            <span class="flex-1 text-text-primary">Total ingresos</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.revenue.total) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.revenue.total) }}
            </span>
            <span
              v-if="hasPrevious"
              class="w-36 text-right tabular-nums text-text-secondary"
            >
              {{ formatCurrency(previous!.revenue.total) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── COGS ─────────────────────────────────────────────────────────── -->
      <div class="border-b border-border">
        <div class="flex items-center gap-2 px-4 py-2 bg-surface-secondary/60">
          <span class="text-xs font-bold text-text-secondary uppercase tracking-wider">COGS — Costo de ventas</span>
        </div>
        <div class="divide-y divide-border/60">
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Costo de alimentos</span>
            <span class="w-36 text-right tabular-nums text-destructive">
              {{ formatCurrency(current.cogs.foodCost) }}
            </span>
            <span
              v-if="hasPrevious"
              class="w-36 text-right tabular-nums text-text-secondary"
            >
              {{ formatCurrency(previous!.cogs.foodCost) }}
            </span>
          </div>
          <div class="flex items-center px-4 py-2.5 text-sm font-semibold bg-surface-secondary/20">
            <span class="flex-1 text-text-primary">Total COGS</span>
            <span class="w-36 text-right tabular-nums text-destructive">
              {{ formatCurrency(current.cogs.total) }}
            </span>
            <span
              v-if="hasPrevious"
              class="w-36 text-right tabular-nums text-text-secondary"
            >
              {{ formatCurrency(previous!.cogs.total) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Utilidad bruta ────────────────────────────────────────────────── -->
      <div class="border-b border-border">
        <div class="flex items-center px-4 py-3 text-sm font-bold bg-surface-secondary/40">
          <span class="flex-1 text-text-primary">Utilidad bruta</span>
          <div class="w-36 flex flex-col items-end">
            <span
              class="tabular-nums"
              :class="isNegative(current.grossProfit) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.grossProfit) }}
            </span>
            <span class="text-xs font-normal text-text-secondary tabular-nums">{{ formatPct(current.grossMarginPct) }}</span>
          </div>
          <div v-if="hasPrevious" class="w-36 flex flex-col items-end">
            <span class="tabular-nums text-text-secondary">{{ formatCurrency(previous!.grossProfit) }}</span>
            <span class="text-xs font-normal text-text-secondary tabular-nums">{{ formatPct(previous!.grossMarginPct) }}</span>
          </div>
        </div>
      </div>

      <!-- ── Gastos operativos ──────────────────────────────────────────────── -->
      <div class="border-b border-border">
        <div class="flex items-center gap-2 px-4 py-2 bg-surface-secondary/60">
          <span class="text-xs font-bold text-text-secondary uppercase tracking-wider">Gastos operativos</span>
        </div>
        <div class="divide-y divide-border/60">
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Nómina</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.operatingExpenses.payroll) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.operatingExpenses.payroll) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.operatingExpenses.payroll) }}
            </span>
          </div>
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Arriendo</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.operatingExpenses.rent) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.operatingExpenses.rent) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.operatingExpenses.rent) }}
            </span>
          </div>
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Servicios públicos</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.operatingExpenses.utilities) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.operatingExpenses.utilities) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.operatingExpenses.utilities) }}
            </span>
          </div>
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Mantenimiento</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.operatingExpenses.maintenance) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.operatingExpenses.maintenance) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.operatingExpenses.maintenance) }}
            </span>
          </div>
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Otros</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.operatingExpenses.other) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.operatingExpenses.other) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.operatingExpenses.other) }}
            </span>
          </div>
          <div class="flex items-center px-4 py-2.5 text-sm font-semibold bg-surface-secondary/20">
            <span class="flex-1 text-text-primary">Total gastos operativos</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.operatingExpenses.total) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.operatingExpenses.total) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.operatingExpenses.total) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── EBITDA ─────────────────────────────────────────────────────────── -->
      <div class="border-b border-border">
        <div class="flex items-center px-4 py-3 text-sm font-bold bg-surface-secondary/40">
          <span class="flex-1 text-text-primary">EBITDA</span>
          <div class="w-36 flex flex-col items-end">
            <span
              class="tabular-nums"
              :class="isNegative(current.ebitda) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.ebitda) }}
            </span>
            <span class="text-xs font-normal text-text-secondary tabular-nums">{{ formatPct(current.ebitdaMarginPct) }}</span>
          </div>
          <div v-if="hasPrevious" class="w-36 flex flex-col items-end">
            <span class="tabular-nums text-text-secondary">{{ formatCurrency(previous!.ebitda) }}</span>
            <span class="text-xs font-normal text-text-secondary tabular-nums">{{ formatPct(previous!.ebitdaMarginPct) }}</span>
          </div>
        </div>
      </div>

      <!-- ── Provisiones ────────────────────────────────────────────────────── -->
      <div class="border-b border-border">
        <div class="flex items-center gap-2 px-4 py-2 bg-surface-secondary/60">
          <span class="text-xs font-bold text-text-secondary uppercase tracking-wider">Provisiones</span>
        </div>
        <div class="divide-y divide-border/60">
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Cesantías</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.provisions.cesantias) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.provisions.cesantias) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.provisions.cesantias) }}
            </span>
          </div>
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Prima de servicios</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.provisions.prima) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.provisions.prima) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.provisions.prima) }}
            </span>
          </div>
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Vacaciones</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.provisions.vacaciones) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.provisions.vacaciones) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.provisions.vacaciones) }}
            </span>
          </div>
          <div class="flex items-center px-4 py-2.5 text-sm">
            <span class="flex-1 text-text-secondary">Intereses cesantías</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.provisions.interesesCesantias) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.provisions.interesesCesantias) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.provisions.interesesCesantias) }}
            </span>
          </div>
          <div class="flex items-center px-4 py-2.5 text-sm font-semibold bg-surface-secondary/20">
            <span class="flex-1 text-text-primary">Total provisiones</span>
            <span
              class="w-36 text-right tabular-nums"
              :class="isNegative(current.provisions.total) ? 'text-destructive' : 'text-text-primary'"
            >
              {{ formatCurrency(current.provisions.total) }}
            </span>
            <span v-if="hasPrevious" class="w-36 text-right tabular-nums text-text-secondary">
              {{ formatCurrency(previous!.provisions.total) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Ingreso neto ───────────────────────────────────────────────────── -->
      <div class="flex items-center px-4 py-4 bg-surface-secondary/60 border-b border-border">
        <span class="flex-1 text-base font-bold text-text-primary">Ingreso neto</span>
        <span
          class="w-36 text-right tabular-nums text-base font-bold"
          :class="isNegative(current.netIncome) ? 'text-destructive' : 'text-emerald-600'"
        >
          {{ formatCurrency(current.netIncome) }}
        </span>
        <span
          v-if="hasPrevious"
          class="w-36 text-right tabular-nums text-base font-bold"
          :class="isNegative(previous!.netIncome) ? 'text-destructive' : 'text-emerald-600'"
        >
          {{ formatCurrency(previous!.netIncome) }}
        </span>
      </div>

      <!-- ── Prime Cost ─────────────────────────────────────────────────────── -->
      <div class="px-4 py-4 flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-text-secondary uppercase tracking-wider">Prime Cost</span>
          <UiStatusBadge
            :value="current.primeCost.status === 'ok' ? 'OK' : 'Atención'"
            format="text"
            :variant="current.primeCost.status === 'ok' ? 'success' : 'warning'"
            size="sm"
          />
        </div>
        <div class="flex flex-wrap items-center gap-4 text-sm">
          <div class="flex items-center gap-1.5">
            <span class="text-text-secondary">Alimentos:</span>
            <span class="font-semibold text-text-primary tabular-nums">{{ formatPct(current.primeCost.foodCostPct) }}</span>
          </div>
          <div class="w-px h-4 bg-border" aria-hidden="true" />
          <div class="flex items-center gap-1.5">
            <span class="text-text-secondary">Nómina:</span>
            <span class="font-semibold text-text-primary tabular-nums">{{ formatPct(current.primeCost.laborPct) }}</span>
          </div>
          <div class="w-px h-4 bg-border" aria-hidden="true" />
          <div class="flex items-center gap-1.5">
            <span class="text-text-secondary">Total:</span>
            <span
              class="font-bold tabular-nums"
              :class="current.primeCost.status === 'ok' ? 'text-emerald-600' : 'text-amber-600'"
            >
              {{ formatPct(current.primeCost.totalPct) }}
            </span>
          </div>
          <div class="w-px h-4 bg-border" aria-hidden="true" />
          <span class="text-xs text-text-secondary">Benchmark: {{ formatPct(current.primeCost.benchmarkPct) }}</span>
        </div>

        <!-- Previous period prime cost (when comparing) -->
        <div v-if="hasPrevious" class="flex flex-wrap items-center gap-4 text-sm text-text-secondary pt-1 border-t border-border/60">
          <span class="text-xs font-medium">{{ prevPeriodLabel }}:</span>
          <div class="flex items-center gap-1">
            <span>Alimentos: {{ formatPct(previous!.primeCost.foodCostPct) }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span>Nómina: {{ formatPct(previous!.primeCost.laborPct) }}</span>
          </div>
          <div class="flex items-center gap-1">
            <span>Total: {{ formatPct(previous!.primeCost.totalPct) }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
