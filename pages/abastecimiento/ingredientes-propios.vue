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
        <UiStatsCard :label="WAREHOUSE_COPY.catalogStatsTotal" :value="stats.total" icon="beaker" />
        <UiStatsCard label="Con costo" :value="stats.withCost" icon="currency-dollar" />
      </UiStats>

      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        :search-fields="[]"
        :search-placeholder="WAREHOUSE_COPY.catalogSearchPlaceholder"
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="typeFilter"
            :class="[filterSelectClass, 'md:hidden']"
            :aria-label="t('abastecimiento.common.tipo')"
            @change="currentPage = 1"
          >
            <option value="">Tipo</option>
            <option value="food">{{ WAREHOUSE_COPY.typeFood }}</option>
            <option value="supply">{{ WAREHOUSE_COPY.typeSupply }}</option>
            <option value="service">{{ WAREHOUSE_COPY.typeService }}</option>
          </select>
          <button
            type="button"
            @click="toggleArchived"
            :class="[
              'h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-1.5',
              showArchived
                ? 'border-state-warning-border bg-state-warning-bg text-state-warning-text'
                : 'border-border bg-background text-text-secondary hover:border-border hover:text-text-primary'
            ]"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v4m4-4v4" />
            </svg>
            Archivados
          </button>
        </template>

        <template #trailing>
          <button
            @click="openPanel(null)"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          >
            {{ nuevoButtonLabel }}
          </button>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Data View -->
      <UiResponsiveDataView
        :columns="tableColumns"
        :data="sortedIngredients"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        :empty-message="WAREHOUSE_COPY.catalogEmptyTitle"
        :empty-sub-message="WAREHOUSE_COPY.catalogEmptySub"
        variant="default"
        row-size="xs"
      >
        <template #header-type>
          <UiTableHeaderFilter
            title="Tipo"
            filter-type="select"
            :model-value="typeFilter"
            :options="typeHeaderOptions"
            all-label="Todos"
            @update:model-value="updateTypeFilter"
          />
        </template>

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
                <span v-if="item.is_active === false" class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-state-warning-bg text-state-warning-text flex-shrink-0">Archivado</span>
              </div>
              <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                <span class="text-xs text-text-secondary font-mono">{{ item.unit }}{{ item.unit_weight_gr ? ` · ${item.unit_weight_gr} gr/und` : '' }}</span>
                <span class="text-xs text-text-tertiary">{{ TYPE_LABELS[item.type] || item.type }}</span>
                <span v-if="item.costo_unitario" class="text-xs text-text-secondary">${{ Number(item.costo_unitario).toLocaleString('es-CO') }}</span>
              </div>
            </div>
            <svg class="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </template>

        <!-- Desktop Cells -->
        <template #cell-name="{ value, row }">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-sm font-bold capitalize" :class="row.is_active === false ? 'text-text-tertiary' : 'text-text-primary'">{{ value }}</span>
            <span v-if="row.is_active === false" class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-state-warning-bg text-state-warning-text flex-shrink-0">Archivado</span>
          </div>
        </template>

        <template #cell-unit="{ value }">
          <span class="text-sm font-mono text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-unit_weight_gr="{ value, row }">
          <span v-if="value" class="text-sm font-mono text-text-secondary">{{ value }} {{ row.unit_weight_unit || 'gr' }}</span>
          <span v-else class="text-sm text-text-tertiary">—</span>
        </template>

        <template #cell-type="{ value }">
          <UiStatusBadge :value="TYPE_LABELS[value] || value" format="text" variant="info" size="sm" />
        </template>

        <template #cell-costo_unitario="{ value }">
          <UiStatusBadge
            :value="value ? `$${Number(value).toLocaleString('es-CO')}` : t('abastecimiento.common.sinCosto')"
            format="text"
            :variant="value ? 'info' : 'secondary'"
            size="sm"
          />
        </template>

        <template #cell-category="{ value }">
          <span class="text-sm text-text-secondary capitalize">{{ value || '—' }}</span>
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
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              v-if="row.is_active !== false"
              @click="openArchiveModal(row)"
              :aria-label="`Archivar ${row.name}`"
              title="Archivar"
              class="p-1.5 rounded-md hover:bg-state-warning-bg transition-colors text-text-secondary hover:text-state-warning-text"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v4m4-4v4" />
              </svg>
            </button>
            <button
              v-if="row.is_active === false"
              @click="restoreIngredient(row)"
              :aria-label="`Restaurar ${row.name}`"
              title="Restaurar"
              class="p-1.5 rounded-md hover:bg-primary/10 transition-colors text-text-secondary hover:text-primary"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>

    <!-- Create / Edit Panel -->
    <IngredientesIngredientePropioPanel
      v-model="showPanel"
      :ingredient="panelIngredient"
      :initial-type="panelInitialType"
      :lock-ingredient-type="!!typeFilter"
      hide-resale-toggle
      @saved="onSaved"
      @archived="onArchived"
      @restored="onRestored"
    />

    <!-- Archive Confirmation Modal -->
    <Teleport to="body">
      <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-200" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showArchiveModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay-backdrop/40" @click.self="showArchiveModal = false">
          <div class="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-state-warning-bg flex items-center justify-center">
                <svg class="w-5 h-5 text-state-warning-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v4m4-4v4" />
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
                class="flex-1 h-10 rounded-lg bg-action-warning-bg text-action-warning-text text-sm font-semibold text-action-primary-text hover:bg-action-warning-hover-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
const { t } = useI18n()
const WAREHOUSE_COPY = useWarehouseCopy()

useHead({ title: () => WAREHOUSE_COPY.warehouseCatalog })

const { currentTenant } = useTenantReactive()

const TYPE_LABELS: Record<string, string> = {
  food: WAREHOUSE_COPY.typeFood,
  supply: WAREHOUSE_COPY.typeSupply,
  service: WAREHOUSE_COPY.typeService,
}

const typeHeaderOptions = [
  { value: 'food', label: WAREHOUSE_COPY.typeFood },
  { value: 'supply', label: WAREHOUSE_COPY.typeSupply },
  { value: 'service', label: WAREHOUSE_COPY.typeService },
]

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const typeFilter = ref('')

const panelInitialType = computed(() => {
  const t = typeFilter.value
  if (t === 'food' || t === 'supply' || t === 'service') return t
  return 'food'
})

const nuevoButtonLabel = computed(() => {
  if (typeFilter.value === 'supply') return WAREHOUSE_COPY.newSupply
  if (typeFilter.value === 'service') return WAREHOUSE_COPY.newService
  if (typeFilter.value === 'food') return WAREHOUSE_COPY.newFood
  return WAREHOUSE_COPY.newWarehouseItemDefault
})
const currentPage = ref(1)
const itemsPerPage = ref(50)
const sortField = ref('')
const sortDirection = ref('asc')
const showPanel = ref(false)
const panelIngredient = ref<any>(null)
const showArchived = ref(false)
const showArchiveModal = ref(false)
const archiveTarget = ref<any>(null)
const archiving = ref(false)

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!typeFilter.value
    || showArchived.value,
)

const performSearch = () => applySearch(() => { currentPage.value = 1 })

const toggleArchived = () => {
  showArchived.value = !showArchived.value
  currentPage.value = 1
}

const updateTypeFilter = (value: string | boolean) => {
  typeFilter.value = typeof value === 'string' ? value : ''
  currentPage.value = 1
}

watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })

const { data: ingredientsData, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['ingredients', 'custom', currentTenant.value?.id, {
    archived: showArchived.value,
    search: appliedSearch.value || null,
    type: typeFilter.value || null,
    page: currentPage.value,
  }],
  query: () => {
    const params: Record<string, string | number | boolean> = {
      tenant_only: true,
      limit: itemsPerPage.value,
      page: currentPage.value,
    }
    if (appliedSearch.value) params.search = appliedSearch.value
    if (typeFilter.value) params.type = typeFilter.value
    if (showArchived.value) params.show_archived = true
    return $fetch('/api/suppliers/ingredients', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !ingredientsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && ingredientsData.value != null)

const ingredients = computed(() => (ingredientsData.value as any)?.data || [])

/** Manual supply ingredients only — resale stock rows are managed from Menú → productos (#869). */
const supplyIngredients = computed(() =>
  ingredients.value.filter((i: any) => !i.is_resale),
)

const stats = computed(() => ({
  total: supplyIngredients.value.length,
  withCost: supplyIngredients.value.filter((i: any) => i.costo_unitario != null).length,
}))

const sortedIngredients = computed(() => {
  const list = supplyIngredients.value
  if (!sortField.value) return list

  return [...list].sort((a: any, b: any) => {
    const aValue = a[sortField.value]
    const bValue = b[sortField.value]
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
    }
    const strA = String(aValue).toLowerCase()
    const strB = String(bValue).toLowerCase()
    return sortDirection.value === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
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
  clearSearch()
  typeFilter.value = ''
  showArchived.value = false
  currentPage.value = 1
}

const tableColumns = [
  { key: 'name',         title: t('abastecimiento.common.nombre'),   sortable: true,  format: 'custom', align: 'left' },
  { key: 'unit',         title: t('abastecimiento.common.unidad'),   sortable: false, format: 'custom', align: 'left' },
  { key: 'unit_weight_gr',title: t('abastecimiento.common.grUnd'),  sortable: false, format: 'custom', align: 'left' },
  { key: 'type',                       title: t('abastecimiento.common.tipo'),          sortable: false, format: 'custom', align: 'left' },
  { key: 'costo_unitario',             title: t('abastecimiento.common.costo'),         sortable: true,  format: 'custom', align: 'left' },
  { key: 'category',                   title: t('abastecimiento.common.categoria'),     sortable: false, format: 'custom', align: 'left' },
  { key: 'actions',                    title: '',              sortable: false, format: 'custom', align: 'center' },
]

// Layout integration
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => setRefreshHandler(refetch))
registerProgressiveLoading(isRefreshing)
onUnmounted(() => clearRefreshHandler(refetch))
</script>
