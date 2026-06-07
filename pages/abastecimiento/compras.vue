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
        v-model:search-field="apiSearchField"
        :search-fields="searchFields"
        search-placeholder="Buscar órdenes de compra..."
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="proveedorFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por proveedor"
            @change="currentPage = 1"
          >
            <option value="">Proveedor</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>

          <select
            v-model="statusFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por estado"
            @change="currentPage = 1"
          >
            <option value="">Estado</option>
            <option v-for="opt in purchaseStatusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>

          <select
            v-model="dateFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por período"
            @change="currentPage = 1"
          >
            <option v-for="opt in purchaseDateFilterOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </template>

        <template #trailing>
          <NuxtLink to="/abastecimiento/compra/crear"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap">
            <span class="hidden sm:inline">+ Nueva Orden</span>
            <span class="sm:hidden">+ Nuevo</span>
          </NuxtLink>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Responsive Data View (Mobile Cards + Desktop Table) -->
      <UiResponsiveDataView
        row-size="sm"
        :columns="ordenesTableColumns"
        :data="sortedOrdenes"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        empty-message="No hay órdenes para mostrar"
        empty-sub-message="Crea una nueva orden para comenzar"
        variant="default"
      >
        <!-- Mobile Card Slot -->
        <template #card="{ item, index }">
          <div
            @click="editOrder(item)"
            class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <span class="text-sm font-bold text-text-primary">{{ item.numero }}</span>
                <span class="text-xs text-text-secondary">{{ formatDateShort(item.fecha) }}</span>
              </div>
              <p class="text-xs text-text-secondary mt-0.5 truncate">{{ item.proveedor }} · {{ item.totalItems }} items</p>
            </div>
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              <p class="text-sm font-bold text-primary tabular-nums">{{ (item.valorTotal || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}</p>
              <UiStatusBadge
                :value="getStatusText(item.estado)"
                format="text"
                :variant="getStatusVariant(item.estado)"
                size="sm"
              />
            </div>
          </div>
        </template>

        <!-- Desktop Table Cell Customizations -->
        <template #cell-numero="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-invoice_number="{ value }">
          <span class="text-sm text-text-secondary">{{ value || 'Sin factura' }}</span>
        </template>

        <template #cell-proveedor="{ value }">
          <div class="flex items-center">
            <div class="ml-3">
              <div class="text-sm font-medium text-text-primary">{{ value }}</div>
            </div>
          </div>
        </template>

        <template #cell-fecha="{ value }">
          <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
        </template>

        <template #cell-valorTotal="{ value }">
          <span class="text-sm font-bold text-primary">{{ (value || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
        </template>

        <template #cell-impuestos="{ value }">
          <span class="text-sm font-bold text-primary">{{ (value || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
        </template>

        <template #cell-totalItems="{ value }">
          <UiStatusBadge :value="`${value} items`" format="text" variant="secondary" size="sm" />
        </template>

        <template #cell-estado="{ value }">
          <UiStatusBadge
            :value="getStatusText(value)"
            format="text"
            :variant="getStatusVariant(value)"
            size="sm"
          />
        </template>

        <template #cell-fechaEntrega="{ value }">
          <div class="text-sm text-text-secondary">
            <div v-if="value">{{ formatDate(value) }}</div>
            <div v-else>Sin programar</div>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <button @click="editOrder(row)" class="text-text-secondary hover:text-primary transition-colors"
              title="Editar orden">
              <PencilIcon class="h-4 w-4" />
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
            Anterior
          </button>
          <button
            @click="nextPage"
            :disabled="!canGoNext"
            :class="[
              'ml-3 relative inline-flex items-center px-4 py-2 border border-action-outline-border text-sm font-medium rounded-md',
              canGoNext ? 'text-action-outline-text bg-action-outline-bg hover:bg-action-outline-hover-bg' : 'text-action-outline-disabled-text bg-action-outline-disabled-bg cursor-not-allowed'
            ]">
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-text-secondary">
              Mostrando <span class="font-medium">{{ startItem }}</span> a <span class="font-medium">{{ endItem }}</span> de
              <span class="font-medium">{{ purchasesData.total }}</span> resultados
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="previousPage"
                :disabled="!canGoPrevious"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-l-md border border-action-outline-border text-sm font-medium',
                  canGoPrevious ? 'bg-action-outline-bg text-action-outline-text hover:bg-action-outline-hover-bg' : 'bg-action-outline-disabled-bg text-action-outline-disabled-text cursor-not-allowed'
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
                  'relative inline-flex items-center px-2 py-2 rounded-r-md border border-action-outline-border text-sm font-medium',
                  canGoNext ? 'bg-action-outline-bg text-action-outline-text hover:bg-action-outline-hover-bg' : 'bg-action-outline-disabled-bg text-action-outline-disabled-text cursor-not-allowed'
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
import { inject } from 'vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useFormatters } from '~/composables/useFormatters'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TruckIcon,
  DocumentCheckIcon,
  EllipsisHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

// Filters — AdvancedFiltersBar (#765)
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const apiSearchField = ref('purchase_number')
const proveedorFilter = ref('')
const statusFilter = ref('')
const { dateFilter, purchaseDateFilterOptions, clearPurchaseDateFilter } = usePurchaseDateFilter()
const showCreateModal = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(20) // 20 filas por página

const searchFields = [
  { label: 'N° Orden', value: 'purchase_number' },
  { label: 'N° Factura', value: 'invoice_number' },
  { label: 'Proveedor', value: 'supplier_name' }
]

const purchaseStatusOptions = [
  { label: 'Cotización', value: 'quotation' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Confirmada', value: 'confirmed' },
  { label: 'En Preparación', value: 'preparing' },
  { label: 'Enviada', value: 'shipped' },
  { label: 'Recibida', value: 'received' },
  { label: 'Verificada', value: 'verified' },
  { label: 'Facturada', value: 'invoiced' },
  { label: 'Pagada', value: 'paid' },
  { label: 'Cancelada', value: 'cancelled' }
]

const performSearch = () => applySearch(() => { currentPage.value = 1 })

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!proveedorFilter.value
    || !!statusFilter.value
    || !!dateFilter.value,
)

// Sorting state
const sortField = ref('')
const sortDirection = ref('asc')

const clearFilters = () => {
  clearSearch()
  proveedorFilter.value = ''
  statusFilter.value = ''
  clearPurchaseDateFilter()
  currentPage.value = 1
}

// Pagination
const totalPages = computed(() => {
  return Math.ceil((purchasesData.value?.total || 0) / itemsPerPage.value)
})

const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
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

const startItem = computed(() => {
  return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endItem = computed(() => {
  return Math.min(currentPage.value * itemsPerPage.value, purchasesData.value?.total || 0)
})

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// Fetch suppliers (static lookup per tenant)
const { data: suppliersData } = useQuery({
  key: () => ['suppliers', 'providers', currentTenant.value?.id],
  query: () => $fetch('/api/suppliers/providers', { params: { limit: 250 } }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const suppliers = computed(() => (suppliersData.value as any)?.data || [])

// Fetch purchases
const { data: purchasesData, status: queryStatus, asyncStatus: purchasesAsyncStatus, refetch } = useQuery({
  key: () => ['suppliers', 'purchases', currentTenant.value?.id, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: appliedSearch.value || null,
    searchField: apiSearchField.value,
    status: statusFilter.value || null,
    supplier: proveedorFilter.value || null,
    date: dateFilter.value || null,
  }],
  query: () => {
    const params: any = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    }
    if (appliedSearch.value) {
      params.search = appliedSearch.value
      params.search_field = apiSearchField.value
    }
    if (statusFilter.value) params.status = statusFilter.value
    if (proveedorFilter.value) params.supplier_id = proveedorFilter.value
    if (dateFilter.value) params.date_filter = dateFilter.value
    return $fetch('/api/suppliers/purchases', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !purchasesData.value)
const isRefreshing = computed(() => purchasesAsyncStatus.value === 'loading' && purchasesData.value != null)

// Reset page on tenant change — key change triggers automatic refetch
watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })

// Computed properties for data
const ordenes = computed(() => {
  if (!purchasesData.value?.data) return []
  return purchasesData.value.data.map(purchase => ({
    id: purchase.id,
    numero: purchase.purchase_number || `PO-${purchase.id.substring(0, 8)}`,
    proveedor: purchase.supplier_name || 'Sin proveedor',
    fecha: purchase.purchase_date,
    fechaEntrega: purchase.estimated_delivery_date || purchase.delivery_date,
    valorTotal: parseFloat(purchase.total_amount || 0),
    impuestos: parseFloat(purchase.tax_amount || 0),
    totalItems: purchase.items?.length || 0,
    estado: purchase.status,
    invoice_number: purchase.invoice_number
  }))
})

// Inject refresh handler setter from layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

onMounted(() => {
  setRefreshHandler(refetch)
})
useMenuReturnRefresh('/abastecimiento/compras', refetch, 'abastecimiento-last-path')
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})



const actividadReciente = ref([
  {
    id: 1,
    tipo: 'received',
    icono: CheckCircleIcon,
    descripcion: 'Orden recibida completamente',
    tiempo: 'Hace 2 horas',
    usuario: 'Ana García',
    orden: 'PO-2025-001'
  },
  {
    id: 2,
    tipo: 'sent',
    icono: TruckIcon,
    descripcion: 'Orden enviada al proveedor',
    tiempo: 'Hace 4 horas',
    usuario: 'Carlos Ruiz',
    orden: 'PO-2025-005'
  },
  {
    id: 3,
    tipo: 'created',
    icono: DocumentTextIcon,
    descripcion: 'Nueva orden de compra creada',
    tiempo: 'Hace 6 horas',
    usuario: 'María López',
    orden: 'PO-2025-005'
  },
  {
    id: 4,
    tipo: 'invoiced',
    icono: DocumentCheckIcon,
    descripcion: 'Factura recibida y procesada',
    tiempo: 'Hace 1 día',
    usuario: 'Luis Pérez',
    orden: 'PO-2025-001'
  }
])

// DataTable configuration
const ordenesTableColumns = [
  {
    key: 'numero',
    title: 'Número',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'invoice_number',
    title: 'Factura',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'proveedor',
    title: 'Proveedor',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'fecha',
    title: 'Fecha',
    sortable: true,
    format: 'date',
    align: 'center'
  },
  {
    key: 'valorTotal',
    title: 'Subtotal',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'impuestos',
    title: 'IVA',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'totalItems',
    title: 'Items',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'estado',
    title: 'Estado',
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'fechaEntrega',
    title: 'Entrega',
    sortable: true,
    format: 'date',
    align: 'center'
  },
  {
    key: 'actions',
    title: 'Acciones',
    sortable: false,
    format: 'text',
    align: 'center'
  }
]

// Sorted orders
const sortedOrdenes = computed(() => {
  if (!sortField.value) return ordenes.value

  const sorted = [...ordenes.value].sort((a, b) => {
    const aValue = a[sortField.value]
    const bValue = b[sortField.value]

    // Handle null/undefined
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    // Numeric comparison for numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
    }

    // Date comparison
    if (sortField.value === 'fecha' || sortField.value === 'fechaEntrega') {
      const dateA = new Date(aValue).getTime()
      const dateB = new Date(bValue).getTime()
      return sortDirection.value === 'asc' ? dateA - dateB : dateB - dateA
    }

    // String comparison
    const strA = String(aValue).toLowerCase()
    const strB = String(bValue).toLowerCase()
    if (sortDirection.value === 'asc') {
      return strA.localeCompare(strB)
    } else {
      return strB.localeCompare(strA)
    }
  })

  return sorted
})

// Handle sort
const handleSort = (field) => {
  if (sortField.value === field) {
    // Toggle direction
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New field, default to ascending
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

// Helper functions
const { formatDate, formatDateShort } = useFormatters()

const getStatusVariant = (status) => {
  const variants: Record<string, string> = {
    quotation: 'secondary',
    pending: 'warning',
    confirmed: 'primary',
    preparing: 'info',
    shipped: 'info',
    partially_received: 'success',
    received: 'success',
    verified: 'success',
    invoiced: 'secondary',
    paid: 'success',
    cancelled: 'destructive',
    overdue: 'destructive'
  }
  return variants[status] || 'secondary'
}

const getStatusText = (status) => {
  const texts = {
    quotation: 'Cotización',
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    preparing: 'En Preparación',
    shipped: 'Enviada',
    received: 'Recibida',
    verified: 'Verificada',
    invoiced: 'Facturada',
    paid: 'Pagada',
    cancelled: 'Cancelada'
  }
  return texts[status] || 'Desconocido'
}

// Methods
const viewOrderDetails = (orden) => {
  // Navegar a página de detalles de la orden
  navigateTo(`/abastecimiento/compras/${orden.numero}`)
}

const openActionsMenu = (orden) => {
  // TODO: Implementar modal con acciones (editar, recibir, descargar, etc.)

}

// Funciones mantenidas para futura implementación
const editOrder = (orden) => {
  // Navegar a la página de editar usando path parameter
  navigateTo(`/abastecimiento/compra/${orden.id}`)
}

const receiveOrder = (orden) => {
  orden.estado = 'received'

}

const downloadOrder = (orden) => {

}

useHead({
  title: 'Órdenes de Compra - Abastecimiento'
})
</script>
