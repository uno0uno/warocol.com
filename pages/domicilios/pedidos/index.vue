<script setup lang="ts">
import { onMounted, onUnmounted, watchEffect } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Pedidos Online — WARO' })

const { formatDateTime, formatCurrency } = useFormatters()

// Tenant reactivity
const { currentTenant, businessProfile } = useTenantReactive()

// Redirect to /comandas when feature is enabled
const router = useRouter()
watchEffect(() => {
  if (businessProfile.value?.comandas_enabled === true) {
    router.replace('/comandas')
  }
})

// Sort state
const sortField = ref('order_date')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Data fetching
const { data: ordersData, status, asyncStatus, error: fetchError, refetch } = useQuery({
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
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const isLoading = computed(() => status.value === 'loading')
const isRefreshing = computed(() => asyncStatus.value === 'loading' && ordersData.value != null)

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

// Label maps
const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery:   'Domicilio',
  pickup:     'Recogida',
  'dine-in':  'En mesa'
}

const { getStatusText, getStatusVariant } = useOnlineOrderStatus()

const handleSort = ({ field, direction }: { field: string; direction: 'asc' | 'desc' }) => {
  sortField.value = field
  sortDirection.value = direction
}

const viewOrder = (order: any) => {
  navigateTo(`/domicilios/pedidos/${order.id}`)
}

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refetch) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => { clearRefreshHandler(refetch) })
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
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
            <!-- Main info -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-text-primary leading-tight truncate">
                <span class="text-primary">#{{ item.order_number }}</span>
                <span class="text-text-secondary font-normal"> · {{ item.verified_email ?? '—' }}</span>
              </p>
              <p class="text-xs text-text-secondary mt-0.5">
                {{ ORDER_TYPE_LABELS[item.order_type] ?? item.order_type }} · {{ formatDateTime(item.order_date) }}
              </p>
            </div>

            <!-- Status + total -->
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
  </div>
</template>
