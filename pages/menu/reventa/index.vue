<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="page-layout">
      <div class="flex flex-col gap-3 md:gap-4">
        <MenuCatalogFiltersBar
          search-placeholder="Buscar productos de reventa..."
          :show-no-recipe="false"
          show-cost-drift
          @search="onCatalogSearch"
          @clear="onCatalogClear"
          @filter-change="currentPage = 1"
        />

        <MenuCatalogBulkBar
          v-if="selectedIds.length > 0"
          variant="selection"
          v-model:bulk-category-id="bulkCategoryId"
          v-model:bulk-availability="bulkAvailability"
          v-model:bulk-station-id="bulkStationId"
          v-model:bulk-online="bulkOnline"
          v-model:bulk-qr="bulkQr"
          :selected-count="selectedIds.length"
          :edit-mode="editMode"
          :is-submitting="isSubmitting"
          :can-apply="canBulkApply"
          :show-station="false"
          :show-online="false"
          :show-qr="false"
          :categories="categories"
          :availability-options="availabilityBulkOptions"
          @apply="onBulkApply"
          @clear-selection="clearSelection"
          @cancel="() => cancelEditOperation(clearSelection)"
          @delete="openBulkDeleteModal"
        />

        <MenuCatalogBulkBar
          v-else-if="editMode"
          variant="edit-only"
          :is-submitting="isSubmitting"
          :can-save-edit="hasChanges && canSubmit"
          @apply="saveChanges"
          @cancel="() => cancelEditOperation(clearSelection)"
        />

        <HealthSemaphore :is-unlocked="true" title="Catálogo comercial de productos de reventa">
          <template #header-actions>
            <div class="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap min-h-[44px] transition-colors"
                :class="editMode
                  ? 'bg-surface border-2 border-border text-text-primary hover:bg-surface-secondary'
                  : 'btn-primary text-primary-foreground'"
                @click="onToggleEditMode"
              >
                <span class="hidden sm:inline">{{ editMode ? 'Ver catálogo' : 'Modo edición' }}</span>
                <span class="sm:hidden">{{ editMode ? 'Ver' : 'Editar' }}</span>
              </button>
              <NuxtLink
                to="/menu/reventa/crear"
                class="btn-secondary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap min-h-[44px] flex items-center"
              >
                <span class="hidden sm:inline">Gestionar productos</span>
                <span class="sm:hidden">Gestionar</span>
              </NuxtLink>
            </div>
          </template>
        <!-- Responsive Data View (Mobile Cards + Desktop Table) -->
        <UiResponsiveDataView
          :columns="productosTableColumns"
          :data="tableRows"
          :row-class="getRowClass"
          :empty-message="emptyMessage"
          :empty-sub-message="emptySubMessage"
          variant="default"
          row-size="sm"
        >
          <template #header-select>
            <div class="flex items-center justify-center">
              <UiBulkSelectCheckbox :checked="allPageSelected" @change="toggleSelectAll" />
            </div>
          </template>

          <template #cell-select="{ row }">
            <UiBulkSelectCheckbox
              v-if="row"
              :checked="selectedIds.includes(row.id)"
              @change="toggleSelect(row.id)"
            />
          </template>

          <!-- Mobile Card Slot -->
          <template #card="{ item, index }">
            <div
              class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors"
              :class="catalogRowClass(item, index)"
            >
              <UiBulkSelectCheckbox
                :checked="selectedIds.includes(item.id)"
                @change="toggleSelect(item.id)"
              />
              <div class="flex-1 min-w-0" @click.stop="editMode">
                <template v-if="editMode">
                  <input
                    v-model="ensureDraft(item).name"
                    type="text"
                    class="input-base w-full py-1.5 px-2 text-sm font-medium"
                    placeholder="Nombre"
                  />
                  <UiFilterSelect
                    v-model="ensureDraft(item).category_id"
                    placeholder="Categoría"
                    :options="categories.map(c => ({ label: c.name, value: c.id }))"
                    class="mt-2 min-w-0"
                  />
                  <div class="relative w-fit mt-2">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs">$</span>
                    <input
                      v-model.number="ensureDraft(item).price"
                      type="number"
                      min="0"
                      step="100"
                      class="input-base input-money w-fit min-w-[7rem] pl-5 pr-2 py-1.5 text-sm text-right tabular-nums"
                      :style="{ width: moneyInputWidth(ensureDraft(item).price) }"
                    />
                  </div>
                </template>
                <template v-else>
                  <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                  <p class="text-xs text-text-secondary mt-0.5">{{ item.category_name || 'Sin categoría' }} · {{ formatCurrency(item.price) }}</p>
                  <p class="text-xs text-text-tertiary flex flex-wrap items-center gap-1">
                    <span>Real:</span>
                    <span v-if="hasCostValue(item.costo_calculado)">{{ formatCostCell(item.costo_calculado) }}</span>
                    <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
                    <span>· Mi costo:</span>
                    <span v-if="hasCostValue(item.costo_percibido)">{{ formatCostCell(item.costo_percibido) }}</span>
                    <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
                  </p>
                </template>
              </div>
              <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                <UiStatusBadge
                  v-if="marginRealPct(item) !== null"
                  :value="marginRealPct(item)!"
                  format="percentage"
                  :variant="(marginRealPct(item) ?? 0) >= 0 ? 'success' : 'secondary'"
                  size="sm"
                  title="Margen real"
                />
                <UiStatusBadge
                  v-else
                  value="N/A"
                  format="text"
                  variant="secondary"
                  size="sm"
                  title="Margen real"
                  class="whitespace-nowrap"
                />
                <UiStatusBadge
                  v-if="marginOperativoPct(item) !== null"
                  :value="marginOperativoPct(item)!"
                  format="percentage"
                  variant="secondary"
                  size="sm"
                  title="Margen operativo"
                />
                <UiStatusBadge
                  v-else
                  value="N/A"
                  format="text"
                  variant="secondary"
                  size="sm"
                  title="Margen operativo"
                  class="whitespace-nowrap"
                />
                <UiStatusBadge
                  :value="item.is_available ? 'Disponible' : 'No disponible'"
                  format="text"
                  :variant="item.is_available ? 'success' : 'default'"
                  size="sm"
                />
              </div>
            </div>
          </template>

          <!-- Desktop Table Cell Customizations -->
          <template #cell-name="{ value, item }">
            <input
              v-if="editMode"
              v-model="ensureDraft(item).name"
              type="text"
              class="input-base min-w-[140px] max-w-[220px] py-1.5 px-2 text-sm font-medium"
              :aria-label="`Nombre de ${item.name}`"
              @click.stop
            />
            <span v-else class="text-sm font-medium text-text-primary">{{ value }}</span>
          </template>

          <template #cell-category_name="{ value, item }">
            <UiFilterSelect
              v-if="editMode"
              v-model="ensureDraft(item).category_id"
              placeholder="Categoría"
              :options="categories.map(c => ({ label: c.name, value: c.id }))"
              class="min-w-[140px]"
              @click.stop
            />
            <span v-else class="text-sm text-text-secondary">{{ value || 'Sin categoria' }}</span>
          </template>

          <template #cell-price="{ value, item }">
            <div v-if="editMode" class="relative w-fit ml-auto shrink-0" @click.stop>
              <span class="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs">$</span>
              <input
                v-model.number="ensureDraft(item).price"
                type="number"
                min="0"
                step="100"
                class="input-base input-money w-fit min-w-[7rem] pl-5 pr-2 py-1.5 text-sm text-right tabular-nums"
                :style="{ width: moneyInputWidth(ensureDraft(item).price) }"
              />
            </div>
            <span v-else class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-costo_calculado="{ value }">
            <div class="flex justify-end">
              <span v-if="hasCostValue(value)" class="text-sm text-text-primary tabular-nums">
                {{ formatCostCell(value) }}
              </span>
              <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
            </div>
          </template>

          <template #cell-costo_percibido="{ value, item }">
            <div class="flex justify-end">
              <input
                v-if="editMode"
                v-model.number="ensureDraft(item).costo_percibido"
                type="number"
                min="0"
                step="100"
                class="input-base input-money w-fit min-w-[7rem] px-2 py-1.5 text-sm text-right tabular-nums"
                :style="{ width: moneyInputWidth(ensureDraft(item).costo_percibido) }"
                placeholder="—"
                @click.stop
              />
              <span v-else-if="hasCostValue(value)" class="text-sm text-text-primary tabular-nums">
                {{ formatCostCell(value) }}
              </span>
              <UiStatusBadge v-else value="N/A" title="Sin costo" format="text" variant="secondary" size="sm" class="whitespace-nowrap" />
            </div>
          </template>

          <template #cell-margen_real="{ row }">
            <div class="flex justify-end">
              <UiStatusBadge
                v-if="marginRealPct(row) !== null"
                :value="marginRealPct(row)!"
                format="percentage"
                :variant="(marginRealPct(row) ?? 0) >= 0 ? 'success' : 'secondary'"
                size="sm"
              />
              <UiStatusBadge
                v-else
                value="N/A"
                title="Sin margen"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
            </div>
          </template>

          <template #cell-margen_operativo="{ row }">
            <div class="flex justify-end">
              <UiStatusBadge
                v-if="marginOperativoPct(row) !== null"
                :value="marginOperativoPct(row)!"
                format="percentage"
                :variant="(marginOperativoPct(row) ?? 0) >= 0 ? 'success' : 'secondary'"
                size="sm"
              />
              <UiStatusBadge
                v-else
                value="N/A"
                title="Sin margen"
                format="text"
                variant="secondary"
                size="sm"
                class="whitespace-nowrap"
              />
            </div>
          </template>

          <template #cell-is_available="{ value, item }">
            <div class="flex justify-center" @click.stop="editMode">
              <button
                v-if="editMode"
                type="button"
                role="switch"
                :aria-checked="item.is_available"
                class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                :class="item.is_available ? 'bg-success' : 'bg-titan-300'"
                @click="toggleDraftAvailability(item)"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="item.is_available ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
              <UiStatusBadge
                v-else
                :value="value ? 'Disponible' : 'No disponible'"
                format="text"
                :variant="value ? 'success' : 'default'"
                size="sm"
              />
            </div>
          </template>

        </UiResponsiveDataView>

        <!-- Pagination -->
        <div v-if="productsData.total > itemsPerPage" class="mt-4 bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
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
                'ml-3 relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md',
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
                <span class="font-medium">{{ productsData.total }}</span>
                productos
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  @click="previousPage"
                  :disabled="!canGoPrevious"
                  :class="[
                    'relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 text-sm font-medium',
                    canGoPrevious ? 'bg-white text-titan-500 hover:bg-titan-50' : 'bg-titan-50 text-titan-400 cursor-not-allowed'
                  ]">
                  <span class="sr-only">Anterior</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="goToPage(page)"
                  :class="[
                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                    page === currentPage
                      ? 'z-10 bg-crocus-50 border-crocus-500 text-crocus-600'
                      : 'bg-white border-titan-300 text-titan-700 hover:bg-titan-50'
                  ]">
                  {{ page }}
                </button>
                <button
                  @click="nextPage"
                  :disabled="!canGoNext"
                  :class="[
                    'relative inline-flex items-center px-2 py-2 rounded-r-md border border-titan-300 text-sm font-medium',
                    canGoNext ? 'bg-white text-titan-500 hover:bg-titan-50' : 'bg-titan-50 text-titan-400 cursor-not-allowed'
                  ]">
                  <span class="sr-only">Siguiente</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
        </HealthSemaphore>
      </div>
    </div>

    <UiModal v-model="showBulkDeleteModal" title="Eliminar productos de reventa">
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <Icon name="heroicons:trash" class="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p class="text-sm text-text-primary font-medium mb-1">
              ¿Eliminar {{ selectedIds.length }} producto{{ selectedIds.length !== 1 ? 's' : '' }}?
            </p>
            <p class="text-sm text-text-secondary">
              Si tienen ventas registradas, se archivarán. Si nunca se vendieron, se eliminan permanentemente.
            </p>
          </div>
        </div>
        <div v-if="bulkDeleteError" class="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {{ bulkDeleteError }}
        </div>
        <div class="flex gap-3 mt-6">
          <UiButton type="button" variant="outline" class="flex-1" :disabled="isSubmitting" @click="showBulkDeleteModal = false">
            Cancelar
          </UiButton>
          <UiButton type="button" variant="destructive" class="flex-1 flex items-center justify-center gap-2" :disabled="isSubmitting" @click="confirmBulkDelete">
            <UiLoadingDots v-if="isSubmitting" size="8px" color="currentColor" />
            <span>{{ isSubmitting ? 'Eliminando...' : 'Sí, eliminar' }}</span>
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { runSequentialProductPatches, runSequentialRequests, toastCatalogBulkResult, toastCatalogDeleteResult } from '@/composables/useMenuCatalogBulkSave'
import { useMenuCatalogEditMode } from '@/composables/useMenuCatalogEditMode'
import { useMenuCatalogSelection } from '@/composables/useMenuCatalogSelection'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useToast } from '@/composables/useToast'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Productos de Reventa' })

const toast = useToast()
const cache = useQueryCache()

const {
  appliedSearch,
  apiSearchField,
  statusFilter,
  categoryFilter,
  sortFilter,
  onlineOnly,
  marginNegativeOnly,
  costDriftOnly,
  performSearch: applyCatalogSearch,
  hasActiveFilters,
} = useMenuCatalogFilters()

const currentPage = ref(1)
const itemsPerPage = ref(20)

const onCatalogSearch = () => applyCatalogSearch(() => { currentPage.value = 1 })
const onCatalogClear = () => { currentPage.value = 1 }

const emptyMessage = computed(() =>
  hasActiveFilters.value
    ? 'Ningún producto de reventa coincide con los filtros'
    : 'No hay productos de reventa registrados',
)

const emptySubMessage = computed(() =>
  hasActiveFilters.value
    ? 'Prueba ajustar o limpiar los filtros'
    : 'Crea un nuevo producto de reventa para comenzar',
)

// Pagination
const totalPages = computed(() => {
  return Math.ceil((productsData.value?.total || 0) / itemsPerPage.value)
})

const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)

const goToPage = (page: number) => {
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
  return Math.min(currentPage.value * itemsPerPage.value, productsData.value?.total || 0)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push(total)
    }
  }

  return pages
})

// Tenant reactivity
const { currentTenant } = useTenantReactive()

const showOnlineControls = computed(() => false)
const showTableQrColumn = computed(() => false)

const { data: categoriesData } = useQuery({
  key: () => ['menu', 'categories', currentTenant.value?.id],
  query: () => $fetch('/api/menu/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const categories = computed(() => (categoriesData.value as { data?: { id: string; name: string }[] })?.data || [])

// Fetch products — ONLY resale (is_resale always true)
const { data: productsData, error: fetchError, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['menu', 'products-resale', currentTenant.value?.id, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: appliedSearch.value || null,
    searchField: apiSearchField.value,
    status: statusFilter.value || null,
    category: categoryFilter.value || null,
    onlineOnly: onlineOnly.value,
    marginNegativeOnly: marginNegativeOnly.value,
    sort: sortFilter.value,
  }],
  query: () => {
    const params: Record<string, string | number | boolean> = {
      page: currentPage.value,
      limit: itemsPerPage.value,
      is_resale: true,
      sort: sortFilter.value,
    }
    if (appliedSearch.value) {
      params.search = appliedSearch.value
      params.search_field = apiSearchField.value
    }
    if (statusFilter.value) {
      params.is_available = statusFilter.value === 'true'
    }
    if (categoryFilter.value) {
      params.category_id = categoryFilter.value
    }
    if (onlineOnly.value) {
      params.is_available_online = true
    }
    if (marginNegativeOnly.value) {
      params.margin_negative = true
    }
    return $fetch('/api/menu/products', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !productsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && productsData.value != null)

// Reset page on tenant or filter change
watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })
// costDriftOnly is client-side; reset page when toggled
watch(costDriftOnly, () => { currentPage.value = 1 })

const products = computed(() => productsData.value?.data || [])

const isOpenSaleShell = (_row: { open_priced?: boolean }) => false

const isSubmitting = ref(false)

const availabilityBulkOptions = [
  { label: 'Disponible', value: 'true' },
  { label: 'No disponible', value: 'false' },
]

const {
  selectedIds,
  bulkCategoryId,
  bulkStationId,
  bulkAvailability,
  bulkOnline,
  bulkQr,
  bulkFields,
  toggleSelect: selectionToggleSelect,
  allPageSelected: isAllPageSelected,
  toggleSelectAll: selectionToggleSelectAll,
  clearSelection: clearCatalogSelection,
  canBulkApplyCatalog: selectionCanBulkApplyCatalog,
  catalogRowSelectionClass,
} = useMenuCatalogSelection()

const {
  editMode,
  productDrafts,
  ensureDraft,
  displayProducts,
  hasChanges,
  canSubmit,
  applyBulkOverridesForSelectedRows,
  discardAllDrafts,
  cancelEditOperation,
  toggleEditMode: editToggleEditMode,
  canBulkApplyEdit,
  buildSavePatchBody,
  idsWithDraftChanges,
} = useMenuCatalogEditMode({
  categories,
  products,
  selectedIds,
  bulkFields,
  isOpenSaleShell,
  showOnlineControls,
  showTableQrColumn,
})

const showBulkDeleteModal = ref(false)
const bulkDeleteError = ref('')

const selectableProductsOnPage = computed(() => displayProducts.value)

const allPageSelected = computed(() => isAllPageSelected(selectableProductsOnPage.value))

const canBulkApplyCatalog = computed(() =>
  selectionCanBulkApplyCatalog({ showOnline: false, showQr: false }),
)

const canBulkApply = computed(() =>
  editMode.value ? canBulkApplyEdit() : canBulkApplyCatalog.value,
)

const toggleSelect = (id: string) => selectionToggleSelect(id, products.value)

const toggleSelectAll = () => selectionToggleSelectAll(selectableProductsOnPage.value)

function clearSelection() {
  clearCatalogSelection()
  bulkDeleteError.value = ''
}

const onToggleEditMode = () => editToggleEditMode(clearSelection)

function toggleDraftAvailability(product: {
  id: string
  name: string
  category_id?: string
  category_name?: string
  price: number
  is_available?: boolean
}) {
  const draft = ensureDraft(product)
  draft.is_available = !draft.is_available
}

watch(
  [currentPage, statusFilter, categoryFilter, sortFilter, onlineOnly, marginNegativeOnly, appliedSearch],
  clearSelection,
)

async function invalidateResaleCatalog() {
  cache.invalidateQueries({ key: ['menu', 'products-resale'] })
  cache.invalidateQueries({ key: ['menu', 'products'] })
}

async function executeBulkCatalogApply() {
  if (!canBulkApplyCatalog.value || isSubmitting.value) return
  isSubmitting.value = true
  const body: Record<string, string | boolean> = {}
  if (bulkCategoryId.value) body.category_id = bulkCategoryId.value
  if (bulkAvailability.value !== '') {
    body.is_available = bulkAvailability.value === 'true'
  }

  try {
    const result = await runSequentialProductPatches(selectedIds.value, () => body)
    await invalidateResaleCatalog()
    await refetch()
    clearSelection()
    toastCatalogBulkResult(result, toast, {
      title: 'Listo',
      errorMessage: 'No se pudo actualizar ningún producto',
    })
  } finally {
    isSubmitting.value = false
  }
}

function onBulkApply() {
  if (editMode.value) {
    saveChanges()
  } else {
    executeBulkCatalogApply()
  }
}

async function saveChanges() {
  if (isSubmitting.value || !canSubmit.value) return
  applyBulkOverridesForSelectedRows()

  const idsToSave = idsWithDraftChanges()
  if (idsToSave.length === 0) return

  isSubmitting.value = true

  try {
    const result = await runSequentialProductPatches(idsToSave, (id) => {
      const draft = productDrafts.value[id]
      if (!draft) return null
      return buildSavePatchBody(draft)
    })

    await invalidateResaleCatalog()
    await refetch()
    discardAllDrafts()
    clearSelection()

    toastCatalogBulkResult(result, toast, {
      title: 'Guardado',
      emptySuccessMessage: 'Catálogo actualizado',
    })
  } finally {
    isSubmitting.value = false
  }
}

const openBulkDeleteModal = () => {
  bulkDeleteError.value = ''
  showBulkDeleteModal.value = true
}

const confirmBulkDelete = async () => {
  if (selectedIds.value.length === 0 || isSubmitting.value) return
  isSubmitting.value = true
  bulkDeleteError.value = ''
  let archived = 0

  const result = await runSequentialRequests(
    selectedIds.value.map((id) => ({
      key: id,
      run: async () => {
        const res = await $fetch<{ success: boolean; archived?: boolean }>(
          `/api/menu/products/${id}`,
          { method: 'DELETE' },
        )
        if (res?.archived) archived++
      },
    })),
  )

  showBulkDeleteModal.value = false
  await invalidateResaleCatalog()
  await refetch()
  clearSelection()
  isSubmitting.value = false

  if (result.fail === 0) {
    toastCatalogDeleteResult({ ...result, archived }, toast)
  } else if (result.ok > 0) {
    toastCatalogDeleteResult({ ...result, archived }, toast)
  } else {
    bulkDeleteError.value = 'No se pudo eliminar ningún producto'
    showBulkDeleteModal.value = true
    toast.error('Error al eliminar', { title: 'Error' })
  }
}

function moneyInputWidth(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '7rem'
  const digits = String(Math.abs(Math.round(Number(value)))).length
  return `${Math.max(11, digits + 5)}ch`
}

const formatCurrency = (value: number) => {
  if (!value) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const {
  marginRealPct,
  marginOperativoPct,
  hasCostDrift,
  formatCostCell: formatCostCellValue,
} = useProductMargins()

const formatCostCell = (value: unknown) => formatCostCellValue(value, formatCurrency)

const hasCostValue = (value: unknown) => value !== null && value !== undefined

const tableRows = computed(() => {
  const rows = displayProducts.value
  if (!costDriftOnly.value) return rows
  return rows.filter((p: { id: string }) => hasCostDrift(p))
})

const costDriftProductIds = computed(() => {
  const ids = new Set<string>()
  for (const p of tableRows.value) {
    if (hasCostDrift(p)) ids.add(p.id)
  }
  return ids
})

const catalogRowBaseClass = (row: { id: string }, index: number) => {
  if (costDriftProductIds.value.has(row.id)) return 'bg-status-warning-bg/40'
  return index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'
}

const catalogRowClass = (row: { id: string }, index: number) =>
  catalogRowSelectionClass(row.id, catalogRowBaseClass(row, index))

const getRowClass = (row: { id: string }): string => {
  const index = tableRows.value.findIndex((p: { id: string }) => p.id === row.id)
  return catalogRowClass(row, index >= 0 ? index : 0)
}

// Inject refresh handler setter from layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refetch)
})
useMenuReturnRefresh('/menu/reventa', refetch)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})

// Table columns configuration
const productosTableColumns = computed(() => [
  { key: 'select', title: '', sortable: false, width: '44px', class: '!px-0', align: 'center' as const },
  {
    key: 'name',
    title: 'Producto',
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'category_name',
    title: 'Categoria',
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'price',
    title: 'Precio',
    sortable: false,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'costo_calculado',
    title: 'Costo real',
    sortable: false,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'costo_percibido',
    title: 'Mi costo',
    sortable: false,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'margen_real',
    title: 'Margen real',
    sortable: false,
    format: 'text',
    align: 'center'
  },
  {
    key: 'margen_operativo',
    title: 'Margen op.',
    sortable: false,
    format: 'text',
    align: 'center'
  },
  {
    key: 'is_available',
    title: 'Estado',
    sortable: false,
    format: 'boolean',
    align: 'center'
  },
])

</script>

<style scoped>
.page-layout {
  @apply w-full;
}
</style>
