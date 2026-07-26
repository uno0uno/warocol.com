<template>
  <div class="page-layout">
    <!-- Loading State (only show if no data yet) -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:search-field="apiSearchField"
        :search-fields="searchFields"
        :search-placeholder="t('abastecimiento.proveedores.searchPlaceholder')"
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="statusFilter"
            :class="[filterSelectClass, 'md:hidden']"
            :aria-label="t('abastecimiento.proveedores.filterStatusAria')"
            @change="onStatusFilterChange"
          >
            <option value="">{{ t('abastecimiento.common.estado') }}</option>
            <option value="active">{{ t('abastecimiento.common.activo') }}</option>
            <option value="inactive">{{ t('abastecimiento.common.inactivo') }}</option>
          </select>

          <select
            v-model="paymentTermsFilter"
            :class="filterSelectClass"
            :aria-label="t('abastecimiento.proveedores.filterPaymentAria')"
            @change="onPaymentTermsChange"
          >
            <option value="">{{ t('abastecimiento.proveedores.paymentTermsFilter') }}</option>
            <option v-for="term in paymentTermsOptions" :key="term" :value="term">{{ term }}</option>
          </select>
        </template>

        <template #trailing>
          <button
            type="button"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
            @click="handleNewSupplierClick"
          >
            <span class="hidden sm:inline">{{ t('abastecimiento.proveedores.newSupplier') }}</span>
            <span class="sm:hidden">{{ t('abastecimiento.proveedores.newShort') }}</span>
          </button>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="proveedoresTableColumns"
        :data="suppliers"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        :empty-message="t('abastecimiento.proveedores.empty')"
        :empty-sub-message="t('abastecimiento.proveedores.emptySub')"
        variant="default"
        row-size="sm"
      >
        <template #header-is_active>
          <UiTableHeaderFilter
            :title="t('abastecimiento.common.estado')"
            column-key="is_active"
            sortable
            :sort-field="sortField"
            :sort-direction="sortDirection"
            filter-type="select"
            :model-value="statusFilter"
            :options="supplierStatusOptions"
            :all-label="t('abastecimiento.common.todos')"
            align="center"
            @sort="handleSort"
            @update:model-value="updateStatusHeaderFilter"
          />
        </template>

        <!-- Mobile Card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
              <p class="text-xs text-text-secondary mt-0.5 truncate">
                {{ item.tax_id || '—' }}{{ item.email ? ` · ${item.email}` : '' }}
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <UiStatusBadge
                :value="item.is_active ? t('abastecimiento.common.activo') : t('abastecimiento.common.inactivo')"
                format="text"
                :variant="item.is_active ? 'success' : 'destructive'"
                size="sm"
              />
              <button
                @click.stop="copyPortalLink(item)"
                class="w-7 h-7 flex items-center justify-center rounded bg-surface-secondary border border-border text-text-secondary hover:text-primary transition-colors"
                :title="t('abastecimiento.proveedores.copyPortal')"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
              <button
                @click.stop="editProveedor(item)"
                class="w-7 h-7 flex items-center justify-center rounded bg-surface-secondary border border-border text-text-secondary hover:text-primary transition-colors"
                :title="t('abastecimiento.proveedores.editSupplier')"
              >
                <PencilIcon class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-name="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-tax_id="{ value }">
          <span class="text-sm text-text-secondary">{{ value || '—' }}</span>
        </template>

        <template #cell-email="{ value }">
          <span class="text-sm text-text-primary">{{ value || '—' }}</span>
        </template>

        <template #cell-phone="{ value }">
          <span class="text-sm text-text-secondary">{{ value || '—' }}</span>
        </template>

        <template #cell-is_active="{ value }">
          <UiStatusBadge :value="value ? t('abastecimiento.common.activo') : t('abastecimiento.common.inactivo')" format="text"
            :variant="value ? 'success' : 'destructive'" size="sm" />
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <button @click="copyPortalLink(row)" class="text-text-secondary hover:text-primary transition-colors"
              :title="t('abastecimiento.proveedores.copyPortal')">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <button @click="editProveedor(row)" class="text-text-secondary hover:text-primary transition-colors"
              :title="t('abastecimiento.proveedores.editSupplier')">
              <PencilIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div v-if="totalSuppliers > 0" class="flex items-center justify-end px-1 py-2">
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.primeraPagina')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaAnterior')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ currentPage }}</span>
          <button
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaSiguiente')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            :disabled="currentPage >= totalPages"
            @click="goToPage(totalPages)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.ultimaPagina')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

    </div>

    <UiConfirmActionModal
      v-model="quotaLimitModalOpen"
      :title="t('billing.upgrade.quotaBlocked')"
      :message="quotaLimitModalMessage"
      :confirm-label="t('nav.miPlan')"
      :cancel-label="t('billing.close')"
      @confirm="goToBillingFromQuotaLimitModal"
      @cancel="closeQuotaLimitModal"
    />
  </div>
</template>

<script setup lang="ts">
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  TruckIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/vue/24/outline'
import { ref, computed, watch, inject, onMounted } from 'vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useSupplierTaxIdLabel } from '~/composables/useSupplierTaxIdLabel'
import { useOperationalQuotaGate } from '~/composables/useOperationalQuotaGate'

const { t } = useI18n({ useScope: 'global' })
const { taxIdLabel } = useSupplierTaxIdLabel()

// Plan quota gate: Nuevo stays clickable; Mi Plan modal at tenant_suppliers cap (#1818)
const {
  quotaLimitModalOpen,
  quotaLimitModalMessage,
  closeQuotaLimitModal,
  goToBillingFromQuotaLimitModal,
  handleCreateClick,
  ensureBillingOverview,
} = useOperationalQuotaGate('tenant_suppliers')

const handleNewSupplierClick = () => {
  void handleCreateClick(() => navigateTo('/abastecimiento/proveedor/crear'))
}

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// Reactive state for API parameters

const currentPage = ref(1);

const itemsPerPage = ref(20);

// Sorting state
const sortField = ref('')
const sortDirection = ref<'asc' | 'desc'>('asc')

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const apiSearchField = ref('name')
const statusFilter = ref('')
const paymentTermsFilter = ref('')

const searchFields = computed(() => [
  { label: t('abastecimiento.common.proveedor'), value: 'name' },
  { label: taxIdLabel.value, value: 'tax_id' },
  { label: t('abastecimiento.common.email'), value: 'email' },
  { label: t('abastecimiento.common.telefono'), value: 'phone' },
])

const supplierStatusOptions = computed(() => [
  { value: 'active', label: t('abastecimiento.common.activo') },
  { value: 'inactive', label: t('abastecimiento.common.inactivo') },
])

const apiIsActive = ref<boolean | null>(null)
const apiPaymentTerms = ref<string | null>(null)

const onStatusFilterChange = () => {
  if (statusFilter.value === 'active') apiIsActive.value = true
  else if (statusFilter.value === 'inactive') apiIsActive.value = false
  else apiIsActive.value = null
  currentPage.value = 1
}

const updateStatusHeaderFilter = (value: string | boolean) => {
  statusFilter.value = typeof value === 'string' ? value : ''
  onStatusFilterChange()
}

const onPaymentTermsChange = () => {
  apiPaymentTerms.value = paymentTermsFilter.value || null
  currentPage.value = 1
}

const performSearch = () => applySearch(() => { currentPage.value = 1 })

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || statusFilter.value !== ''
    || !!paymentTermsFilter.value,
)

const clearFilters = () => {
  clearSearch()
  apiSearchField.value = 'name'
  statusFilter.value = ''
  paymentTermsFilter.value = ''
  apiIsActive.value = null
  apiPaymentTerms.value = null
  currentPage.value = 1
}

const { data: suppliersLookupData } = useQuery({
  key: () => ['suppliers', 'providers', 'payment-terms-options', currentTenant.value?.id],
  query: async () => {
    const response = await $fetch<{ data?: { payment_terms?: string | null }[] }>('/api/suppliers/providers', {
      query: { limit: 250 },
    })
    return response.data ?? []
  },
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const paymentTermsOptions = computed(() => {
  const terms = new Set(
    (suppliersLookupData.value ?? [])
      .map((s) => s.payment_terms)
      .filter((t): t is string => !!t && t.trim().length > 0),
  )
  return [...terms].sort((a, b) => a.localeCompare(b))
})



const { data: suppliersData, status: queryStatus, asyncStatus: queryAsyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['suppliers', 'providers', currentTenant.value?.id, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: appliedSearch.value || null,
    search_field: apiSearchField.value || null,
    is_active: apiIsActive.value,
    payment_terms: apiPaymentTerms.value || null,
  }],
  query: async () => {
    const params: Record<string, any> = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    }
    if (appliedSearch.value) {
      params.search = appliedSearch.value
      params.search_field = apiSearchField.value
    }
    if (apiIsActive.value !== null) params.is_active = apiIsActive.value
    if (apiPaymentTerms.value) params.payment_terms = apiPaymentTerms.value
    const response = await $fetch<any>('/api/suppliers/providers', { query: params })
    return {
      data: response.data || [],
      total: response.total || 0,
      stats: response.stats || null,
    }
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !suppliersData.value && !fetchError.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && suppliersData.value != null)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

onMounted(() => {
  setRefreshHandler(refetch)
  ensureBillingOverview()
})
useMenuReturnRefresh(
  '/abastecimiento/proveedores',
  refetch,
  'abastecimiento-last-path',
  ['/abastecimiento/proveedor/', '/abastecimiento/proveedores/']
)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})

// Computed properties for data and pagination
// Computed properties for data and pagination
const suppliersList = computed(() => suppliersData.value?.data || []);
const totalSuppliers = computed(() => suppliersData.value.total);

// Sorted suppliers
const suppliers = computed(() => {
  if (!sortField.value) return suppliersList.value

  const sorted = [...suppliersList.value].sort((a, b) => {
    const aValue = a[sortField.value]
    const bValue = b[sortField.value]

    // Handle null/undefined
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    // Numeric comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
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






// DataTable configuration

const proveedoresTableColumns = computed(() => [
  {
    key: 'name',
    title: t('abastecimiento.common.proveedor'),
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'tax_id',
    title: taxIdLabel.value,
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'email',
    title: t('abastecimiento.common.email'),
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'phone',
    title: t('abastecimiento.common.telefono'),
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'is_active',
    title: t('abastecimiento.common.estado'),

    sortable: true,

    format: 'boolean',

    align: 'center'

  },

  {

    key: 'actions',

    title: t('abastecimiento.common.acciones'),

    sortable: false,

    format: 'text',

    align: 'center'

  }

])



// Computed properties for pagination display

const totalPages = computed(() => Math.max(1, Math.ceil(totalSuppliers.value / itemsPerPage.value)));



// Pagination methods

const goToPage = (page) => {
  const next = Math.max(1, Math.min(page, totalPages.value))
  currentPage.value = next
};



// Methods

const editProveedor = (proveedor) => {

  // Navegar a la página de editar usando path parameter

  navigateTo(`/abastecimiento/proveedor/${proveedor.id}`)

}

const copyPortalLink = async (proveedor) => {
  try {
    const baseUrl = window.location.origin
    const portalUrl = `${baseUrl}/proveedor/${proveedor.access_token}`

    // Try modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(portalUrl)
    } else {
      // Fallback for non-HTTPS contexts
      const textArea = document.createElement('textarea')
      textArea.value = portalUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }


  } catch (error) {

  }
}

// The toggleStatus function might need to be updated to call the API

const toggleStatus = (proveedor) => {

  proveedor.is_active = !proveedor.is_active



}



useHead({ title: () => t('abastecimiento.head.proveedores') })

</script>
