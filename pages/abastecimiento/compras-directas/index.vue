<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-ebony-800 mb-2">Error al cargar las compras.</p>
        <p class="text-sm text-ebony-600">{{ fetchError.message }}</p>
        <button @click="handleRefresh" class="mt-4 px-4 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- Filters Bar -->
      <SharedFiltersBar
        v-model:search="localSearchTerm"
        v-model:supplier-filter="proveedorFilter"
        v-model:status-filter="statusFilter"
        v-model:date-filter="dateFilter"
        :suppliers="suppliers"
        :status-options="statusOptions"
        status-label="Estado"
        status-placeholder="Todos los estados"
        show-supplier-filter
        show-status-filter
        show-date-filter
        @search="performSearch"
        @clear-filters="clearFilters"
      />

      <!-- Responsive Data View -->
      <HealthSemaphore :is-unlocked="true" title="Compras Directas">
        <template #header-actions>
          <NuxtLink to="/abastecimiento/compras-directas/crear"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap">
            <span class="hidden sm:inline">+ Nueva Compra Directa</span>
            <span class="sm:hidden">+ Nueva</span>
          </NuxtLink>
        </template>
        <UiScanUsageBar
          v-if="quota"
          :quota="quota"
          :compact="true"
          :show-period="false"
          :warning-level="warningLevel"
          :scans-remaining="scansRemaining"
          class="mb-4"
        />
      <UiResponsiveDataView
        :columns="tableColumns"
        :data="sortedPurchases"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        @row-click="viewPurchase"
        title="Compras Directas"
        empty-message="No hay compras directas para mostrar"
        empty-sub-message="Crea una nueva compra directa para comenzar"
        variant="default"
        row-size="sm"
      >
        <!-- Mobile Card Slot -->
        <template #card="{ item }">
          <div
            class="bg-white border border-border rounded-lg p-4 cursor-pointer hover:bg-surface-secondary transition-colors"
            @click="viewPurchase(item)"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="font-bold text-text-primary">{{ item.purchase_number }}</p>
                <p class="text-sm text-text-secondary">{{ item.supplier_name || 'Sin proveedor' }}</p>
              </div>
              <UiStatusBadge
                :value="getStatusText(item.status)"
                format="text"
                :class="['border-0', getStatusClass(item.status)]"
                size="sm"
              />
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-text-secondary">{{ formatDate(item.purchase_date) }}</span>
              <span class="font-bold text-text-primary">
                ${{ formatCurrency(item.total_amount) }}
              </span>
            </div>
          </div>
        </template>

        <!-- Desktop Table Cell Customizations -->
        <template #cell-purchase_number="{ value }">
          <span class="text-sm font-medium text-ebony-800">{{ value }}</span>
        </template>

        <template #cell-supplier_name="{ value }">
          <span class="text-sm font-bold text-ebony-800">{{ value || 'Sin proveedor' }}</span>
        </template>

        <template #cell-purchase_date="{ value }">
          <span class="text-sm text-ebony-800">{{ formatDate(value) }}</span>
        </template>

        <template #cell-total_amount="{ value }">
          <span class="text-sm font-medium text-ebony-800">${{ formatCurrency(value) }}</span>
        </template>

        <template #cell-items_count="{ value }">
          <UiStatusBadge :value="`${value || 0} items`" format="text" variant="secondary" size="sm" />
        </template>

        <template #cell-status="{ value }">
          <UiStatusBadge
            :value="getStatusText(value)"
            format="text"
            :class="['border-0', getStatusClass(value)]"
            size="sm"
          />
        </template>

        <template #cell-invoice_number="{ value }">
          <span class="text-sm text-text-secondary">{{ value || 'Sin factura' }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <button @click="viewPurchase(row)" class="text-crocus-600 hover:text-crocus-900 transition-colors"
              title="Ver detalle">
              <EyeIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
      </HealthSemaphore>

      <!-- Pagination -->
      <div v-if="purchasesData.total > itemsPerPage" class="bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="previousPage"
            :disabled="!canGoPrevious"
            :class="[
              'relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md',
              canGoPrevious ? 'text-titan-700 bg-white hover:bg-titan-50' : 'text-titan-400 bg-titan-50 cursor-not-allowed'
            ]">
            Anterior
          </button>
          <button
            @click="nextPage"
            :disabled="!canGoNext"
            :class="[
              'relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md',
              canGoNext ? 'text-titan-700 bg-white hover:bg-titan-50' : 'text-titan-400 bg-titan-50 cursor-not-allowed'
            ]">
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-titan-700">
              Mostrando
              <span class="font-medium">{{ startItem }}</span>
              a
              <span class="font-medium">{{ endItem }}</span>
              de
              <span class="font-medium">{{ purchasesData.total }}</span>
              compras
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="previousPage"
                :disabled="!canGoPrevious"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 text-sm font-medium',
                  canGoPrevious ? 'text-titan-500 bg-white hover:bg-titan-50' : 'text-titan-300 bg-titan-50 cursor-not-allowed'
                ]">
                <ChevronLeftIcon class="h-5 w-5" />
              </button>
              <span class="relative inline-flex items-center px-4 py-2 border border-titan-300 bg-white text-sm font-medium text-titan-700">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                @click="nextPage"
                :disabled="!canGoNext"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-r-md border border-titan-300 text-sm font-medium',
                  canGoNext ? 'text-titan-500 bg-white hover:bg-titan-50' : 'text-titan-300 bg-titan-50 cursor-not-allowed'
                ]">
                <ChevronRightIcon class="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon } from '@heroicons/vue/24/outline'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { onMounted, onUnmounted } from 'vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useScanQuotaQuery } from '~/composables/queries/useScanQuota'

useHead({
  title: 'Compras Directas - Abastecimiento'
})

// Scan quota
const { quota, warningLevel, scansRemaining } = useScanQuotaQuery()

// State
const currentPage = ref(1)
const itemsPerPage = ref(20)
const localSearchTerm = ref('')
const proveedorFilter = ref('')
const statusFilter = ref('')
const dateFilter = ref('')
const sortField = ref('purchase_date')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Fetch purchases
const { currentTenant } = useTenantReactive()

const { data: purchasesResponse, asyncStatus: queryAsyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['suppliers', 'direct-purchases', currentTenant.value?.id ?? null, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: localSearchTerm.value || null,
    status: statusFilter.value || null,
    supplier_id: proveedorFilter.value || null,
    date_filter: dateFilter.value || null,
  }],
  query: () => {
    const params: Record<string, string | number> = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    }

    if (localSearchTerm.value) {
      params.search = localSearchTerm.value
    }
    if (statusFilter.value) {
      params.status = statusFilter.value
    }
    if (proveedorFilter.value) {
      params.supplier_id = proveedorFilter.value
    }
    if (dateFilter.value) {
      params.date_filter = dateFilter.value
    }

    return $fetch('/api/suppliers/purchases/direct', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const purchasesData = computed(() => purchasesResponse.value || { data: [], total: 0, page: 1, limit: 20 })
const purchases = computed(() => purchasesData.value?.data || [])
const isLoading = computed(() => !purchasesResponse.value && !fetchError.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && purchasesResponse.value != null)

// Fetch suppliers for filter
const { data: suppliersResponse } = useQuery({
  key: () => ['suppliers', 'providers-lookup', currentTenant.value?.id ?? null],
  query: () => $fetch('/api/suppliers/providers', { params: { limit: 250 } }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const suppliers = computed(() => (suppliersResponse.value?.data || []).map((s: any) => ({
  value: s.id,
  label: s.name
})))

// Status options
const statusOptions = [
  { value: 'received', label: 'Recibida' },
  { value: 'invoiced', label: 'Facturada' },
  { value: 'paid', label: 'Pagada' }
]

// Table columns
const tableColumns = [
  { key: 'purchase_number', title: 'Numero', sortable: true },
  { key: 'supplier_name', title: 'Proveedor', sortable: true },
  { key: 'purchase_date', title: 'Fecha', sortable: true },
  { key: 'total_amount', title: 'Total', sortable: true },
  { key: 'items_count', title: 'Items', sortable: false },
  { key: 'status', title: 'Estado', sortable: true },
  { key: 'invoice_number', title: 'Factura', sortable: false },
  { key: 'actions', title: '', sortable: false }
]

// Computed
const sortedPurchases = computed(() => {
  const items = [...purchases.value]
  if (!sortField.value) return items

  return items.sort((a: any, b: any) => {
    let aVal = a[sortField.value]
    let bVal = b[sortField.value]

    if (sortField.value === 'purchase_date') {
      aVal = new Date(aVal).getTime()
      bVal = new Date(bVal).getTime()
    }

    if (aVal < bVal) return sortDirection.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })
})

const totalPages = computed(() => Math.ceil(purchasesData.value.total / itemsPerPage.value))
const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)
const startItem = computed(() => (currentPage.value - 1) * itemsPerPage.value + 1)
const endItem = computed(() => Math.min(currentPage.value * itemsPerPage.value, purchasesData.value.total))

// Methods
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatCurrency = (value: number) => {
  if (!value) return '0'
  return value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'received': 'Recibida',
    'invoiced': 'Facturada',
    'paid': 'Pagada'
  }
  return statusMap[status] || status
}

const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    'received': 'bg-blue-100 text-blue-800',
    'invoiced': 'bg-yellow-100 text-yellow-800',
    'paid': 'bg-green-100 text-green-800'
  }
  return classMap[status] || 'bg-gray-100 text-gray-800'
}

const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
}

const performSearch = () => {
  currentPage.value = 1
}

const clearFilters = () => {
  localSearchTerm.value = ''
  proveedorFilter.value = ''
  statusFilter.value = ''
  dateFilter.value = ''
  currentPage.value = 1
}

const viewPurchase = (purchase: any) => {
  navigateTo(`/abastecimiento/compras-directas/${purchase.id}`)
}

const previousPage = () => {
  if (canGoPrevious.value) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (canGoNext.value) {
    currentPage.value++
  }
}

// Inject refresh handler
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const handleRefresh = async () => {
  await refetch()
}

onMounted(() => {
  setRefreshHandler(handleRefresh)
})
useMenuReturnRefresh(
  '/abastecimiento/compras-directas',
  handleRefresh,
  'abastecimiento-last-path',
  ['/abastecimiento/compras-directas/']
)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(handleRefresh)
})
</script>
