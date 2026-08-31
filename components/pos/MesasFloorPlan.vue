<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { $fetch } from 'ofetch'
import { displayTableCode } from '~/composables/useTableDisplayCode'
import { tableSessionDisplayName, tableSessionHasAlias } from '~/utils/tableSessionDisplayName'

const { formatCurrency } = useFormatters()
const { singular: tableSingular } = useTableLabel()
const tableSingularLower = computed(() => tableSingular.value.toLowerCase())

const props = defineProps<{
  comandasEnabled?: boolean
  /** Issue #574 — when true, render the effective-waiter line under each mesa card */
  waiterAttributionEnabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'enter-table', ctx: { tableId: string; sessionId: string; tableName: string; isBar?: boolean; gotoCheckout?: boolean }): void
  (e: 'no-tables'): void
  (e: 'move-table', ctx: { tableId: string; sessionId: string; tableName: string }): void
}>()

type FloorView = 'mesas' | 'domicilios'
type FloorLayout = 'grid' | 'list'

interface PendingDeliveryRow {
  id: string
  order_number: number
  order_date: string | null
  total_amount: number
  status: string
  payment_status: string | null
  delivery_instructions: string | null
  address_label: string | null
  customer: { id: string | null; name: string | null; phone_number: string | null }
}

const { currentTenant } = useTenantReactive()

// ── Tables data ────────────────────────────────────────────────────────────
const { data: tablesData, status: tablesStatus, asyncStatus: tablesAsyncStatus, error: tablesError, refetch } = useQuery({
  key: () => ['tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/tables'),
  enabled: () => !!currentTenant.value,
  staleTime: 0,
})

const loadingTables = computed(() => tablesStatus.value === 'pending')
const isRefreshing = computed(() => tablesAsyncStatus.value === 'loading' && tablesData.value != null)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

const tables = computed(() => tablesData.value?.data ?? [])

const floorView = ref<FloorView>('mesas')
const floorLayout = ref<FloorLayout>('grid')
const floorLayoutToggleTarget = computed<FloorLayout>(() =>
  floorLayout.value === 'grid' ? 'list' : 'grid',
)
const toggleFloorLayout = () => {
  floorLayout.value = floorLayoutToggleTarget.value
}

const {
  data: pendingDeliveriesData,
  status: pendingDeliveriesStatus,
  asyncStatus: pendingDeliveriesAsyncStatus,
  error: pendingDeliveriesError,
  refetch: refetchPendingDeliveries,
} = useQuery({
  key: () => ['tables', 'pending-deliveries', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: PendingDeliveryRow[] }>('/api/tables/pending-deliveries'),
  enabled: () => !!currentTenant.value,
  staleTime: 0,
})

const pendingDeliveries = computed(() => pendingDeliveriesData.value?.data ?? [])
const loadingPendingDeliveries = computed(() => pendingDeliveriesStatus.value === 'pending')
const isRefreshingDeliveries = computed(() =>
  pendingDeliveriesAsyncStatus.value === 'loading' && pendingDeliveriesData.value != null,
)
const isFloorRefreshing = computed(() => isRefreshing.value || isRefreshingDeliveries.value)
registerProgressiveLoading(isFloorRefreshing)

const refreshFloor = async () => {
  await Promise.all([refetch(), refetchPendingDeliveries()])
}

const handleDeliveryClick = (order: PendingDeliveryRow) => {
  navigateTo({ path: '/pos/checkout', query: { pendingOrder: order.id } })
}

const tableListColumns = computed(() => [
  { key: 'name', title: t('pos.floor.colTable'), sortable: false },
  { key: 'status', title: t('pos.floor.colStatus'), sortable: false },
  { key: 'total', title: t('pos.floor.colTotal'), sortable: false },
])

const deliveryListColumns = computed(() => [
  { key: 'customer', title: t('pos.floor.colCustomer'), sortable: false },
  { key: 'address', title: t('pos.floor.colAddress'), sortable: false },
  { key: 'total', title: t('pos.floor.colTotal'), sortable: false },
  { key: 'time', title: t('pos.floor.colTime'), sortable: false },
])

const floorToolbarButtonClass = [
  'inline-flex items-center justify-center min-h-9 px-3 rounded-lg text-xs font-semibold border transition-colors',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
]
const floorToolbarToggleClass = [
  'relative w-9 px-0 overflow-hidden text-text-secondary border border-border rounded-lg min-h-9',
  'hover:text-text-primary hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
  'inline-flex items-center justify-center',
]

// Bar tile is always-on — separate from regular tables
const barTable = computed(() => tables.value.find((t: any) => t.is_bar))
const regularTables = computed(() => tables.value.filter((t: any) => !t.is_bar))

// When data loads and there are 0 *regular* tables, tell the parent to fall back to POS view.
// The bar alone does not count as a configured table for this purpose.
watch(tablesStatus, (status) => {
  if (status === 'success' && regularTables.value.length === 0) emit('no-tables')
}, { immediate: true })

watch(() => currentTenant.value?.id, () => { refetch() })

// ── 30-second polling ──────────────────────────────────────────────────────
let pollInterval: ReturnType<typeof setInterval> | null = null

// ── Open session ───────────────────────────────────────────────────────────
const openingTableId = ref<string | null>(null)

const handleTableClick = async (table: any) => {
  if (table.status === 'free') {
    if (openingTableId.value) return
    // Open the session directly; mesero assignment happens from the
    // banner chip in /pos (no pre-open prompt). If the mesa has a
    // default `assigned_member_id`, the resolver carries it through
    // automatically (#573 → #574 fallback chain).
    await doOpenTable(table, null)
  } else if (table.status === 'open') {
    emit('enter-table', {
      tableId: table.id,
      sessionId: table.session?.id,
      tableName: table.name,
    })
  } else if (table.status === 'bill_requested') {
    emit('enter-table', {
      tableId: table.id,
      sessionId: table.session?.id,
      tableName: table.name,
      gotoCheckout: true,
    })
  }
}

const doOpenTable = async (table: any, attendedByMemberId: string | null) => {
  openingTableId.value = table.id
  try {
    const result = await $fetch<{ success: boolean; data: { session_id: string } }>(
      `/api/tables/${table.id}/open`,
      {
        method: 'POST',
        body: attendedByMemberId ? { attended_by_member_id: attendedByMemberId } : undefined,
      },
    )
    await refetch()
    emit('enter-table', {
      tableId: table.id,
      sessionId: result?.data?.session_id,
      tableName: table.name,
    })
  } catch {
    await refetch()
    emit('enter-table', {
      tableId: table.id,
      sessionId: table.session?.id,
      tableName: table.name,
    })
  } finally {
    openingTableId.value = null
  }
}

// ── Bar click — session is always open, fetch current and enter ─────────────
const isEnteringBar = ref(false)

const handleBarClick = async () => {
  if (!barTable.value || isEnteringBar.value) return
  isEnteringBar.value = true
  try {
    emit('enter-table', {
      tableId: barTable.value.id,
      sessionId: barTable.value.session?.id ?? '',
      tableName: barTable.value.name,
      isBar: true,
    })
  } finally {
    isEnteringBar.value = false
  }
}

// ── Reopen session (subtle text link on free tables with last_closed_at) ────
const isReopeningTableId = ref<string | null>(null)

const handleReopenTable = async (tableId: string, event: Event) => {
  event.stopPropagation()
  isReopeningTableId.value = tableId
  try {
    await $fetch(`/api/tables/${tableId}/session/reopen`, { method: 'POST' })
    await refetch()
  } catch {
    // Non-critical — table state unchanged
  } finally {
    isReopeningTableId.value = null
  }
}

// ── Move table ────────────────────────────────────────────────────────────
const handleMoveTable = (table: any, event: Event) => {
  event.stopPropagation()
  emit('move-table', {
    tableId: table.id,
    sessionId: table.session?.id ?? '',
    tableName: table.name,
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDuration = (openedAt: string): string => {
  const diffMs = Date.now() - new Date(openedAt).getTime()
  const totalMins = Math.floor(diffMs / 60_000)
  if (totalMins < 60) return `${totalMins}m`
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const minimumConsumptionLabel = (table: any): string | null => {
  const state = table.session?.minimum_consumption
  if (!state?.enabled || !(Number(state.amount) > 0)) return null
  const remaining = Number(state.remaining) || 0
  if (state.covered || remaining <= 0) return t('pos.floor.minCovered')
  return t('pos.floor.remaining', { amount: formatCurrency(remaining) })
}

const badgeLabel = (status: string) => {
  if (status === 'open') return t('pos.floor.inService')
  if (status === 'bill_requested') return t('pos.floor.bill')
  return t('pos.floor.free')
}


/** Status theme — soft tint on body, stronger tint on footer (no left border). */
const tableStatusTheme = (status: string) => {
  const panel = 'px-2.5 py-1.5 flex flex-col gap-0.5'
  const text = {
    title: 'text-text-primary',
    meta: 'text-text-secondary',
    amount: 'text-text-primary',
    time: 'text-text-secondary',
    waiter: 'text-text-tertiary',
  }
  const moveHover = 'hover:bg-black/5 focus-visible:ring-border/50'

  if (status === 'open') {
    return {
      card: 'border-2 border-border/50 hover:border-status-success-text hover:shadow-sm',
      bodyPanel: 'table-card-body table-card-body--open',
      footerPanel: 'table-card-footer table-card-footer--open',
      focus: 'focus-visible:ring-status-success-text/30 focus-visible:ring-offset-surface',
      panel,
      divider: 'border-border/50',
      statusLabel: 'text-status-success-text',
      dot: 'bg-status-success-text',
      moveHover,
      ...text,
    }
  }
  if (status === 'bill_requested') {
    return {
      card: 'border-2 border-border/50 hover:border-status-warning-text hover:shadow-sm',
      bodyPanel: 'table-card-body table-card-body--bill',
      footerPanel: 'table-card-footer table-card-footer--bill',
      focus: 'focus-visible:ring-status-warning-text/30 focus-visible:ring-offset-surface',
      panel,
      divider: 'border-border/50',
      statusLabel: 'text-status-warning-text',
      dot: 'bg-status-warning-text',
      moveHover,
      ...text,
    }
  }
  return {
    card: 'border-2 border-border/50 hover:border-status-info-text hover:shadow-sm',
    bodyPanel: 'table-card-body table-card-body--free',
    footerPanel: 'table-card-footer table-card-footer--free',
    focus: 'focus-visible:ring-status-info-text/30 focus-visible:ring-offset-surface',
    panel,
    divider: 'border-border/50',
    statusLabel: 'text-status-info-text',
    dot: 'bg-status-info-text',
    moveHover,
    ...text,
  }
}

const cardClass = (status: string) => tableStatusTheme(status).card
const focusRingClass = (status: string) => tableStatusTheme(status).focus
const tableCardPanelClass = (status: string) => tableStatusTheme(status).panel
const tableCardPanelDividerClass = (status: string) => tableStatusTheme(status).divider
const tableCardBodyPanelClass = (status: string) =>
  `${tableCardPanelClass(status)} border-b ${tableCardPanelDividerClass(status)} ${tableStatusTheme(status).bodyPanel} flex-1 min-h-[3.75rem] text-start`
const tableCardFooterPanelClass = (status: string) =>
  `${tableCardPanelClass(status)} border-t ${tableCardPanelDividerClass(status)} ${tableStatusTheme(status).footerPanel} shrink-0 text-start`
const themeTitleClass = (status: string) => tableStatusTheme(status).title
const themeMetaClass = (status: string) => tableStatusTheme(status).meta
const themeAmountClass = (status: string) => tableStatusTheme(status).amount
const themeTimeClass = (status: string) => tableStatusTheme(status).time
const themeWaiterClass = (status: string) => tableStatusTheme(status).waiter
const themeStatusLabelClass = (status: string) => tableStatusTheme(status).statusLabel
const dotClass = (status: string) => tableStatusTheme(status).dot
const moveButtonClass = (status: string) => tableStatusTheme(status).moveHover

/** Shared row typography — same scale in body and footer panels. */
const tableCardTitleTextClass = 'text-lg font-bold leading-tight'
const tableCardPrimaryTextClass = 'text-sm font-bold tabular-nums leading-none'
const tableCardSecondaryTextClass = 'text-xs font-medium tabular-nums leading-none'
const tableCardTertiaryTextClass = 'text-xs font-normal leading-none truncate'

const tableCardDisplayName = (table: { name: string; session?: { custom_label?: string | null } | null }) =>
  tableSessionDisplayName(table.name, table.session?.custom_label)

const tableCardShowsCatalogName = (table: { name: string; session?: { custom_label?: string | null } | null }) =>
  tableSessionHasAlias(table.name, table.session?.custom_label)

const tableCardAriaLabel = (table: { name: string; status: string; capacity?: number | null; session?: { custom_label?: string | null; covers?: number | null; capacity_snapshot?: number | null } | null }) => {
  const display = tableCardDisplayName(table)
  const capacity = tableCardCapacityLabel(table)
  const status = badgeLabel(table.status)
  if (tableCardShowsCatalogName(table)) {
    return capacity
      ? t('pos.floor.tableAriaWithAliasCapacity', { alias: display, name: table.name, status, capacity })
      : t('pos.floor.tableAriaWithAlias', { alias: display, name: table.name, status })
  }
  return capacity
    ? t('pos.floor.tableAriaWithCapacity', { name: display, status, capacity })
    : `${display} — ${status}`
}

const parsePositiveInt = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return Number.isFinite(n) && n >= 1 ? n : null
}

const tableCatalogCapacity = (table: { capacity?: unknown }) => parsePositiveInt(table.capacity)

const sessionCapacitySnapshot = (session?: { capacity_snapshot?: unknown; capacitySnapshot?: unknown } | null) =>
  parsePositiveInt(session?.capacity_snapshot) ?? parsePositiveInt(session?.capacitySnapshot)

const tableEffectiveCapacity = (table: {
  capacity?: unknown
  session?: { capacity_snapshot?: unknown; capacitySnapshot?: unknown } | null
}) => sessionCapacitySnapshot(table.session) ?? tableCatalogCapacity(table)

const tableCardCapacityLabel = (table: {
  status: string
  capacity?: unknown
  session?: { covers?: unknown; capacity_snapshot?: unknown; capacitySnapshot?: unknown } | null
}): string | null => {
  const capacity = tableEffectiveCapacity(table)
  const covers = parsePositiveInt(table.session?.covers)

  if (table.status === 'free') {
    if (!capacity) return null
    return t('pos.floor.capacityOnly', { count: capacity })
  }

  if (covers != null && capacity != null) {
    return t('pos.floor.coversOfCapacity', { covers, capacity })
  }
  if (covers != null) {
    return t('pos.floor.coversOnly', { covers })
  }
  if (capacity != null) {
    return t('pos.floor.capacityOnly', { count: capacity })
  }
  return null
}

const tableCardTitle = (table: { name: string; session?: { custom_label?: string | null } | null }) =>
  tableCardDisplayName(table)

/** Secondary line split into parts — bold highlights codes, capacity, minimum. */
type TableCardSecondaryPart = { text: string; bold?: boolean }

const tableCardSecondaryParts = (table: {
  name: string
  status: string
  capacity?: unknown
  session?: { covers?: unknown; capacity_snapshot?: unknown; capacitySnapshot?: unknown; custom_label?: string | null } | null
}): TableCardSecondaryPart[] => {
  const parts: TableCardSecondaryPart[] = []
  const code = displayTableCode(table)
  const title = tableCardTitle(table)
  if (code && code !== title && !title.includes(code)) parts.push({ text: code, bold: true })
  if (tableCardShowsCatalogName(table)) parts.push({ text: table.name })
  const capacity = tableCardCapacityLabel(table)
  if (capacity) parts.push({ text: capacity, bold: true })
  const minLabel = minimumConsumptionLabel(table)
  if (minLabel) parts.push({ text: minLabel, bold: true })
  return parts
}

const tableCardWaiterLine = (table: { status: string; effective_waiter_member_name?: string | null }) => {
  if (table.status === 'free' && !table.effective_waiter_member_name) return null
  return table.effective_waiter_member_name || t('pos.floor.unassigned')
}

const freeCount = computed(() => regularTables.value.filter((t: any) => t.status === 'free').length)
const openCount = computed(() => regularTables.value.filter((t: any) => t.status === 'open').length)
const billCount = computed(() => regularTables.value.filter((t: any) => t.status === 'bill_requested').length)

const totalVentas = computed(() =>
  regularTables.value
    .filter((t: any) => t.status !== 'free' && t.session?.running_total)
    .reduce((sum: number, t: any) => sum + (t.session.running_total ?? 0), 0)
)

onMounted(() => {
  setRefreshHandler(refreshFloor)
  pollInterval = setInterval(refreshFloor, 30_000)
})

onUnmounted(() => {
  clearRefreshHandler(refreshFloor)
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loadingTables || openingTableId" class="flex items-center justify-center min-h-[70vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="tablesError" />

    <!-- Content -->
    <div v-else>
      <div class="flex items-center justify-between gap-3 mb-4">
        <div class="inline-flex rounded-lg border border-border p-0.5 bg-surface">
          <button
            type="button"
            :class="[
              floorToolbarButtonClass,
              floorView === 'mesas'
                ? 'bg-badge-primary-bg text-badge-primary-text border-badge-primary-border'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            ]"
            @click="floorView = 'mesas'"
          >
            {{ t('pos.floor.viewTables') }}
          </button>
          <button
            type="button"
            :class="[
              floorToolbarButtonClass,
              floorView === 'domicilios'
                ? 'bg-badge-primary-bg text-badge-primary-text border-badge-primary-border'
                : 'border-transparent text-text-secondary hover:text-text-primary',
            ]"
            :aria-label="t('pos.floor.viewDeliveriesAria', { count: pendingDeliveries.length })"
            @click="floorView = 'domicilios'"
          >
            {{ t('pos.floor.viewDeliveries') }}
            <span
              v-if="pendingDeliveries.length"
              class="ms-1.5 min-w-5 px-1 rounded-full bg-status-warning-bg text-status-warning-text text-[10px] font-bold tabular-nums"
            >
              {{ pendingDeliveries.length }}
            </span>
          </button>
        </div>
        <button
          type="button"
          :class="floorToolbarToggleClass"
          :aria-label="floorLayoutToggleTarget === 'list' ? t('pos.catalog.layoutSwitchToList') : t('pos.catalog.layoutSwitchToGrid')"
          :title="floorLayoutToggleTarget === 'list' ? t('pos.catalog.layoutList') : t('pos.catalog.layoutGrid')"
          @click="toggleFloorLayout"
        >
          <svg
            v-if="floorLayoutToggleTarget === 'list'"
            class="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          <svg
            v-else
            class="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 8.25 20.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
          </svg>
        </button>
      </div>

      <div v-if="floorView === 'domicilios'">
        <div v-if="loadingPendingDeliveries" class="flex items-center justify-center min-h-[40vh]">
          <CommonsTheCustomLoader size="large" />
        </div>
        <CommonsTheErrorState v-else-if="pendingDeliveriesError" />
        <div
          v-else-if="pendingDeliveries.length === 0"
          class="flex flex-col items-center justify-center min-h-[40vh] text-center px-4"
        >
          <p class="text-base font-semibold text-text-primary">{{ t('pos.floor.deliveriesEmptyTitle') }}</p>
          <p class="text-sm text-text-secondary mt-1">{{ t('pos.floor.deliveriesEmptyBody') }}</p>
        </div>
        <UiResponsiveDataView
          v-else-if="floorLayout === 'list'"
          :columns="deliveryListColumns"
          :data="pendingDeliveries"
          item-key="id"
          :empty-message="t('pos.floor.deliveriesEmptyTitle')"
          row-size="sm"
          @row-click="handleDeliveryClick"
        >
          <template #card="{ item }">
            <button
              type="button"
              class="flex w-full flex-col gap-1 border-b border-border px-3 py-3 text-left hover:bg-data-table-row-hover-bg"
              @click="handleDeliveryClick(item)"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="min-w-0 truncate text-sm font-semibold text-text-primary">
                  {{ item.customer?.name || t('pos.floor.unknownCustomer') }}
                </p>
                <p class="flex-shrink-0 text-sm font-semibold tabular-nums">{{ formatCurrency(item.total_amount) }}</p>
              </div>
              <p class="text-xs text-text-secondary truncate">
                {{ item.address_label || t('pos.floor.noAddress') }}
                <span v-if="item.order_date"> · {{ formatDuration(item.order_date) }}</span>
              </p>
            </button>
          </template>
          <template #cell-customer="{ item }">
            <span class="font-semibold">{{ item.customer?.name || t('pos.floor.unknownCustomer') }}</span>
          </template>
          <template #cell-address="{ item }">
            <span class="text-text-secondary">{{ item.address_label || t('pos.floor.noAddress') }}</span>
          </template>
          <template #cell-total="{ item }">
            <span class="tabular-nums">{{ formatCurrency(item.total_amount) }}</span>
          </template>
          <template #cell-time="{ item }">
            <span class="text-text-secondary">{{ item.order_date ? formatDuration(item.order_date) : '—' }}</span>
          </template>
        </UiResponsiveDataView>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-32 items-stretch">
          <button
            v-for="order in pendingDeliveries"
            :key="order.id"
            type="button"
            class="table-card w-full h-full flex flex-col rounded-xl overflow-hidden border border-status-warning-text/30 bg-surface text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-status-warning-text/45 hover:border-status-warning-text/60"
            @click="handleDeliveryClick(order)"
          >
            <div class="flex-1 p-3">
              <p class="text-[10px] font-bold uppercase tracking-widest text-status-warning-text mb-1">
                {{ t('pos.floor.viewDeliveries') }} · #{{ order.order_number }}
              </p>
              <p class="font-bold text-text-primary line-clamp-2 min-h-[2.5rem]">
                {{ order.customer?.name || t('pos.floor.unknownCustomer') }}
              </p>
              <p class="text-xs text-text-secondary line-clamp-2 mt-1">
                {{ order.address_label || t('pos.floor.noAddress') }}
              </p>
            </div>
            <div class="px-3 py-2 bg-status-warning-bg/60 flex items-center justify-between gap-2">
              <span class="text-sm font-bold tabular-nums text-status-warning-text">{{ formatCurrency(order.total_amount) }}</span>
              <span class="text-xs text-text-secondary">{{ order.order_date ? formatDuration(order.order_date) : '' }}</span>
            </div>
          </button>
        </div>
      </div>

      <template v-else>
      <!-- Bar tile — always visible, pinned before regular tables -->
      <div v-if="barTable" class="mb-4">
        <button
          class="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 border-status-warning-text bg-status-warning-bg text-status-warning-text focus:outline-none focus-visible:ring-2 focus-visible:ring-status-warning-text/45 focus-visible:ring-offset-2 hover:brightness-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="isEnteringBar"
          :aria-label="t('pos.floor.barAlwaysOpenAria')"
          @click="handleBarClick"
        >
          <!-- Bar icon -->
          <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-status-warning-text/12 border border-status-warning-text/30">
            <svg class="w-6 h-6 text-status-warning-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 3h18v2l-7 9v7l-4-2v-5L3 5V3z" />
            </svg>
          </div>
          <!-- Info -->
          <div class="flex-1 min-w-0 text-start">
            <div class="flex items-center gap-2">
              <span class="text-base font-black uppercase tracking-wide">{{ t('pos.floor.bar') }}</span>
              <span class="text-[10px] font-bold bg-status-warning-text/12 text-status-warning-text px-2 py-0.5 rounded-full uppercase tracking-widest">{{ t('pos.floor.alwaysOpen') }}</span>
            </div>
            <p class="text-xs opacity-90 mt-0.5 tabular-nums">
              <template v-if="barTable.session?.running_total > 0">
                {{ t('pos.floor.accumulated', { amount: formatCurrency(barTable.session.running_total) }) }} ·
                {{ formatDuration(barTable.session.opened_at) }}
              </template>
              <template v-else>
                {{ t('pos.floor.noActiveConsumption') }}
              </template>
            </p>
          </div>
          <!-- Arrow -->
          <svg class="w-5 h-5 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Table grid -->
      <div v-if="floorLayout === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-32 items-stretch">
        <div v-for="table in regularTables" :key="table.id" class="h-full">

          <!-- Card — uniform height across grid -->
          <button
            class="table-card group w-full h-full flex flex-col rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            :class="[cardClass(table.status), focusRingClass(table.status)]"
            :disabled="openingTableId === table.id"
            :aria-label="tableCardAriaLabel(table)"
            @click="handleTableClick(table)"
          >
            <!-- Body panel — same chrome as footer -->
            <div :class="tableCardBodyPanelClass(table.status)">
              <p
                class="uppercase tracking-wide line-clamp-2 min-h-[2.75rem]"
                :class="[tableCardTitleTextClass, themeTitleClass(table.status)]"
              >
                {{ tableCardTitle(table) }}
              </p>
              <p
                class="line-clamp-2 min-h-[1.125rem]"
                :class="tableCardSecondaryTextClass"
              >
                <span v-if="tableCardSecondaryParts(table).length" :class="themeMetaClass(table.status)">
                  <template v-for="(part, partIdx) in tableCardSecondaryParts(table)" :key="partIdx">
                    <span v-if="partIdx > 0" class="font-normal opacity-70"> · </span>
                    <span :class="part.bold ? 'font-bold' : 'font-normal'">{{ part.text }}</span>
                  </template>
                </span>
                <span v-else aria-hidden="true">&nbsp;</span>
              </p>
            </div>

            <!-- Footer panel -->
            <div :class="tableCardFooterPanelClass(table.status)">
              <div class="flex items-center min-h-[1.75rem]">
                <template v-if="table.status !== 'free'">
                  <div class="flex w-full items-center justify-between gap-2">
                    <span class="truncate min-w-0" :class="[tableCardPrimaryTextClass, themeAmountClass(table.status)]">
                      {{ formatCurrency(table.session?.running_total ?? 0) }}
                    </span>
                    <div class="flex items-center gap-1 flex-shrink-0">
                      <span class="w-1.5 h-1.5 rounded-full" :class="dotClass(table.status)" aria-hidden="true" />
                      <span class="whitespace-nowrap" :class="[tableCardSecondaryTextClass, themeTimeClass(table.status)]">
                        {{ formatDuration(table.session.opened_at) }}
                      </span>
                      <template v-if="props.comandasEnabled && table.session?.unfired_count > 0">
                        <span class="relative flex h-2 w-2 flex-shrink-0" aria-hidden="true">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-state-danger-icon" />
                        </span>
                      </template>
                      <button
                        type="button"
                        class="min-h-7 min-w-7 flex items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 -me-0.5 text-text-tertiary"
                        :class="moveButtonClass(table.status)"
                        :aria-label="`Mover ${table.name} a otra ${tableSingularLower}`"
                        @click.stop="handleMoveTable(table, $event)"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <span class="uppercase tracking-wide" :class="[tableCardPrimaryTextClass, themeStatusLabelClass(table.status)]">
                    {{ t('pos.floor.free') }}
                  </span>
                </template>
              </div>
              <p
                v-if="waiterAttributionEnabled"
                class="w-full text-start min-h-[1rem]"
                :class="[tableCardTertiaryTextClass, themeWaiterClass(table.status), !table.effective_waiter_member_name && tableCardWaiterLine(table) && 'italic']"
              >
                {{ tableCardWaiterLine(table) || '\u00A0' }}
              </p>
            </div>
          </button>

        </div>
      </div>

      <UiResponsiveDataView
        v-else
        :columns="tableListColumns"
        :data="regularTables"
        item-key="id"
        :empty-message="t('pos.floor.free')"
        row-size="sm"
        @row-click="handleTableClick"
      >
        <template #card="{ item }">
          <button
            type="button"
            class="flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left hover:bg-data-table-row-hover-bg disabled:opacity-60"
            :disabled="openingTableId === item.id"
            @click="handleTableClick(item)"
          >
            <p class="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{{ tableCardTitle(item) }}</p>
            <span class="flex-shrink-0 text-xs font-semibold uppercase text-text-secondary">{{ badgeLabel(item.status) }}</span>
            <p class="flex-shrink-0 text-sm font-semibold tabular-nums">
              {{ item.status === 'free' ? '—' : formatCurrency(item.session?.running_total ?? 0) }}
            </p>
          </button>
        </template>
        <template #cell-name="{ item }">
          <span class="font-semibold">{{ tableCardTitle(item) }}</span>
        </template>
        <template #cell-status="{ item }">
          {{ badgeLabel(item.status) }}
        </template>
        <template #cell-total="{ item }">
          <span class="tabular-nums">
            {{ item.status === 'free' ? '—' : formatCurrency(item.session?.running_total ?? 0) }}
          </span>
        </template>
      </UiResponsiveDataView>
      </template>
    </div>

  </div>
</template>

<style scoped>
.table-card {
  min-height: 8.75rem;
}

/* status-bg tokens are too faint + Tailwind /opacity doesn't apply to var() colors */
.table-card-body--free {
  background-color: color-mix(in oklch, var(--status-info-text) 9%, hsl(var(--surface)));
}

.table-card-footer--free {
  background-color: color-mix(in oklch, var(--status-info-text) 20%, hsl(var(--surface)));
}

.table-card-body--open {
  background-color: color-mix(in oklch, var(--status-success-text) 9%, hsl(var(--surface)));
}

.table-card-footer--open {
  background-color: color-mix(in oklch, var(--status-success-text) 20%, hsl(var(--surface)));
}

.table-card-body--bill {
  background-color: color-mix(in oklch, var(--status-warning-text) 10%, hsl(var(--surface)));
}

.table-card-footer--bill {
  background-color: color-mix(in oklch, var(--status-warning-text) 22%, hsl(var(--surface)));
}
</style>
