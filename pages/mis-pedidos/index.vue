<template>
  <div>

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">No se pudo cargar tus pedidos.</p>
        <p class="text-sm text-text-secondary mb-4">{{ error.message }}</p>
        <button
          class="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg
                 hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          @click="refresh()"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Data view -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- Filters -->
      <UiAdvancedFiltersBar
        :show-search="false"
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <UiFilterSelect
            v-model="restaurantFilter"
            placeholder="Todos los restaurantes"
            :options="restaurantOptions"
            aria-label="Restaurante"
          />
          <UiFilterSelect
            v-model="statusFilter"
            placeholder="Todos los estados"
            :options="statusOptions"
            aria-label="Estado"
          />
          <UiFilterSelect
            v-model="dateFilter"
            placeholder="Todos"
            :options="dateOptions"
            aria-label="Periodo"
          />
        </template>
      </UiAdvancedFiltersBar>

      <!-- Table -->
      <UiResponsiveDataView
        row-size="sm"
        :columns="columns"
        :data="filteredOrders"
        :item-key="'order_id'"
        :empty-message="emptyMessage"
        :empty-sub-message="emptySubMessage"
        variant="default"
        @row-click="(order) => navigateTo('/mis-pedidos/' + order.order_id)"
      >
        <!-- Mobile Card -->
        <template #card="{ item }">
          <div
            v-if="item"
            class="bg-surface border border-border rounded-xl p-4
                   hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
            @click="navigateTo('/mis-pedidos/' + item.order_id)"
          >
            <!-- Row 1: order number + status -->
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="text-base font-bold text-text-primary">#{{ item.order_number }}</span>
              <UiStatusBadge :variant="getStatusVariant(item.status)" size="sm" format="text">
                {{ getStatusText(item.status, item.order_type) }}
              </UiStatusBadge>
            </div>
            <!-- Row 2: restaurant -->
            <p class="text-sm text-text-secondary leading-snug mb-2">{{ item.restaurant_name }}</p>
            <!-- Row 3: total + date -->
            <div class="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <span class="text-sm font-bold text-primary">{{ formatCurrency(item.total_amount) }}</span>
              <span class="text-xs text-text-secondary">{{ formatRelativeDate(item.created_at) }}</span>
            </div>
          </div>
        </template>

        <!-- Desktop Cells -->
        <template #cell-order_number="{ value }">
          <span class="text-sm font-bold text-text-primary">#{{ value }}</span>
        </template>

        <template #cell-restaurant_name="{ value }">
          <span class="text-sm text-text-primary">{{ value }}</span>
        </template>

        <template #cell-status="{ value, row }">
          <UiStatusBadge :variant="getStatusVariant(value)" size="sm" format="text">
            {{ getStatusText(value, row.order_type) }}
          </UiStatusBadge>
        </template>

        <template #cell-total_amount="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-created_at="{ value }">
          <span class="text-sm text-text-secondary">{{ formatRelativeDate(value) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center">
            <button
              title="Ver detalle"
              class="text-crocus-600 hover:text-crocus-900 transition-colors"
              @click.stop="navigateTo('/mis-pedidos/' + row.order_id)"
            >
              <EyeIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>

  </div>
</template>

<script setup lang="ts">
import { EyeIcon } from '@heroicons/vue/24/outline'
import { useOnlineOrderStatus } from '~/composables/useOnlineOrderStatus'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({
  middleware: 'customer-auth',
  layout: 'customer-portal',
})

useHead({ title: 'Mis pedidos' })

const { getStatusText, getStatusVariant } = useOnlineOrderStatus()
const { formatCurrency, formatRelativeDate } = useFormatters()

interface OrderSummary {
  order_id: string
  order_number: number
  order_type: string
  status: string
  restaurant_name: string
  tenant_slug: string
  total_amount: number
  created_at: string
  item_count: number
}

interface Column {
  key: string
  title: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  format?: 'currency' | 'percentage' | 'number' | 'text'
}

const columns: Column[] = [
  { key: 'order_number', title: 'Nº Pedido', sortable: false },
  { key: 'restaurant_name', title: 'Restaurante', sortable: false },
  { key: 'status', title: 'Estado', sortable: false },
  { key: 'total_amount', title: 'Total', sortable: false, align: 'right' },
  { key: 'created_at', title: 'Fecha', sortable: false },
  { key: 'actions', title: '', sortable: false, align: 'center' },
]

// Filter state
const statusFilter = ref('')
const dateFilter = ref('')
const restaurantFilter = ref('')

// Status options
const statusOptions = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'En preparación' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
]

const dateOptions = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'last_week', label: 'Semana Pasada' },
  { value: '15_days', label: 'Últimos 15 días' },
  { value: '1_month', label: 'Último mes' },
  { value: '3_months', label: 'Últimos 3 meses' },
]

// Fetch — status filter is server-side
const { data: ordersData, pending, error, refresh } = useFetch<{ data: OrderSummary[] }>('/api/customer/orders', {
  query: computed(() => ({
    status: statusFilter.value || undefined,
  })),
  server: false,
  watch: [statusFilter],
})

const orders = computed<OrderSummary[]>(() => ordersData.value?.data ?? [])

// Restaurant options derived from fetched data (for the supplier filter slot)
const restaurantOptions = computed(() =>
  [...new Set(orders.value.map(o => o.restaurant_name))]
    .sort()
    .map(name => ({ value: name, label: name }))
)

// Date filter helper (local midnight boundaries)
function isInDateRange(dateStr: string, filter: string): boolean {
  if (!filter) return true
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (filter) {
    case 'today':
      return date >= today
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return date >= yesterday && date < today
    }
    case 'last_week': {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return date >= weekAgo
    }
    case '15_days': {
      const ago = new Date(today)
      ago.setDate(ago.getDate() - 15)
      return date >= ago
    }
    case '1_month': {
      const ago = new Date(today)
      ago.setMonth(ago.getMonth() - 1)
      return date >= ago
    }
    case '3_months': {
      const ago = new Date(today)
      ago.setMonth(ago.getMonth() - 3)
      return date >= ago
    }
    default:
      return true
  }
}

// Client-side filtered orders (date + restaurant on already-fetched array)
const filteredOrders = computed(() =>
  orders.value.filter(o =>
    isInDateRange(o.created_at, dateFilter.value) &&
    (!restaurantFilter.value || o.restaurant_name === restaurantFilter.value)
  )
)

// Dynamic empty state
const hasActiveFilters = computed(() =>
  !!(statusFilter.value || dateFilter.value || restaurantFilter.value)
)
const emptyMessage = computed(() =>
  hasActiveFilters.value ? 'No hay pedidos con estos filtros' : 'Aún no tienes pedidos'
)
const emptySubMessage = computed(() =>
  hasActiveFilters.value
    ? 'Intenta cambiar o limpiar los filtros activos'
    : 'Haz tu primer pedido en nuestros restaurantes'
)

function clearFilters() {
  statusFilter.value = ''
  dateFilter.value = ''
  restaurantFilter.value = ''
}
</script>
