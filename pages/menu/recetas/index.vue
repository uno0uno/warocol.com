<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <Icon name="heroicons:exclamation-circle" class="h-16 w-16 mx-auto text-text-secondary mb-4" />
        <p class="text-text-secondary">{{ fetchError }}</p>
        <UiButton variant="outline" size="default" class="mt-4" @click="refresh">
          Reintentar
        </UiButton>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="page-layout">
      <div class="flex flex-col gap-3 md:gap-4">
        <!-- Filters Bar -->
        <SharedFiltersBar
          v-model:search="localSearchTerm"
          v-model:search-field="apiSearchField"
          @search="performSearch"
          @clear-filters="clearFilters"
        />

        <!-- Tabla de Recetas -->
        <UiResponsiveDataView
          :columns="recetasTableColumns"
          :data="recetas"
          title="Gestión de Recetas Base"
          empty-message="No hay recetas base registradas"
          empty-sub-message="Crea una nueva receta base para comenzar"
          variant="default"
        >
          <!-- Mobile Actions -->
          <template #mobileActions>
            <NuxtLink to="/menu/recetas/crear"
              class="btn-primary w-full px-4 py-2 rounded-lg text-sm font-medium text-center">
              + Nueva Receta Base
            </NuxtLink>
          </template>

          <!-- Desktop Header -->
          <template #header>
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <h3 class="text-base sm:text-lg font-bold text-text-primary">
                Gestión de Recetas Base
              </h3>
              <NuxtLink to="/menu/recetas/crear"
                class="btn-primary px-4 sm:px-6 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap">
                <span class="hidden sm:inline">+ Nueva Receta Base</span>
                <span class="sm:hidden">+ Nueva</span>
              </NuxtLink>
            </div>
          </template>

          <!-- Desktop Table Cells -->
          <template #cell-producto_name="{ value }">
            <div class="flex items-center">
              <div class="ml-2">
                <div class="text-sm font-bold text-ebony-800">{{ value }}</div>
              </div>
            </div>
          </template>

          <template #cell-ingredientes_count="{ row }">
            <div class="flex justify-center">
              <span class="text-sm font-semibold text-text-primary">{{ row.ingredientes.length }}</span>
            </div>
          </template>

          <template #cell-costo_total="{ row }">
            <div class="flex justify-end">
              <span class="text-sm text-text-primary">{{ formatCurrency(row.costo_total) }}</span>
            </div>
          </template>

          <template #cell-is_active="{ row }">
            <div class="flex justify-center">
              <UiStatusBadge
                :value="row.is_active ? 'Activa' : 'Inactiva'"
                format="text"
                :variant="row.is_active ? 'success' : 'secondary'"
                size="sm"
              />
            </div>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-center">
              <button
                class="text-crocus-600 hover:text-crocus-900 transition-colors"
                title="Editar receta"
                @click="$router.push(`/menu/recetas/${row.id}`)"
              >
                <Icon name="heroicons:pencil-square" class="h-4 w-4" />
              </button>
            </div>
          </template>

          <!-- Mobile Card -->
          <template #card="{ item }">
            <div class="bg-surface border border-border rounded-xl p-4">
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <p class="font-semibold text-text-primary">{{ item.producto_name }}</p>
                  <p v-if="item.descripcion" class="text-xs text-text-secondary mt-1">{{ item.descripcion }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <p class="text-xs text-text-secondary">
                      {{ item.ingredientes.length }} ingredientes
                    </p>
                    <span class="text-xs text-text-tertiary">•</span>
                    <p class="text-xs text-text-primary">
                      {{ formatCurrency(item.costo_total) }}
                    </p>
                  </div>
                </div>
                <UiStatusBadge
                  :value="item.is_active ? 'Activa' : 'Inactiva'"
                  format="text"
                  :variant="item.is_active ? 'success' : 'secondary'"
                  size="sm"
                />
              </div>

              <div class="space-y-2">

                <!-- Ingredientes expandibles -->
                <div v-if="expandedRows.has(item.id)" class="pt-2 border-t border-border">
                  <p class="text-xs font-semibold text-text-primary mb-2">Ingredientes:</p>
                  <div class="space-y-1.5">
                    <div
                      v-for="ing in item.ingredientes"
                      :key="ing.ingrediente_id"
                      class="flex justify-between items-center text-xs"
                    >
                      <div class="flex items-center gap-2 flex-1">
                        <span class="text-text-primary">{{ ing.ingrediente_name }}</span>
                        <UiStatusBadge
                          v-if="ing.is_required"
                          value="Requerido"
                          format="text"
                          variant="success"
                          size="sm"
                        />
                      </div>
                      <div class="text-right">
                        <div class="text-text-primary font-medium">
                          {{ ing.cantidad }} {{ ing.unidad }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex gap-2 mt-3">
                <button
                  @click="toggleExpanded(item.id)"
                  class="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
                >
                  {{ expandedRows.has(item.id) ? 'Contraer' : 'Ver ingredientes' }}
                </button>
                <button
                  class="px-3 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
                  @click="$router.push(`/menu/recetas/${item.id}`)"
                >
                  Editar
                </button>
              </div>
            </div>
          </template>
        </UiResponsiveDataView>

        <!-- Pagination -->
        <div v-if="productsData.total > itemsPerPage" class="bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
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
                recetas
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

        <!-- Detalles expandidos (solo desktop) -->
        <div
          v-for="recipe in recetas.filter(r => expandedRows.has(r.id))"
          :key="`expanded-${recipe.id}`"
          class="hidden md:block bg-surface border border-border rounded-lg p-4 -mt-3"
        >
          <h4 class="text-sm font-semibold text-text-primary mb-3">
            Ingredientes de {{ recipe.producto_name }}
          </h4>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-2 px-2 text-xs font-medium text-text-secondary">
                    Ingrediente
                  </th>
                  <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                    Control Stock
                  </th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-text-secondary">
                    Cantidad
                  </th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-text-secondary">
                    Costo Unitario
                  </th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-text-secondary">
                    Costo Total
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
                      value="Sí"
                      format="text"
                      variant="success"
                      size="sm"
                    />
                    <UiStatusBadge
                      v-else
                      value="No"
                      format="text"
                      variant="secondary"
                      size="sm"
                    />
                  </td>
                  <td class="py-3 px-2 text-sm text-text-primary text-right">
                    {{ ing.cantidad }} {{ ing.unidad }}
                  </td>
                  <td class="py-3 px-2 text-sm text-text-primary text-right">
                    {{ formatCurrency(ing.costo_unitario) }}
                  </td>
                  <td class="py-3 px-2 text-sm font-medium text-text-primary text-right">
                    {{ formatCurrency(ing.costo_total) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-border font-semibold">
                  <td colspan="4" class="py-3 px-2 text-sm text-text-primary text-right">
                    Total:
                  </td>
                  <td class="py-3 px-2 text-sm text-text-primary text-right">
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
import { ref, computed, onMounted, inject, watch } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Recetas' })

const { onTenantChange, currentTenant } = useTenantReactive()

// Reactive state
const localSearchTerm = ref('')
const apiSearchTerm = ref('')
const apiSearchField = ref('name')
const statusFilter = ref('')
const categoryFilter = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(20)
const expandedRows = ref(new Set())

// Fetch recipe bases from backend with ingredients
const { data: productsData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `recipe-bases-${currentTenant.value?.id || 'default'}`,
  () => {
    const params: any = {
      page: currentPage.value,
      limit: itemsPerPage.value,
      include_ingredients: true
    }
    if (apiSearchTerm.value) {
      params.search = apiSearchTerm.value
    }

    return $fetch('/api/menu/recipe-bases', {
      query: params
    })
  },
  {
    server: false,
    watch: [currentTenant, currentPage, itemsPerPage],
    default: () => ({ data: [], total: 0 }),
    transform: (response: any) => ({
      data: response.data || [],
      total: response.total || 0,
    })
  }
)

const performSearch = () => {
  apiSearchTerm.value = localSearchTerm.value
  currentPage.value = 1
  refresh()
}

// Debounce search
let searchTimeout: NodeJS.Timeout
watch(localSearchTerm, (newVal) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 500)
})

const clearFilters = () => {
  localSearchTerm.value = ''
  apiSearchTerm.value = ''
  currentPage.value = 1
  refresh()
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
      const cantidad = Number(ing.base_quantity || 0)
      return {
        ingrediente_id: ing.ingredient_id,
        ingrediente_name: ing.ingredient_name,
        cantidad: cantidad,
        unidad: ing.unit,
        is_required: ing.is_required,
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

// Debug logs
watch([isLoading, recetas], ([loading, recipes]) => {
  console.log('🍳 [RECETAS] isLoading:', loading)
  console.log('🍳 [RECETAS] recetas.length:', recipes?.length || 0)
  console.log('🍳 [RECETAS] productsData:', productsData.value)
}, { immediate: true })

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

// Table columns configuration
const recetasTableColumns = [
  {
    key: 'producto_name',
    title: 'Nombre de Receta',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'ingredientes_count',
    title: 'Ingredientes',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'costo_total',
    title: 'Costo',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'is_active',
    title: 'Estado',
    sortable: true,
    format: 'text',
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const toggleExpanded = (recipeId: number) => {
  if (expandedRows.value.has(recipeId)) {
    expandedRows.value.delete(recipeId)
  } else {
    expandedRows.value.add(recipeId)
  }
  // Force reactivity
  expandedRows.value = new Set(expandedRows.value)
}

const setRefreshHandler = inject('setRefreshHandler', () => {})

onMounted(() => {
  setRefreshHandler(refresh)
})

onTenantChange(async () => {
  await refresh()
})
</script>

<style scoped>
.page-layout {
  @apply w-full;
}
</style>
