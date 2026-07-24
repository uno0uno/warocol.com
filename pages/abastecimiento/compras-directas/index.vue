<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- Filters Bar -->
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        :search-placeholder="t('abastecimiento.comprasDirectas.searchPlaceholder')"
        :search-fields="[]"
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="proveedorFilter"
            :class="[filterSelectClass, 'md:hidden']"
            :aria-label="t('abastecimiento.comprasDirectas.filterSupplierAria')"
            @change="currentPage = 1"
          >
            <option value="">{{ t('abastecimiento.comprasDirectas.supplierFilter') }}</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>

          <select
            v-model="statusFilter"
            :class="[filterSelectClass, 'md:hidden']"
            :aria-label="t('abastecimiento.comprasDirectas.filterStatusAria')"
            @change="currentPage = 1"
          >
            <option value="">{{ t('abastecimiento.comprasDirectas.statusFilter') }}</option>
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>

          <select
            v-model="dateFilter"
            :class="filterSelectClass"
            :aria-label="t('abastecimiento.comprasDirectas.filterPeriodAria')"
            @change="currentPage = 1"
          >
            <option v-for="opt in purchaseDateFilterOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </template>

        <template #trailing>
          <NuxtLink to="/abastecimiento/compras-directas/crear"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap">
            <span class="hidden sm:inline">{{ t('abastecimiento.comprasDirectas.newPurchase') }}</span>
            <span class="sm:hidden">{{ t('abastecimiento.comprasDirectas.newShort') }}</span>
          </NuxtLink>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Responsive Data View -->
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
        :empty-message="t('abastecimiento.comprasDirectas.empty')"
        :empty-sub-message="t('abastecimiento.comprasDirectas.emptySub')"
        variant="default"
        row-size="sm"
      >
        <template #header-supplier_name>
          <UiTableHeaderFilter
            :title="t('abastecimiento.comprasDirectas.supplierFilter')"
            column-key="supplier_name"
            sortable
            :sort-field="sortField"
            :sort-direction="sortDirection"
            filter-type="select"
            :model-value="proveedorFilter"
            :options="supplierHeaderOptions"
            :all-label="t('abastecimiento.common.todos')"
            @sort="handleSort"
            @update:model-value="updateProveedorFilter"
          />
        </template>

        <template #header-status>
          <UiTableHeaderFilter
            :title="t('abastecimiento.comprasDirectas.statusFilter')"
            column-key="status"
            sortable
            :sort-field="sortField"
            :sort-direction="sortDirection"
            filter-type="select"
            :model-value="statusFilter"
            :options="statusOptions"
            :all-label="t('abastecimiento.common.todos')"
            align="center"
            @sort="handleSort"
            @update:model-value="updateStatusFilter"
          />
        </template>

        <!-- Mobile Card Slot -->
        <template #card="{ item, index }">
          <div
            @click="viewPurchase(item)"
            class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <span class="text-sm font-bold text-text-primary">{{ item.purchase_number }}</span>
                <span class="text-xs text-text-secondary">{{ formatDate(item.purchase_date) }}</span>
              </div>
              <p class="text-xs text-text-secondary mt-0.5 truncate">
                {{ item.supplier_name || t('abastecimiento.common.sinProveedor') }} · {{ t('abastecimiento.comprasDirectas.itemsCount', { count: item.items_count || 0 }) }}
              </p>
              <p class="text-xs text-text-tertiary mt-0.5">
                {{ t('abastecimiento.comprasDirectas.paymentLabel', { date: getPaymentDateLabel(item) }) }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              <p class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(item.total_amount) }}</p>
              <UiStatusBadge
                :value="getStatusText(item.status)"
                format="text"
                :variant="getStatusVariant(item.status)"
                size="sm"
              />
            </div>
          </div>
        </template>

        <!-- Desktop Table Cell Customizations -->
        <template #cell-purchase_number="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-supplier_name="{ value }">
          <span class="text-sm font-medium text-text-primary">{{ value || t('abastecimiento.common.sinProveedor') }}</span>
        </template>

        <template #cell-purchase_date="{ value }">
          <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
        </template>

        <template #cell-payment_date="{ row }">
          <span class="text-sm" :class="getPaymentDateValue(row) ? 'text-text-secondary' : 'text-text-tertiary'">
            {{ getPaymentDateLabel(row) }}
          </span>
        </template>

        <template #cell-total_amount="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-items_count="{ value }">
          <UiStatusBadge :value="t('abastecimiento.comprasDirectas.itemsCount', { count: value || 0 })" format="text" variant="secondary" size="sm" />
        </template>

        <template #cell-status="{ value }">
          <UiStatusBadge
            :value="getStatusText(value)"
            format="text"
            :variant="getStatusVariant(value)"
            size="sm"
          />
        </template>

        <template #cell-invoice_number="{ value }">
          <span class="text-sm text-text-secondary">{{ value || t('abastecimiento.common.sinFactura') }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <button @click="viewPurchase(row)" class="text-text-secondary hover:text-primary transition-colors"
              :title="t('abastecimiento.comprasDirectas.viewDetail')">
              <EyeIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div v-if="purchasesData.total > itemsPerPage" class="bg-surface px-4 py-3 flex items-center justify-between border border-border rounded-lg">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="previousPage"
            :disabled="!canGoPrevious"
            :class="[
              'relative inline-flex items-center px-4 py-2 border border-action-outline-border text-sm font-medium rounded-md',
              canGoPrevious ? 'text-action-outline-text bg-action-outline-bg hover:bg-action-outline-hover-bg' : 'text-action-outline-disabled-text bg-action-outline-disabled-bg cursor-not-allowed'
            ]">
            {{ t('abastecimiento.comprasDirectas.previous') }}
          </button>
          <button
            @click="nextPage"
            :disabled="!canGoNext"
            :class="[
              'relative inline-flex items-center px-4 py-2 border border-action-outline-border text-sm font-medium rounded-md',
              canGoNext ? 'text-action-outline-text bg-action-outline-bg hover:bg-action-outline-hover-bg' : 'text-action-outline-disabled-text bg-action-outline-disabled-bg cursor-not-allowed'
            ]">
            {{ t('abastecimiento.comprasDirectas.next') }}
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-text-secondary">
              {{ t('abastecimiento.comprasDirectas.showing', { start: startItem, end: endItem, total: purchasesData.total }) }}
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="previousPage"
                :disabled="!canGoPrevious"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-s-md border border-action-outline-border text-sm font-medium',
                  canGoPrevious ? 'text-action-outline-text bg-action-outline-bg hover:bg-action-outline-hover-bg' : 'text-action-outline-disabled-text bg-action-outline-disabled-bg cursor-not-allowed'
                ]">
                <ChevronLeftIcon class="h-5 w-5" />
              </button>
              <span class="relative inline-flex items-center px-4 py-2 border border-action-outline-border bg-action-outline-bg text-sm font-medium text-action-outline-text">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                @click="nextPage"
                :disabled="!canGoNext"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-e-md border border-action-outline-border text-sm font-medium',
                  canGoNext ? 'text-action-outline-text bg-action-outline-bg hover:bg-action-outline-hover-bg' : 'text-action-outline-disabled-text bg-action-outline-disabled-bg cursor-not-allowed'
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
import { onMounted, onUnmounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useScanQuotaQuery } from '~/composables/queries/useScanQuota'
const { t } = useI18n({ useScope: 'global' })

useHead({
  title: () => t('abastecimiento.head.comprasDirectas')
})

// Scan quota
const { quota, warningLevel, scansRemaining } = useScanQuotaQuery()

// State
const currentPage = ref(1)
const itemsPerPage = ref(20)
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const proveedorFilter = ref('')
const statusFilter = ref('')
const { dateFilter, purchaseDateFilterOptions, clearPurchaseDateFilter } = usePurchaseDateFilter()
const sortField = ref('purchase_date')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Fetch purchases
const { currentTenant } = useTenantReactive()

const { data: purchasesResponse, asyncStatus: queryAsyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['suppliers', 'direct-purchases', currentTenant.value?.id ?? null, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: appliedSearch.value || null,
    status: statusFilter.value || null,
    supplier_id: proveedorFilter.value || null,
    date_filter: dateFilter.value || null,
  }],
  query: () => {
    const params: Record<string, string | number> = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    }

    if (appliedSearch.value) {
      params.search = appliedSearch.value
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
const suppliers = computed(() => suppliersResponse.value?.data || [])

const supplierHeaderOptions = computed(() =>
  suppliers.value.map((supplier: any) => ({
    label: supplier.name,
    value: supplier.id,
  })),
)

// Status options
const statusOptions = computed(() => [
  { value: 'received', label: t('abastecimiento.common.recibida') },
  { value: 'invoiced', label: t('abastecimiento.common.facturada') },
  { value: 'paid', label: t('abastecimiento.common.pagada') },
])

// Table columns
const tableColumns = computed(() => [
  { key: 'purchase_number', title: t('abastecimiento.common.numero'), sortable: true },
  { key: 'supplier_name', title: t('abastecimiento.common.proveedor'), sortable: true },
  { key: 'purchase_date', title: t('abastecimiento.common.fecha'), sortable: true },
  { key: 'payment_date', title: t('abastecimiento.common.fechaPago'), sortable: true },
  { key: 'total_amount', title: t('abastecimiento.common.total'), sortable: true },
  { key: 'items_count', title: t('abastecimiento.common.items'), sortable: false },
  { key: 'status', title: t('abastecimiento.common.estado'), sortable: true },
  { key: 'invoice_number', title: t('abastecimiento.common.factura'), sortable: false },
  { key: 'actions', title: '', sortable: false }
])

// Computed
const sortedPurchases = computed(() => {
  const items = [...purchases.value]
  if (!sortField.value) return items

  return items.sort((a: any, b: any) => {
    let aVal = a[sortField.value]
    let bVal = b[sortField.value]

    if (sortField.value === 'purchase_date' || sortField.value === 'payment_date') {
      if (sortField.value === 'payment_date') {
        aVal = getPaymentDateValue(a)
        bVal = getPaymentDateValue(b)
      }
      aVal = aVal ? new Date(aVal).getTime() : 0
      bVal = bVal ? new Date(bVal).getTime() : 0
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
const { formatDate: _fmtDate, formatCurrency } = useFormatters()
const formatDate = (date: string) => _fmtDate(date)

const getPaymentDateValue = (purchase: any) => {
  if (purchase?.payment_date) return purchase.payment_date
  if (purchase?.status === 'paid' && purchase?.paid_at) return purchase.paid_at
  return null
}

const getPaymentDateLabel = (purchase: any) => {
  const value = getPaymentDateValue(purchase)
  return value ? formatDate(value) : t('abastecimiento.common.sinPago')
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'received': t('abastecimiento.common.recibida'),
    'invoiced': t('abastecimiento.common.facturada'),
    'paid': t('abastecimiento.common.pagada'),
  }
  return statusMap[status] || status
}

const getStatusVariant = (status: string) => {
  const variantMap: Record<string, 'success' | 'warning' | 'info' | 'secondary'> = {
    received: 'info',
    invoiced: 'warning',
    paid: 'success'
  }
  return variantMap[status] || 'secondary'
}

const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
}

const updateProveedorFilter = (value: string | boolean) => {
  proveedorFilter.value = typeof value === 'string' ? value : ''
  currentPage.value = 1
}

const updateStatusFilter = (value: string | boolean) => {
  statusFilter.value = typeof value === 'string' ? value : ''
  currentPage.value = 1
}

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!proveedorFilter.value
    || !!statusFilter.value
    || !!dateFilter.value,
)

const performSearch = () => applySearch(() => { currentPage.value = 1 })

const clearFilters = () => {
  clearSearch()
  proveedorFilter.value = ''
  statusFilter.value = ''
  clearPurchaseDateFilter()
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
