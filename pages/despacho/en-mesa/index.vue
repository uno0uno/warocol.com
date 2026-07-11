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

interface TableQrRequest {
  id: string
  table_id: string
  table_name: string
  items: Array<{ line_total?: number }>
  item_count: number
  payment_method?: string
  payment_method_group_name?: string | null
  payment_method_name?: string | null
  payment_display?: string | null
  created_at: string
  tenant_timezone?: string | null
}

interface TableQrRequestRow extends TableQrRequest {
  total_amount: number
}

interface TableGroup {
  table_id: string
  table_name: string
  requests: TableQrRequest[]
}

interface TableQrRequestsResponse {
  success: boolean
  data: {
    tables: TableGroup[]
    total_pending: number
    tenant_timezone?: string | null
  }
}

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const tableFilterId = ref('')

const sortField = ref('created_at')
const sortDirection = ref<'asc' | 'desc'>('desc')

const hasActiveFilters = computed(
  () => !!localSearchTerm.value || !!appliedSearch.value || !!tableFilterId.value,
)

const performSearch = () => applySearch()

const clearFilters = () => {
  clearSearch()
  tableFilterId.value = ''
  syncTableQuery()
}

const {
  data: pendingData,
  status: pendingStatus,
  asyncStatus: pendingAsyncStatus,
  error: fetchError,
  refetch: refetchPending,
} = useQuery({
  key: () => ['table-qr-requests', 'pending', currentTenant.value?.id],
  query: () => $fetch<TableQrRequestsResponse>(
    '/api/table-qr-requests',
    { params: { status: 'pending' } },
  ),
  enabled: () => !!currentTenant.value,
  staleTime: 15_000,
})

const isLoading = computed(() => pendingStatus.value === 'loading' || (!pendingData.value && !fetchError.value))
const isRefreshing = computed(() => pendingAsyncStatus.value === 'loading' && pendingData.value != null)
const tenantTimezone = computed(() => normalizeTimezone(pendingData.value?.data?.tenant_timezone ?? timezone.value))
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

const tableOptions = computed(() =>
  (pendingData.value?.data?.tables ?? []).map(t => ({
    id: t.table_id,
    name: t.table_name,
  })),
)
const tableHeaderOptions = computed(() =>
  tableOptions.value.map(t => ({
    value: t.id,
    label: t.name,
  })),
)

const requests = computed<TableQrRequestRow[]>(() =>
  (pendingData.value?.data?.tables ?? []).flatMap(t =>
    t.requests.map(r => ({
      ...r,
      total_amount: r.items.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0),
    })),
  ),
)

const filteredRequests = computed(() => {
  const q = appliedSearch.value.trim().toLowerCase()
  return requests.value.filter((r) => {
    if (tableFilterId.value && r.table_id !== tableFilterId.value) return false
    if (!q) return true
    return r.table_name.toLowerCase().includes(q)
  })
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
  { key: 'item_count', title: t('despacho.common.items'), sortable: true },
  { key: 'payment_method', title: t('despacho.common.payment'), sortable: true },
  { key: 'total_amount', title: t('despacho.common.total'), sortable: true },
])

const itemCountLabel = (count: number) =>
  t(count === 1 ? 'despacho.enMesa.itemCountOne' : 'despacho.enMesa.itemCountMany', { count })

function syncTableQuery() {
  const query = { ...route.query }
  if (tableFilterId.value) {
    query.table = tableFilterId.value
  } else {
    delete query.table
  }
  router.replace({ query })
}

watch(tableFilterId, () => {
  syncTableQuery()
})

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  const fromRoute = route.query.table as string | undefined
  if (fromRoute) tableFilterId.value = fromRoute
  setRefreshHandler(refetchPending)
})
onUnmounted(() => { clearRefreshHandler(refetchPending) })
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
            v-model="tableFilterId"
            :class="filterSelectClass"
            class="md:hidden"
            :aria-label="t('despacho.enMesa.filterTable')"
          >
            <option value="">{{ t('despacho.common.table') }}</option>
            <option v-for="t in tableOptions" :key="t.id" :value="t.id">
              {{ t.name }}
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
              class="flex items-center gap-3 py-3 px-3 border-b border-data-table-border cursor-pointer transition-colors hover:bg-data-table-row-hover-bg"
              :class="index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'"
              @click="viewRequest(item)"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-text-primary leading-tight truncate">
                  {{ item.table_name }}
                </p>
                <p class="text-xs text-text-secondary mt-0.5">
                  {{ itemCountLabel(item.item_count) }}
                  · {{ formatRequestDateTime(item.created_at) }}
                  <span v-if="formatTableQrPayment(item) !== '—'"> · {{ formatTableQrPayment(item) }}</span>
                </p>
              </div>
              <span class="text-sm font-bold text-primary flex-shrink-0">
                {{ formatCurrency(item.total_amount) }}
              </span>
            </div>
          </template>

          <template #cell-table_name="{ value }">
            <span class="text-sm font-semibold text-text-primary">{{ value }}</span>
          </template>
          <template #cell-created_at="{ value }">
            <span class="text-sm text-text-secondary">{{ formatRequestDateTime(value) }}</span>
          </template>
          <template #cell-item_count="{ value }">
            <span class="text-sm text-text-secondary">{{ value }}</span>
          </template>
          <template #cell-payment_method="{ item }">
            <span class="text-sm text-text-secondary">{{ formatTableQrPayment(item) }}</span>
          </template>
          <template #cell-total_amount="{ value }">
            <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
          </template>
        </UiResponsiveDataView>
    </div>
  </div>
</template>
