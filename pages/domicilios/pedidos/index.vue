<script setup lang="ts">
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({
  layout: false,
  ssr: false
})

useHead({ title: 'Pedidos Online — WARO' })

const { formatDateTime, formatCurrency } = useFormatters()

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Sort state
const sortField = ref('order_date')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Data fetching
const { data: ordersData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `online-orders-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/online/orders', {
    params: {
      sort_field: sortField.value,
      sort_direction: sortDirection.value
    }
  }),
  {
    server: false,
    watch: [currentTenant]
  }
)

onTenantChange(async () => {
  await refresh()
})

// Computed orders list
const orders = computed(() => {
  if (!ordersData.value?.data) return []
  return ordersData.value.data
})

// Column configuration
const columns: Column[] = [
  { key: 'order_number', title: '# Pedido',   sortable: true },
  { key: 'order_date',   title: 'Fecha',       sortable: true },
  { key: 'scheduled_time', title: 'Programado', sortable: true },
  { key: 'order_type',   title: 'Tipo',        sortable: true },
  { key: 'status',       title: 'Estado',      sortable: false },
  { key: 'total_amount', title: 'Total',       sortable: true },
  { key: 'verified_email', title: 'Cliente',   sortable: true }
]

// Label and color maps
const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery:   'Domicilio',
  pickup:     'Recogida',
  'dine-in':  'En mesa'
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completado',
  pending:   'Pendiente',
  cancelled: 'Cancelado'
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
}

const handleSort = ({ field, direction }: { field: string; direction: 'asc' | 'desc' }) => {
  sortField.value = field
  sortDirection.value = direction
  refresh()
}
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar los pedidos.</p>
        <p class="text-sm text-text-secondary">{{ fetchError.message }}</p>
        <button
          @click="refresh"
          class="mt-4 min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else>
      <UiResponsiveDataView
        :columns="columns"
        :data="orders"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        empty-message="Aún no hay pedidos online."
        empty-sub-message="Los domicilios y recogidas aparecerán aquí."
        variant="default"
        @sort="handleSort"
      >
        <!-- Mobile Card -->
        <template #card="{ item }">
          <div
            v-if="item"
            class="bg-surface border border-border rounded-xl p-4"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="text-base font-bold text-text-primary"># {{ item.order_number }}</p>
                <p class="text-sm text-text-secondary">{{ formatDateTime(item.order_date) }}</p>
              </div>
              <span :class="['px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-800']">
                {{ STATUS_LABELS[item.status] ?? item.status }}
              </span>
            </div>
            <div class="space-y-1">
              <p class="text-sm text-text-secondary truncate">{{ item.verified_email ?? '—' }}</p>
              <div class="flex justify-between items-center pt-2 border-t border-border">
                <span class="text-sm text-text-secondary">{{ ORDER_TYPE_LABELS[item.order_type] ?? item.order_type }}</span>
                <p class="text-base font-bold text-primary">{{ formatCurrency(item.total_amount) }}</p>
              </div>
              <p class="text-xs text-text-secondary">
                {{ item.scheduled_time ? formatDateTime(item.scheduled_time) : 'Inmediato' }}
              </p>
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
          <span class="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            {{ ORDER_TYPE_LABELS[value] ?? value }}
          </span>
        </template>

        <template #cell-status="{ value }">
          <span :class="['px-2 py-1 rounded-full text-xs font-medium inline-block', STATUS_COLORS[value] ?? 'bg-gray-100 text-gray-800']">
            {{ STATUS_LABELS[value] ?? value }}
          </span>
        </template>

        <template #cell-total_amount="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-verified_email="{ value }">
          <span class="text-sm text-text-secondary">{{ value ?? '—' }}</span>
        </template>
      </UiResponsiveDataView>
    </div>
  </div>
</template>
