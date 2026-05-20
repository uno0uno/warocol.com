<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({ layout: 'dashboard' })

useHead({ title: 'Pedidos en mesa (QR) — WARO' })

const route = useRoute()
const router = useRouter()
const { formatCurrency, formatDateTime } = useFormatters()
const { currentTenant } = useTenantReactive()

interface TableQrRequest {
  id: string
  table_id: string
  table_name: string
  items: Array<{ line_total?: number }>
  item_count: number
  payment_method?: string
  created_at: string
}

interface TableQrRequestRow extends TableQrRequest {
  total_amount: number
}

interface TableGroup {
  table_id: string
  table_name: string
  requests: TableQrRequest[]
}

const sortField = ref('created_at')
const sortDirection = ref<'asc' | 'desc'>('desc')

const {
  data: pendingData,
  status: pendingStatus,
  asyncStatus: pendingAsyncStatus,
  error: fetchError,
  refetch: refetchPending,
} = useQuery({
  key: () => ['table-qr-requests', 'pending', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { tables: TableGroup[]; total_pending: number } }>(
    '/api/table-qr-requests',
    { params: { status: 'pending' } },
  ),
  enabled: () => !!currentTenant.value,
  staleTime: 15_000,
})

const isLoading = computed(() => pendingStatus.value === 'loading' || (!pendingData.value && !fetchError.value))
const isRefreshing = computed(() => pendingAsyncStatus.value === 'loading' && pendingData.value != null)

const requests = computed<TableQrRequestRow[]>(() =>
  (pendingData.value?.data?.tables ?? []).flatMap(t =>
    t.requests.map(r => ({
      ...r,
      total_amount: r.items.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0),
    })),
  ),
)

const tableFilterId = computed(() => route.query.table as string | undefined)

const filterTableName = computed(() => {
  if (!tableFilterId.value) return null
  return requests.value.find(r => r.table_id === tableFilterId.value)?.table_name ?? null
})

const filteredRequests = computed(() => {
  if (!tableFilterId.value) return requests.value
  return requests.value.filter(r => r.table_id === tableFilterId.value)
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
    return String(av).localeCompare(String(bv), 'es') * dir
  })

  return list
})

const columns: Column[] = [
  { key: 'table_name', title: 'Mesa', sortable: true },
  { key: 'created_at', title: 'Fecha', sortable: true },
  { key: 'item_count', title: 'Items', sortable: true },
  { key: 'payment_method', title: 'Pago', sortable: true },
  { key: 'total_amount', title: 'Total', sortable: true },
]

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refetchPending) })
onUnmounted(() => { clearRefreshHandler(refetchPending) })
registerProgressiveLoading(isRefreshing)

const handleSort = ({ field, direction }: { field: string; direction: 'asc' | 'desc' }) => {
  sortField.value = field
  sortDirection.value = direction
}

const viewRequest = (request: TableQrRequestRow) => {
  navigateTo(`/despacho/en-mesa/${request.id}`)
}

function clearTableFilter() {
  const { table: _table, ...rest } = route.query
  router.replace({ query: rest })
}
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else>
      <div
        v-if="tableFilterId && filterTableName"
        class="flex flex-wrap items-center gap-2 mb-1"
      >
        <span class="text-sm text-text-secondary">
          Filtrando: <span class="font-medium text-text-primary">{{ filterTableName }}</span>
        </span>
        <button
          type="button"
          class="text-sm text-primary hover:underline"
          @click="clearTableFilter"
        >
          Ver todos
        </button>
      </div>

      <HealthSemaphore :is-unlocked="true" title="Pedidos en mesa (QR)">
        <UiResponsiveDataView
          row-size="sm"
          :columns="columns"
          :data="sortedRequests"
          :sort-field="sortField"
          :sort-direction="sortDirection"
          empty-message="Sin pedidos pendientes."
          empty-sub-message="Los nuevos pedidos QR aparecerán aquí."
          variant="default"
          @sort="handleSort"
          @row-click="viewRequest"
        >
          <template #card="{ item, index }">
            <div
              class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
              :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
              @click="viewRequest(item)"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-text-primary leading-tight truncate">
                  {{ item.table_name }}
                </p>
                <p class="text-xs text-text-secondary mt-0.5">
                  {{ item.item_count }} item{{ item.item_count !== 1 ? 's' : '' }}
                  · {{ formatDateTime(item.created_at) }}
                  <span v-if="item.payment_method"> · {{ item.payment_method }}</span>
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
            <span class="text-sm text-text-secondary">{{ formatDateTime(value) }}</span>
          </template>
          <template #cell-item_count="{ value }">
            <span class="text-sm text-text-secondary">{{ value }}</span>
          </template>
          <template #cell-payment_method="{ value }">
            <span class="text-sm text-text-secondary">{{ value ?? '—' }}</span>
          </template>
          <template #cell-total_amount="{ value }">
            <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
          </template>
        </UiResponsiveDataView>
      </HealthSemaphore>
    </div>
  </div>
</template>
