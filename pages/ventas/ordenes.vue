<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Ordenes' })

const { currentTenant } = useTenantReactive()

const mockOrders = ref([
  {
    id: 'ORD-001',
    order_date: '2024-01-15T14:30:00',
    status: 'completed',
    items_count: 3,
    total: 27000,
    profit: 10500,
    customer_name: 'Mesa 5'
  },
  {
    id: 'ORD-002',
    order_date: '2024-01-15T15:45:00',
    status: 'completed',
    items_count: 2,
    total: 20000,
    profit: 7500,
    customer_name: 'Domicilio - Juan Pérez'
  },
  {
    id: 'ORD-003',
    order_date: '2024-01-15T16:20:00',
    status: 'pending',
    items_count: 4,
    total: 48000,
    profit: 19200,
    customer_name: 'Mesa 12'
  },
  {
    id: 'ORD-004',
    order_date: '2024-01-15T17:10:00',
    status: 'preparing',
    items_count: 1,
    total: 15000,
    profit: 6500,
    customer_name: 'Para llevar'
  },
  {
    id: 'ORD-005',
    order_date: '2024-01-15T17:45:00',
    status: 'completed',
    items_count: 5,
    total: 62000,
    profit: 27500,
    customer_name: 'Mesa 3'
  }
])

const searchQuery = ref('')
const statusFilter = ref('all')

const filteredOrders = computed(() => {
  return mockOrders.value.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         order.customer_name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = statusFilter.value === 'all' || order.status === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

const stats = computed(() => ({
  total: mockOrders.value.length,
  completed: mockOrders.value.filter(o => o.status === 'completed').length,
  total_revenue: mockOrders.value.reduce((sum, o) => sum + o.total, 0),
  total_profit: mockOrders.value.reduce((sum, o) => sum + o.profit, 0)
}))

const getStatusVariant = (status: string) => {
  const variants: Record<string, string> = {
    pending: 'warning',
    preparing: 'default',
    completed: 'success',
    cancelled: 'destructive'
  }
  return variants[status] || 'default'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    preparing: 'Preparando',
    completed: 'Completada',
    cancelled: 'Cancelada'
  }
  return labels[status] || status
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const formatDateTime = (date: string) => {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const { setRefreshHandler } = useLayoutActions()
const refresh = () => {
  console.log('Refreshing orders...')
}

onMounted(() => {
  setRefreshHandler(refresh)
})

watch(() => currentTenant.value?.id, refresh)
</script>

<template>
  <div class="space-y-6">
    <UiStats>
      <UiStatsCard
        label="Total Órdenes"
        :value="stats.total"
        icon="shopping-cart"
      />
      <UiStatsCard
        label="Completadas"
        :value="stats.completed"
        icon="check-circle"
      />
      <UiStatsCard
        label="Ingresos Totales"
        :value="formatCurrency(stats.total_revenue)"
        icon="currency-dollar"
      />
      <UiStatsCard
        label="Utilidad Total"
        :value="formatCurrency(stats.total_profit)"
        icon="chart-bar"
      />
    </UiStats>

    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <UiSearchBar
          v-model="searchQuery"
          placeholder="Buscar por número de orden o cliente..."
        />
      </div>
      <div class="w-full sm:w-48">
        <select
          v-model="statusFilter"
          class="w-full px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="preparing">Preparando</option>
          <option value="completed">Completada</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>
    </div>

    <!-- Desktop Table -->
    <div class="hidden md:block">
      <UiCard>
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-3 px-4 text-xs font-medium text-text-secondary">Orden</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-text-secondary">Fecha</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-text-secondary">Cliente</th>
              <th class="text-right py-3 px-4 text-xs font-medium text-text-secondary">Items</th>
              <th class="text-right py-3 px-4 text-xs font-medium text-text-secondary">Total</th>
              <th class="text-right py-3 px-4 text-xs font-medium text-text-secondary">Utilidad</th>
              <th class="text-center py-3 px-4 text-xs font-medium text-text-secondary">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in filteredOrders"
              :key="order.id"
              class="border-b border-border last:border-0 hover:bg-surface-secondary transition-colors cursor-pointer"
            >
              <td class="py-3 px-4">
                <p class="text-sm font-semibold text-text-primary">{{ order.id }}</p>
              </td>
              <td class="py-3 px-4">
                <p class="text-sm text-text-primary">{{ formatDateTime(order.order_date) }}</p>
              </td>
              <td class="py-3 px-4">
                <p class="text-sm text-text-primary">{{ order.customer_name }}</p>
              </td>
              <td class="py-3 px-4 text-right">
                <p class="text-sm text-text-primary">{{ order.items_count }}</p>
              </td>
              <td class="py-3 px-4 text-right">
                <p class="text-sm font-semibold text-text-primary">{{ formatCurrency(order.total) }}</p>
              </td>
              <td class="py-3 px-4 text-right">
                <UiStatusBadge
                  :label="formatCurrency(order.profit)"
                  variant="success"
                />
              </td>
              <td class="py-3 px-4 text-center">
                <UiStatusBadge
                  :label="getStatusLabel(order.status)"
                  :variant="getStatusVariant(order.status)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </UiCard>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-3">
      <UiCard
        v-for="order in filteredOrders"
        :key="order.id"
        class="hover:shadow-lg transition-shadow cursor-pointer"
      >
        <UiCardHeader>
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-base font-bold text-text-primary">{{ order.id }}</h3>
              <p class="text-sm text-text-secondary">{{ formatDateTime(order.order_date) }}</p>
            </div>
            <UiStatusBadge
              :label="getStatusLabel(order.status)"
              :variant="getStatusVariant(order.status)"
            />
          </div>
        </UiCardHeader>
        <UiCardContent class="space-y-3">
          <div class="flex items-center gap-2 text-sm">
            <Icon name="heroicons:user" class="h-4 w-4 text-text-secondary" />
            <span class="text-text-primary">{{ order.customer_name }}</span>
          </div>
          <div class="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <p class="text-xs text-text-secondary">Items</p>
              <p class="text-lg font-semibold text-text-primary">{{ order.items_count }}</p>
            </div>
            <div>
              <p class="text-xs text-text-secondary">Total</p>
              <p class="text-lg font-bold text-primary">{{ formatCurrency(order.total) }}</p>
            </div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-border">
            <span class="text-sm text-text-secondary">Utilidad:</span>
            <UiStatusBadge
              :label="formatCurrency(order.profit)"
              variant="success"
            />
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <div
      v-if="filteredOrders.length === 0"
      class="text-center py-12"
    >
      <Icon name="heroicons:shopping-cart" class="h-16 w-16 mx-auto text-text-secondary mb-4" />
      <p class="text-text-secondary">No se encontraron órdenes</p>
    </div>
  </div>
</template>
