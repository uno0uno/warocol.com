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
        <UiStatsCard label="Total ingredientes" :value="stats.total" icon="beaker" />
        <UiStatsCard label="En reventa" :value="stats.resale" icon="shopping-cart" />
        <UiStatsCard label="Con costo" :value="stats.withCost" icon="currency-dollar" />
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
            v-model="typeFilter"
            class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer flex-shrink-0"
          >
            <option value="all">Todos los tipos</option>
            <option value="food">Alimento</option>
            <option value="supply">Insumo</option>
            <option value="service">Servicio</option>
          </select>
          <button
            type="button"
            @click="showArchived = !showArchived"
            :class="[
              'h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-1.5',
              showArchived
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-border bg-background text-text-secondary hover:border-border hover:text-text-primary'
            ]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v4m4-4v4" />
            </svg>
            Archivados
          </button>
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
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                <span v-if="item.is_resale" class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">Reventa</span>
                <span v-if="item.is_active === false" class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">Archivado</span>
              </div>
              <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                <span class="text-xs text-text-secondary font-mono">{{ item.unit }}{{ item.unit_weight_gr ? ` · ${item.unit_weight_gr} gr/und` : '' }}</span>
                <span class="text-xs text-text-tertiary">{{ TYPE_LABELS[item.type] || item.type }}</span>
                <span v-if="item.costo_unitario" class="text-xs text-text-secondary">${{ Number(item.costo_unitario).toLocaleString('es-CO') }}</span>
              </div>
            </div>
            <svg class="w-4 h-4 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </template>

        <!-- Desktop Cells -->
        <template #cell-name="{ value, row }">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-sm font-bold" :class="row.is_active === false ? 'text-text-tertiary' : 'text-text-primary'">{{ value }}</span>
            <span v-if="row.is_active === false" class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">Archivado</span>
          </div>
        </template>

        <template #cell-unit="{ value }">
          <span class="text-sm font-mono text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-is_resale="{ value }">
          <UiStatusBadge
            :value="value ? 'Reventa' : 'No'"
            format="text"
            :variant="value ? 'primary' : 'secondary'"
            size="sm"
          />
        </template>

        <template #cell-unit_weight_gr="{ value, row }">
          <span v-if="value" class="text-sm font-mono text-text-secondary">{{ value }} {{ row.unit_weight_unit || 'gr' }}</span>
          <span v-else class="text-sm text-text-tertiary">—</span>
        </template>

        <template #cell-type="{ value }">
          <span :class="[
            'text-xs font-medium px-2 py-0.5 rounded-full',
            value === 'food'    ? 'bg-green-100 text-green-700' :
            value === 'supply'  ? 'bg-blue-100 text-blue-700' :
            value === 'service' ? 'bg-purple-100 text-purple-700' :
            'bg-surface-secondary text-text-secondary'
          ]">{{ TYPE_LABELS[value] || value }}</span>
        </template>

        <template #cell-costo_unitario="{ value }">
          <UiStatusBadge
            :value="value ? `$${Number(value).toLocaleString('es-CO')}` : 'Sin costo'"
            format="text"
            :variant="value ? 'success' : 'secondary'"
            size="sm"
          />
        </template>

        <template #cell-category="{ value }">
          <span class="text-sm text-text-secondary">{{ value || '—' }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-center gap-1">
            <button
              v-if="row.is_active !== false"
              @click="openPanel(row)"
              :aria-label="`Editar ${row.name}`"
              title="Editar"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-text-secondary hover:text-primary"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              v-if="row.is_active !== false"
              @click="openArchiveModal(row)"
              :aria-label="`Archivar ${row.name}`"
              title="Archivar"
              class="p-1.5 rounded-md hover:bg-amber-50 transition-colors text-text-secondary hover:text-amber-600"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v4m4-4v4" />
              </svg>
            </button>
            <button
              v-if="row.is_active === false"
              @click="restoreIngredient(row)"
              :aria-label="`Restaurar ${row.name}`"
              title="Restaurar"
              class="p-1.5 rounded-md hover:bg-primary/10 transition-colors text-text-secondary hover:text-primary"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
      @archived="onArchived"
      @restored="onRestored"
    />

    <!-- Archive Confirmation Modal -->
    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showArchiveModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="showArchiveModal = false">
          <div class="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v4m4-4v4" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-bold text-text-primary">Archivar ingrediente</h3>
                <p class="text-sm text-text-secondary mt-0.5">{{ archiveTarget?.name }}</p>
              </div>
            </div>

            <p class="text-sm text-text-secondary leading-relaxed">
              Al archivar este ingrediente se eliminará de todas las recetas, modificadores y reventa activos.
              <strong class="text-text-primary">El historial de compras, ventas y movimientos queda intacto.</strong>
            </p>

            <p class="text-xs text-text-tertiary bg-surface-secondary/60 rounded-lg px-3 py-2 leading-relaxed">
              Si quieres volver a usarlo en el futuro, puedes restaurarlo desde la vista de archivados.
            </p>

            <div class="flex gap-3 mt-1">
              <button
                type="button"
                @click="showArchiveModal = false"
                :disabled="archiving"
                class="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                @click="confirmArchive"
                :disabled="archiving"
                class="flex-1 h-10 rounded-lg bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="archiving">Archivando...</span>
                <span v-else>Archivar</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

useHead({ title: 'Ingredientes Personalizados' })

const { currentTenant } = useTenantReactive()

const TYPE_LABELS: Record<string, string> = { food: 'Alimento', supply: 'Insumo', service: 'Servicio' }

// State
const searchQuery = ref('')
const typeFilter = ref('all')
const sortField = ref('')
const sortDirection = ref('asc')
const showPanel = ref(false)
const panelIngredient = ref<any>(null)
const showArchived = ref(false)
const showArchiveModal = ref(false)
const archiveTarget = ref<any>(null)
const archiving = ref(false)

// Data
const { data: ingredientsData, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['ingredients', 'custom', currentTenant.value?.id, showArchived.value],
  query: () => $fetch('/api/suppliers/ingredients', {
    params: { tenant_only: true, limit: 500, ...(showArchived.value && { show_archived: true }) }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !ingredientsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && ingredientsData.value != null)

const ingredients = computed(() => (ingredientsData.value as any)?.data || [])

const stats = computed(() => ({
  total: ingredients.value.length,
  resale: ingredients.value.filter((i: any) => i.is_resale).length,
  withCost: ingredients.value.filter((i: any) => i.costo_unitario != null).length,
}))

const filteredIngredients = computed(() => {
  return ingredients.value.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesType = typeFilter.value === 'all' || item.type === typeFilter.value
    return matchesSearch && matchesType
  })
})

const openPanel = (ingredient: any) => {
  panelIngredient.value = ingredient
  showPanel.value = true
}

const onSaved = () => {
  refetch()
}

const openArchiveModal = (ingredient: any) => {
  archiveTarget.value = ingredient
  showArchiveModal.value = true
}

const confirmArchive = async () => {
  if (!archiveTarget.value) return
  archiving.value = true
  try {
    await $fetch(`/api/suppliers/ingredients/${archiveTarget.value.id}/archive`, { method: 'PATCH' })
    showArchiveModal.value = false
    refetch()
  } catch (err: any) {
    console.error('Archive failed', err)
  } finally {
    archiving.value = false
  }
}

const restoreIngredient = async (ingredient: any) => {
  try {
    await $fetch(`/api/suppliers/ingredients/${ingredient.id}/restore`, { method: 'PATCH' })
    refetch()
  } catch (err: any) {
    console.error('Restore failed', err)
  }
}

const onArchived = () => {
  refetch()
}

const onRestored = () => {
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
  typeFilter.value = 'all'
}

const tableColumns = [
  { key: 'name',         title: 'Nombre',   sortable: true,  format: 'custom', align: 'left' },
  { key: 'unit',         title: 'Unidad',   sortable: false, format: 'custom', align: 'left' },
  { key: 'is_resale',    title: 'Reventa',  sortable: false, format: 'custom', align: 'left' },
  { key: 'unit_weight_gr',title: 'Gr/und',  sortable: false, format: 'custom', align: 'left' },
  { key: 'type',                       title: 'Tipo',          sortable: false, format: 'custom', align: 'left' },
  { key: 'costo_unitario',             title: 'Costo',         sortable: true,  format: 'custom', align: 'left' },
  { key: 'category',                   title: 'Categoría',     sortable: false, format: 'custom', align: 'left' },
  { key: 'actions',                    title: '',              sortable: false, format: 'custom', align: 'center' },
]

// Layout integration
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => setRefreshHandler(refetch))
registerProgressiveLoading(isRefreshing)
onUnmounted(() => clearRefreshHandler(refetch))
</script>
