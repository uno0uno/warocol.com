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
      <div class="flex flex-col gap-2 md:gap-3">
        <UiAdvancedFiltersBar
          v-model:search="localSearchTerm"
          :search-fields="[]"
          :search-placeholder="t('menu.recetas.searchPlaceholder')"
          :show-date-range="false"
          :show-clear="hasActiveRecetasFilters"
          @search="performSearch"
          @clear="onClearRecetasFilters"
        >
          <template #trailing>
            <NuxtLink
              to="/menu/recetas/crear"
              class="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-shell-cta-bg px-4 py-2 text-center text-sm font-medium text-shell-cta-text whitespace-nowrap transition-all hover:bg-shell-cta-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring"
            >
              <Icon name="heroicons:plus" class="h-4 w-4 flex-shrink-0" />
              <span class="hidden sm:inline">{{ t('menu.recetas.newRecipe') }}</span>
              <span class="sm:hidden">{{ t('menu.recetas.newShort') }}</span>
            </NuxtLink>
          </template>
        </UiAdvancedFiltersBar>

        <!-- Tabla de Recetas -->
        <UiResponsiveDataView
          :columns="recetasTableColumns"
          :data="recetas"
          :empty-message="t('menu.recetas.empty')"
          :empty-sub-message="t('menu.recetas.emptySub')"
          variant="default"
          row-size="xs"
        >
          <template #header-is_active>
            <UiTableHeaderFilter
              v-model="statusFilter"
              :title="t('menu.common.estado')"
              filter-type="select"
              :options="statusHeaderOptions"
              :all-label="t('menu.common.todos')"
              align="center"
            />
          </template>

          <!-- Desktop Table Cells -->
          <template #cell-producto_name="{ value }">
            <div class="flex items-center">
              <div class="ms-2">
                <div class="text-sm font-semibold text-text-primary">{{ value }}</div>
              </div>
            </div>
          </template>

          <template #cell-ingredientes_count="{ row }">
            <div class="flex justify-center">
              <span class="text-sm font-medium text-text-primary">{{ row.ingredientes.length }}</span>
            </div>
          </template>

          <template #cell-costo_total="{ row }">
            <div class="flex justify-end">
              <span class="text-sm font-semibold text-primary">{{ formatCurrency(row.costo_total) }}</span>
            </div>
          </template>

          <template #cell-is_active="{ row }">
            <div class="flex justify-center">
              <UiStatusBadge
                :value="row.is_active ? t('menu.common.active') : t('menu.common.inactive')"
                format="text"
                :variant="row.is_active ? 'success' : 'secondary'"
                size="sm"
              />
            </div>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-center">
              <button
                class="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-text-secondary transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring"
                :title="t('menu.recetas.editRecipe')"
                :aria-label="t('menu.recetas.editRecipe')"
                @click="$router.push(`/menu/recetas/${row.id}`)"
              >
                <Icon name="heroicons:pencil-square" class="h-4 w-4" />
              </button>
            </div>
          </template>

          <!-- Mobile Card -->
          <template #card="{ item, index }">
            <div
              class="flex items-center gap-3 py-2 px-3 border-b border-border transition-colors hover:bg-surface-secondary cursor-pointer"
              :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
              @click="$router.push(`/menu/recetas/${item.id}`)"
            >
              <div class="flex-1 min-w-0">
                <span class="text-sm font-semibold text-text-primary">{{ item.producto_name }}</span>
                <p class="text-xs text-text-secondary mt-0.5">{{ item.ingredientes.length }} {{ WAREHOUSE_COPY.recipeLinesCountSuffix }} · {{ formatCurrency(item.costo_total) }}</p>
              </div>
              <UiStatusBadge
                :value="item.is_active ? t('menu.common.active') : t('menu.common.inactive')"
                format="text"
                :variant="item.is_active ? 'success' : 'secondary'"
                size="sm"
              />
            </div>
          </template>
        </UiResponsiveDataView>

        <!-- Pagination -->
        <div v-if="productsData.total > itemsPerPage" class="flex items-center justify-end px-1 py-2">
          <div class="flex flex-1 justify-between sm:hidden">
            <button
              @click="previousPage"
              :disabled="!canGoPrevious"
              :class="[
                'relative inline-flex min-h-[36px] items-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                canGoPrevious ? 'text-text-secondary hover:bg-surface-secondary' : 'text-text-secondary cursor-not-allowed opacity-40'
              ]">
              {{ t('menu.recetas.previous') }}
            </button>
            <button
              @click="nextPage"
              :disabled="!canGoNext"
              :class="[
                'ms-2 relative inline-flex min-h-[36px] items-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                canGoNext ? 'text-text-secondary hover:bg-surface-secondary' : 'text-text-secondary cursor-not-allowed opacity-40'
              ]">
              {{ t('menu.recetas.next') }}
            </button>
          </div>
          <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
              <nav class="relative z-0 inline-flex items-center gap-1" aria-label="Pagination">
                <button
                  @click="previousPage"
                  :disabled="!canGoPrevious"
                  :class="[
                    'relative inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                    canGoPrevious ? 'text-text-secondary hover:bg-surface-secondary' : 'text-text-secondary cursor-not-allowed opacity-40'
                  ]">
                  <span class="sr-only">{{ t('menu.recetas.previous') }}</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
                <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ currentPage }}</span>
                <button
                  @click="nextPage"
                  :disabled="!canGoNext"
                  :class="[
                    'relative inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                    canGoNext ? 'text-text-secondary hover:bg-surface-secondary' : 'text-text-secondary cursor-not-allowed opacity-40'
                  ]">
                  <span class="sr-only">{{ t('menu.recetas.next') }}</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
          </div>
        </div>

        <!-- Detalles expandidos (solo desktop) -->
        <div
          v-for="recipe in recetas.filter(r => expandedRows.has(r.id))"
          :key="`expanded-${recipe.id}`"
          class="hidden md:block bg-surface border border-border rounded-lg p-4 -mt-3"
        >
          <h4 class="text-sm font-semibold text-text-primary mb-3">
            {{ t('menu.recetas.compositionOf', { name: recipe.producto_name }) }}
          </h4>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-start py-2 px-2 text-xs font-medium text-text-secondary">
                    {{ WAREHOUSE_COPY.recipeCompositionTableHeader }}
                  </th>
                  <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                    {{ t('menu.recetas.stockControl') }}
                  </th>
                  <th class="text-end py-2 px-2 text-xs font-medium text-text-secondary">
                    {{ t('menu.recetas.quantity') }}
                  </th>
                  <th class="text-end py-2 px-2 text-xs font-medium text-text-secondary">
                    {{ t('menu.recetas.unitCost') }}
                  </th>
                  <th class="text-end py-2 px-2 text-xs font-medium text-text-secondary">
                    {{ t('menu.recetas.totalCost') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="ing in recipe.ingredientes"
                  :key="ing.ingrediente_id"
                  class="border-b border-border last:border-0"
                >
                  <td class="py-3 px-2 text-sm text-text-primary">
                    {{ ing.ingrediente_name }}
                  </td>
                  <td class="py-3 px-2 text-center">
                    <UiStatusBadge
                      v-if="ing.controla_inventario"
                      :value="t('common.yes')"
                      format="text"
                      variant="success"
                      size="sm"
                    />
                    <UiStatusBadge
                      v-else
                      :value="t('common.no')"
                      format="text"
                      variant="secondary"
                      size="sm"
                    />
                  </td>
                  <td class="py-3 px-2 text-sm text-text-primary text-end">
                    {{ formatQuantity(ing.cantidad) }} {{ ing.unidad }}
                  </td>
                  <td class="py-3 px-2 text-sm text-text-primary text-end">
                    {{ formatCurrency(ing.costo_unitario) }}
                  </td>
                  <td class="py-3 px-2 text-sm font-medium text-text-primary text-end">
                    {{ formatCurrency(ing.costo_total) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-border font-semibold">
                  <td colspan="4" class="py-3 px-2 text-sm text-text-primary text-end">
                    {{ t('menu.recetas.total') }}
                  </td>
                  <td class="py-3 px-2 text-sm text-text-primary text-end">
                    {{ formatCurrency(recipe.costo_total) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { formatDomainQuantity, normalizeDomainNumber } from '~/utils/domainNumberFormat'
const { t } = useI18n()
const WAREHOUSE_COPY = useWarehouseCopy()
const { formatCurrency } = useFormatters()

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
  module: 'menu',
})

useHead({ title: () => t('menu.head.recetas')})

const { currentTenant } = useTenantReactive()

const {
  localSearchTerm,
  appliedSearch: apiSearchTerm,
  clearFilters: clearRecetasFilters,
  hasActiveFilters,
} = useMenuRecetasFilters()

const currentPage = ref(1)
const itemsPerPage = ref(20)
const expandedRows = ref(new Set())
const statusFilter = ref<'active' | 'inactive' | ''>('')
const statusHeaderOptions = [
  { label: t('menu.common.active'), value: 'active' },
  { label: t('menu.common.inactive'), value: 'inactive' },
]
const isActiveFilter = computed(() => {
  if (statusFilter.value === 'active') return true
  if (statusFilter.value === 'inactive') return false
  return null
})
const hasActiveRecetasFilters = computed(() => hasActiveFilters.value || !!statusFilter.value)

// Fetch recipe bases from backend with ingredients
const { data: productsData, status: queryStatus, asyncStatus: queryAsyncStatus, error: queryError, refetch } = useQuery({
  key: () => ['menu', 'recipe-bases', currentTenant.value?.id, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: apiSearchTerm.value || null,
    is_active: isActiveFilter.value,
  }],
  query: () => {
    const params: Record<string, string | number | boolean> = {
      page: currentPage.value,
      limit: itemsPerPage.value,
      include_ingredients: true
    }
    if (apiSearchTerm.value) {
      params.search = apiSearchTerm.value
    }
    if (isActiveFilter.value !== null) {
      params.is_active = isActiveFilter.value
    }
    return $fetch('/api/menu/recipe-bases', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !productsData.value && !queryError.value)
const fetchError = computed(() => !!queryError.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && productsData.value != null)

// Reset page on tenant change — key change triggers automatic refetch
watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })
watch(statusFilter, () => { currentPage.value = 1 })

const performSearch = () => {
  apiSearchTerm.value = localSearchTerm.value.trim()
  currentPage.value = 1
}

const onClearRecetasFilters = () => {
  clearRecetasFilters()
  statusFilter.value = ''
  currentPage.value = 1
}

// Transform recipe bases data to match display format
const recetas = computed(() => {
  if (!productsData.value?.data) return []

  return productsData.value.data.map((recipeBase: any) => ({
    id: recipeBase.id,
    producto_id: recipeBase.id,
    producto_name: recipeBase.name,
    descripcion: recipeBase.description,
    is_active: recipeBase.is_active,
    ingredientes: recipeBase.ingredients?.map((ing: any) => {
      const costoUnitario = Number(ing.costo_unitario || 0)
      const cantidad = normalizeDomainNumber(ing.base_quantity, 6)
      return {
        ingrediente_id: ing.ingredient_id,
        ingrediente_name: ing.ingredient_name,
        cantidad: cantidad,
        unidad: ing.unit,
        notes: ing.notes,
        costo_unitario: costoUnitario,
        costo_total: costoUnitario * cantidad,
        controla_inventario: ing.controla_inventario || false
      }
    }) || [],
    costo_total: recipeBase.ingredients?.reduce((total: number, ing: any) => {
      return total + (Number(ing.costo_unitario || 0) * Number(ing.base_quantity || 0))
    }, 0) || 0,
    rendimiento: 1
  }))
})

// Pagination
const totalPages = computed(() => {
  return Math.ceil((productsData.value?.total || 0) / itemsPerPage.value)
})

const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)

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

// Table columns configuration
const recetasTableColumns = [
  {
    key: 'producto_name',
    title: t('menu.recetas.nameCol'),
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'ingredientes_count',
    title: WAREHOUSE_COPY.recipeLinesColumn,
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'costo_total',
    title: t('abastecimiento.common.costo'),
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'is_active',
    title: t('menu.common.estado'),
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'actions',
    title: t('menu.common.acciones'),
    sortable: false,
    format: 'text',
    align: 'center'
  }
]

const formatQuantity = (value: number) => formatDomainQuantity(value, 6)

const toggleExpanded = (recipeId: number) => {
  if (expandedRows.value.has(recipeId)) {
    expandedRows.value.delete(recipeId)
  } else {
    expandedRows.value.add(recipeId)
  }
  // Force reactivity
  expandedRows.value = new Set(expandedRows.value)
}

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

onMounted(() => {
  setRefreshHandler(refetch)
})
useMenuReturnRefresh('/menu/recetas', refetch)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})

</script>

<style scoped>
.page-layout {
  @apply w-full;
}
</style>
