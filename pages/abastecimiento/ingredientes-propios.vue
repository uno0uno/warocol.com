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
        <UiStatsCard label="Total Personalizados" :value="stats.total" icon="beaker" />
        <UiStatsCard label="Con base global" :value="stats.withParent" icon="link" />
        <UiStatsCard label="Sin base" :value="stats.withoutParent" icon="plus-circle" />
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
      </SharedFiltersBar>

      <!-- Data View -->
      <HealthSemaphore :is-unlocked="true" title="Ingredientes Personalizados">
        <template #header-actions>
          <button
            @click="openPanel(null)"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          >
            + Nuevo ingrediente
          </button>
        </template>
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
            class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary cursor-pointer"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            @click="openPanel(item)"
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
            <svg class="w-4 h-4 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
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
          <div class="flex justify-center">
            <button
              @click="openPanel(row)"
              :aria-label="`Editar ${row.name}`"
              title="Editar"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-text-secondary hover:text-primary"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
      </HealthSemaphore>
    </div>

    <!-- Create / Edit Panel -->
    <IngredientesIngredientePropioPanel
      v-model="showPanel"
      :ingredient="panelIngredient"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

useHead({ title: 'Ingredientes Personalizados' })

const { currentTenant } = useTenantReactive()

// State
const searchQuery = ref('')
const parentFilter = ref('all')
const sortField = ref('')
const sortDirection = ref('asc')
const showPanel = ref(false)
const panelIngredient = ref<any>(null)

// Data
const { data: ingredientsData, asyncStatus: queryAsyncStatus, refetch } = useQuery({
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

const openPanel = (ingredient: any) => {
  panelIngredient.value = ingredient
  showPanel.value = true
}

const onSaved = () => {
  refetch()
}

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

const tableColumns = [
  { key: 'name', title: 'Nombre', sortable: true, format: 'text', align: 'left' },
  { key: 'unit', title: 'Unidad', sortable: false, format: 'text', align: 'left' },
  { key: 'parent_name', title: 'Basado en', sortable: true, format: 'custom', align: 'left' },
  { key: 'category', title: 'Categoría', sortable: false, format: 'text', align: 'left' },
  { key: 'actions', title: '', sortable: false, format: 'custom', align: 'center' },
]

// Layout integration
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => setRefreshHandler(refetch))
registerProgressiveLoading(isRefreshing)
onUnmounted(() => clearRefreshHandler(refetch))
</script>
