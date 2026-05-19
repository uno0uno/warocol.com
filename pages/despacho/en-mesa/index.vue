<script setup lang="ts">
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({ layout: 'dashboard' })

useHead({ title: 'Pedidos en mesa (QR) — WARO' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const cache = useQueryCache()
const { formatCurrency, formatDateTime } = useFormatters()
const { currentTenant } = useTenantReactive()

interface TableQrRequest {
  id: string
  table_id: string
  table_name: string
  items: Array<{
    product_id: string
    quantity: number
    notes?: string
    modifiers?: Array<{ id: string; name: string; price?: number }>
    line_total?: number
  }>
  item_count: number
  payment_method?: string
  customer_notes?: string
  created_at: string
}

interface TableGroup {
  table_id: string
  table_name: string
  requests: TableQrRequest[]
}

const {
  data: pendingData,
  status: pendingStatus,
  error: pendingError,
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

const tables = computed(() => pendingData.value?.data?.tables ?? [])
const totalPending = computed(() => pendingData.value?.data?.total_pending ?? 0)

const activeTableId = ref<string | null>(null)
const selectedIds = ref<string[]>([])
const isBulkWorking = ref(false)

const activeTable = computed(() =>
  tables.value.find(t => t.table_id === activeTableId.value) ?? null,
)

const allTableSelected = computed(() => {
  const ids = activeTable.value?.requests.map(r => r.id) ?? []
  return ids.length > 0 && ids.every(id => selectedIds.value.includes(id))
})

function selectTable(tableId: string) {
  activeTableId.value = tableId
  const table = tables.value.find(t => t.table_id === tableId)
  selectedIds.value = table?.requests.map(r => r.id) ?? []
  router.replace({ query: { ...route.query, table: tableId } })
}

function toggleRequest(id: string) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter(i => i !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAllTable() {
  const ids = activeTable.value?.requests.map(r => r.id) ?? []
  selectedIds.value = allTableSelected.value ? [] : [...ids]
}

function requestLineTotal(req: TableQrRequest): number {
  return req.items.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0)
}

function tablePendingTotal(table: TableGroup): number {
  return table.requests.reduce((sum, r) => sum + requestLineTotal(r), 0)
}

function invalidateAfterAction() {
  cache.invalidateQueries({ key: ['table-qr-requests'] })
  cache.invalidateQueries({ key: ['tables'] })
  cache.invalidateQueries({ key: ['pos'] })
  cache.invalidateQueries({ key: ['comandas-monitor'] })
}

async function acceptSelected() {
  if (!selectedIds.value.length) return
  isBulkWorking.value = true
  try {
    const res = await $fetch<{ success: boolean; data: { order_number?: number } }>(
      '/api/table-qr-requests/bulk-accept',
      { method: 'POST', body: { request_ids: selectedIds.value } },
    )
    toast.success(
      res.data?.order_number
        ? `Pedidos aceptados — comanda #${res.data.order_number}`
        : 'Pedidos aceptados',
      { title: 'Listo' },
    )
    selectedIds.value = []
    await refetchPending()
    invalidateAfterAction()
    if (tables.value.length) {
      selectTable(tables.value[0].table_id)
    } else {
      activeTableId.value = null
      router.replace({ query: {} })
    }
  } catch (err: any) {
    const detail = err?.data?.detail
    toast.error(typeof detail === 'string' ? detail : detail?.message ?? 'No se pudo aceptar', { title: 'Error' })
  } finally {
    isBulkWorking.value = false
  }
}

async function rejectSelected() {
  if (!selectedIds.value.length) return
  isBulkWorking.value = true
  try {
    for (const id of selectedIds.value) {
      await $fetch(`/api/table-qr-requests/${id}/reject`, { method: 'PATCH' })
    }
    toast.success('Pedidos rechazados', { title: 'Listo' })
    selectedIds.value = []
    await refetchPending()
    if (activeTable.value?.requests.length) {
      selectTable(activeTableId.value!)
    } else if (tables.value.length) {
      selectTable(tables.value[0].table_id)
    } else {
      activeTableId.value = null
    }
  } catch (err: any) {
    toast.error(err?.data?.detail ?? 'No se pudo rechazar', { title: 'Error' })
  } finally {
    isBulkWorking.value = false
  }
}

watch(tables, (list) => {
  if (!list.length) {
    activeTableId.value = null
    selectedIds.value = []
    return
  }
  const fromQuery = route.query.table as string | undefined
  const target = fromQuery && list.some(t => t.table_id === fromQuery)
    ? fromQuery
    : activeTableId.value && list.some(t => t.table_id === activeTableId.value)
      ? activeTableId.value
      : list[0].table_id
  if (target && target !== activeTableId.value) {
    selectTable(target)
  } else if (target) {
    const table = list.find(t => t.table_id === target)
    selectedIds.value = table?.requests.map(r => r.id) ?? []
  }
}, { immediate: true })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refetchPending) })
onUnmounted(() => { clearRefreshHandler(refetchPending) })
registerProgressiveLoading(computed(() => pendingStatus.value === 'pending' && !!pendingData.value))
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <p class="text-sm text-text-secondary">
      Pedidos enviados por QR de mesa. Al aceptar, se agregan al tab del POS y se envían a cocina.
    </p>

    <div v-if="pendingStatus === 'pending' && !pendingData" class="flex justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="pendingError" />

    <div v-else-if="tables.length === 0" class="text-center py-16 px-4">
      <div class="text-5xl mb-3">✓</div>
      <h2 class="text-lg font-semibold text-foreground">Sin pedidos pendientes</h2>
      <p class="text-sm text-muted-foreground mt-1">Los nuevos pedidos QR aparecerán aquí.</p>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        <span>{{ totalPending }} pedido{{ totalPending !== 1 ? 's' : '' }} pendiente{{ totalPending !== 1 ? 's' : '' }}</span>
        <span>·</span>
        <span>{{ tables.length }} mesa{{ tables.length !== 1 ? 's' : '' }}</span>
      </div>

      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 -translate-y-2"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="selectedIds.length > 0"
          class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5"
        >
          <span class="text-sm font-semibold">
            {{ selectedIds.length }} seleccionado{{ selectedIds.length !== 1 ? 's' : '' }}
          </span>
          <div class="flex-1" />
          <button
            type="button"
            class="h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50"
            :disabled="isBulkWorking"
            @click="acceptSelected"
          >
            Aceptar
          </button>
          <button
            type="button"
            class="h-9 px-4 rounded-lg text-sm font-medium border border-destructive text-destructive disabled:opacity-50"
            :disabled="isBulkWorking"
            @click="rejectSelected"
          >
            Rechazar
          </button>
        </div>
      </Transition>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-4 flex flex-col gap-2">
          <button
            v-for="table in tables"
            :key="table.table_id"
            type="button"
            class="w-full text-left px-4 py-3 rounded-xl border-2 transition-colors"
            :class="table.table_id === activeTableId
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary/40'"
            @click="selectTable(table.table_id)"
          >
            <div class="flex justify-between items-start gap-2">
              <span class="font-semibold text-foreground">{{ table.table_name }}</span>
              <span class="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                {{ table.requests.length }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              {{ formatCurrency(tablePendingTotal(table)) }}
            </p>
          </button>
        </div>

        <div v-if="activeTable" class="lg:col-span-8">
          <div class="bg-card border-2 border-border rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <h2 class="font-bold text-foreground">{{ activeTable.table_name }}</h2>
              <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  class="sr-only peer"
                  :checked="allTableSelected"
                  @change="toggleSelectAllTable"
                >
                <span class="w-5 h-5 rounded border-2 border-border peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center text-white text-xs">✓</span>
                Todos
              </label>
            </div>

            <div class="divide-y divide-border">
              <div
                v-for="req in activeTable.requests"
                :key="req.id"
                class="px-4 py-3 flex gap-3"
              >
                <label class="flex-shrink-0 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    class="sr-only peer"
                    :checked="selectedIds.includes(req.id)"
                    @change="toggleRequest(req.id)"
                  >
                  <span class="w-5 h-5 rounded border-2 border-border peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center text-white text-xs">✓</span>
                </label>
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between gap-2 text-sm">
                    <span class="text-muted-foreground">{{ formatDateTime(req.created_at) }}</span>
                    <span class="font-semibold">{{ formatCurrency(requestLineTotal(req)) }}</span>
                  </div>
                  <ul class="mt-2 space-y-1 text-sm">
                    <li v-for="(item, idx) in req.items" :key="idx">
                      <span class="font-medium">{{ item.quantity }}×</span>
                      <span v-if="item.modifiers?.length" class="text-muted-foreground text-xs">
                        (+ {{ item.modifiers.map(m => m.name).join(', ') }})
                      </span>
                      <span v-if="item.notes" class="block text-xs italic text-muted-foreground">{{ item.notes }}</span>
                    </li>
                  </ul>
                  <p v-if="req.payment_method" class="text-xs text-muted-foreground mt-2">
                    Pago: {{ req.payment_method }}
                  </p>
                  <p v-if="req.customer_notes" class="text-xs mt-1 italic">{{ req.customer_notes }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
