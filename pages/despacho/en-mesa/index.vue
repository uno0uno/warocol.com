<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import { formatTableQrPayment } from '~/composables/formatTableQrPayment'
import { normalizeTimezone } from '~/utils/bogotaDate'

definePageMeta({ layout: 'dashboard', module: 'despacho' })

const { t } = useI18n({ useScope: 'global' })

useHead({ title: () => t('despacho.head.enMesa') })

const route = useRoute()
const router = useRouter()
const { formatCurrency, numberLocaleTag } = useFormatters()
const { currentTenant } = useTenantReactive()
const { timezone } = useTenantTimezone()

interface TableQrRequestRow {
  id: string
  table_id: string
  table_name: string
  status: string
  items: Array<{ line_total?: number }>
  item_count: number
  total_amount: number
  payment_method?: string
  payment_method_group_name?: string | null
  payment_method_name?: string | null
  payment_display?: string | null
  created_at: string
  accepted_at?: string | null
  rejected_at?: string | null
  tenant_timezone?: string | null
}

interface TableOption {
  table_id: string
  table_name: string
}

interface TableQrRequestsResponse {
  success: boolean
  data: {
    requests?: TableQrRequestRow[]
    tables?: TableOption[]
    total_pending: number
    tenant_timezone?: string | null
  }
  pagination?: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

const PAGE_SIZE = 25
const currentPage = ref(1)
const statusFilter = ref<string>('pending')

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const tableFilterId = ref('')

const sortField = ref('created_at')
const sortDirection = ref<'asc' | 'desc'>('desc')

const statusLabel = (status: string) => {
  const key = `despacho.orderStatuses.${status}`
  const translated = t(key)
  return translated === key ? status : translated
}

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!tableFilterId.value
    || statusFilter.value !== 'pending',
)

const performSearch = () => applySearch(() => { currentPage.value = 1 })

const clearFilters = () => {
  clearSearch()
  tableFilterId.value = ''
  statusFilter.value = 'pending'
  currentPage.value = 1
  syncTableQuery()
}

const {
  data: listData,
  status: listStatus,
  asyncStatus: listAsyncStatus,
  error: fetchError,
  refetch: refetchList,
} = useQuery({
  key: () => ['table-qr-requests', currentTenant.value?.id, {
    status: statusFilter.value,
    limit: PAGE_SIZE,
    offset: (currentPage.value - 1) * PAGE_SIZE,
    tableId: tableFilterId.value || null,
  }],
  query: () => $fetch<TableQrRequestsResponse>(
    '/api/table-qr-requests',
    {
      params: {
        status: statusFilter.value,
        limit: PAGE_SIZE,
        offset: (currentPage.value - 1) * PAGE_SIZE,
        grouped: false,
        table_id: tableFilterId.value || undefined,
      },
    },
  ),
  enabled: () => !!currentTenant.value,
  staleTime: 15_000,
})

const isLoading = computed(() => listStatus.value === 'loading' || (!listData.value && !fetchError.value))
const isRefreshing = computed(() => listAsyncStatus.value === 'loading' && listData.value != null)
const tenantTimezone = computed(() => normalizeTimezone(listData.value?.data?.tenant_timezone ?? timezone.value))
const tenantDateTimeFormatter = computed(() => new Intl.DateTimeFormat(numberLocaleTag.value, {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: tenantTimezone.value,
}))
const formatRequestDateTime = (value: string | null | undefined) =>
  value ? tenantDateTimeFormatter.value.format(new Date(value)) : t('despacho.common.notSpecified')

const tableOptions = computed(() => listData.value?.data?.tables ?? [])
const tableHeaderOptions = computed(() =>
  tableOptions.value.map(t => ({
    value: t.table_id,
    label: t.table_name,
  })),
)

const requests = computed<TableQrRequestRow[]>(() => listData.value?.data?.requests ?? [])

const listTotal = computed(() => listData.value?.pagination?.total ?? 0)
const listTotalPages = computed(() => Math.max(1, Math.ceil(listTotal.value / PAGE_SIZE)))
const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, listTotalPages.value))
}

watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })
watch([statusFilter, tableFilterId], () => { currentPage.value = 1 })

const filteredRequests = computed(() => {
  const q = appliedSearch.value.trim().toLowerCase()
  if (!q) return requests.value
  return requests.value.filter(r => r.table_name.toLowerCase().includes(q))
})

const sortedRequests = computed(() => {
  const list = [...filteredRequests.value]
  const field = sortField.value
  const dir = sortDirection.value === 'asc' ? 1 : -1

  list.sort((a, b) => {
    const av = a[field as keyof TableQrRequestRow]
    const bv = b[field as keyof TableQrRequestRow]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (field === 'created_at') {
      return (new Date(String(av)).getTime() - new Date(String(bv)).getTime()) * dir
    }
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })

  return list
})

const columns = computed<Column[]>(() => [
  { key: 'table_name', title: t('despacho.common.table'), sortable: true },
  { key: 'created_at', title: t('despacho.common.date'), sortable: true },
  { key: 'status', title: t('despacho.common.status'), sortable: false },
  { key: 'item_count', title: t('despacho.common.items'), sortable: true },
  { key: 'payment_method', title: t('despacho.common.payment'), sortable: true },
  { key: 'total_amount', title: t('despacho.common.total'), sortable: true },
])

const itemCountLabel = (count: number) =>
  t(count === 1 ? 'despacho.enMesa.itemCountOne' : 'despacho.enMesa.itemCountMany', { count })

const paymentLabel = (row: TableQrRequestRow) => formatTableQrPayment(row, { t })

const statusBadgeVariant = (status: string) => {
  if (status === 'accepted') return 'success'
  if (status === 'rejected') return 'destructive'
  return 'warning'
}

function syncTableQuery() {
  const query = { ...route.query }
  if (tableFilterId.value) {
    query.table = tableFilterId.value
  } else {
    delete query.table
  }
  if (statusFilter.value && statusFilter.value !== 'pending') {
    query.status = statusFilter.value
  } else {
    delete query.status
  }
  router.replace({ query })
}

watch([tableFilterId, statusFilter], () => {
  syncTableQuery()
})

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  const fromRoute = route.query.table as string | undefined
  if (fromRoute) tableFilterId.value = fromRoute
  const statusFromRoute = route.query.status as string | undefined
  if (statusFromRoute && ['pending', 'accepted', 'rejected', 'all'].includes(statusFromRoute)) {
    statusFilter.value = statusFromRoute
  }
  setRefreshHandler(refetchList)
})
onUnmounted(() => { clearRefreshHandler(refetchList) })
registerProgressiveLoading(isRefreshing)

const handleSort = (event: string | { field: string; direction?: 'asc' | 'desc' }) => {
  const field = typeof event === 'string' ? event : event.field
  const direction = typeof event === 'string'
    ? (sortField.value === event && sortDirection.value === 'asc' ? 'desc' : 'asc')
    : event.direction ?? 'asc'
  sortField.value = field
  sortDirection.value = direction
}

const viewRequest = (request: TableQrRequestRow) => {
  navigateTo(`/despacho/en-mesa/${request.id}`)
}
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="flex flex-col gap-3 md:gap-4">
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        :search-fields="[]"
        :show-date-range="false"
        :search-placeholder="t('despacho.common.searchTable')"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="statusFilter"
            :class="filterSelectClass"
            :aria-label="t('despacho.enMesa.filterStatus')"
          >
            <option value="pending">{{ statusLabel('pending') }}</option>
            <option value="accepted">{{ statusLabel('accepted') }}</option>
            <option value="rejected">{{ statusLabel('rejected') }}</option>
            <option value="all">{{ t('despacho.enMesa.filterStatusAll') }}</option>
          </select>
          <select
            v-model="tableFilterId"
            :class="filterSelectClass"
            class="md:hidden"
            :aria-label="t('despacho.enMesa.filterTable')"
          >
            <option value="">{{ t('despacho.common.table') }}</option>
            <option v-for="opt in tableOptions" :key="opt.table_id" :value="opt.table_id">
              {{ opt.table_name }}
            </option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <UiResponsiveDataView
        row-size="sm"
        :columns="columns"
        :data="sortedRequests"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        :empty-message="t('despacho.enMesa.emptyTitle')"
        :empty-sub-message="t('despacho.enMesa.emptySub')"
        variant="default"
        @sort="handleSort"
        @row-click="viewRequest"
      >
        <template #header-table_name>
          <UiTableHeaderFilter
            v-model="tableFilterId"
            :title="t('despacho.common.table')"
            column-key="table_name"
            sortable
            :sort-field="sortField"
            :sort-direction="sortDirection"
            filter-type="select"
            :options="tableHeaderOptions"
            :all-label="t('despacho.common.allFemale')"
            @sort="handleSort"
          />
        </template>

        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            @click="viewRequest(item)"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-text-primary leading-tight truncate">
                {{ item.table_name }}
              </p>
              <p class="text-xs text-text-secondary mt-0.5">
                {{ itemCountLabel(item.item_count) }}
                · {{ formatRequestDateTime(item.created_at) }}
                <span v-if="paymentLabel(item) !== '—'"> · {{ paymentLabel(item) }}</span>
              </p>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <UiStatusBadge :variant="statusBadgeVariant(item.status)" size="sm" format="text">
                {{ statusLabel(item.status) }}
              </UiStatusBadge>
              <span class="text-sm font-bold text-text-primary tabular-nums">
                {{ formatCurrency(item.total_amount) }}
              </span>
            </div>
          </div>
        </template>

        <template #cell-table_name="{ value }">
          <span class="text-sm font-semibold text-text-primary">{{ value }}</span>
        </template>
        <template #cell-created_at="{ value }">
          <span class="text-sm text-text-secondary">{{ formatRequestDateTime(value) }}</span>
        </template>
        <template #cell-status="{ value }">
          <UiStatusBadge :variant="statusBadgeVariant(value)" size="sm" format="text">
            {{ statusLabel(value) }}
          </UiStatusBadge>
        </template>
        <template #cell-item_count="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>
        <template #cell-payment_method="{ item }">
          <span class="text-sm text-text-secondary">{{ paymentLabel(item) }}</span>
        </template>
        <template #cell-total_amount="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
        </template>
      </UiResponsiveDataView>

      <div v-if="listTotal > 0" class="flex items-center justify-end px-1 py-2">
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage <= 1"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.primeraPagina')"
            @click="goToPage(1)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button
            :disabled="currentPage <= 1"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaAnterior')"
            @click="goToPage(currentPage - 1)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ currentPage }}</span>
          <button
            :disabled="currentPage >= listTotalPages"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaSiguiente')"
            @click="goToPage(currentPage + 1)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            :disabled="currentPage >= listTotalPages"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.ultimaPagina')"
            @click="goToPage(listTotalPages)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
