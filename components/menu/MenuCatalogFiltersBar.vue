<script setup lang="ts">
import { computed, watch } from 'vue'
import { filterChipClass, productTypeChipClass } from '@/composables/useFilterSelectClass'
import { useMenuCatalogFilters } from '@/composables/useMenuCatalogFilters'
import { useTenantReactive } from '@/composables/useTenantReactive'
import type { ProductTypeFilter } from '@/stores/menuFilters'

const props = withDefaults(
  defineProps<{
    searchPlaceholder?: string
    showStation?: boolean
    showQr?: boolean
    showOnline?: boolean
    showNoRecipe?: boolean
    showCostDrift?: boolean
    showProductTypeFilter?: boolean
    tableHeaderFilters?: boolean
  }>(),
  {
    searchPlaceholder: undefined,
    showStation: false,
    showQr: false,
    showOnline: false,
    showNoRecipe: true,
    showCostDrift: false,
    showProductTypeFilter: false,
    tableHeaderFilters: false,
  },
)

const emit = defineEmits<{
  search: []
  clear: []
  'filter-change': []
}>()

const { t } = useI18n({ useScope: 'global' })
const { currentTenant, businessProfile } = useTenantReactive()

const {
  localSearchTerm,
  appliedSearch,
  apiSearchField,
  categoryFilter,
  statusFilter,
  stationFilter,
  sortFilter,
  productTypeFilter,
  onlineOnly,
  qrOnly,
  noRecipeOnly,
  marginNegativeOnly,
  costDriftOnly,
  performSearch,
  clearFilters,
  hasActiveFilters,
} = useMenuCatalogFilters()

const resolvedSearchPlaceholder = computed(
  () => props.searchPlaceholder || t('menu.filters.searchPlaceholder'),
)

const searchFields = computed(() => [
  { label: t('menu.filters.searchFieldsName'), value: 'name' },
  { label: t('menu.filters.searchFieldsDescription'), value: 'description' },
  { label: t('menu.filters.searchFieldsKitchen'), value: 'kitchen_name' },
])

const statusOptions = computed(() => [
  { label: t('menu.filters.disponible'), value: 'true' },
  { label: t('menu.filters.noDisponible'), value: 'false' },
])

const sortOptions = computed(() => [
  { label: t('menu.filters.sortNewest'), value: 'created_at_desc' },
  { label: t('menu.filters.sortOldest'), value: 'created_at_asc' },
  { label: t('menu.filters.sortNameAsc'), value: 'name_asc' },
  { label: t('menu.filters.sortNameDesc'), value: 'name_desc' },
  { label: t('menu.filters.sortPriceAsc'), value: 'price_asc' },
  { label: t('menu.filters.sortPriceDesc'), value: 'price_desc' },
  { label: t('menu.filters.sortMarginAsc'), value: 'margin_asc' },
  { label: t('menu.filters.sortMarginDesc'), value: 'margin_desc' },
])

const productTypeOptions = computed((): { label: string; value: ProductTypeFilter }[] => [
  { label: t('menu.filters.typeAll'), value: 'all' },
  { label: t('menu.filters.typeMenu'), value: 'menu' },
  { label: t('menu.filters.typeResale'), value: 'resale' },
])

const columnFilterFallbackClass = computed(() => props.tableHeaderFilters ? 'md:hidden' : '')

function productTypeChipClassFor(value: ProductTypeFilter): string {
  return productTypeChipClass(productTypeFilter.value === value)
}

const { data: categoriesData } = useQuery({
  key: () => ['menu', 'categories', currentTenant.value?.id],
  query: () => $fetch('/api/menu/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const categories = computed(() => (categoriesData.value as { data?: { id: string; name: string }[] })?.data ?? [])

const showComandasStations = computed(() => !!businessProfile.value?.comandas_enabled)

const { data: stationsData } = useQuery({
  key: () => ['tenant', 'stations', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { id: string; name: string }[] }>('/api/api/stations'),
  enabled: () => !!currentTenant.value && (props.showStation || showComandasStations.value),
  staleTime: 30_000,
})
const stations = computed(() => stationsData.value?.data ?? [])

const onSearch = () => {
  performSearch(() => emit('search'))
}

const onClear = () => {
  clearFilters(() => emit('clear'))
}

watch(
  [
    categoryFilter,
    statusFilter,
    stationFilter,
    sortFilter,
    productTypeFilter,
    onlineOnly,
    qrOnly,
    noRecipeOnly,
    marginNegativeOnly,
    costDriftOnly,
    appliedSearch,
    apiSearchField,
  ],
  () => emit('filter-change'),
)
</script>

<template>
  <UiAdvancedFiltersBar
    v-model:search="localSearchTerm"
    v-model:search-field="apiSearchField"
    :search-fields="searchFields"
    :search-placeholder="resolvedSearchPlaceholder"
    :show-date-range="false"
    :show-clear="hasActiveFilters"
    @search="onSearch"
    @clear="onClear"
  >
    <template #additional-filters>
      <div
        v-if="showProductTypeFilter"
        role="group"
        :aria-label="t('menu.filters.productTypeAria')"
        :class="['flex flex-wrap items-center gap-2', columnFilterFallbackClass]"
      >
        <button
          v-for="opt in productTypeOptions"
          :key="opt.value"
          type="button"
          :class="productTypeChipClassFor(opt.value)"
          :aria-pressed="productTypeFilter === opt.value"
          @click="productTypeFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <UiFilterSelect
        v-model="categoryFilter"
        :placeholder="t('menu.filters.categoryPlaceholder')"
        :aria-label="t('menu.filters.categoryAria')"
        :options="categories.map(c => ({ label: c.name, value: c.id }))"
        :class="columnFilterFallbackClass"
      />

      <UiFilterSelect
        v-model="statusFilter"
        :placeholder="t('menu.filters.statusPlaceholder')"
        :aria-label="t('menu.filters.statusAria')"
        :options="statusOptions"
        :class="columnFilterFallbackClass"
      />

      <UiFilterSelect
        v-if="showStation && showComandasStations"
        v-model="stationFilter"
        :placeholder="t('menu.filters.stationPlaceholder')"
        :aria-label="t('menu.filters.stationAria')"
        :options="stations.map(s => ({ label: s.name, value: s.id }))"
      />

      <UiFilterSelect
        v-model="sortFilter"
        :placeholder="t('menu.filters.sortPlaceholder')"
        :aria-label="t('menu.filters.sortAria')"
        :options="sortOptions"
        always-active
        hide-placeholder
        :class="columnFilterFallbackClass"
      />

      <label v-if="showOnline" :class="[filterChipClass(onlineOnly), columnFilterFallbackClass]">
        <input v-model="onlineOnly" type="checkbox" class="sr-only" :aria-label="t('menu.filters.onlineOnlyAria')" />
        <span class="font-semibold">{{ t('menu.filters.onlineOnly') }}</span>
      </label>

      <label v-if="showQr" :class="[filterChipClass(qrOnly), columnFilterFallbackClass]">
        <input v-model="qrOnly" type="checkbox" class="sr-only" :aria-label="t('menu.filters.qrOnlyAria')" />
        <span class="font-semibold">{{ t('menu.filters.qrOnly') }}</span>
      </label>

      <label v-if="showNoRecipe" :class="filterChipClass(noRecipeOnly)">
        <input v-model="noRecipeOnly" type="checkbox" class="sr-only" :aria-label="t('menu.filters.noRecipeAria')" />
        <span class="font-semibold">{{ t('menu.filters.noRecipe') }}</span>
      </label>

      <label :class="[filterChipClass(marginNegativeOnly), columnFilterFallbackClass]">
        <input v-model="marginNegativeOnly" type="checkbox" class="sr-only" :aria-label="t('menu.filters.marginNegativeAria')" />
        <span class="font-semibold">{{ t('menu.filters.marginNegative') }}</span>
      </label>

      <label v-if="showCostDrift" :class="filterChipClass(costDriftOnly)">
        <input v-model="costDriftOnly" type="checkbox" class="sr-only" :aria-label="t('menu.filters.costDriftAria')" />
        <span class="font-semibold">{{ t('menu.filters.costDrift') }}</span>
      </label>
    </template>

    <template v-if="$slots.trailing" #trailing>
      <slot name="trailing" />
    </template>
  </UiAdvancedFiltersBar>
</template>
