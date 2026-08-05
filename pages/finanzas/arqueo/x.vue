<template>
  <div class="page-layout">

    <!-- Header info card -->
    <div class="bg-surface border-2 border-border rounded-lg mb-3 sm:mb-4">
      <div class="p-3 sm:p-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          <!-- Period -->
          <div class="flex items-center gap-3">
            <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">{{ t('finanzas.common.period') }}</p>
              <p class="text-base font-semibold text-text-primary">{{ formatPeriod(periodStart, periodEnd) }}</p>
            </div>
          </div>

          <!-- Period picker (editable) -->
          <div class="sm:col-span-2 flex flex-wrap items-center gap-2">
            <VueDatePicker
              v-model="dateRangeDates"
              range
              :preset-dates="presetDates"
              :enable-time-picker="false"
              :locale="locale"
              :placeholder="t('finanzas.common.dateRange')"
              auto-apply
              :timezone="timezone"
              :max-date="maxDate"
              :format="formatDateRange"
              input-class-name="dp-custom-input"
              menu-class-name="dp-custom-menu"
              calendar-cell-class-name="dp-custom-cell"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="previewLoading" class="flex justify-center py-16">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="previewError" class="text-center py-16 text-text-secondary text-sm">
      {{ t('finanzas.arqueo.loadSummaryError') }}
    </div>

    <!-- Preview cards -->
    <div v-else-if="previewData" class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <!-- Ventas -->
      <div class="bg-surface border-2 border-border rounded-lg">
        <div class="p-3 sm:p-4 border-b border-border">
          <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">{{ t('finanzas.arqueo.periodSales') }}</h3>
        </div>
        <div class="divide-y divide-border">
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">{{ t('finanzas.arqueo.totalSales') }}</span>
            <span class="font-bold text-text-primary">{{ formatCurrency(previewData.totalSales) }}</span>
          </div>
          <div v-if="hasCapturedTips(previewData)" class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">{{ t('finanzas.common.tips') }}</span>
            <span class="font-medium">{{ formatCurrency(previewData.totalTips) }}</span>
          </div>
          <div v-if="(previewData.totalTipTax ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">{{ t('finanzas.arqueo.tipTax') }}</span>
            <span class="font-medium">{{ formatCurrency(previewData.totalTipTax) }}</span>
          </div>
          <div v-if="hasCapturedTips(previewData)" class="flex justify-between px-4 py-2.5 text-sm font-semibold">
            <span class="text-text-primary">{{ t('finanzas.arqueo.totalCharged') }}</span>
            <span>{{ formatCurrency(previewData.totalCharged) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">{{ t('finanzas.arqueo.orders') }}</span>
            <span class="font-medium">{{ previewData.itemsSold }}</span>
          </div>
        </div>
      </div>

      <!-- Caja -->
      <div class="bg-surface border-2 border-border rounded-lg">
        <div class="p-3 sm:p-4 border-b border-border">
          <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">{{ t('finanzas.arqueo.drawerState') }}</h3>
        </div>
        <div class="divide-y divide-border">
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">{{ t('finanzas.arqueo.cashReceived') }}</span>
            <span class="font-medium">{{ formatCurrency(previewData.totalCash) }}</span>
          </div>
          <div v-if="(previewData.cashTips ?? 0) > 0" class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">{{ t('finanzas.arqueo.cashTips') }}</span>
            <span class="font-medium">+ {{ formatCurrency(previewData.cashTips) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">{{ t('finanzas.arqueo.cashExpensesLong') }}</span>
            <span class="font-medium text-destructive">− {{ formatCurrency(previewData.gastosEfectivo) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm font-semibold">
            <span class="text-text-primary">{{ t('finanzas.arqueo.expectedInDrawer') }}</span>
            <span :class="Number(previewData.cashExpected ?? 0) < 0 ? 'text-destructive' : 'text-text-primary'">{{ formatCurrencySigned(previewData.cashExpected) }}</span>
          </div>
          <div v-if="Number(previewData.cashExpected ?? 0) < 0" class="px-4 py-2.5 text-xs text-destructive border-t border-border">
            <p class="font-semibold">{{ t('finanzas.arqueo.expectedNegative') }}</p>
            <p class="mt-0.5">{{ t('finanzas.arqueo.expectedNegativeHelp') }}</p>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">{{ t('finanzas.arqueo.openTables', {
              count: previewData.openTablesCount,
              table: tablePlural,
              state: t('finanzas.arqueo.tableOpenPlural'),
            }) }}</span>
            <span
              class="font-medium"
              :class="previewData.openTablesCount > 0 ? 'text-state-warning-text font-semibold' : 'text-text-primary'"
            >
              {{ previewData.openTablesCount }}
            </span>
          </div>
        </div>
      </div>

      <!-- Métodos de pago -->
      <div class="sm:col-span-2 bg-surface border-2 border-border rounded-lg">
        <div class="p-3 sm:p-4 border-b border-border">
          <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">{{ t('finanzas.arqueo.paymentMethods') }}</h3>
        </div>
        <div v-if="groupedMethods?.length" class="divide-y divide-border">
          <div
            v-for="grp in groupedMethods"
            :key="grp.slug"
          >
            <!-- Group header -->
            <div class="flex items-center justify-between px-4 py-2.5 bg-background">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="GROUP_COLORS[grp.slug]?.dot ?? 'bg-primary'" />
                <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">{{ grp.label }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="text-xs font-semibold px-1.5 py-0.5 rounded"
                  :class="GROUP_COLORS[grp.slug]?.badge ?? 'bg-primary/10 text-primary'"
                >
                  {{ groupTotalPct(grp).toFixed(0) }}%
                </span>
                <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(grp.groupTotal) }}</span>
              </div>
            </div>
            <!-- Methods -->
            <div class="divide-y divide-border">
              <div
                v-for="(m, mi) in grp.methods"
                :key="m.key"
                class="flex items-center justify-between ps-8 pe-4 py-2.5"
                :class="mi % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
              >
                <span class="text-sm text-text-primary">{{ m.label }}</span>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-text-secondary">{{ methodPct(m).toFixed(0) }}%</span>
                  <span class="text-sm font-medium text-text-primary w-28 text-end">{{ formatCurrency(m.total) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="px-4 py-4 text-sm text-text-secondary">{{ t('finanzas.arqueo.noPaymentMethods') }}</div>
      </div>

      <!-- CTA -->
      <div class="sm:col-span-2 flex flex-wrap gap-3">
        <button
          @click="navigateTo({ path: '/finanzas/arqueo/z', query: {
            mode: 'custom',
            start: periodStart,
            end:   periodEnd,
            ...(periodStartTime && { startTime: periodStartTime }),
            ...(periodEndTime   && { endTime:   periodEndTime   }),
          } })"
          class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {{ t('finanzas.arqueo.registerPeriod') }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
const { t, locale } = useI18n({ useScope: 'global' })
useHead({ title: () => t('finanzas.head.x') })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const { plural: tablePlural } = useTableLabel()
const route = useRoute()
const { addDaysISO, dateAtNoon, isoFromDate, timezone, todayISO } = useTenantTimezone()
const { formatCalendarDate, formatCurrency: formatMoneyValue, formatCurrencySigned } = useFormatters()

const today = todayISO()
const maxDate = computed(() => dateAtNoon(todayISO()))

// Initialise from query params if present
const initStart     = (route.query.start     as string) || today
const initEnd       = (route.query.end       as string) || today
const initStartTime = (route.query.startTime as string) || null
const initEndTime   = (route.query.endTime   as string) || null
const dateRangeDates = ref<Date[] | null>([
  dateAtNoon(initStart),
  dateAtNoon(initEnd),
])
const periodStartTime = ref<string | null>(initStartTime)
const periodEndTime   = ref<string | null>(initEndTime)

const todayNoon = dateAtNoon(today)
const presetDates = computed(() => [
  { label: t('finanzas.common.today'),           value: [todayNoon, todayNoon] },
  { label: t('finanzas.common.yesterday'),          value: (() => { const d = dateAtNoon(addDaysISO(today, -1)); return [d, d] })() },
  { label: t('finanzas.arqueo.lastWeek'), value: [dateAtNoon(addDaysISO(today, -7)), todayNoon] },
  { label: t('finanzas.arqueo.lastMonth'),    value: [dateAtNoon(addDaysISO(today, -30)), todayNoon] },
])

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = formatCalendarDate(isoFromDate(dates[0]))
  if (!dates[1]) return from
  return `${from} - ${formatCalendarDate(isoFromDate(dates[1]))}`
}

const periodStart = computed(() =>
  dateRangeDates.value?.[0] ? isoFromDate(dateRangeDates.value[0]) : today
)
const periodEnd = computed(() =>
  dateRangeDates.value?.[1] ? isoFromDate(dateRangeDates.value[1]) : today
)

const { data: rawPreview, status: previewStatus, asyncStatus: previewAsyncStatus, error: previewErr, refetch } = useQuery({
  key: () => ['cierre', 'preview', currentTenant.value?.id, periodStart.value, periodEnd.value, periodStartTime.value, periodEndTime.value],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/preview', {
    params: {
      period_start: periodStart.value,
      period_end:   periodEnd.value,
      ...(periodStartTime.value && { period_start_time: periodStartTime.value }),
      ...(periodEndTime.value   && { period_end_time:   periodEndTime.value   }),
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const previewData    = computed(() => rawPreview.value?.data ?? null)
const previewLoading = computed(() => previewStatus.value === 'pending' && !previewData.value)
const previewError   = computed(() => previewErr.value)
const isRefreshing   = computed(() => previewAsyncStatus.value === 'loading' && previewData.value != null)

const groupLabel = (slug: string) => {
  const labels: Record<string, string> = {
    cash: t('finanzas.common.cash'),
    card: t('finanzas.common.card'),
    digital: t('finanzas.common.digital'),
    credit: t('finanzas.common.credit'),
    untracked: t('finanzas.arqueo.untrackedPaymentGroup'),
  }
  return labels[slug] ?? slug
}

const GROUP_COLORS: Record<string, { dot: string; badge: string }> = {
  cash:    { dot: 'bg-state-success-icon', badge: 'bg-state-success-bg text-state-success-text' },
  card:    { dot: 'bg-state-info-icon',    badge: 'bg-state-info-bg text-state-info-text'       },
  digital: { dot: 'bg-state-info-icon',  badge: 'bg-state-info-bg text-state-info-text'   },
  credit:  { dot: 'bg-state-warning-icon',   badge: 'bg-state-warning-bg text-state-warning-text'     },
}

interface BreakdownRowRaw { group_slug: string; method_name: string; total: number }
interface BreakdownGroup  { slug: string; label: string; total: number }
interface DisplayMethod   { key: string; groupSlug: string; label: string; groupLabel: string; total: number }

// Individual methods sorted by total desc; fallback to group-level totals
const displayMethods = computed<DisplayMethod[]>(() => {
  const rows: BreakdownRowRaw[] = previewData.value?.breakdown ?? []
  if (rows.length > 0) {
    return [...rows]
      .sort((a, b) => b.total - a.total)
      .map(r => ({
        key:        `${r.group_slug}__${r.method_name}`,
        groupSlug:  r.group_slug,
        label:      r.method_name,
        groupLabel: groupLabel(r.group_slug),
        total:      r.total,
      }))
  }
  // fallback: group-level non-zero totals
  const p = previewData.value
  if (!p) return []
  return ([
    { slug: 'cash',    label: t('finanzas.common.cash'), total: p.totalCash    ?? 0 },
    { slug: 'card',    label: t('finanzas.common.card'),  total: p.totalCard    ?? 0 },
    { slug: 'digital', label: t('finanzas.common.digital'),  total: p.totalDigital ?? 0 },
    { slug: 'credit',  label: t('finanzas.common.credit'),  total: p.totalCredit  ?? 0 },
  ] as BreakdownGroup[])
    .filter(g => g.total > 0)
    .map(g => ({ key: g.slug, groupSlug: g.slug, label: g.label, groupLabel: g.label, total: g.total }))
})

const methodPct = (m: DisplayMethod) => {
  const total = previewData.value?.totalSales ?? 0
  if (total === 0) return 0
  return Math.min(100, (m.total / total) * 100)
}

interface GroupedSection {
  slug: string
  label: string
  groupTotal: number
  methods: DisplayMethod[]
}

const groupedMethods = computed<GroupedSection[]>(() => {
  const map = new Map<string, GroupedSection>()
  for (const m of displayMethods.value) {
    if (!map.has(m.groupSlug)) {
      map.set(m.groupSlug, {
        slug: m.groupSlug,
        label: m.groupLabel,
        groupTotal: 0,
        methods: [],
      })
    }
    const grp = map.get(m.groupSlug)!
    grp.groupTotal += m.total
    grp.methods.push(m)
  }
  return Array.from(map.values()).sort((a, b) => b.groupTotal - a.groupTotal)
})

const groupTotalPct = (grp: GroupedSection) => {
  const total = previewData.value?.totalSales ?? 0
  if (total === 0) return 0
  return Math.min(100, (grp.groupTotal / total) * 100)
}

registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })

const formatCurrency = (value?: number | null) => formatMoneyValue(value ?? 0)

const hasCapturedTips = (data?: Record<string, any> | null) =>
  Number(data?.totalTips ?? 0) > 0 || Number(data?.totalTipTax ?? 0) > 0

const formatPeriod = (start: string, end: string) => {
  if (!start) return ''
  const fmt = (d: string) => formatCalendarDate(d)
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}
</script>
