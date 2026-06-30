<template>
  <div class="page-layout">

    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else-if="cierre">
      <!-- ── Header info card ─────────────────────────────────────────────── -->
      <div class="bg-surface border-2 border-border rounded-lg mb-3 sm:mb-5">
        <div class="p-3 sm:p-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            <!-- Período -->
            <div class="flex items-center gap-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Período</p>
                <p class="text-base font-semibold text-text-primary">{{ formatPeriodDates(cierre) }}</p>
                <p v-if="formatPeriodTimes(cierre)" class="text-xs text-text-secondary font-mono mt-0.5">{{ formatPeriodTimes(cierre) }}</p>
                <span
                  class="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                  :class="periodBadgeClass(cierre)"
                >{{ periodTypeLabel(cierre) }}</span>
              </div>
            </div>

            <!-- Registrado -->
            <div class="flex items-center gap-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Registrado</p>
                <p class="text-base font-semibold text-text-primary">{{ formatDate(cierre.closedAt) }}</p>
              </div>
            </div>

            <!-- Diferencia -->
            <div class="flex items-center gap-3">
              <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
                <svg class="w-6 h-6 sm:w-8 sm:h-8" :class="cierre.cashDifference >= 0 ? 'text-state-success-text' : 'text-destructive'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Diferencia caja</p>
                <p class="text-base font-semibold" :class="cierre.cashDifference >= 0 ? 'text-state-success-text' : 'text-destructive'">
                  {{ cierre.cashDifference >= 0 ? '+' : '' }}{{ formatCurrency(cierre.cashDifference) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Detail cards ────────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <!-- Ventas -->
        <div class="bg-surface border-2 border-border rounded-lg">
          <div class="p-3 sm:p-4 border-b border-border">
            <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Ventas</h3>
          </div>
          <div class="divide-y divide-border">
            <div class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Total ventas</span>
              <span class="font-bold text-text-primary">{{ formatCurrency(cierre.totalSales) }}</span>
            </div>
            <div v-if="hasCapturedTips(cierre)" class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Propinas</span>
              <span class="font-medium">{{ formatCurrency(cierre.totalTips) }}</span>
            </div>
            <div v-if="(cierre.totalTipTax ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Impuesto propina</span>
              <span class="font-medium">{{ formatCurrency(cierre.totalTipTax) }}</span>
            </div>
            <div v-if="hasCapturedTips(cierre)" class="flex justify-between px-4 py-2.5 text-sm font-semibold">
              <span class="text-text-primary">Total cobrado</span>
              <span>{{ formatCurrency(cierre.totalCharged) }}</span>
            </div>
            <div class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Órdenes al cerrar</span>
              <span class="font-medium">{{ cierre.itemsSold }}</span>
            </div>
            <div class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Efectivo</span>
              <span class="font-medium">{{ formatCurrency(cierre.totalCash) }}</span>
            </div>
            <div class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Tarjeta</span>
              <span class="font-medium">{{ formatCurrency(cierre.totalCard) }}</span>
            </div>
            <div class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Digital</span>
              <span class="font-medium">{{ formatCurrency(cierre.totalDigital) }}</span>
            </div>
            <div class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Crédito</span>
              <span class="font-medium">{{ formatCurrency(cierre.totalCredit) }}</span>
            </div>
          </div>
        </div>

        <!-- Caja -->
        <div class="bg-surface border-2 border-border rounded-lg">
          <div class="p-3 sm:p-4 border-b border-border">
            <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Caja</h3>
          </div>
          <div class="divide-y divide-border">
            <div v-if="(cierre.openingCash ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Fondo inicial</span>
              <span class="font-medium">+ {{ formatCurrency(cierre.openingCash) }}</span>
            </div>
            <div class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Gastos en efectivo</span>
              <span class="font-medium text-destructive">− {{ formatCurrency(cierre.gastosEfectivo) }}</span>
            </div>
            <div v-if="(cierre.cashPurchases ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Compras directas efectivo</span>
              <span class="font-medium text-destructive">− {{ formatCurrency(cierre.cashPurchases) }}</span>
            </div>
            <div v-if="(cierre.cashTips ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Propinas en efectivo</span>
              <span class="font-medium">+ {{ formatCurrency(cierre.cashTips) }}</span>
            </div>
            <div class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Esperado en caja</span>
              <span class="font-semibold text-text-primary">{{ formatCurrency(cierre.cashExpected) }}</span>
            </div>
            <div class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Efectivo contado</span>
              <span class="font-medium">{{ formatCurrency(cierre.cashCounted) }}</span>
            </div>
            <div class="flex justify-between px-4 py-2.5 text-sm font-semibold">
              <span>Diferencia</span>
              <span :class="cierre.cashDifference >= 0 ? 'text-state-success-text' : 'text-destructive'">
                {{ cierre.cashDifference >= 0 ? '+' : '' }}{{ formatCurrency(cierre.cashDifference) }}
              </span>
            </div>
            <div v-if="(cierre.cashLeftInDrawer ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm">
              <span class="text-text-secondary">Dejó en caja</span>
              <span class="font-medium text-text-primary">{{ formatCurrency(cierre.cashLeftInDrawer) }}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="cierre.notes" class="sm:col-span-2 bg-surface border-2 border-border rounded-lg p-4">
          <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Notas</p>
          <p class="text-sm text-text-primary">{{ cierre.notes }}</p>
        </div>

        <!-- Movimiento neto por método (solo cierres nuevos con breakdown) -->
        <div v-if="cierre.breakdown?.length > 0" class="sm:col-span-2 bg-surface border-2 border-border rounded-lg">
          <div class="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Movimiento neto por método</h3>
            <NuxtLink
              v-if="hasReconcilableBreakdown"
              :to="`/finanzas/conciliacion?cierreId=${cierre.id}`"
              class="min-h-[36px] px-3 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center"
            >
              Conciliar
            </NuxtLink>
          </div>
          <div v-for="group in breakdownByGroup" :key="group.slug" class="border-b border-border last:border-b-0">
            <div class="px-4 py-2 bg-background">
              <span class="text-xs font-semibold text-text-secondary uppercase tracking-wide">{{ group.label }}</span>
            </div>
            <div v-for="method in group.methods" :key="method.key" class="grid grid-cols-[1fr_auto] gap-3 px-4 py-2 text-sm sm:grid-cols-[1fr_auto_auto_auto_auto]">
              <span class="text-text-secondary pl-2">{{ method.label }}</span>
              <span class="font-medium text-primary tabular-nums">Entr. {{ formatCurrency(method.grossInflowsAmount) }}</span>
              <span v-if="method.totalOutflows > 0" class="font-medium text-destructive tabular-nums">Sal. − {{ formatCurrency(method.totalOutflows) }}</span>
              <span class="font-semibold tabular-nums" :class="amountToneClass(method.expectedAmount)">Neto {{ formatCurrency(method.expectedAmount) }}</span>
              <span v-if="method.reportedAmount != null" class="text-text-secondary tabular-nums">Rep. {{ formatCurrency(method.reportedAmount) }}</span>
              <span
                v-if="method.differenceAmount != null"
                class="font-semibold"
                :class="method.differenceAmount >= 0 ? 'text-state-success-text' : 'text-destructive'"
              >
                {{ method.differenceAmount >= 0 ? '+' : '' }}{{ formatCurrency(method.differenceAmount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Back -->
        <div class="sm:col-span-2">
          <NuxtLink
            to="/finanzas/arqueo"
            class="inline-flex min-h-[44px] px-5 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors items-center"
          >
            ← Volver al historial
          </NuxtLink>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'

const GROUP_LABELS: Record<string, string> = {
  cash:    'Efectivo',
  card:    'Tarjeta',
  digital: 'Digital',
  credit:  'Crédito',
  customer_wallet: 'Billetera cliente',
  table_session_advance: 'Anticipos mesa',
}

definePageMeta({ layout: 'dashboard', module: 'finanzas' })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const route = useRoute()
const cierreId = route.params.id as string

const { data: rawCierre, status, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['cierre', 'detail', currentTenant.value?.id, cierreId],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>(`/api/cierre/${cierreId}`),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})

const cierre       = computed(() => rawCierre.value?.data ?? null)

interface RawBreakdownRow {
  group_slug?: string
  groupSlug?: string
  method_name?: string
  methodName?: string
  total?: number | string
  grossInflowsAmount?: number | string | null
  gross_inflows_amount?: number | string | null
  expenseOutflowsAmount?: number | string | null
  expense_outflows_amount?: number | string | null
  purchaseOutflowsAmount?: number | string | null
  purchase_outflows_amount?: number | string | null
  expectedAmount?: number | string | null
  expected_amount?: number | string | null
  reportedAmount?: number | string | null
  reported_amount?: number | string | null
  differenceAmount?: number | string | null
  difference_amount?: number | string | null
  reconciliationStatus?: string | null
  reconciliation_status?: string | null
}

interface BreakdownMethod {
  key: string
  label: string
  total: number
  grossInflowsAmount: number
  expenseOutflowsAmount: number
  purchaseOutflowsAmount: number
  totalOutflows: number
  expectedAmount: number
  reportedAmount: number | null
  differenceAmount: number | null
  reconciliationStatus: string | null
}

interface BreakdownGroup {
  slug: string
  label: string
  methods: BreakdownMethod[]
}

const formatMethodLabel = (groupSlug: string, methodName: string) => {
  if (!methodName || methodName === groupSlug) return GROUP_LABELS[groupSlug] ?? methodName
  return methodName
}

const breakdownByGroup = computed<BreakdownGroup[]>(() => {
  const rows: RawBreakdownRow[] = cierre.value?.breakdown ?? []
  const map = new Map<string, BreakdownGroup>()
  for (const row of rows) {
    const groupSlug = row.group_slug ?? row.groupSlug ?? ''
    const methodName = row.method_name ?? row.methodName ?? ''
    if (!groupSlug) continue
    if (!map.has(groupSlug)) {
      map.set(groupSlug, {
        slug:    groupSlug,
        label:   GROUP_LABELS[groupSlug] ?? groupSlug,
        methods: [],
      })
    }
    const grossInflowsAmount = row.grossInflowsAmount != null || row.gross_inflows_amount != null
      ? Number(row.grossInflowsAmount ?? row.gross_inflows_amount)
      : Number(row.total ?? 0)
    const expenseOutflowsAmount = row.expenseOutflowsAmount != null || row.expense_outflows_amount != null
      ? Number(row.expenseOutflowsAmount ?? row.expense_outflows_amount)
      : 0
    const purchaseOutflowsAmount = row.purchaseOutflowsAmount != null || row.purchase_outflows_amount != null
      ? Number(row.purchaseOutflowsAmount ?? row.purchase_outflows_amount)
      : 0
    const expectedAmount = row.expectedAmount != null || row.expected_amount != null
      ? Number(row.expectedAmount ?? row.expected_amount)
      : Number(row.total ?? 0)
    map.get(groupSlug)!.methods.push({
      key: `${groupSlug}__${methodName || 'group'}`,
      label: formatMethodLabel(groupSlug, methodName),
      total: Number(row.total ?? 0),
      grossInflowsAmount,
      expenseOutflowsAmount,
      purchaseOutflowsAmount,
      totalOutflows: expenseOutflowsAmount + purchaseOutflowsAmount,
      expectedAmount,
      reportedAmount: row.reportedAmount != null || row.reported_amount != null
        ? Number(row.reportedAmount ?? row.reported_amount)
        : null,
      differenceAmount: row.differenceAmount != null || row.difference_amount != null
        ? Number(row.differenceAmount ?? row.difference_amount)
        : null,
      reconciliationStatus: row.reconciliationStatus ?? row.reconciliation_status ?? null,
    })
  }
  return Array.from(map.values())
})

const hasReconcilableBreakdown = computed(() =>
  breakdownByGroup.value.some(group => !['cash', 'untracked'].includes(group.slug)),
)
const amountToneClass = (value: number | null | undefined) => {
  if ((value ?? 0) < 0) return 'text-destructive'
  if ((value ?? 0) > 0) return 'text-primary'
  return 'text-text-secondary'
}
const isLoading    = computed(() => status.value === 'pending' && !cierre.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && cierre.value != null)

registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })

useHead(() => ({
  title: cierre.value ? `Arqueo ${formatPeriodDates(cierre.value)} - Warocol` : 'Arqueo de caja - Warocol',
}))

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const hasCapturedTips = (data?: Record<string, any> | null) =>
  Number(data?.totalTips ?? 0) > 0 || Number(data?.totalTipTax ?? 0) > 0

const { formatDateTime: _fmtDateTime } = useFormatters()
const { formatPeriodDates, formatPeriodTimes, periodTypeLabel, periodBadgeClass } = useCierrePeriod()

const formatDate = (iso: string) => {
  if (!iso) return ''
  return _fmtDateTime(iso)
}
</script>
