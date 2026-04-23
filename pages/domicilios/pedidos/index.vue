<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({
  layout: 'dashboard'
})

const { formatDateTime, formatCurrency } = useFormatters()
const { currentTenant, businessProfile } = useTenantReactive()

useHead({
  title: computed(() =>
    businessProfile.value?.comandas_enabled
      ? 'Pedidos & Comandas — WARO'
      : 'Pedidos Online — WARO'
  )
})

const comandasEnabled = computed(() => businessProfile.value?.comandas_enabled === true)

// ── Mode B: Comanda monitor ─────────────────────────────────────────────────
const SOURCE_FILTERS = [
  { value: 'all',      label: 'Todas' },
  { value: 'table',    label: 'Mesas' },
  { value: 'pos',      label: 'Mostrador' },
  { value: 'delivery', label: 'Domicilios' },
  { value: 'pickup',   label: 'Recogidas' },
]
const STATUS_FILTERS = [
  { value: 'active',    label: 'Activas' },
  { value: 'ready',     label: 'Listas' },
  { value: 'delivered', label: 'Entregadas' },
]

const SOURCE_LABELS: Record<string, string> = {
  table:    'Mesa',
  pos:      'Mostrador',
  delivery: 'Domicilio',
  pickup:   'Recogida',
}

const COMANDA_STATUS_LABELS: Record<string, string> = {
  pending:   'Pendiente',
  preparing: 'En preparación',
  ready:     'Lista',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

const sourceFilter = ref('all')
const statusFilter = ref('active')

const comandaColumns: Column[] = [
  { key: 'comanda_number',    title: '#',        sortable: false },
  { key: 'source_type',       title: 'Origen',   sortable: false },
  { key: 'table_display_name',title: 'Destino',  sortable: false },
  { key: 'status',            title: 'Estado',   sortable: false },
  { key: 'items',             title: 'Items',    sortable: false },
  { key: 'elapsed_seconds',   title: 'Tiempo',   sortable: false },
  { key: '_actions',          title: '',         sortable: false },
]

const statusParam = computed(() => {
  if (statusFilter.value === 'active') return 'pending,preparing,ready'
  return statusFilter.value
})

const {
  data: comandasData,
  status: comandasStatus,
  asyncStatus: comandasAsyncStatus,
  refetch: refetchComandas,
} = useQuery({
  key: () => ['comandas-monitor', currentTenant.value?.id, sourceFilter.value, statusFilter.value],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/comandas', {
    params: {
      status: statusParam.value,
      ...(sourceFilter.value !== 'all' ? { source_type: sourceFilter.value } : {}),
    }
  }),
  enabled: () => !!currentTenant.value && comandasEnabled.value,
  staleTime: 30_000,
})

const comandas = computed(() => comandasData.value?.data ?? [])
const isLoadingComandas = computed(() => comandasStatus.value === 'loading')
const isRefreshingComandas = computed(() => comandasAsyncStatus.value === 'loading' && comandasData.value != null)

// ── Mode A: Online orders ───────────────────────────────────────────────────
const sortField = ref('order_date')
const sortDirection = ref<'asc' | 'desc'>('desc')

const {
  data: ordersData,
  status: ordersStatus,
  asyncStatus: ordersAsyncStatus,
  error: fetchError,
  refetch: refetchOrders,
} = useQuery({
  key: () => ['online-orders', currentTenant.value?.id, {
    sortField: sortField.value,
    sortDirection: sortDirection.value,
  }],
  query: () => $fetch('/api/online/orders', {
    params: {
      sort_field: sortField.value,
      sort_direction: sortDirection.value
    }
  }),
  enabled: () => !!currentTenant.value && !comandasEnabled.value,
  staleTime: 30_000,
})

const isLoadingOrders = computed(() => ordersStatus.value === 'loading')
const isRefreshingOrders = computed(() => ordersAsyncStatus.value === 'loading' && ordersData.value != null)

const orders = computed(() => {
  if (!ordersData.value?.data) return []
  return ordersData.value.data
})

// ── Progressive loading + refresh button — picks active mode ───────────────
const isRefreshing = computed(() =>
  comandasEnabled.value ? isRefreshingComandas.value : isRefreshingOrders.value
)

// Stable function reference — required for clearRefreshHandler reference equality check
const handleRefetch = () => {
  if (comandasEnabled.value) refetchComandas()
  else refetchOrders()
}

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(handleRefetch) })
onUnmounted(() => { clearRefreshHandler(handleRefetch) })
registerProgressiveLoading(isRefreshing)

// ── Mode A helpers ──────────────────────────────────────────────────────────
const columns: Column[] = [
  { key: 'order_number',   title: '# Pedido',   sortable: true },
  { key: 'order_date',     title: 'Fecha',       sortable: true },
  { key: 'scheduled_time', title: 'Programado',  sortable: true },
  { key: 'order_type',     title: 'Tipo',        sortable: true },
  { key: 'status',         title: 'Estado',      sortable: false },
  { key: 'total_amount',   title: 'Total',       sortable: true },
  { key: 'verified_email', title: 'Cliente',     sortable: true }
]

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery:  'Domicilio',
  pickup:    'Recogida',
  'dine-in': 'En mesa'
}

const { getStatusText, getStatusVariant } = useOnlineOrderStatus()

// ── Mode B helpers ──────────────────────────────────────────────────────────
const updatingComandaId = ref<string | null>(null)

const formatElapsed = (seconds: number | null): string => {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

const getComandaStatusVariant = (status: string): string => {
  const map: Record<string, string> = {
    pending:   'warning',
    preparing: 'info',
    ready:     'success',
    delivered: 'default',
    cancelled: 'error',
  }
  return map[status] ?? 'default'
}

const getAlertVariant = (alertLevel: number, status: string): string => {
  if (status === 'ready') return 'success'
  if (alertLevel >= 2) return 'error'
  if (alertLevel >= 1) return 'warning'
  return 'default'
}

const updateComandaStatus = async (comanda: any, newStatus: string) => {
  if (updatingComandaId.value) return
  updatingComandaId.value = comanda.id
  try {
    await $fetch(`/api/api/comandas/${comanda.id}/status`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    refetchComandas()
  } catch {
    // silent — toast is overkill here
  } finally {
    updatingComandaId.value = null
  }
}

const handleSort = ({ field, direction }: { field: string; direction: 'asc' | 'desc' }) => {
  sortField.value = field
  sortDirection.value = direction
}

const viewOrder = (order: any) => {
  navigateTo(`/domicilios/pedidos/${order.id}`)
}
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">

    <!-- ── MODE B: Comanda monitor (comandas_enabled = true) ── -->
    <template v-if="comandasEnabled">

      <!-- Filter bar -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Source filter -->
        <div class="flex items-center gap-1 bg-surface-secondary p-1 rounded-lg border border-border">
          <button
            v-for="f in SOURCE_FILTERS"
            :key="f.value"
            type="button"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[36px]"
            :class="sourceFilter === f.value
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:bg-surface-tertiary'"
            @click="sourceFilter = f.value"
          >
            {{ f.label }}
          </button>
        </div>

        <!-- Status filter -->
        <div class="flex items-center gap-1 bg-surface-secondary p-1 rounded-lg border border-border">
          <button
            v-for="s in STATUS_FILTERS"
            :key="s.value"
            type="button"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[36px]"
            :class="statusFilter === s.value
              ? 'bg-surface border border-border shadow-sm text-text-primary'
              : 'text-text-secondary hover:bg-surface-tertiary'"
            @click="statusFilter = s.value"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingComandas" class="flex items-center justify-center min-h-[400px]">
        <CommonsTheCustomLoader size="large" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!comandas.length"
        class="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-surface/50 border border-border rounded-2xl"
      >
        <div class="w-16 h-16 bg-titan-100 rounded-full flex items-center justify-center mb-4 text-titan-500">
          <Icon name="lucide:check-circle-2" size="32" />
        </div>
        <h3 class="text-lg font-bold text-text-primary">Todo al día</h3>
        <p class="text-sm text-text-secondary mt-1">
          No hay pedidos
          <template v-if="sourceFilter !== 'all'">
            de {{ SOURCE_FILTERS.find(f => f.value === sourceFilter)?.label?.toLowerCase() }}
          </template>
          {{ statusFilter === 'active' ? 'activos' : statusFilter === 'ready' ? 'listos' : 'entregados' }} en este momento.
        </p>
      </div>

      <!-- Comanda table -->
      <UiResponsiveDataView
        v-else
        row-size="sm"
        :columns="comandaColumns"
        :data="comandas"
        empty-message="No hay comandas."
        variant="default"
      >
        <!-- Mobile card -->
        <template #card="{ item }">
          <div
            class="flex items-start gap-3 py-3 px-3 border-b border-border"
            :class="[
              item.alert_level >= 2 ? 'bg-destructive/5' :
              item.alert_level >= 1 ? 'bg-warning/5' :
              item.status === 'ready' ? 'bg-success/5' : ''
            ]"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-black text-text-primary leading-tight">
                <span class="text-primary">#{{ String(item.comanda_number).padStart(3, '0') }}</span>
                <span class="text-text-secondary font-normal"> · {{ item.table_display_name }}</span>
              </p>
              <p class="text-xs text-text-secondary mt-0.5">
                {{ SOURCE_LABELS[item.source_type] ?? item.source_type }}
                · {{ item.items?.filter((i: any) => i.status !== 'cancelled').length ?? 0 }} items
              </p>
              <div class="flex items-center gap-2 mt-1.5">
                <UiStatusBadge :variant="getComandaStatusVariant(item.status)" size="sm" format="text">
                  {{ COMANDA_STATUS_LABELS[item.status] ?? item.status }}
                </UiStatusBadge>
                <span
                  class="text-xs font-bold"
                  :class="item.alert_level >= 2 ? 'text-destructive' : item.alert_level >= 1 ? 'text-warning' : 'text-text-secondary'"
                >
                  {{ formatElapsed(item.elapsed_seconds) }}
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-1 flex-shrink-0">
              <button
                v-if="item.status === 'pending'"
                :disabled="updatingComandaId === item.id"
                class="h-8 px-3 rounded-lg bg-primary text-white text-xs font-black disabled:opacity-50"
                @click="updateComandaStatus(item, 'preparing')"
              >Empezar</button>
              <button
                v-else-if="item.status === 'preparing'"
                :disabled="updatingComandaId === item.id"
                class="h-8 px-3 rounded-lg bg-success text-white text-xs font-black disabled:opacity-50"
                @click="updateComandaStatus(item, 'ready')"
              >Listo</button>
              <button
                v-else-if="item.status === 'ready'"
                :disabled="updatingComandaId === item.id"
                class="h-8 px-3 rounded-lg bg-success text-white text-xs font-black disabled:opacity-50"
                @click="updateComandaStatus(item, 'delivered')"
              >Entregar</button>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-comanda_number="{ value }">
          <span class="text-sm font-black text-text-primary">#{{ String(value).padStart(3, '0') }}</span>
        </template>
        <template #cell-source_type="{ value }">
          <UiStatusBadge variant="info" size="sm" format="text">
            {{ SOURCE_LABELS[value] ?? value }}
          </UiStatusBadge>
        </template>
        <template #cell-table_display_name="{ value }">
          <span class="text-sm text-text-primary font-medium">{{ value }}</span>
        </template>
        <template #cell-status="{ value }">
          <UiStatusBadge :variant="getComandaStatusVariant(value)" size="sm" format="text">
            {{ COMANDA_STATUS_LABELS[value] ?? value }}
          </UiStatusBadge>
        </template>
        <template #cell-items="{ value, row }">
          <span class="text-sm text-text-secondary">
            {{ value?.filter((i: any) => i.status !== 'cancelled').length ?? 0 }}
            <span
              v-if="value?.some((i: any) => i.notes)"
              class="ml-1 text-amber-500"
              title="Tiene notas"
            >📝</span>
          </span>
        </template>
        <template #cell-elapsed_seconds="{ value, row }">
          <span
            class="text-sm font-bold tabular-nums"
            :class="row.alert_level >= 2 ? 'text-destructive' : row.alert_level >= 1 ? 'text-warning' : 'text-text-secondary'"
          >{{ formatElapsed(value) }}</span>
        </template>
        <template #cell-_actions="{ row }">
          <div class="flex items-center gap-1">
            <button
              v-if="row.status === 'pending'"
              :disabled="updatingComandaId === row.id"
              class="h-7 px-2.5 rounded-md bg-primary text-white text-xs font-black disabled:opacity-50 transition-opacity"
              @click="updateComandaStatus(row, 'preparing')"
            >Empezar</button>
            <button
              v-else-if="row.status === 'preparing'"
              :disabled="updatingComandaId === row.id"
              class="h-7 px-2.5 rounded-md bg-success text-white text-xs font-black disabled:opacity-50 transition-opacity"
              @click="updateComandaStatus(row, 'ready')"
            >Listo</button>
            <button
              v-else-if="row.status === 'ready'"
              :disabled="updatingComandaId === row.id"
              class="h-7 px-2.5 rounded-md bg-success text-white text-xs font-black disabled:opacity-50 transition-opacity"
              @click="updateComandaStatus(row, 'delivered')"
            >Entregar</button>
          </div>
        </template>
      </UiResponsiveDataView>
    </template>

    <!-- ── MODE A: Online orders table (comandas_enabled = false) ── -->
    <template v-else>
      <!-- Loading State -->
      <div v-if="isLoadingOrders" class="flex items-center justify-center min-h-[400px]">
        <CommonsTheCustomLoader size="large" />
      </div>

      <!-- Error State -->
      <CommonsTheErrorState v-else-if="fetchError" />

      <!-- Main Content -->
      <div v-else>
        <HealthSemaphore :is-unlocked="true" title="Pedidos Online">
          <UiResponsiveDataView
            row-size="sm"
            :columns="columns"
            :data="orders"
            :sort-field="sortField"
            :sort-direction="sortDirection"
            empty-message="Aún no hay pedidos online."
            empty-sub-message="Los domicilios y recogidas aparecerán aquí."
            variant="default"
            @sort="handleSort"
            @row-click="viewOrder"
          >
            <!-- Mobile Card -->
            <template #card="{ item, index }">
              <div
                class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
                :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
                @click="viewOrder(item)"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-text-primary leading-tight truncate">
                    <span class="text-primary">#{{ item.order_number }}</span>
                    <span class="text-text-secondary font-normal"> · {{ item.verified_email ?? '—' }}</span>
                  </p>
                  <p class="text-xs text-text-secondary mt-0.5">
                    {{ ORDER_TYPE_LABELS[item.order_type] ?? item.order_type }} · {{ formatDateTime(item.order_date) }}
                  </p>
                </div>
                <div class="flex flex-col items-end gap-1 flex-shrink-0">
                  <UiStatusBadge :variant="getStatusVariant(item.status)" size="sm" format="text">
                    {{ getStatusText(item.status, item.order_type) }}
                  </UiStatusBadge>
                  <span class="text-sm font-bold text-primary">{{ formatCurrency(item.total_amount) }}</span>
                </div>
              </div>
            </template>

            <!-- Desktop Table Cells -->
            <template #cell-order_number="{ value }">
              <span class="text-sm font-bold text-text-primary">#{{ value }}</span>
            </template>
            <template #cell-order_date="{ value }">
              <span class="text-sm text-text-secondary">{{ formatDateTime(value) }}</span>
            </template>
            <template #cell-scheduled_time="{ value }">
              <span class="text-sm text-text-secondary">
                {{ value ? formatDateTime(value) : 'Inmediato' }}
              </span>
            </template>
            <template #cell-order_type="{ value }">
              <UiStatusBadge :value="ORDER_TYPE_LABELS[value] ?? value" format="text" variant="info" size="sm" />
            </template>
            <template #cell-status="{ value, row }">
              <UiStatusBadge :variant="getStatusVariant(value)" size="sm" format="text">
                {{ getStatusText(value, row.order_type) }}
              </UiStatusBadge>
            </template>
            <template #cell-total_amount="{ value }">
              <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
            </template>
            <template #cell-verified_email="{ value }">
              <span class="text-sm text-text-secondary">{{ value ?? '—' }}</span>
            </template>
          </UiResponsiveDataView>
        </HealthSemaphore>
      </div>
    </template>

  </div>
</template>
