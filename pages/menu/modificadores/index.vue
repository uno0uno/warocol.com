<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        :search-fields="[]"
        search-placeholder="Buscar grupo o producto..."
        :show-date-range="false"
        :show-clear="hasActiveModificadoresFilters"
        @search="performSearch"
        @clear="onClearModificadoresFilters"
      >
        <template #trailing>
          <button
            @click="goToCreateGroup"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
          >
            <span class="hidden sm:inline">+ Nuevo Grupo</span>
            <span class="sm:hidden">+ Nuevo</span>
          </button>
        </template>
      </UiAdvancedFiltersBar>
      <!-- Tabla de Grupos de Modificadores -->
      <UiResponsiveDataView
        :columns="gruposTableColumns"
        :data="modifierGroups"
        empty-message="No hay grupos de modificadores registrados"
        empty-sub-message="Crea un nuevo grupo para comenzar"
        variant="default"
        row-size="sm"
      >
      <template #header-tipo>
        <UiTableHeaderFilter
          v-model="requiredFilter"
          title="Tipo"
          filter-type="select"
          :options="requiredHeaderOptions"
          all-label="Todos"
          align="center"
        />
      </template>

      <!-- Desktop Table Cells -->
      <template #cell-name="{ value }">
        <div class="flex items-center">
          <div class="ml-2">
            <div class="text-sm font-bold text-text-primary">{{ value }}</div>
          </div>
        </div>
      </template>

      <template #cell-products="{ row }">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="product in (row.products || []).slice(0, 3)"
            :key="product.id"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
          >
            {{ product.name }}
          </span>
          <span
            v-if="(row.products || []).length > 3"
            class="text-xs text-text-secondary"
          >
            +{{ row.products.length - 3 }} más
          </span>
          <span v-if="!row.products?.length" class="text-xs text-text-secondary">
            Sin productos
          </span>
        </div>
      </template>

      <template #cell-opciones="{ row }">
        <div class="flex flex-col items-center gap-0.5 max-w-[220px] mx-auto">
          <span class="text-sm font-semibold text-text-primary">
            {{ getModificadoresByGrupo(row.id).length }}
          </span>
          <span class="text-xs text-text-secondary text-center line-clamp-2" :title="formatGroupOptionsSummary(row.id)">
            {{ formatGroupOptionsSummary(row.id) }}
          </span>
        </div>
      </template>

      <template #cell-min_qty="{ value }">
        <div class="flex justify-center">
          <span class="text-sm text-text-primary">{{ value }}</span>
        </div>
      </template>

      <template #cell-max_qty="{ value }">
        <div class="flex justify-center">
          <span class="text-sm text-text-primary">{{ value }}</span>
        </div>
      </template>

      <template #cell-tipo="{ row }">
        <div class="flex justify-center">
          <UiStatusBadge
            v-if="row.is_required"
            value="Obligatorio"
            format="text"
            variant="warning"
            size="sm"
          />
          <UiStatusBadge
            v-else
            value="Opcional"
            format="text"
            variant="secondary"
            size="sm"
          />
        </div>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex justify-center">
          <button
            @click="goToEditGroup(row.id)"
            class="text-text-secondary hover:text-primary transition-colors"
            title="Editar grupo"
          >
            <Icon name="heroicons:pencil-square" class="h-4 w-4" />
          </button>
        </div>
      </template>

      <!-- Mobile Card -->
      <template #card="{ item, index }">
        <div
          class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary cursor-pointer"
          :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          @click="goToEditGroup(item.id)"
        >
          <div class="flex-1 min-w-0">
            <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
            <p class="text-xs text-text-secondary mt-0.5 line-clamp-2">
              {{ getModificadoresByGrupo(item.id).length }} opciones · sel. {{ item.min_qty }}–{{ item.max_qty }}
              <span v-if="formatGroupOptionsSummary(item.id)"> · {{ formatGroupOptionsSummary(item.id) }}</span>
            </p>
          </div>
          <UiStatusBadge
            :value="item.is_required ? 'Obligatorio' : 'Opcional'"
            format="text"
            :variant="item.is_required ? 'warning' : 'secondary'"
            size="sm"
          />
        </div>
      </template>
    </UiResponsiveDataView>

    <div v-if="(groupsData?.total ?? 0) > itemsPerPage" class="mt-4 bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
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
            <span class="font-medium">{{ groupsData?.total ?? 0 }}</span>
            grupos
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
      v-for="grupo in modifierGroups.filter(g => expandedRows.has(g.id))"
      :key="`expanded-${grupo.id}`"
      class="hidden md:block bg-surface border border-border rounded-lg p-4 -mt-3"
    >
      <h4 class="text-sm font-semibold text-text-primary mb-3">
        Modificadores del grupo "{{ grupo.name }}"
      </h4>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-2 px-2 text-xs font-medium text-text-secondary">
                Modificador
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Precio Adicional
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Max Cantidad
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="mod in getModificadoresByGrupo(grupo.id)"
              :key="mod.id"
              class="border-b border-border last:border-0"
            >
              <td class="py-3 px-2 text-sm text-text-primary">
                <div class="flex items-center gap-2">
                  {{ mod.name }}
                  <UiStatusBadge
                    v-if="mod.is_default"
                    value="Por defecto"
                    format="text"
                    variant="default"
                    size="sm"
                  />
                </div>
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-center">
                <span :class="mod.price < 0 ? 'text-red-600' : 'text-green-600'">
                  {{ formatCurrency(mod.price) }}
                </span>
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-center">
                {{ mod.max_limit }}
              </td>
              <td class="py-3 px-2 text-center">
                <UiStatusBadge
                  :value="mod.is_available ? 'Activo' : 'Inactivo'"
                  format="text"
                  :variant="mod.is_available ? 'success' : 'destructive'"
                  size="sm"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Modificadores' })

const router = useRouter()
const { currentTenant } = useTenantReactive()

const {
  localSearchTerm,
  appliedSearch,
  clearFilters: clearModificadoresFilters,
  hasActiveFilters,
} = useMenuModificadoresFilters()

const currentPage = ref(1)
const itemsPerPage = ref(20)
const expandedRows = ref(new Set())
const requiredFilter = ref<'required' | 'optional' | ''>('')
const requiredHeaderOptions = [
  { label: 'Obligatorio', value: 'required' },
  { label: 'Opcional', value: 'optional' },
]
const hasActiveModificadoresFilters = computed(() => hasActiveFilters.value || !!requiredFilter.value)

watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })
watch(requiredFilter, () => { currentPage.value = 1 })

const performSearch = () => {
  appliedSearch.value = localSearchTerm.value.trim()
  currentPage.value = 1
}

const onClearModificadoresFilters = () => {
  clearModificadoresFilters()
  requiredFilter.value = ''
  currentPage.value = 1
}

// Fetch modifier groups from API
const { data: groupsData, asyncStatus: groupsAsyncStatus, refetch: refetchGroups } = useQuery({
  key: () => ['menu', 'modifier-groups', currentTenant.value?.id, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: appliedSearch.value || null,
  }],
  query: () => {
    const params: Record<string, string | number> = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    }
    if (appliedSearch.value) params.search = appliedSearch.value
    return $fetch('/api/menu/modifier-groups', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// Fetch stats from API
const { data: statsData, refetch: refetchStats } = useQuery({
  key: () => ['menu', 'modifier-stats', currentTenant.value?.id],
  query: () => $fetch('/api/menu/modifier-groups/stats/summary'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const modifierGroups = computed(() => {
  const list = groupsData.value?.data ?? []
  if (requiredFilter.value === 'required') return list.filter((group: any) => group.is_required)
  if (requiredFilter.value === 'optional') return list.filter((group: any) => !group.is_required)
  return list
})

const totalPages = computed(() =>
  Math.ceil((groupsData.value?.total ?? 0) / itemsPerPage.value),
)

const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

const previousPage = () => {
  if (canGoPrevious.value) currentPage.value--
}

const nextPage = () => {
  if (canGoNext.value) currentPage.value++
}

const startItem = computed(() => (currentPage.value - 1) * itemsPerPage.value + 1)

const endItem = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, groupsData.value?.total ?? 0),
)

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages: number[] = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push(total)
  }

  return pages
})

const stats = computed(() => {
  return {
    total_groups: statsData.value?.total_groups || 0,
    total_modifiers: statsData.value?.total_modifiers || 0,
    with_recipe: 0, // TODO: Add this to API if needed
    products_with_modifiers: statsData.value?.products_with_modifiers || 0
  }
})

const isLoading = computed(() => !groupsData.value)
const isRefreshing = computed(() => groupsAsyncStatus.value === 'loading' && groupsData.value != null)

// Table columns configuration
const gruposTableColumns = [
  {
    key: 'name',
    title: 'Grupo',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'products',
    title: 'Productos',
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'opciones',
    title: 'Opciones',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'min_qty',
    title: 'Mín',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'max_qty',
    title: 'Máx',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'tipo',
    title: 'Tipo',
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

const toggleExpanded = (grupoId: string) => {
  if (expandedRows.value.has(grupoId)) {
    expandedRows.value.delete(grupoId)
  } else {
    expandedRows.value.add(grupoId)
  }
  // Force reactivity
  expandedRows.value = new Set(expandedRows.value)
}

const getModificadoresByGrupo = (grupoId: string) => {
  const grupo = modifierGroups.value.find((g: any) => g.id === grupoId)
  return grupo?.modifiers || []
}


function formatGroupOptionsSummary(grupoId: string) {
  const mods = getModificadoresByGrupo(grupoId)
  if (!mods.length) return ''
  const labels = mods.slice(0, 3).map((m: any) => {
    const type = (m.option_type || 'INGREDIENT').toUpperCase()
    if (type === 'INGREDIENT') return m.ingredient?.name || m.name
    if (type === 'RECIPE') return m.recipe_base?.name || m.name
    if (type === 'PRODUCT') return m.linked_product?.name || m.name
    return m.name
  })
  const suffix = mods.length > 3 ? ` +${mods.length - 3}` : ''
  return labels.filter(Boolean).join(', ') + suffix
}

const goToCreateGroup = () => {
  router.push('/menu/modificadores/crear')
}

const goToEditGroup = (groupId: string) => {
  router.push(`/menu/modificadores/${groupId}`)
}

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const handleRefresh = async () => {
  await Promise.all([refetchGroups(), refetchStats()])
}

onMounted(() => {
  setRefreshHandler(handleRefresh)
})
useMenuReturnRefresh('/menu/modificadores', handleRefresh)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(handleRefresh)
})

</script>
