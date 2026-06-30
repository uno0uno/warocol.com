<template>
  <div class="page-layout">
    <div class="flex flex-col gap-3 md:gap-4">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard title="Pendientes" :value="summary.pending" variant="primary" />
        <MetricCard title="Con diferencia" :value="summary.withDifference" variant="destructive" />
        <MetricCard title="Total esperado" :value="summary.totalExpected" format="currency" variant="primary" />
        <MetricCard title="Diferencia total" :value="summary.totalDifference" format="currency" :variant="summary.totalDifference >= 0 ? 'primary' : 'destructive'" />
      </div>

      <div class="rounded-lg border border-border bg-surface p-3">
        <UiAdvancedFiltersBar
          v-model:date-range="dateRangeDates"
          :preset-dates="presetDates"
          :format-date-range="formatDateRange"
          :max-date="maxDate"
          :show-search="false"
          :show-date-range="true"
          :show-clear="hasActiveFilters"
          @clear="clearFilters"
        >
          <template #trailing>
            <NuxtLink
              v-if="cierreIdFilter"
              to="/finanzas/conciliacion"
              class="h-10 px-3 rounded-lg border border-primary/30 bg-primary/5 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center"
            >
              Ver todas
            </NuxtLink>
          </template>
        </UiAdvancedFiltersBar>
      </div>

      <div v-if="isLoading" class="flex min-h-[320px] items-center justify-center">
        <CommonsTheCustomLoader size="large" />
      </div>

      <CommonsTheErrorState v-else-if="fetchError" />

      <div v-else class="rounded-lg border border-border bg-surface overflow-hidden">
        <UiResponsiveDataView
          :data="rows"
          :columns="columns"
          row-size="sm"
          empty-message="No hay conciliaciones para estos filtros."
          empty-sub-message="Cambia los filtros de cabecera para ver otros estados."
        >
          <template #cell-period="{ row }">
            <span class="text-sm font-semibold text-text-primary whitespace-nowrap">{{ formatPeriod(row) }}</span>
          </template>
          <template #cell-method="{ row }">
            <div class="flex items-start gap-2">
              <span class="mt-1.5 h-2 w-2 rounded-full" :class="groupDotClass(row.groupSlug)" />
              <div class="min-w-0">
                <p class="text-sm font-semibold leading-tight text-text-primary capitalize">{{ row.methodName }}</p>
              </div>
            </div>
          </template>
          <template #cell-groupSlug="{ value }">
            <span class="text-sm text-text-secondary">{{ groupLabel(value) }}</span>
          </template>
          <template #header-groupSlug>
            <UiTableHeaderFilter
              v-model="groupHeaderFilter"
              title="Tipo"
              filter-type="select"
              :options="groupHeaderOptions"
              all-label="Todos"
              align="left"
            />
          </template>
          <template #cell-grossInflowsAmount="{ value }">
            <span class="text-sm font-semibold text-primary tabular-nums">{{ formatCurrency(value) }}</span>
          </template>
          <template #cell-outflowsAmount="{ row }">
            <span class="text-sm font-semibold tabular-nums" :class="totalOutflows(row) > 0 ? 'text-destructive' : 'text-text-tertiary'">
              {{ totalOutflows(row) > 0 ? `− ${formatCurrency(totalOutflows(row))}` : '—' }}
            </span>
          </template>
          <template #cell-expectedAmount="{ value }">
            <span class="text-sm font-semibold tabular-nums" :class="amountToneClass(value)">{{ formatCurrency(value) }}</span>
          </template>
          <template #cell-reportedAmount="{ value }">
            <span class="text-sm tabular-nums" :class="value == null ? 'text-text-tertiary' : amountToneClass(value)">{{ value == null ? 'Sin reportar' : formatCurrency(value) }}</span>
          </template>
          <template #cell-differenceAmount="{ value }">
            <span class="text-sm font-semibold" :class="differenceClass(value)">
              {{ value == null ? '—' : `${value >= 0 ? '+' : ''}${formatCurrency(value)}` }}
            </span>
          </template>
          <template #cell-reconciliationStatus="{ value }">
            <span class="inline-flex rounded px-2 py-1 text-xs font-semibold" :class="statusClass(value)">
              {{ statusLabel(value) }}
            </span>
          </template>
          <template #header-reconciliationStatus>
            <UiTableHeaderFilter
              v-model="statusHeaderFilter"
              title="Estado"
              filter-type="select"
              :options="statusOptions"
              all-label="Todos"
              align="left"
            />
          </template>
          <template #cell-actions="{ row }">
            <div class="flex items-center gap-1">
              <button
                @click.stop="openReconcile(row)"
                class="h-8 px-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                {{ isActionable(row) ? 'Conciliar' : 'Ver' }}
              </button>
              <NuxtLink
                :to="`/finanzas/arqueo/${row.cierreId}`"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors"
                title="Ver cierre"
                aria-label="Ver cierre"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </NuxtLink>
              <NuxtLink
                v-if="row.journalEntryId"
                to="/finanzas/contabilidad/asientos"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors"
                title="Ver asiento"
                aria-label="Ver asiento"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
              </NuxtLink>
            </div>
          </template>
        </UiResponsiveDataView>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="selectedRow" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-overlay-backdrop/50" @click="closeReconcile" />
        <div class="relative w-full max-w-lg rounded-xl bg-surface shadow-xl">
          <div class="border-b border-border px-5 py-4">
            <h2 class="text-base font-bold text-text-primary">Conciliar {{ selectedRow.methodName }}</h2>
            <p class="text-xs text-text-secondary">{{ formatPeriod(selectedRow) }} · {{ groupLabel(selectedRow.groupSlug) }}</p>
          </div>

          <div class="space-y-4 p-5">
            <div class="grid grid-cols-3 gap-2">
              <div class="rounded-lg border border-border bg-background p-3">
                <p class="text-xs text-text-secondary">Entradas</p>
                <p class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(selectedRow.grossInflowsAmount) }}</p>
              </div>
              <div class="rounded-lg border border-border bg-background p-3">
                <p class="text-xs text-text-secondary">Salidas</p>
                <p class="text-sm font-bold" :class="totalOutflows(selectedRow) > 0 ? 'text-destructive' : 'text-text-secondary'">
                  {{ totalOutflows(selectedRow) > 0 ? `− ${formatCurrency(totalOutflows(selectedRow))}` : formatCurrency(0) }}
                </p>
              </div>
              <div class="rounded-lg border border-border bg-background p-3">
                <p class="text-xs text-text-secondary">Esperado neto</p>
                <p class="text-sm font-bold tabular-nums" :class="amountToneClass(selectedRow.expectedAmount)">{{ formatCurrency(selectedRow.expectedAmount) }}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-lg border border-border bg-background p-3">
                <p class="text-xs text-text-secondary">Reportado</p>
                <p class="text-sm font-bold tabular-nums" :class="amountToneClass(Number(reportedAmount || 0))">{{ formatCurrency(Number(reportedAmount || 0)) }}</p>
              </div>
              <div class="rounded-lg border border-border bg-background p-3">
                <p class="text-xs text-text-secondary">Diferencia</p>
                <p class="text-sm font-bold" :class="differenceClass(currentDifference)">{{ currentDifference >= 0 ? '+' : '' }}{{ formatCurrency(currentDifference) }}</p>
              </div>
            </div>

            <label class="block">
              <span class="mb-1 block text-xs font-medium text-text-secondary">Monto reportado</span>
              <input
                v-model="reportedAmount"
                type="number"
                step="1"
                class="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
            </label>

            <label class="block">
              <span class="mb-1 block text-xs font-medium text-text-secondary">Motivo</span>
              <select v-model="reason" class="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary">
                <option v-for="option in reasonOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>

            <label class="block">
              <span class="mb-1 block text-xs font-medium text-text-secondary">Notas</span>
              <textarea
                v-model="notes"
                rows="3"
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Soporte, extracto, explicación o referencia interna."
              />
            </label>

            <label class="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <input v-model="createJournalEntry" type="checkbox" class="h-4 w-4 rounded border-border text-primary focus:ring-primary">
              <span class="text-sm text-text-primary">Crear ajuste PUC como borrador revisable</span>
            </label>

            <p v-if="formError" class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ formError }}</p>
          </div>

          <div class="flex gap-2 border-t border-border px-5 py-4">
            <button
              @click="closeReconcile"
              :disabled="saving"
              class="h-11 flex-1 rounded-lg border border-border text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Volver
            </button>
            <button
              @click="saveReconciliation"
              :disabled="saving"
              class="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {{ saving ? 'Guardando...' : 'Guardar conciliación' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import MetricCard from '~/components/shared/MetricCard.vue'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
useHead({ title: 'Conciliación - Warocol' })

interface ReconciliationRow {
  id: string
  cierreId: string
  periodStart: string
  periodEnd: string
  closedAt: string | null
  groupSlug: string
  methodName: string
  grossInflowsAmount: number
  expenseOutflowsAmount: number
  purchaseOutflowsAmount: number
  expectedAmount: number
  reportedAmount: number | null
  differenceAmount: number | null
  reconciliationStatus: string
  reconciliationReason: string | null
  reconciliationNotes: string | null
  journalEntryId: string | null
}

const route = useRoute()
const cache = useQueryCache()
const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const { formatCalendarDate } = useFormatters()
const { dateRangeDates, presetDates, maxDate, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()

const cierreIdFilter = computed(() => route.query.cierreId as string | undefined)
const statusFilter = ref('pending')
const groupFilter = ref('')

const { data: rawRows, status, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['cierre', 'reconciliations', currentTenant.value?.id, {
    status: statusFilter.value || null,
    group: groupFilter.value || null,
    dateFrom: dateRange.value.from,
    dateTo: dateRange.value.to,
    cierreId: cierreIdFilter.value || null,
  }],
  query: () => $fetch<{ success: boolean; data: ReconciliationRow[]; summary: Record<string, number> }>('/api/cierre/reconciliations', {
    params: {
      status: statusFilter.value || undefined,
      groupSlug: groupFilter.value || undefined,
      dateFrom: dateRange.value.from || undefined,
      dateTo: dateRange.value.to || undefined,
      cierreId: cierreIdFilter.value || undefined,
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const rows = computed(() => rawRows.value?.data ?? [])
const summary = computed(() => ({
  pending: rawRows.value?.summary?.pending ?? 0,
  withDifference: rawRows.value?.summary?.withDifference ?? 0,
  totalExpected: rawRows.value?.summary?.totalExpected ?? 0,
  totalDifference: rawRows.value?.summary?.totalDifference ?? 0,
}))
const isLoading = computed(() => status.value === 'pending' && !rawRows.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && rawRows.value != null)
const hasActiveFilters = computed(() =>
  !!statusFilter.value || !!groupFilter.value || !!dateRangeDates.value || !!cierreIdFilter.value,
)

const columns = [
  { key: 'period', title: 'Fecha', sortable: false },
  { key: 'method', title: 'Método', sortable: false },
  { key: 'groupSlug', title: 'Tipo', sortable: false },
  { key: 'grossInflowsAmount', title: 'Entradas', sortable: false },
  { key: 'outflowsAmount', title: 'Salidas', sortable: false },
  { key: 'expectedAmount', title: 'Esperado', sortable: false },
  { key: 'reportedAmount', title: 'Reportado', sortable: false },
  { key: 'differenceAmount', title: 'Diferencia', sortable: false },
  { key: 'reconciliationStatus', title: 'Estado', sortable: false },
  { key: 'actions', title: 'Acciones', sortable: false },
]

const statusOptions = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'matched', label: 'Sin diferencia' },
  { value: 'needs_review', label: 'Con diferencia' },
  { value: 'resolved', label: 'Resuelto' },
]

const groupHeaderOptions = [
  { value: 'digital', label: 'Digital' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'credit', label: 'Crédito' },
  { value: 'customer_wallet', label: 'Billetera cliente' },
  { value: 'table_session_advance', label: 'Anticipos mesa' },
]

const statusHeaderFilter = computed({
  get: () => statusFilter.value,
  set: (value: string | boolean) => {
    statusFilter.value = typeof value === 'string' ? value : ''
  },
})

const groupHeaderFilter = computed({
  get: () => groupFilter.value,
  set: (value: string | boolean) => {
    groupFilter.value = typeof value === 'string' ? value : ''
  },
})

const reasonOptions = [
  { value: 'timing', label: 'Diferencia temporal' },
  { value: 'commission', label: 'Comisión bancaria' },
  { value: 'missing_sale', label: 'Venta no registrada' },
  { value: 'duplicate', label: 'Pago duplicado' },
  { value: 'client_balance', label: 'Saldo a favor cliente' },
  { value: 'method_misclassified', label: 'Método mal clasificado' },
  { value: 'real_surplus', label: 'Sobrante real' },
  { value: 'real_shortage', label: 'Faltante real' },
  { value: 'other', label: 'Otro' },
]

const groupLabels: Record<string, string> = {
  card: 'Tarjeta',
  credit: 'Crédito',
  customer_wallet: 'Billetera cliente',
  digital: 'Digital',
  table_session_advance: 'Anticipos mesa',
}

const statusLabels: Record<string, string> = {
  matched: 'Sin diferencia',
  needs_review: 'Con diferencia',
  not_required: 'No requerida',
  pending: 'Pendiente',
  resolved: 'Resuelta',
}

const clearFilters = () => {
  statusFilter.value = 'pending'
  groupFilter.value = ''
  clearDateRange()
  if (cierreIdFilter.value) navigateTo('/finanzas/conciliacion')
}

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const formatPeriod = (row: ReconciliationRow) => {
  if (row.periodStart === row.periodEnd) return formatCalendarDate(row.periodStart)
  return `${formatCalendarDate(row.periodStart)} - ${formatCalendarDate(row.periodEnd)}`
}

const groupLabel = (slug: string) => groupLabels[slug] ?? slug

const groupDotClass = (slug: string) => {
  if (slug === 'credit') return 'bg-state-warning-icon'
  if (slug === 'digital' || slug === 'card') return 'bg-state-info-icon'
  return 'bg-primary'
}

const statusLabel = (value: string) => statusLabels[value] ?? value
const statusClass = (value: string) => {
  if (value === 'matched' || value === 'resolved') return 'bg-state-success-bg text-state-success-text border border-state-success-border'
  if (value === 'needs_review') return 'bg-destructive/10 text-destructive border border-destructive/20'
  if (value === 'pending') return 'bg-state-warning-bg text-state-warning-text border border-state-warning-border'
  return 'bg-surface-secondary text-text-secondary border border-border'
}

const differenceClass = (value: number | null | undefined) => {
  if (value == null || value === 0) return 'text-text-secondary'
  return value > 0 ? 'text-state-success-text' : 'text-destructive'
}

const amountToneClass = (value: number | null | undefined) => {
  if ((value ?? 0) < 0) return 'text-destructive'
  if ((value ?? 0) > 0) return 'text-primary'
  return 'text-text-secondary'
}

const totalOutflows = (row: ReconciliationRow) =>
  (row.expenseOutflowsAmount ?? 0) + (row.purchaseOutflowsAmount ?? 0)

const isActionable = (row: ReconciliationRow) =>
  ['pending', 'needs_review'].includes(row.reconciliationStatus)

const selectedRow = ref<ReconciliationRow | null>(null)
const reportedAmount = ref('')
const reason = ref('timing')
const notes = ref('')
const createJournalEntry = ref(false)
const saving = ref(false)
const formError = ref<string | null>(null)

const currentDifference = computed(() => {
  if (!selectedRow.value) return 0
  return Number(reportedAmount.value || 0) - selectedRow.value.expectedAmount
})

const openReconcile = (row: ReconciliationRow) => {
  selectedRow.value = row
  reportedAmount.value = String(row.reportedAmount ?? row.expectedAmount)
  reason.value = row.reconciliationReason ?? 'timing'
  notes.value = row.reconciliationNotes ?? ''
  createJournalEntry.value = false
  formError.value = null
}

const closeReconcile = () => {
  if (saving.value) return
  selectedRow.value = null
}

const saveReconciliation = async () => {
  if (!selectedRow.value) return
  saving.value = true
  formError.value = null
  try {
    const amount = Number(reportedAmount.value || 0)
    await $fetch(`/api/cierre/reconciliations/${selectedRow.value.id}/reported`, {
      method: 'PATCH',
      body: { reportedAmount: amount, notes: notes.value || null },
    })
    await $fetch(`/api/cierre/reconciliations/${selectedRow.value.id}/resolve`, {
      method: 'POST',
      body: {
        reason: reason.value,
        notes: notes.value || null,
        createJournalEntry: createJournalEntry.value,
      },
    })
    await refetch()
    cache.invalidateQueries({ key: ['cierre', 'list'] })
    cache.invalidateQueries({ key: ['cierre', 'detail'] })
    cache.invalidateQueries({ key: ['accounting', 'journal-entries'] })
    selectedRow.value = null
  } catch (err: any) {
    formError.value = err?.data?.detail ?? err?.data?.message ?? err?.message ?? 'No se pudo guardar la conciliación.'
  } finally {
    saving.value = false
  }
}

watch(() => route.query.cierreId, () => { refetch() })

registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })
</script>
