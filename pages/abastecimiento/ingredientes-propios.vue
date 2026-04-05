<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Stats Cards -->
      <UiStats>
        <UiStatsCard
          label="Total Personalizados"
          :value="stats.total"
          icon="beaker"
        />
        <UiStatsCard
          label="Con base global"
          :value="stats.withParent"
          icon="link"
        />
        <UiStatsCard
          label="Sin base"
          :value="stats.withoutParent"
          icon="plus-circle"
        />
      </UiStats>

      <!-- Filters Bar -->
      <SharedFiltersBar
        v-model:search="searchQuery"
        search-label="Buscar"
        search-placeholder="Buscar ingredientes..."
        @search="() => {}"
        @clear-filters="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="parentFilter"
            class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer flex-shrink-0"
          >
            <option value="all">Todos</option>
            <option value="with_parent">Con base global</option>
            <option value="without_parent">Sin base</option>
          </select>
        </template>

        <template #actions>
          <button
            @click="showCreateModal = true"
            class="min-h-[44px] px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:outline-none active:scale-95 transition-all flex items-center gap-2 flex-shrink-0"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Crear ingrediente
          </button>
        </template>
      </SharedFiltersBar>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="tableColumns"
        :data="filteredIngredients"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        empty-message="Aún no tienes ingredientes personalizados"
        empty-sub-message="Crea tu primer ingrediente personalizado desde aquí o desde cualquier receta o modificador"
        variant="default"
        row-size="sm"
      >
        <!-- Mobile Card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-text-secondary">{{ item.unit }}</span>
                <span v-if="item.parent_name" class="text-xs text-primary bg-primary/10 rounded px-1">
                  {{ item.parent_name }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                @click.stop="navigateTo(`/abastecimiento/ajustes/crear?ingredientId=${item.id}`)"
                aria-label="`Ajuste manual para ${item.name}`"
                title="Ajuste manual"
                class="w-8 h-8 flex items-center justify-center rounded bg-surface-secondary border border-border text-text-secondary hover:text-primary transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              <button
                @click.stop="navigateTo('/abastecimiento/compras-directas/crear')"
                aria-label="`Registrar compra de ${item.name}`"
                title="Registrar compra"
                class="w-8 h-8 flex items-center justify-center rounded bg-surface-secondary border border-border text-text-secondary hover:text-primary transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 19a1 1 0 100 2 1 1 0 000-2zm-10 0a1 1 0 100 2 1 1 0 000-2z" />
                </svg>
              </button>
              <button
                @click.stop="navigateTo('/abastecimiento/stock')"
                aria-label="`Ver stock de ${item.name}`"
                title="Ver stock"
                class="w-8 h-8 flex items-center justify-center rounded bg-surface-secondary border border-border text-text-secondary hover:text-primary transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- Desktop Cells -->
        <template #cell-name="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-unit="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-parent_name="{ value }">
          <span v-if="value" class="text-sm text-primary bg-primary/10 rounded px-2 py-0.5">{{ value }}</span>
          <span v-else class="text-sm text-text-secondary">—</span>
        </template>

        <template #cell-category="{ value }">
          <span class="text-sm text-text-secondary">{{ value || '—' }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center gap-1">
            <button
              @click="navigateTo(`/abastecimiento/ajustes/crear?ingredientId=${row.id}`)"
              aria-label="`Ajuste manual para ${row.name}`"
              title="Ajuste manual"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-text-secondary hover:text-primary"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
            <button
              @click="navigateTo('/abastecimiento/compras-directas/crear')"
              aria-label="`Registrar compra de ${row.name}`"
              title="Registrar compra"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-text-secondary hover:text-primary"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5 6m0 0h9M17 19a1 1 0 100 2 1 1 0 000-2zm-10 0a1 1 0 100 2 1 1 0 000-2z" />
              </svg>
            </button>
            <button
              @click="navigateTo('/abastecimiento/stock')"
              aria-label="`Ver stock de ${row.name}`"
              title="Ver stock"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-text-secondary hover:text-primary"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>

    <!-- Create Modal -->
    <UiCreateCustomIngredientModal
      v-model="showCreateModal"
      @created="onIngredientCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

useHead({ title: 'Ingredientes Personalizados' })

const { currentTenant } = useTenantReactive()

// State
const searchQuery = ref('')
const parentFilter = ref('all')
const sortField = ref('')
const sortDirection = ref('asc')
const showCreateModal = ref(false)

// Data
const { data: ingredientsData, status: queryStatus, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['ingredients', 'custom', currentTenant.value?.id],
  query: () => $fetch('/api/suppliers/ingredients', {
    params: { tenant_only: true, limit: 500 }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !ingredientsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && ingredientsData.value != null)

const ingredients = computed(() => (ingredientsData.value as any)?.data || [])

const stats = computed(() => ({
  total: ingredients.value.length,
  withParent: ingredients.value.filter((i: any) => i.parent_name).length,
  withoutParent: ingredients.value.filter((i: any) => !i.parent_name).length,
}))

const filteredIngredients = computed(() => {
  return ingredients.value.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesParent =
      parentFilter.value === 'all' ||
      (parentFilter.value === 'with_parent' && !!item.parent_name) ||
      (parentFilter.value === 'without_parent' && !item.parent_name)
    return matchesSearch && matchesParent
  })
})

const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  parentFilter.value = 'all'
}

const onIngredientCreated = () => {
  refetch()
}

const tableColumns = [
  { key: 'name', title: 'Nombre', sortable: true, format: 'text', align: 'left' },
  { key: 'unit', title: 'Unidad', sortable: false, format: 'text', align: 'left' },
  { key: 'parent_name', title: 'Basado en', sortable: true, format: 'custom', align: 'left' },
  { key: 'category', title: 'Categoría', sortable: false, format: 'text', align: 'left' },
  { key: 'actions', title: 'Acciones', sortable: false, format: 'custom', align: 'center' },
]

// Layout integration
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  setRefreshHandler(refetch)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>
