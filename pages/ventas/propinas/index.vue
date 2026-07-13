<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import MetricCard from '~/components/shared/MetricCard.vue'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({
  layout: 'dashboard',

  module: 'finanzas',
})

useHead({ title: () => t('ventas.head.propinas') })

const { currentTenant } = useTenantReactive()
const toast = useToast()
const { formatDateTime: formatDate, formatCurrency } = useFormatters()

// Payment groups (same query as /ventas/ordenes — shared cache)
const { data: paymentGroupsData } = useQuery({
  key: () => ['payments', 'pos-methods', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { id: string; slug: string; name: string; methods: { id: string; name: string }[] }[] }>('/api/pos/payment-methods'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})
const paymentGroups = computed(() => paymentGroupsData.value?.data ?? [])
const { resolveLabel } = usePaymentLabel(paymentGroups)

// Tenant context (for tip_enabled gate + members dropdown). Shared cache key
// with /operaciones/propinas (config page) and the rest of /operaciones/*.
const { data: ctxData, asyncStatus: ctxAsyncStatus } = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const tipEnabled = computed<boolean>(() => ctxData.value?.data?.tip_enabled === true)
const memberOptions = computed<{ id: string; name: string }[]>(
  () => (ctxData.value?.data?.members ?? []).map((m: any) => ({ id: String(m.id), name: m.name || t('ventas.common.sinNombre') }))
)

// ── Filter state ────────────────────────────────────────────────────────────
const localSearchTerm = ref<string>('')
const appliedSearch = ref<string>('')
const memberFilter = ref<string | null>(null)
const paymentFilter = ref<string | null>(null) // group slug
const channelFilter = ref<'pos' | 'mesa' | 'online' | null>(null)
const dateRangeDates = ref<Date[] | null>(null)
const sortField = ref<'order_number' | 'order_date' | 'total_amount' | 'tip_amount' | 'payment_method'>('order_date')
const sortDirection = ref<'asc' | 'desc'>('desc')
const { timezone, todayISO, addDaysISO, dateAtNoon, isoFromDate } = useTenantTimezone()
const presetRange = (fromIso: string, toIso = todayISO()) => [dateAtNoon(fromIso), dateAtNoon(toIso)]
const maxDate = computed(() => dateAtNoon(todayISO()))
const formatIsoShort = (iso: string) => {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year.slice(2)}`
}

const presetDates = computed(() => [
  { label: t('ventas.propinas.today'), value: presetRange(todayISO()) },
  { label: t('ventas.propinas.yesterday'), value: presetRange(addDaysISO(todayISO(), -1), addDaysISO(todayISO(), -1)) },
  { label: t('ventas.propinas.lastWeek'), value: presetRange(addDaysISO(todayISO(), -7)) },
  { label: t('ventas.propinas.last15'), value: presetRange(addDaysISO(todayISO(), -15)) },
  { label: t('ventas.propinas.lastMonth'), value: presetRange(addDaysISO(todayISO(), -30)) },
  { label: t('ventas.propinas.last90'), value: presetRange(addDaysISO(todayISO(), -90)) },
])

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = formatIsoShort(isoFromDate(dates[0]))
  if (!dates[1]) return from
  const to = formatIsoShort(isoFromDate(dates[1]))
  return `${from} - ${to}`
}

const dateRange = computed(() => {
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null as string | null, to: null as string | null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return { from: isoFromDate(from), to: isoFromDate(to) }
})

// Pagination
const PAGE_SIZE = 25
const currentPage = ref(1)

// ── Main query ──────────────────────────────────────────────────────────────
const { data: tipsData, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['tips', currentTenant.value?.id, {
    limit: PAGE_SIZE,
    offset: (currentPage.value - 1) * PAGE_SIZE,
    search: appliedSearch.value || null,
    member_id: memberFilter.value,
    payment_method: paymentFilter.value,
    channel: channelFilter.value,
    dateFrom: dateRange.value.from,
    dateTo: dateRange.value.to,
    sortField: sortField.value,
    sortDirection: sortDirection.value,
  }],
  query: () => $fetch<any>('/api/orders/tips', {
    params: {
      limit: PAGE_SIZE,
      offset: (currentPage.value - 1) * PAGE_SIZE,
      search: appliedSearch.value || undefined,
      member_id: memberFilter.value || undefined,
      payment_method: paymentFilter.value || undefined,
      channel: channelFilter.value || undefined,
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      sort_field: sortField.value,
      sort_direction: sortDirection.value,
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(
  () =>
    (!tipsData.value && !fetchError.value)
    || (ctxAsyncStatus.value === 'loading' && !ctxData.value),
)
const isRefreshing = computed(
  () => asyncStatus.value === 'loading' && tipsData.value != null,
)
const tips = computed<any[]>(() => tipsData.value?.data ?? [])
const aggregates = computed<{ sum_tip: number; count_with_tip: number; avg_pct: number }>(
  () => tipsData.value?.aggregates ?? { sum_tip: 0, count_with_tip: 0, avg_pct: 0 }
)
const totalCount = computed<number>(() => tipsData.value?.pagination?.total ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))

// Reset page on tenant or filter change
watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })
watch([memberFilter, paymentFilter, channelFilter, dateRangeDates, appliedSearch], () => {
  currentPage.value = 1
})

const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

// ── Sort + filter handlers ──────────────────────────────────────────────────
const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field as any
    sortDirection.value = 'desc'
  }
}

const applySearch = () => {
  appliedSearch.value = localSearchTerm.value.trim()
}

const clearAllFilters = () => {
  localSearchTerm.value = ''
  appliedSearch.value = ''
  memberFilter.value = null
  paymentFilter.value = null
  channelFilter.value = null
  dateRangeDates.value = null
}

// Mesero click on a row → filter to that mesero
const filterByMember = (memberId: string | null) => {
  if (!memberId) return
  memberFilter.value = memberId
}

// warocol.com#662 — open order detail in the same tab (like /ventas/ordenes)
const goToOrderDetail = (orderId: string) => {
  if (!orderId) return
  navigateTo(`/ventas/${orderId}`)
}

// ── Export by email ─────────────────────────────────────────────────────────
const isExporting = ref(false)
const showExportModal = ref(false)
const exportResult = ref<{ success: boolean; message: string; email?: string; count?: number } | null>(null)

const exportToEmail = async () => {
  if (isExporting.value) return
  isExporting.value = true
  exportResult.value = null
  try {
    const res = await $fetch<{ success: boolean; message: string; data: { email: string; orders_count: number } }>(
      '/api/orders/export',
      {
        method: 'POST',
        params: {
          tips_only: true,
          search: appliedSearch.value || undefined,
          member_id: memberFilter.value || undefined,
          payment_method: paymentFilter.value || undefined,
          channel: channelFilter.value || undefined,
          date_from: dateRange.value.from || undefined,
          date_to: dateRange.value.to || undefined,
          sort_field: sortField.value,
          sort_direction: sortDirection.value,
        },
      },
    )
    exportResult.value = {
      success: true,
      message: res.message,
      email: res.data?.email,
      count: res.data?.orders_count,
    }
    showExportModal.value = true
  } catch (e: any) {
    exportResult.value = {
      success: false,
      message: e?.data?.detail || e?.message || t('ventas.propinas.exportError'),
    }
    showExportModal.value = true
  } finally {
    isExporting.value = false
  }
}

// ── Formatting helpers ──────────────────────────────────────────────────────
const formatPercent = (value: number) => `${(value || 0).toFixed(2)}%`

const channelLabel = (ch: string | null | undefined) => {
  if (ch === 'online') return t('ventas.propinas.online')
  if (ch === 'mesa') return t('ventas.propinas.mesa')
  if (ch === 'barra') return t('ventas.propinas.barra')
  return t('ventas.common.pos')
}
const channelVariant = (ch: string | null | undefined) => {
  if (ch === 'online') return 'success'
  if (ch === 'mesa') return 'info'
  if (ch === 'barra') return 'warning'
  return 'secondary'
}

const channelHeaderOptions = [
  { label: t('ventas.common.pos'), value: 'pos' },
  { label: t('ventas.propinas.mesa'), value: 'mesa' },
  { label: t('ventas.propinas.online'), value: 'online' },
]

const memberHeaderOptions = computed(() =>
  memberOptions.value.map(member => ({ label: member.name, value: member.id })),
)

const paymentHeaderOptions = computed(() =>
  paymentGroups.value.map(group => ({ label: group.name, value: group.slug })),
)

const memberHeaderFilter = computed({
  get: () => memberFilter.value ?? '',
  set: (value: string | boolean) => {
    memberFilter.value = typeof value === 'string' && value ? value : null
  },
})

const channelHeaderFilter = computed({
  get: () => channelFilter.value ?? '',
  set: (value: string | boolean) => {
    channelFilter.value = typeof value === 'string' && value ? value as 'pos' | 'mesa' | 'online' : null
  },
})

const paymentHeaderFilter = computed({
  get: () => paymentFilter.value ?? '',
  set: (value: string | boolean) => {
    paymentFilter.value = typeof value === 'string' && value ? value : null
  },
})

// ── Columns ─────────────────────────────────────────────────────────────────
const columns: Column[] = [
  { key: 'order_date', title: t('ventas.common.fecha'), sortable: true, width: '180px' },
  { key: 'order_number', title: t('ventas.common.orden'), sortable: true, width: '90px' },
  { key: 'channel', title: t('ventas.propinas.channel'), width: '100px' },
  { key: 'total_amount', title: t('ventas.common.subtotal'), sortable: true, align: 'right' },
  { key: 'tip_amount', title: t('ventas.common.propina'), sortable: true, align: 'right' },
  { key: 'tip_percent', title: '%', align: 'right', width: '80px' },
  { key: 'member_name', title: t('ventas.common.mesero') },
  { key: 'payment_method', title: t('ventas.common.metodoPago') },
]

// ── Layout integration ──────────────────────────────────────────────────────
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

// warocol.com#641 — pre-apply the date range when arriving via the
// "{{ t('ventas.propinas.periodTips') }}" MetricCard on /analitica/ventas. URL is the
// source of truth on first paint; subsequent user interactions update
// the local ref directly (we don't sync back to the URL — out of scope).
const route = useRoute()

onMounted(() => {
  const qFrom = route.query.date_from as string | undefined
  const qTo = route.query.date_to as string | undefined
  if (qFrom && qTo) {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(qFrom) ? dateAtNoon(qFrom) : null
    const to = /^\d{4}-\d{2}-\d{2}$/.test(qTo) ? dateAtNoon(qTo) : null
    if (from && to && !isNaN(from.getTime()) && !isNaN(to.getTime())) {
      dateRangeDates.value = [from, to]
    }
  }
  // warocol.com#642 — pre-apply mesero filter when arriving from /equipo/miembros/[id]
  const qMember = route.query.member_id as string | undefined
  if (qMember) memberFilter.value = qMember
  setRefreshHandler(refetch)
})
onUnmounted(() => clearRefreshHandler(refetch))
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- ══════ EMPTY STATE: tipping disabled ══════ -->
    <div
      v-else-if="ctxData && !tipEnabled"
      class="flex flex-col items-center justify-center gap-3 py-16 px-6 bg-surface rounded-xl border-2 border-border text-center"
    >
      <span aria-hidden="true" class="text-4xl">💡</span>
      <p class="text-base font-semibold text-text-primary">{{ t('ventas.propinas.disabledTitle') }}</p>
      <p class="text-sm text-text-secondary max-w-md">
        {{ t('ventas.propinas.disabledBody') }}
      </p>
      <NuxtLink
        to="/operaciones/propinas"
        class="mt-2 min-h-[44px] px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
      >
        {{ t('ventas.propinas.configureTips') }}
      </NuxtLink>
    </div>

    <!-- ══════ MAIN CONTENT: tipping enabled ══════ -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Aggregates — MetricCard pattern (matches /analitica/ventas) -->
      <div class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3">
        <MetricCard
          :title="t('ventas.propinas.totalTips')"
          :value="aggregates.sum_tip"
          format="currency"
          variant="primary"
        />
        <MetricCard
          :title="t('ventas.propinas.avgOverSale')"
          :value="aggregates.avg_pct"
          format="percentage"
          :precision="2"
          variant="primary"
        />
        <MetricCard
          :title="t('ventas.propinas.ordersWithTip')"
          :value="aggregates.count_with_tip"
          format="number"
          variant="primary"
          class="col-span-2 md:col-span-1"
        />
      </div>

      <!-- Filter bar — matches /ventas/ordenes -->
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[200px]">
          <button
            type="button"
            class="absolute start-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary transition-colors cursor-pointer"
            @click="applySearch"
            :aria-label="t('ventas.propinas.search')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <input
            v-model="localSearchTerm"
            type="text"
            inputmode="numeric"
            :placeholder="t('ventas.propinas.searchOrder')"
            class="w-full h-10 ps-9 pe-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            @keydown.enter.prevent="applySearch"
          />
        </div>

        <!-- Date Range Picker -->
        <VueDatePicker
          v-model="dateRangeDates"
          range
          :preset-dates="presetDates"
          :enable-time-picker="false"
          :locale="locale"
          :placeholder="t('ventas.propinas.dateRangePlaceholder')"
          auto-apply
          :teleport="true"
          :timezone="timezone"
          :max-date="maxDate"
          :format="formatDateRange"
          input-class-name="dp-custom-input"
          menu-class-name="dp-custom-menu"
          calendar-cell-class-name="dp-custom-cell"
        />

        <!-- Mesero -->
        <select
          v-model="memberFilter"
          class="py-2 ps-3 pe-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0 md:hidden"
          :aria-label="t('ventas.propinas.filterWaiter')"
        >
          <option :value="null">{{ t('ventas.common.mesero') }}</option>
          <option v-for="m in memberOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>

        <!-- Channel -->
        <select
          v-model="channelFilter"
          class="py-2 ps-3 pe-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0 md:hidden"
          :aria-label="t('ventas.propinas.filterChannel')"
        >
          <option :value="null">{{ t('ventas.propinas.channel') }}</option>
          <option value="pos">{{ t('ventas.common.pos') }}</option>
          <option value="mesa">{{ t('ventas.propinas.mesa') }}</option>
          <option value="online">{{ t('ventas.propinas.online') }}</option>
        </select>

        <!-- Payment method -->
        <select
          v-model="paymentFilter"
          class="py-2 ps-3 pe-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0 md:hidden"
          :aria-label="t('ventas.propinas.filterPayment')"
        >
          <option :value="null">{{ t('ventas.common.metodoPagoShort') }}</option>
          <option v-for="g in paymentGroups" :key="g.slug" :value="g.slug">{{ g.name }}</option>
        </select>

        <!-- Clear -->
        <button
          v-if="localSearchTerm || dateRangeDates || memberFilter || paymentFilter || channelFilter"
          type="button"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
          :aria-label="t('ventas.propinas.clearFilters')"
          @click="clearAllFilters"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Export -->
        <button
          type="button"
          class="hidden md:flex h-10 px-3 items-center gap-2 rounded-lg border-2 border-border bg-background text-text-secondary text-sm font-medium hover:text-text-primary hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          :disabled="isExporting || tips.length === 0"
          :aria-label="isExporting ? t('ventas.propinas.exporting') : t('ventas.propinas.exportAria')"
          @click="exportToEmail"
        >
          <svg v-if="!isExporting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </button>
      </div>

      <!-- Table loading (filter change, empty result) — mirrors /ventas/ordenes -->
      <div v-if="isRefreshing && tips.length === 0" class="flex items-center justify-center min-h-[200px]">
        <CommonsTheCustomLoader size="medium" />
      </div>

      <template v-else>
      <UiResponsiveDataView
        :columns="columns"
        :data="tips"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        :empty-message="t('ventas.propinas.emptyTitle')"
        :empty-sub-message="t('ventas.propinas.emptySub')"
        item-key="id"
        row-size="sm"
        @sort="handleSort"
      >
        <template #header-channel>
          <UiTableHeaderFilter
            v-model="channelHeaderFilter"
            :title="t('ventas.propinas.channel')"
            filter-type="select"
            :options="channelHeaderOptions"
            :all-label="t('ventas.propinas.channel')"
            align="center"
          />
        </template>

        <template #header-member_name>
          <UiTableHeaderFilter
            v-model="memberHeaderFilter"
            :title="t('ventas.common.mesero')"
            filter-type="select"
            :options="memberHeaderOptions"
            :all-label="t('ventas.common.mesero')"
            align="left"
          />
        </template>

        <template #header-payment_method>
          <UiTableHeaderFilter
            v-model="paymentHeaderFilter"
            :title="t('ventas.common.metodoPago')"
            filter-type="select"
            :options="paymentHeaderOptions"
            :all-label="t('ventas.common.metodoPagoShort')"
            align="left"
          />
        </template>

        <!-- Mobile card -->
        <template #card="{ item, index }">
          <div :class="['flex flex-col gap-2 p-4 border-b border-border', index % 2 === 0 ? 'bg-surface' : 'bg-background']">
            <div class="flex items-center justify-between">
              <div class="flex items-baseline gap-2">
                <span class="text-xs text-text-secondary">{{ formatDate(item.order_date) }}</span>
                <button
                  type="button"
                  class="text-sm font-semibold text-primary hover:underline"
                  @click.stop="goToOrderDetail(item.id)"
                >
                  #{{ item.order_number }}
                </button>
              </div>
              <UiStatusBadge :variant="channelVariant(item.channel)" size="sm" :value="channelLabel(item.channel)" />
            </div>
            <div class="flex items-end justify-between">
              <div>
                <p class="text-xs text-text-secondary">{{ t('ventas.propinas.subtotalValue', { amount: formatCurrency(item.total_amount) }) }}</p>
                <button
                  type="button"
                  class="text-sm font-medium text-text-primary hover:text-primary hover:underline mt-0.5"
                  @click.stop="filterByMember(item.served_by_member_id)"
                >
                  {{ item.member_name || t('ventas.propinas.unassigned') }}
                </button>
                <p class="text-xs text-text-tertiary mt-0.5">{{ resolveLabel(item.payment_method) }}</p>
              </div>
              <div class="text-end">
                <p class="text-xl font-bold text-primary tabular-nums">{{ formatCurrency(item.tip_amount) }}</p>
                <p class="text-xs text-text-secondary tabular-nums">{{ formatPercent(item.tip_percent) }}</p>
              </div>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-order_date="{ value }">
          <span class="text-sm text-text-secondary whitespace-nowrap">{{ formatDate(value) }}</span>
        </template>
        <template #cell-order_number="{ row, value }">
          <button
            type="button"
            class="text-sm font-medium text-primary hover:underline"
            @click.stop="goToOrderDetail(row.id)"
          >
            #{{ value }}
          </button>
        </template>
        <template #cell-channel="{ row }">
          <UiStatusBadge :variant="channelVariant(row.channel)" size="sm" :value="channelLabel(row.channel)" />
        </template>
        <template #cell-total_amount="{ value }">
          <span class="text-sm tabular-nums">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-tip_amount="{ value }">
          <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-tip_percent="{ value }">
          <span class="text-sm tabular-nums text-text-secondary">{{ formatPercent(value) }}</span>
        </template>
        <template #cell-member_name="{ row }">
          <button
            type="button"
            class="text-sm text-text-primary hover:text-primary hover:underline text-start"
            @click.stop="filterByMember(row.served_by_member_id)"
          >
            {{ row.member_name || t('ventas.propinas.unassigned') }}
          </button>
        </template>
        <template #cell-payment_method="{ value }">
          <span class="text-sm text-text-secondary">{{ resolveLabel(value) }}</span>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div v-if="totalCount > PAGE_SIZE" class="flex items-center justify-between gap-2 px-2 mt-0">
        <p class="text-xs text-text-secondary">
          {{ t('ventas.propinas.paginationSummary', { page: currentPage, pages: totalPages, total: totalCount }) }}
        </p>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="min-h-[36px] min-w-[36px] px-2 rounded-md border border-border hover:border-primary disabled:opacity-40"
            :disabled="currentPage === 1"
            :aria-label="t('ventas.common.primeraPagina')"
            @click="goToPage(1)"
          >«</button>
          <button
            type="button"
            class="min-h-[36px] min-w-[36px] px-2 rounded-md border border-border hover:border-primary disabled:opacity-40"
            :disabled="currentPage === 1"
            :aria-label="t('ventas.common.paginaAnterior')"
            @click="goToPage(currentPage - 1)"
          >‹</button>
          <button
            type="button"
            class="min-h-[36px] min-w-[36px] px-2 rounded-md border border-border hover:border-primary disabled:opacity-40"
            :disabled="currentPage === totalPages"
            :aria-label="t('ventas.common.paginaSiguiente')"
            @click="goToPage(currentPage + 1)"
          >›</button>
          <button
            type="button"
            class="min-h-[36px] min-w-[36px] px-2 rounded-md border border-border hover:border-primary disabled:opacity-40"
            :disabled="currentPage === totalPages"
            :aria-label="t('ventas.common.ultimaPagina')"
            @click="goToPage(totalPages)"
          >»</button>
        </div>
      </div>
      </template>
    </div>

    <!-- Export result modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showExportModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5"
          @click.self="showExportModal = false"
        >
          <div class="bg-background rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div
              :class="[
                'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5',
                exportResult?.success ? 'bg-green-100' : 'bg-red-100',
              ]"
            >
              <svg v-if="exportResult?.success" class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-text-primary mb-2">
              {{ exportResult?.success ? t('ventas.propinas.reportSent') : t('ventas.propinas.exportErrorTitle') }}
            </h2>
            <p v-if="exportResult?.success" class="text-sm text-text-secondary mb-1">
              {{ exportResult.count }} {{ t('ventas.propinas.tipsSentTo') }}
            </p>
            <p v-if="exportResult?.success && exportResult.email" class="text-sm font-medium text-text-primary mb-5">
              {{ exportResult.email }}
            </p>
            <p v-else class="text-sm text-text-secondary mb-5">{{ exportResult?.message }}</p>
            <button
              type="button"
              class="w-full min-h-[44px] px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
              @click="showExportModal = false"
            >
              {{ t('ventas.propinas.closeReport') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>

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
  min-width: 150px;
}
.dp-custom-input:focus {
  outline: none !important;
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2) !important;
}
.dp-custom-input::placeholder {
  color: hsl(var(--muted-foreground)) !important;
}
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
