<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MetricCard from '~/components/shared/MetricCard.vue'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
useHead({ title: () => t('finanzas.contabilidad.accountsTitle') })

const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const { addDaysISO, dateAtNoon, isoFromDate, monthBounds, timezone, todayISO } = useTenantTimezone()
const { formatCalendarDate, formatCurrency } = useFormatters()
const formatCOP = (v: number) => formatCurrency(v ?? 0)

// ── View toggle ────────────────────────────────────────────────────────────
const showAll = ref(false)

// ── Date range filter (default: current month) ─────────────────────────────
const today = todayISO()
const currentMonth = monthBounds(today)
const maxDate = computed(() => dateAtNoon(todayISO()))
const dateRangeDates = ref<Date[] | null>([dateAtNoon(currentMonth.first), dateAtNoon(today)])

const presetDates = [
  { label: t('finanzas.common.today'), value: [dateAtNoon(today), dateAtNoon(today)] },
  { label: t('finanzas.contabilidad.thisWeek'), value: [dateAtNoon(addDaysISO(today, -7)), dateAtNoon(today)] },
  { label: t('finanzas.contabilidad.thisMonth'), value: [dateAtNoon(currentMonth.first), dateAtNoon(today)] },
  { label: t('finanzas.contabilidad.lastMonth'), value: [dateAtNoon(addDaysISO(today, -30)), dateAtNoon(today)] },
  { label: t('finanzas.contabilidad.last90Days'), value: [dateAtNoon(addDaysISO(today, -90)), dateAtNoon(today)] },
]

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = formatCalendarDate(isoFromDate(dates[0]))
  if (!dates[1]) return from
  return `${from} - ${formatCalendarDate(isoFromDate(dates[1]))}`
}

const dateRange = computed(() => {
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null, to: null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return {
    from: isoFromDate(from),
    to:   isoFromDate(to),
  }
})

// ── Trial balance (period summary) ─────────────────────────────────────────
interface TrialBalanceRow {
  accountId: string; openingBalance: number
  periodDebits: number; periodCredits: number; closingBalance: number
}
interface TrialBalanceResp {
  success: boolean; totalDebits: number; totalCredits: number
  isBalanced: boolean; rows: TrialBalanceRow[]
}

const { data: trialData, refetch: refetchTrial } = useQuery({
  key: () => ['accounting', 'trial-balance', currentTenant.value?.id, dateRange.value.from, dateRange.value.to],
  query: () => $fetch<TrialBalanceResp>('/api/accounting/trial-balance', {
    params: {
      periodStart: dateRange.value.from,
      periodEnd:   dateRange.value.to,
      includeZeroBalances: false,
    },
  }),
  enabled: () => !!currentTenant.value && !!dateRange.value.from && !!dateRange.value.to,
  staleTime: 30_000,
})

const periodSummary = computed(() => {
  const rows = trialData.value?.rows ?? []
  return {
    openingBalance:  rows.reduce((s, r) => s + (r.openingBalance ?? 0), 0),
    periodDebits:    trialData.value?.totalDebits ?? 0,
    periodCredits:   trialData.value?.totalCredits ?? 0,
    closingBalance:  rows.reduce((s, r) => s + (r.closingBalance ?? 0), 0),
  }
})

// ── Filters ────────────────────────────────────────────────────────────────
const classFilter  = ref<string | null>(null)
const activeFilter = ref<string | null>(null)
const levelFilter  = ref<string | null>(null)  // 'cuenta' | 'subcuenta' | null

const CLASS_ORDER = ['1', '2', '3', '4', '5', '6']

const CLASS_SHORT: Record<string, string> = {
  '1': t('finanzas.contabilidad.classes.assets'),
  '2': t('finanzas.contabilidad.classes.liabilities'),
  '3': t('finanzas.contabilidad.classes.equity'),
  '4': t('finanzas.contabilidad.classes.income'),
  '5': t('finanzas.contabilidad.classes.expenses'),
  '6': t('finanzas.contabilidad.classes.costs'),
}
const CLASS_VARIANTS: Record<string, string> = {
  '1': 'primary', '2': 'warning', '3': 'secondary',
  '4': 'success',  '5': 'destructive', '6': 'warning',
}
const CLASS_BG: Record<string, string> = {
  '1': 'bg-primary/10',  '2': 'bg-state-warning-bg',  '3': 'bg-status-chip-bg',
  '4': 'bg-state-success-bg',   '5': 'bg-state-danger-bg',    '6': 'bg-state-warning-bg',
}
const CLASS_TEXT: Record<string, string> = {
  '1': 'text-primary',   '2': 'text-state-warning-text', '3': 'text-status-chip-text',
  '4': 'text-state-success-text', '5': 'text-state-danger-text',   '6': 'text-state-warning-text',
}

const pucLevel = (code: string): { label: string; variant: string } => {
  const len = code.length
  if (len === 1) return { label: t('finanzas.contabilidad.class'), variant: 'primary' }
  if (len === 2) return { label: t('finanzas.contabilidad.group'), variant: 'secondary' }
  if (len === 4) return { label: t('finanzas.contabilidad.account'), variant: 'warning' }
  return { label: t('finanzas.contabilidad.subaccount'), variant: 'success' }
}

// ── Data ───────────────────────────────────────────────────────────────────
interface TenantAccount {
  id: string; code: string; name: string; accountClass: string
  accountType: string; normalBalance: string; level: number
  parentId: string | null; isDetail: boolean; isActive: boolean
  isSystem: boolean; tenantId: string; templateId: string | null; createdAt: string
}

const { data: accountsData, asyncStatus: accountsAsyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['accounting', 'accounts', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: TenantAccount[] }>('/api/accounting/accounts'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading    = computed(() => accountsData.value == null && !fetchError.value)
const isRefreshing = computed(() => accountsAsyncStatus.value === 'loading' && accountsData.value != null)
const allAccounts  = computed<TenantAccount[]>(() => accountsData.value?.data ?? [])

// ── Filtered + grouped ─────────────────────────────────────────────────────
const displayAccounts = computed<TenantAccount[]>(() => {
  let list = showAll.value
    ? allAccounts.value
    : allAccounts.value.filter(a => a.isDetail)

  if (activeFilter.value !== null)
    list = list.filter(a => a.isActive === (activeFilter.value === 'true'))

  if (levelFilter.value === 'cuenta')
    list = list.filter(a => a.code.length === 4)
  else if (levelFilter.value === 'subcuenta')
    list = list.filter(a => a.code.length > 4)

  return list
})

const groupedAccounts = computed(() => {
  const classes = classFilter.value ? [classFilter.value] : CLASS_ORDER
  return classes
    .map(cls => ({
      cls,
      label: `${cls} · ${CLASS_SHORT[cls] || cls}`,
      items: displayAccounts.value.filter(a => a.accountClass === cls),
    }))
    .filter(g => g.items.length > 0)
})

const totalDetail = computed(() => allAccounts.value.filter(a => a.isDetail).length)

// ── Trial balance lookup by accountId ──────────────────────────────────────
const trialByAccountId = computed<Record<string, TrialBalanceRow>>(() => {
  const map: Record<string, TrialBalanceRow> = {}
  for (const row of trialData.value?.rows ?? []) map[row.accountId] = row
  return map
})

const accountTrial = (id: string) =>
  trialByAccountId.value[id] ?? { openingBalance: 0, periodDebits: 0, periodCredits: 0, closingBalance: 0 }

// ── Table columns ──────────────────────────────────────────────────────────
const tableColumns = computed(() => [
  { key: 'code',           title: t('finanzas.contabilidad.code'),     sortable: false },
  { key: 'name',           title: t('finanzas.contabilidad.name'),     sortable: false },
  { key: 'isSystem',       title: '',           sortable: false },
  { key: 'level',          title: t('finanzas.contabilidad.level'),      sortable: false },
  { key: 'openingBalance', title: t('finanzas.contabilidad.openingBalanceShort'), sortable: false },
  { key: 'periodDebits',   title: t('finanzas.contabilidad.debits'),    sortable: false },
  { key: 'periodCredits',  title: t('finanzas.contabilidad.credits'),   sortable: false },
  { key: 'closingBalance', title: t('finanzas.contabilidad.balance'),      sortable: false },
  { key: 'isActive',       title: t('finanzas.common.status'),     sortable: false },
  { key: 'actions',        title: t('finanzas.common.actions'),   sortable: false },
])

// ── Navigation ─────────────────────────────────────────────────────────────
const openAccount = (account: TenantAccount) => {
  if (!account.isDetail) return
  navigateTo(`/finanzas/contabilidad/cuentas/${account.id}`)
}

// ── Toggle active ──────────────────────────────────────────────────────────
const togglingId = ref<string | null>(null)

const toggleActive = async (account: TenantAccount) => {
  if (togglingId.value) return
  togglingId.value = account.id
  try {
    await $fetch(`/api/accounting/accounts/${account.id}`, {
      method: 'PUT',
      body: { isActive: !account.isActive },
    })
    await refetch()
  } catch (err: any) {
    alert(err?.data?.detail || t('finanzas.contabilidad.updateError'))
  } finally {
    togglingId.value = null
  }
}

const hasActiveFilters = computed(() => classFilter.value !== null || activeFilter.value !== null || levelFilter.value !== null)
const clearFilters = () => { classFilter.value = null; activeFilter.value = null; levelFilter.value = null }

// ── Layout integration ─────────────────────────────────────────────────────
const refetchAll = () => { refetch(); refetchTrial() }
registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetchAll) })
onUnmounted(() => { clearRefreshHandler(refetchAll) })
</script>

<template>
  <div class="page-layout">

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- ── Period summary strip ───────────────────────────────────────── -->
      <div class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <MetricCard :title="t('finanzas.contabilidad.openingBalance')" :value="periodSummary.openingBalance" format="currency" variant="primary" />
        <MetricCard :title="t('finanzas.contabilidad.debitsPeriod')" :value="periodSummary.periodDebits" format="currency" variant="primary" />
        <MetricCard :title="t('finanzas.contabilidad.creditsPeriod')" :value="periodSummary.periodCredits" format="currency" variant="primary" />
        <MetricCard
          :title="t('finanzas.contabilidad.closingBalance')"
          :value="periodSummary.closingBalance"
          format="currency"
          :variant="periodSummary.closingBalance >= 0 ? 'primary' : 'destructive'"
        />
      </div>

      <!-- ── Filter bar ──────────────────────────────────────────────────── -->
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">

        <!-- Date range picker -->
        <VueDatePicker
          v-model="dateRangeDates"
          range
          :preset-dates="presetDates"
          :enable-time-picker="false"
          :locale="locale"
          :placeholder="t('finanzas.common.dateRange')"
          auto-apply
          :teleport="true"
          :timezone="timezone"
          :max-date="maxDate"
          :format="formatDateRange"
          input-class-name="dp-custom-input"
          menu-class-name="dp-custom-menu"
          calendar-cell-class-name="dp-custom-cell"
        />

        <!-- Clase filter -->
        <select
          v-model="classFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          :aria-label="t('finanzas.contabilidad.filterClass')"
        >
          <option :value="null">{{ t('finanzas.contabilidad.allClasses') }}</option>
          <option v-for="cls in CLASS_ORDER" :key="cls" :value="cls">{{ cls }} · {{ CLASS_SHORT[cls] }}</option>
        </select>

        <!-- Estado filter -->
        <select
          v-model="activeFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          :aria-label="t('finanzas.contabilidad.filterStatus')"
        >
          <option :value="null">{{ t('finanzas.common.allF') }}</option>
          <option value="true">{{ t('finanzas.contabilidad.active') }}</option>
          <option value="false">{{ t('finanzas.contabilidad.inactive') }}</option>
        </select>

        <!-- Nivel filter -->
        <select
          v-model="levelFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          :aria-label="t('finanzas.contabilidad.filterLevel')"
        >
          <option :value="null">{{ t('finanzas.contabilidad.level') }}</option>
          <option value="cuenta">{{ t('finanzas.contabilidad.account4') }}</option>
          <option value="subcuenta">{{ t('finanzas.contabilidad.subaccount6') }}</option>
        </select>

        <!-- Clear filters -->
        <button
          v-if="hasActiveFilters"
          type="button"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
          :aria-label="t('finanzas.common.clearFilters')"
          @click="clearFilters"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex-1" />

        <!-- Toggle: detail only vs full PUC -->
        <button
          type="button"
          class="flex items-center gap-1.5 h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors flex-shrink-0"
          :class="showAll
            ? 'border-primary text-primary bg-primary/5'
            : 'border-border text-text-secondary hover:border-primary hover:text-primary'"
          @click="showAll = !showAll"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h4" />
          </svg>
          {{ showAll ? t('finanzas.contabilidad.fullPuc') : t('finanzas.contabilidad.detailOnlyCount', { count: totalDetail }) }}
        </button>
      </div>

      <!-- ── Grouped sections ────────────────────────────────────────────── -->
      <div class="flex flex-col gap-4">
        <div
          v-for="group in groupedAccounts"
          :key="group.cls"
          class="flex flex-col gap-2"
        >
          <div class="flex items-center justify-between gap-3 px-1">
            <p class="text-sm font-semibold text-text-primary">{{ group.label }}</p>
            <span class="text-xs font-medium text-text-secondary">
              {{ t('finanzas.contabilidad.accountCount', { count: group.items.length }) }}
            </span>
          </div>
          <div class="[&_td]:!py-1 [&_th]:!py-1.5">
            <UiResponsiveDataView
              row-size="sm"
              :columns="tableColumns"
              :data="group.items"
              :empty-message="t('finanzas.contabilidad.emptyClass')"
              variant="default"
              @row-click="openAccount"
            >
                <!-- Mobile card -->
                <template #card="{ item, index }">
                  <div
                    class="flex items-center gap-3 py-2 px-3 border-b border-border transition-colors"
                    :class="[
                      index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30',
                      item.isDetail ? 'cursor-pointer hover:bg-surface-secondary' : 'cursor-default opacity-60',
                    ]"
                    @click="openAccount(item)"
                  >
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-mono text-text-secondary flex-shrink-0">{{ item.code }}</span>
                        <span class="text-sm font-medium text-text-primary truncate">{{ item.name }}</span>
                      </div>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <UiStatusBadge v-if="showAll" :value="pucLevel(item.code).label" format="text" :variant="pucLevel(item.code).variant" size="sm" />
                        <span v-if="item.isDetail" class="text-xs font-mono tabular-nums"
                          :class="accountTrial(item.id).periodDebits ? 'text-primary' : 'text-text-secondary'">
                          {{ t('finanzas.contabilidad.debitShort') }}: {{ formatCOP(accountTrial(item.id).periodDebits) }}
                        </span>
                        <span v-if="item.isDetail" class="text-xs font-mono tabular-nums text-text-secondary">
                          {{ t('finanzas.contabilidad.creditShort') }}: {{ formatCOP(accountTrial(item.id).periodCredits) }}
                        </span>

                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span v-if="item.isDetail" class="text-sm font-semibold font-mono tabular-nums"
                        :class="accountTrial(item.id).closingBalance >= 0 ? 'text-text-primary' : 'text-destructive'">
                        {{ formatCOP(accountTrial(item.id).closingBalance) }}
                      </span>
                      <UiStatusBadge :value="item.isActive ? t('finanzas.contabilidad.activeOne') : t('finanzas.contabilidad.inactiveOne')" format="text" :variant="item.isActive ? 'success' : 'secondary'" size="sm" />
                      <button
                        v-if="item.isDetail"
                        type="button"
                        class="flex items-center justify-center w-7 h-7 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        :disabled="togglingId === item.id"
                        :aria-label="item.isActive ? t('finanzas.contabilidad.deactivateCode', { code: item.code }) : t('finanzas.contabilidad.activateCode', { code: item.code })"
                        @click.stop="toggleActive(item)"
                      >
                        <svg v-if="togglingId === item.id" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <svg v-else-if="item.isActive" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </template>

                <!-- code -->
                <template #cell-code="{ row }">
                  <span class="text-xs font-mono text-text-secondary tabular-nums">{{ row.code }}</span>
                </template>

                <!-- name -->
                <template #cell-name="{ row }">
                  <span
                    class="text-sm text-text-primary"
                    :class="row.isDetail ? 'font-medium' : 'font-normal text-text-secondary italic'"
                  >
                    {{ row.name }}
                  </span>
                </template>

                <!-- isSystem lock icon -->
                <template #cell-isSystem="{ value }">
                  <div class="flex justify-center">
                    <svg v-if="value" class="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" :aria-label="t('finanzas.contabilidad.systemAccount')">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </template>

                <!-- level (showAll mode only) -->
                <template #cell-level="{ row }">
                  <UiStatusBadge :value="pucLevel(row.code).label" format="text" :variant="pucLevel(row.code).variant" size="sm" />
                </template>

                <!-- period columns (only for detail accounts) -->
                <template #cell-openingBalance="{ row }">
                  <span v-if="row.isDetail" class="text-xs font-mono tabular-nums text-text-secondary">
                    {{ formatCOP(accountTrial(row.id).openingBalance) }}
                  </span>
                  <span v-else class="text-xs text-text-secondary">—</span>
                </template>

                <template #cell-periodDebits="{ row }">
                  <span class="text-xs font-mono tabular-nums" :class="accountTrial(row.id).periodDebits ? 'text-primary' : 'text-text-secondary'">
                    {{ formatCOP(accountTrial(row.id).periodDebits) }}
                  </span>
                </template>

                <template #cell-periodCredits="{ row }">
                  <span class="text-xs font-mono tabular-nums text-text-secondary">
                    {{ formatCOP(accountTrial(row.id).periodCredits) }}
                  </span>
                </template>

                <template #cell-closingBalance="{ row }">
                  <span v-if="row.isDetail" class="text-xs font-mono font-semibold tabular-nums"
                    :class="accountTrial(row.id).closingBalance >= 0 ? 'text-text-primary' : 'text-destructive'">
                    {{ formatCOP(accountTrial(row.id).closingBalance) }}
                  </span>
                  <span v-else class="text-xs text-text-secondary">—</span>
                </template>

                <!-- isActive -->
                <template #cell-isActive="{ row }">
                  <UiStatusBadge
                    :value="row.isActive ? t('finanzas.contabilidad.activeOne') : t('finanzas.contabilidad.inactiveOne')"
                    format="text"
                    :variant="row.isActive ? 'success' : 'secondary'"
                    size="sm"
                  />
                </template>

                <!-- actions -->
                <template #cell-actions="{ row }">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      v-if="row.isDetail"
                      type="button"
                      class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      :disabled="togglingId === row.id"
                      :aria-label="row.isActive ? t('finanzas.contabilidad.deactivateCode', { code: row.code }) : t('finanzas.contabilidad.activateCode', { code: row.code })"
                      :title="row.isActive ? t('finanzas.contabilidad.deactivate') : t('finanzas.contabilidad.activate')"
                      @click.stop="toggleActive(row)"
                    >
                      <svg v-if="togglingId === row.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <svg v-else-if="row.isActive" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                      <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>

                    <button
                      v-if="row.isDetail"
                      type="button"
                      class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors"
                      :aria-label="t('finanzas.contabilidad.viewLedger')"
                      :title="t('finanzas.contabilidad.viewLedger')"
                      @click.stop="openAccount(row)"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </template>

            </UiResponsiveDataView>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="groupedAccounts.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <p class="text-sm text-text-secondary">{{ t('finanzas.contabilidad.emptyFilter') }}</p>
        </div>
      </div>

    </div>
  </div>
</template>
