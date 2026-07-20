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
        <UiStatsCard :label="t('abastecimiento.glossary.withCost')" :value="stats.withCost" icon="currency-dollar" />
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
            <option value="">{{ t('abastecimiento.glossary.typeFilter') }}</option>
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
            {{ t('abastecimiento.glossary.archived') }}
          </button>
        </template>

        <template #trailing>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              class="min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
              :class="editMode
                ? 'bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg'
                : 'border border-border bg-background text-text-secondary hover:text-text-primary'"
              @click="onToggleEditMode"
            >
              {{ editMode
                ? t('abastecimiento.glossary.catalogViewMode')
                : t('abastecimiento.glossary.catalogEditMode') }}
            </button>
            <button
              @click="openPanel(null)"
              class="btn-primary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap"
            >
              {{ nuevoButtonLabel }}
            </button>
          </div>
        </template>
      </UiAdvancedFiltersBar>

      <AbastecimientoWarehouseCatalogBulkBar
        v-if="selectedIds.length > 0"
        v-model:category="bulkCategory"
        variant="selection"
        :selected-count="selectedIds.length"
        :is-submitting="isSubmitting"
        :can-apply="hasChanges"
        @apply="onCatalogSave"
        @cancel="onCancelEdit"
        @clear-selection="clearSelection"
      />
      <AbastecimientoWarehouseCatalogBulkBar
        v-else-if="editMode"
        variant="edit-only"
        :is-submitting="isSubmitting"
        :can-apply="hasChanges"
        @apply="onCatalogSave"
        @cancel="onCancelEdit"
      />

      <!-- Table loading (page/filter change, no cached rows yet) -->
      <div v-if="isRefreshing && sortedIngredients.length === 0" class="flex items-center justify-center min-h-[200px]">
        <CommonsTheCustomLoader size="medium" />
      </div>

      <!-- Data View -->
      <UiResponsiveDataView
        v-else
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
        <template v-if="editMode" #header-select>
          <div class="flex items-center justify-center">
            <UiBulkSelectCheckbox :checked="allPageSelected" @change="toggleSelectAll(sortedIngredients)" />
          </div>
        </template>

        <template #header-name>
          <UiTableHeaderFilter
            :title="t('abastecimiento.common.nombre')"
            column-key="name"
            sortable
            :sort-field="sortField"
            :sort-direction="sortDirection"
            filter-type="none"
            @sort="handleSort"
          />
        </template>

        <template #header-unit>
          <UiTableHeaderFilter
            :title="t('abastecimiento.common.unidad')"
            filter-type="select"
            :model-value="unitFilter"
            :options="unitHeaderOptions"
            :all-label="t('abastecimiento.common.todos')"
            @update:model-value="updateUnitFilter"
          />
        </template>

        <template #header-unit_weight_gr>
          <UiTableHeaderFilter
            :title="t('abastecimiento.common.grUnd')"
            filter-type="select"
            :model-value="unitWeightFilter"
            :options="unitWeightHeaderOptions"
            :all-label="t('abastecimiento.common.todos')"
            @update:model-value="updateUnitWeightFilter"
          />
        </template>

        <template #header-type>
          <UiTableHeaderFilter
            :title="t('abastecimiento.glossary.typeFilter')"
            filter-type="select"
            :model-value="typeFilter"
            :options="typeHeaderOptions"
            :all-label="t('abastecimiento.common.todos')"
            @update:model-value="updateTypeFilter"
          />
        </template>

        <template #header-costo_unitario>
          <UiTableHeaderFilter
            :title="t('abastecimiento.common.costo')"
            column-key="costo_unitario"
            sortable
            :sort-field="sortField"
            :sort-direction="sortDirection"
            filter-type="select"
            :model-value="costFilter"
            :options="costHeaderOptions"
            :all-label="t('abastecimiento.common.todos')"
            @sort="handleSort"
            @update:model-value="updateCostFilter"
          />
        </template>

        <template #header-category>
          <UiTableHeaderFilter
            :title="t('abastecimiento.common.categoria')"
            filter-type="select"
            :model-value="categoryFilter"
            :options="categoryHeaderOptions"
            :all-label="t('abastecimiento.common.todas')"
            @update:model-value="updateCategoryFilter"
          />
        </template>

        <!-- Mobile Card -->
        <template #card="{ item, index }">
          <div
            class="flex items-start gap-3 border-b border-border px-3 py-3 transition-colors"
            :class="[
              index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30',
              !editMode && item.is_active !== false ? 'cursor-pointer hover:bg-surface-secondary' : '',
              selectedIds.includes(item.id) ? 'ring-1 ring-inset ring-primary/30' : '',
            ]"
            @click="!editMode && item.is_active !== false && openPanel(item)"
          >
            <UiBulkSelectCheckbox
              v-if="editMode && item.is_active !== false"
              class="mt-1 flex-shrink-0"
              :checked="selectedIds.includes(item.id)"
              @change="toggleSelect(item.id)"
            />
            <div class="flex-1 min-w-0">
              <template v-if="editMode && item.is_active !== false">
                <label class="sr-only" :for="`warehouse-mobile-name-${item.id}`">
                  {{ t('abastecimiento.common.nombre') }}
                </label>
                <input
                  :id="`warehouse-mobile-name-${item.id}`"
                  v-model="ensureDraft(item).name"
                  type="text"
                  class="input-base w-full px-2 py-1.5 text-sm font-medium"
                  :placeholder="t('abastecimiento.glossary.ingredientNamePlaceholder')"
                  @input="clearRowError(item.id)"
                />
                <UiWarehouseCategorySearchInput
                  v-model="ensureDraft(item).category"
                  :input-id="`warehouse-mobile-category-${item.id}`"
                  class="mt-2"
                  :placeholder="t('abastecimiento.glossary.categoryPlaceholder')"
                  :listbox-label="t('abastecimiento.glossary.warehouseCategorySearchResults')"
                  compact
                  :allow-create="false"
                  placement="auto"
                  @change="clearRowError(item.id)"
                />
                <p v-if="rowErrors[item.id]" class="mt-1 text-xs text-destructive" role="alert">
                  {{ rowErrors[item.id] }}
                </p>
              </template>
              <div v-else class="flex items-center gap-1.5 flex-wrap">
                <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                <span v-if="item.is_active === false" class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-state-warning-bg text-state-warning-text flex-shrink-0">{{ t('abastecimiento.glossary.archived') }}</span>
              </div>
              <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                <span class="text-xs text-text-secondary font-mono">{{ item.unit }}{{ item.unit_weight_gr ? ` · ${item.unit_weight_gr} gr/und` : '' }}</span>
                <span class="text-xs text-text-tertiary">{{ TYPE_LABELS[item.type] || item.type }}</span>
                <span v-if="item.costo_unitario" class="text-xs text-text-secondary">${{ Number(item.costo_unitario).toLocaleString(toNumberLocaleTag(locale)) }}</span>
              </div>
            </div>
            <button
              v-if="item.is_active !== false"
              type="button"
              class="flex-shrink-0 rounded-md p-2 text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-primary"
              :aria-label="`${t('abastecimiento.glossary.editItem')} ${item.name}`"
              @click.stop="openPanel(item)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </template>

        <!-- Desktop Cells -->
        <template v-if="editMode" #cell-select="{ row }">
          <UiBulkSelectCheckbox
            v-if="row.is_active !== false"
            :checked="selectedIds.includes(row.id)"
            @change="toggleSelect(row.id)"
          />
        </template>

        <template #cell-name="{ value, row }">
          <div v-if="editMode && row.is_active !== false" class="min-w-[12rem]">
            <label class="sr-only" :for="`warehouse-name-${row.id}`">{{ t('abastecimiento.common.nombre') }}</label>
            <input
              :id="`warehouse-name-${row.id}`"
              v-model="ensureDraft(row).name"
              type="text"
              class="input-base w-full px-2 py-1.5 text-sm font-medium"
              @input="clearRowError(row.id)"
            />
            <p v-if="rowErrors[row.id]" class="mt-1 text-xs text-destructive" role="alert">
              {{ rowErrors[row.id] }}
            </p>
          </div>
          <div v-else class="flex items-center gap-1.5 flex-wrap">
            <span class="text-sm font-bold capitalize" :class="row.is_active === false ? 'text-text-tertiary' : 'text-text-primary'">{{ value }}</span>
            <span v-if="row.is_active === false" class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-state-warning-bg text-state-warning-text flex-shrink-0">{{ t('abastecimiento.glossary.archived') }}</span>
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
            :value="value ? `$${Number(value).toLocaleString(toNumberLocaleTag(locale))}` : t('abastecimiento.common.sinCosto')"
            format="text"
            :variant="value ? 'info' : 'secondary'"
            size="sm"
          />
        </template>

        <template #cell-category="{ value, row }">
          <div v-if="editMode && row.is_active !== false" class="min-w-[14rem]">
            <UiWarehouseCategorySearchInput
              v-model="ensureDraft(row).category"
              :input-id="`warehouse-category-${row.id}`"
              :placeholder="t('abastecimiento.glossary.categoryPlaceholder')"
              :listbox-label="t('abastecimiento.glossary.warehouseCategorySearchResults')"
              compact
              :allow-create="false"
              placement="auto"
              @change="clearRowError(row.id)"
            />
          </div>
          <span v-else class="text-sm text-text-secondary capitalize">{{ value || '—' }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-center gap-1">
            <button
              v-if="row.is_active !== false"
              @click="openPanel(row)"
              :aria-label="`${t('abastecimiento.glossary.editItem')} ${row.name}`"
              :title="t('abastecimiento.glossary.editItem')"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-text-secondary hover:text-primary"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              v-if="row.is_active !== false"
              @click="openArchiveModal(row)"
              :aria-label="`${t('abastecimiento.glossary.archiveItem')} ${row.name}`"
              :title="t('abastecimiento.glossary.archiveItem')"
              class="p-1.5 rounded-md hover:bg-state-warning-bg transition-colors text-text-secondary hover:text-state-warning-text"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 12v4m4-4v4" />
              </svg>
            </button>
            <button
              v-if="row.is_active === false"
              @click="restoreIngredient(row)"
              :aria-label="`${t('abastecimiento.glossary.restoreItem')} ${row.name}`"
              :title="t('abastecimiento.glossary.restoreItem')"
              class="p-1.5 rounded-md hover:bg-primary/10 transition-colors text-text-secondary hover:text-primary"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div v-if="ingredientsTotal > 0" class="flex items-center justify-end px-1 py-2">
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
            :disabled="currentPage >= ingredientsTotalPages"
            @click="goToPage(currentPage + 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaSiguiente')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            :disabled="currentPage >= ingredientsTotalPages"
            @click="goToPage(ingredientsTotalPages)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.ultimaPagina')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
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
                <h3 class="text-base font-bold text-text-primary">{{ t('abastecimiento.glossary.archivePanelTitle') }}</h3>
                <p class="text-sm text-text-secondary mt-0.5">{{ archiveTarget?.name }}</p>
              </div>
            </div>

            <p class="text-sm text-text-secondary leading-relaxed">
              {{ t('abastecimiento.glossary.archivePanelBody') }}
              <strong class="text-text-primary">{{ t('abastecimiento.glossary.archivePanelHistory') }}</strong>
            </p>

            <p class="text-xs text-text-tertiary bg-surface-secondary/60 rounded-lg px-3 py-2 leading-relaxed">
              {{ t('abastecimiento.glossary.archivePanelHint') }}
            </p>

            <div class="flex gap-3 mt-1">
              <button
                type="button"
                @click="showArchiveModal = false"
                :disabled="archiving"
                class="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors disabled:opacity-50"
              >
                {{ t('abastecimiento.glossary.cancel') }}
              </button>
              <button
                type="button"
                @click="confirmArchive"
                :disabled="archiving"
                class="flex-1 h-10 rounded-lg bg-action-warning-bg text-action-warning-text text-sm font-semibold text-action-primary-text hover:bg-action-warning-hover-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="archiving">{{ t('abastecimiento.glossary.archivingItem') }}</span>
                <span v-else>{{ t('abastecimiento.glossary.archiveItem') }}</span>
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
const { t, locale } = useI18n({ useScope: 'global' })
const WAREHOUSE_COPY = useWarehouseCopy()
const toast = useToast()

useHead({ title: () => WAREHOUSE_COPY.warehouseCatalog })

const { currentTenant } = useTenantReactive()

const TYPE_LABELS = computed(() => ({
  food: WAREHOUSE_COPY.typeFood,
  supply: WAREHOUSE_COPY.typeSupply,
  service: WAREHOUSE_COPY.typeService,
}))

const typeHeaderOptions = computed(() => [
  { value: 'food', label: WAREHOUSE_COPY.typeFood },
  { value: 'supply', label: WAREHOUSE_COPY.typeSupply },
  { value: 'service', label: WAREHOUSE_COPY.typeService },
])

const unitHeaderOptions = [
  { value: 'gr', label: 'gr' },
  { value: 'ml', label: 'ml' },
  { value: 'kg', label: 'kg' },
  { value: 'und', label: 'und' },
  { value: 'lt', label: 'lt' },
  { value: 'hr', label: 'hr' },
]

const costHeaderOptions = computed(() => [
  { value: 'with', label: t('abastecimiento.glossary.withCost') },
  { value: 'without', label: t('abastecimiento.common.sinCosto') },
])

const unitWeightHeaderOptions = computed(() => [
  { value: 'with', label: t('common.yes') },
  { value: 'without', label: t('common.no') },
])

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const typeFilter = ref('')
const categoryFilter = ref('')
const unitFilter = ref('')
const costFilter = ref('')
const unitWeightFilter = ref('')

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
    || !!categoryFilter.value
    || !!unitFilter.value
    || !!costFilter.value
    || !!unitWeightFilter.value
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

const updateCategoryFilter = (value: string | boolean) => {
  categoryFilter.value = typeof value === 'string' ? value : ''
  currentPage.value = 1
}

const updateUnitFilter = (value: string | boolean) => {
  unitFilter.value = typeof value === 'string' ? value : ''
  currentPage.value = 1
}

const updateCostFilter = (value: string | boolean) => {
  costFilter.value = typeof value === 'string' ? value : ''
  currentPage.value = 1
}

const updateUnitWeightFilter = (value: string | boolean) => {
  unitWeightFilter.value = typeof value === 'string' ? value : ''
  currentPage.value = 1
}

const { data: categoriesData } = useQuery({
  key: () => ['ingredients', 'categories', currentTenant.value?.id],
  query: () => $fetch('/api/suppliers/ingredients/categories', { params: { limit: 250 } }),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})

const categoryHeaderOptions = computed(() =>
  ((categoriesData.value as { data?: { name: string }[] })?.data ?? []).map(category => ({
    label: category.name,
    value: category.name,
  })),
)

const { data: ingredientsData, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['ingredients', 'custom', currentTenant.value?.id, {
    archived: showArchived.value,
    search: appliedSearch.value || null,
    type: typeFilter.value || null,
    category: categoryFilter.value || null,
    unit: unitFilter.value || null,
    cost: costFilter.value || null,
    unitWeight: unitWeightFilter.value || null,
    page: currentPage.value,
  }],
  query: () => {
    const params: Record<string, string | number | boolean> = {
      tenant_only: true,
      is_resale: false,
      limit: itemsPerPage.value,
      page: currentPage.value,
    }
    if (appliedSearch.value) params.search = appliedSearch.value
    if (typeFilter.value) params.type = typeFilter.value
    if (categoryFilter.value) params.category = categoryFilter.value
    if (unitFilter.value) params.unit = unitFilter.value
    if (costFilter.value === 'with') params.has_cost = true
    if (costFilter.value === 'without') params.has_cost = false
    if (unitWeightFilter.value === 'with') params.has_unit_weight = true
    if (unitWeightFilter.value === 'without') params.has_unit_weight = false
    if (showArchived.value) params.show_archived = true
    return $fetch('/api/suppliers/ingredients', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !ingredientsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && ingredientsData.value != null)

const ingredientsTotal = computed(() => (ingredientsData.value as any)?.total ?? 0)
const ingredientsTotalPages = computed(() =>
  Math.max(1, Math.ceil(ingredientsTotal.value / itemsPerPage.value)),
)

const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, ingredientsTotalPages.value))
}

const ingredients = computed(() => (ingredientsData.value as any)?.data || [])

/** Manual supply ingredients only — resale stock rows are managed from Menú → productos (#869). */
const supplyIngredients = computed(() =>
  ingredients.value.filter((i: any) => !i.is_resale),
)

const {
  editMode,
  rowErrors,
  selectedIds,
  bulkCategory,
  isSubmitting,
  displayIngredients,
  hasChanges,
  ensureDraft,
  clearRowError,
  clearSelection,
  toggleSelect,
  allPageSelected: isAllPageSelected,
  toggleSelectAll,
  saveChanges,
  cancelEditOperation,
  toggleEditMode,
  resetForTenant,
} = useWarehouseCatalogEditMode({
  ingredients: supplyIngredients,
  refetch,
  messages: {
    nameRequired: t('abastecimiento.glossary.catalogNameRequired'),
    categoryRequired: t('abastecimiento.glossary.catalogCategoryRequired'),
    saveFailed: t('abastecimiento.glossary.catalogRowSaveFailed'),
  },
})

const stats = computed(() => ({
  total: ingredientsTotal.value,
  withCost: supplyIngredients.value.filter((i: any) => i.costo_unitario != null).length,
}))

const sortedIngredients = computed(() => {
  const list = displayIngredients.value
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

const allPageSelected = computed(() => isAllPageSelected(sortedIngredients.value))

const confirmDiscard = () => window.confirm(t('abastecimiento.glossary.catalogDiscardConfirm'))
const onToggleEditMode = () => toggleEditMode(confirmDiscard)
const onCancelEdit = () => cancelEditOperation(confirmDiscard)

const onCatalogSave = async () => {
  const result = await saveChanges()
  if (result.ok > 0 && result.fail + result.invalid === 0) {
    toast.success(t('abastecimiento.glossary.catalogSavedCount', { count: result.ok }))
  } else if (result.ok > 0) {
    toast.warning(t('abastecimiento.glossary.catalogPartialSave', {
      ok: result.ok,
      fail: result.fail + result.invalid,
    }))
  } else if (result.fail + result.invalid > 0) {
    toast.error(t('abastecimiento.glossary.catalogSaveNone'))
  }
}

watch(
  [currentPage, appliedSearch, typeFilter, categoryFilter, unitFilter, costFilter, unitWeightFilter, showArchived],
  clearSelection,
)

watch(() => currentTenant.value?.id, () => {
  currentPage.value = 1
  resetForTenant()
})

const openPanel = (ingredient: any) => {
  panelIngredient.value = ingredient?.id
    ? supplyIngredients.value.find((row: any) => row.id === ingredient.id) ?? ingredient
    : null
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
  categoryFilter.value = ''
  unitFilter.value = ''
  costFilter.value = ''
  unitWeightFilter.value = ''
  showArchived.value = false
  currentPage.value = 1
}

const tableColumns = computed(() => [
  ...(editMode.value
    ? [{ key: 'select', title: '', sortable: false, format: 'custom', align: 'center' }]
    : []),
  { key: 'name',         title: t('abastecimiento.common.nombre'),   sortable: true,  format: 'custom', align: 'left' },
  { key: 'unit',         title: t('abastecimiento.common.unidad'),   sortable: false, format: 'custom', align: 'left' },
  { key: 'unit_weight_gr',title: t('abastecimiento.common.grUnd'),  sortable: false, format: 'custom', align: 'left' },
  { key: 'type',                       title: t('abastecimiento.common.tipo'),          sortable: false, format: 'custom', align: 'left' },
  { key: 'costo_unitario',             title: t('abastecimiento.common.costo'),         sortable: true,  format: 'custom', align: 'left' },
  { key: 'category',                   title: t('abastecimiento.common.categoria'),     sortable: false, format: 'custom', align: 'left' },
  { key: 'actions',                    title: '',              sortable: false, format: 'custom', align: 'center' },
])

// Layout integration
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => setRefreshHandler(refetch))
registerProgressiveLoading(isRefreshing)
onUnmounted(() => clearRefreshHandler(refetch))
</script>
