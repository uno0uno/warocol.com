<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
useHead({ title: 'Balance de comprobación - Warocol' })

const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// ── Date helpers ─────────────────────────────────────────────────────────────
const { addDaysISO, monthBounds, todayISO } = useTenantTimezone()

function todayStr(): string {
  return todayISO()
}

function firstDayOfCurrentMonth(): string {
  return monthBounds(todayISO()).first
}

function firstDayOfLastMonth(): string {
  return monthBounds(addDaysISO(firstDayOfCurrentMonth(), -1)).first
}

function lastDayOfLastMonth(): string {
  return addDaysISO(firstDayOfCurrentMonth(), -1)
}

function firstDayOfCurrentQuarter(): string {
  const [year, month] = todayISO().split('-').map(Number)
  const q = Math.floor((month - 1) / 3)
  return `${year}-${String(q * 3 + 1).padStart(2, '0')}-01`
}

function firstDayOfCurrentYear(): string {
  return `${todayISO().slice(0, 4)}-01-01`
}

// ── Period selector state ────────────────────────────────────────────────────
const periodStart = ref(firstDayOfCurrentMonth())
const periodEnd = ref(todayStr())
const includeZeroBalances = ref(false)

// shouldFetch controls when we actually query — true on mount, and on "Consultar" click
const shouldFetch = ref(false)

onMounted(() => { shouldFetch.value = true })

const applyPreset = (start: string, end: string) => {
  periodStart.value = start
  periodEnd.value = end
  shouldFetch.value = true
}

// ── Types ────────────────────────────────────────────────────────────────────
interface TrialBalanceRow {
  accountId: string
  code: string
  name: string
  class: string
  accountType: string
  normalBalance: string
  openingBalance: number
  periodDebits: number
  periodCredits: number
  closingBalance: number
}

interface TrialBalanceResponse {
  success: boolean
  periodStart: string
  periodEnd: string
  rows: TrialBalanceRow[]
  totalDebits: number
  totalCredits: number
  isBalanced: boolean
}

// ── Data ─────────────────────────────────────────────────────────────────────
const { data: trialData, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => [
    'accounting', 'trial-balance',
    currentTenant.value?.id,
    periodStart.value,
    periodEnd.value,
    includeZeroBalances.value,
    shouldFetch.value,
  ],
  query: () => $fetch<TrialBalanceResponse>('/api/accounting/trial-balance', {
    params: {
      periodStart: periodStart.value,
      periodEnd: periodEnd.value,
      includeZeroBalances: includeZeroBalances.value,
    },
  }),
  enabled: () => !!currentTenant.value && shouldFetch.value,
  staleTime: 60_000,
})

const isLoading = computed(() => trialData.value == null && !fetchError.value && shouldFetch.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && trialData.value != null)

const rows = computed<TrialBalanceRow[]>(() => trialData.value?.rows ?? [])
const totalDebits = computed(() => trialData.value?.totalDebits ?? 0)
const totalCredits = computed(() => trialData.value?.totalCredits ?? 0)
const isBalanced = computed(() => trialData.value?.isBalanced ?? true)

// ── Consultar button ─────────────────────────────────────────────────────────
const handleConsultar = () => {
  shouldFetch.value = true
  refetch()
}

// ── PUC class constants ──────────────────────────────────────────────────────
const PUC_CLASSES = [
  { value: '1', label: 'Activos' },
  { value: '2', label: 'Pasivos' },
  { value: '3', label: 'Patrimonio' },
  { value: '4', label: 'Ingresos' },
  { value: '5', label: 'Gastos' },
  { value: '6', label: 'Costos' },
]

// ── Grouped rows with subtotals ──────────────────────────────────────────────
const groupedRows = computed(() => {
  const groups: {
    classCode: string
    label: string
    items: TrialBalanceRow[]
    subtotals: { openingBalance: number; periodDebits: number; periodCredits: number; closingBalance: number }
  }[] = []

  for (const cls of PUC_CLASSES) {
    const items = rows.value.filter(r => r.class === cls.value)
    if (items.length === 0) continue

    const subtotals = items.reduce(
      (acc, row) => ({
        openingBalance: acc.openingBalance + row.openingBalance,
        periodDebits: acc.periodDebits + row.periodDebits,
        periodCredits: acc.periodCredits + row.periodCredits,
        closingBalance: acc.closingBalance + row.closingBalance,
      }),
      { openingBalance: 0, periodDebits: 0, periodCredits: 0, closingBalance: 0 }
    )

    groups.push({ classCode: cls.value, label: cls.label, items, subtotals })
  }
  return groups
})

// ── Indent from code length ──────────────────────────────────────────────────
const indentStyle = (code: string): string => {
  const len = code.length
  if (len <= 1) return ''
  if (len <= 2) return 'pl-4'
  if (len <= 4) return 'pl-8'
  return 'pl-12'
}

// ── Currency formatter ───────────────────────────────────────────────────────
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

const isNegative = (value: number) => value < 0

// ── CSV Export ───────────────────────────────────────────────────────────────
const exportCSV = () => {
  const headers = ['Código', 'Nombre', 'Saldo Inicial', 'Débitos', 'Créditos', 'Saldo Final']
  const csvRows = [headers.join(',')]
  for (const row of rows.value) {
    csvRows.push([
      row.code,
      `"${row.name.replace(/"/g, '""')}"`,
      row.openingBalance,
      row.periodDebits,
      row.periodCredits,
      row.closingBalance,
    ].join(','))
  }
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `balance-comprobacion-${periodStart.value}-${periodEnd.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Layout integration ────────────────────────────────────────────────────────
registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })
</script>

<template>
  <div class="page-layout">

    <!-- Period selector card -->
    <div class="flex flex-col gap-3 p-4 rounded-xl border border-border bg-surface mb-4">

      <!-- Date inputs row -->
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-text-secondary" for="period-start">Desde</label>
          <input
            id="period-start"
            v-model="periodStart"
            type="date"
            class="h-9 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            :max="periodEnd"
            aria-label="Fecha de inicio del período"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-text-secondary" for="period-end">Hasta</label>
          <input
            id="period-end"
            v-model="periodEnd"
            type="date"
            class="h-9 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            :min="periodStart"
            :max="todayStr()"
            aria-label="Fecha de fin del período"
          />
        </div>

        <!-- includeZeroBalances -->
        <label class="flex items-center gap-2 h-9 cursor-pointer select-none">
          <input
            v-model="includeZeroBalances"
            type="checkbox"
            class="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-2"
            aria-label="Incluir cuentas con saldo cero"
          />
          <span class="text-sm text-text-secondary">Incluir saldos cero</span>
        </label>

        <!-- Consultar button -->
        <button
          type="button"
          :disabled="asyncStatus === 'loading'"
          class="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          aria-label="Consultar balance de comprobación"
          @click="handleConsultar"
        >
          <svg v-if="asyncStatus === 'loading'" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Consultar</span>
        </button>
      </div>

      <!-- Preset buttons -->
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-xs text-text-secondary mr-1">Período rápido:</span>
        <button
          type="button"
          class="h-8 px-3 rounded-lg border border-border bg-background text-xs text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          @click="applyPreset(firstDayOfCurrentMonth(), todayStr())"
        >Mes actual</button>
        <button
          type="button"
          class="h-8 px-3 rounded-lg border border-border bg-background text-xs text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          @click="applyPreset(firstDayOfLastMonth(), lastDayOfLastMonth())"
        >Mes anterior</button>
        <button
          type="button"
          class="h-8 px-3 rounded-lg border border-border bg-background text-xs text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          @click="applyPreset(firstDayOfCurrentQuarter(), todayStr())"
        >Trimestre actual</button>
        <button
          type="button"
          class="h-8 px-3 rounded-lg border border-border bg-background text-xs text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          @click="applyPreset(firstDayOfCurrentYear(), todayStr())"
        >Año actual</button>
      </div>
    </div>

    <!-- Loading state (initial) -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Pre-query state (shouldFetch not triggered yet — should never show since onMounted sets it) -->
    <div v-else-if="!shouldFetch" class="flex flex-col items-center justify-center py-16 text-center">
      <svg class="w-12 h-12 text-text-secondary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-sm text-text-secondary">Selecciona un período y haz clic en Consultar</p>
    </div>

    <!-- Error state -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Results -->
    <div v-else-if="trialData" class="flex flex-col gap-3">

      <!-- isBalanced warning banner -->
      <div
        v-if="!isBalanced"
        class="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive"
        role="alert"
      >
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p class="text-sm font-semibold">El balance no está cuadrado</p>
          <p class="text-xs mt-0.5">Revisa los asientos contables — los totales de débito y crédito no coinciden.</p>
        </div>
      </div>

      <!-- Header row: title + export + balanced badge -->
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex-1 min-w-0">
          <h2 class="text-sm font-semibold text-text-primary">
            Balance de comprobación
            <span class="font-normal text-text-secondary ml-1">
              {{ periodStart }} — {{ periodEnd }}
            </span>
          </h2>
          <p class="text-xs text-text-secondary mt-0.5">
            {{ rows.length }} cuenta{{ rows.length !== 1 ? 's' : '' }}
          </p>
        </div>

        <!-- isBalanced badge -->
        <span
          v-if="isBalanced && rows.length > 0"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-badge-success-bg text-badge-success-text border border-badge-success-border"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          Cuadrado
        </span>

        <!-- CSV export button -->
        <button
          v-if="rows.length > 0"
          type="button"
          class="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors whitespace-nowrap"
          aria-label="Exportar a CSV"
          @click="exportCSV"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="rows.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <svg class="w-12 h-12 text-text-secondary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-sm font-medium text-text-primary">Sin movimientos en el período seleccionado</p>
        <p class="text-xs text-text-secondary mt-1">Intenta con un rango de fechas diferente o activa "Incluir saldos cero".</p>
      </div>

      <!-- Trial balance table -->
      <div v-else class="rounded-xl border border-data-table-border overflow-hidden bg-data-table-container-bg">
        <div class="overflow-x-auto">
          <table class="w-full text-sm" role="table" aria-label="Balance de comprobación">
            <thead>
              <tr class="border-b border-data-table-border bg-data-table-header-bg">
                <th scope="col" class="text-left py-2.5 px-3 text-xs font-bold text-data-table-header-text uppercase tracking-wider whitespace-nowrap w-28">Código</th>
                <th scope="col" class="text-left py-2.5 px-3 text-xs font-bold text-data-table-header-text uppercase tracking-wider">Cuenta</th>
                <th scope="col" class="text-right py-2.5 px-3 text-xs font-bold text-data-table-header-text uppercase tracking-wider whitespace-nowrap">Saldo inicial</th>
                <th scope="col" class="text-right py-2.5 px-3 text-xs font-bold text-data-table-header-text uppercase tracking-wider whitespace-nowrap">Débitos</th>
                <th scope="col" class="text-right py-2.5 px-3 text-xs font-bold text-data-table-header-text uppercase tracking-wider whitespace-nowrap">Créditos</th>
                <th scope="col" class="text-right py-2.5 px-3 text-xs font-bold text-data-table-header-text uppercase tracking-wider whitespace-nowrap">Saldo final</th>
              </tr>
            </thead>
            <tbody>

              <!-- Per-class sections -->
              <template v-for="group in groupedRows" :key="group.classCode">

                <!-- Class header row -->
                <tr class="bg-data-table-footer-bg border-t border-data-table-border">
                  <td colspan="6" class="py-2 px-3">
                    <span class="text-xs font-bold text-data-table-cell-muted uppercase tracking-wider">
                      {{ group.classCode }} · {{ group.label }}
                    </span>
                  </td>
                </tr>

                <!-- Data rows -->
                <tr
                  v-for="(row, idx) in group.items"
                  :key="row.accountId"
                  class="border-t border-data-table-border/50 hover:bg-data-table-row-hover-bg transition-colors"
                  :class="idx % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'"
                >
                  <td class="py-2 px-3">
                    <span class="text-xs font-mono text-text-secondary tabular-nums">{{ row.code }}</span>
                  </td>
                  <td class="py-2 px-3">
                    <span
                      class="text-sm text-text-primary"
                      :class="[indentStyle(row.code), row.code.length <= 2 ? 'font-semibold' : 'font-normal']"
                    >
                      {{ row.name }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums" :class="isNegative(row.openingBalance) ? 'text-destructive' : 'text-text-primary'">
                    {{ formatCurrency(row.openingBalance) }}
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums" :class="isNegative(row.periodDebits) ? 'text-destructive' : 'text-text-primary'">
                    {{ row.periodDebits !== 0 ? formatCurrency(row.periodDebits) : '—' }}
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums" :class="isNegative(row.periodCredits) ? 'text-destructive' : 'text-text-primary'">
                    {{ row.periodCredits !== 0 ? formatCurrency(row.periodCredits) : '—' }}
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums font-medium" :class="isNegative(row.closingBalance) ? 'text-destructive' : 'text-text-primary'">
                    {{ formatCurrency(row.closingBalance) }}
                  </td>
                </tr>

                <!-- Class subtotal row -->
                <tr class="border-t border-data-table-border bg-data-table-footer-bg">
                  <td class="py-2 px-3" />
                  <td class="py-2 px-3">
                    <span class="text-xs font-bold text-text-secondary">Subtotal {{ group.label }}</span>
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums text-xs font-bold" :class="isNegative(group.subtotals.openingBalance) ? 'text-destructive' : 'text-text-primary'">
                    {{ formatCurrency(group.subtotals.openingBalance) }}
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums text-xs font-bold" :class="isNegative(group.subtotals.periodDebits) ? 'text-destructive' : 'text-text-primary'">
                    {{ formatCurrency(group.subtotals.periodDebits) }}
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums text-xs font-bold" :class="isNegative(group.subtotals.periodCredits) ? 'text-destructive' : 'text-text-primary'">
                    {{ formatCurrency(group.subtotals.periodCredits) }}
                  </td>
                  <td class="py-2 px-3 text-right tabular-nums text-xs font-bold" :class="isNegative(group.subtotals.closingBalance) ? 'text-destructive' : 'text-text-primary'">
                    {{ formatCurrency(group.subtotals.closingBalance) }}
                  </td>
                </tr>

              </template>

              <!-- Grand totals row -->
              <tr class="border-t-2 border-data-table-border bg-data-table-footer-bg">
                <td class="py-3 px-3" />
                <td class="py-3 px-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-text-primary">TOTALES</span>
                    <span
                      v-if="isBalanced"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-badge-success-bg text-badge-success-text"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      Cuadrado
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive"
                    >
                      No cuadrado
                    </span>
                  </div>
                </td>
                <td class="py-3 px-3" />
                <td class="py-3 px-3 text-right tabular-nums text-sm font-bold text-text-primary">
                  {{ formatCurrency(totalDebits) }}
                </td>
                <td class="py-3 px-3 text-right tabular-nums text-sm font-bold text-text-primary">
                  {{ formatCurrency(totalCredits) }}
                </td>
                <td class="py-3 px-3" />
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
table {
  font-variant-numeric: tabular-nums;
  border-collapse: collapse;
}
</style>
