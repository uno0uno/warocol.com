<script setup lang="ts">
import { computed, watch } from 'vue'
import { filterChipClass } from '@/composables/useFilterSelectClass'
import { useMenuCatalogFilters } from '@/composables/useMenuCatalogFilters'
import { useTenantReactive } from '@/composables/useTenantReactive'

const props = withDefaults(
  defineProps<{
    searchPlaceholder?: string
    showStation?: boolean
    showQr?: boolean
    showOnline?: boolean
    showNoRecipe?: boolean
    showCostDrift?: boolean
  }>(),
  {
    searchPlaceholder: 'Buscar productos...',
    showStation: false,
    showQr: false,
    showOnline: false,
    showNoRecipe: true,
    showCostDrift: false,
  },
)

const emit = defineEmits<{
  search: []
  clear: []
  'filter-change': []
}>()

const { currentTenant, businessProfile } = useTenantReactive()

const {
  localSearchTerm,
  appliedSearch,
  apiSearchField,
  categoryFilter,
  statusFilter,
  stationFilter,
  sortFilter,
  onlineOnly,
  qrOnly,
  noRecipeOnly,
  marginNegativeOnly,
  costDriftOnly,
  performSearch,
  clearFilters,
  hasActiveFilters,
} = useMenuCatalogFilters()

const searchFields = [
  { label: 'Nombre', value: 'name' },
  { label: 'Descripción', value: 'description' },
  { label: 'Nombre cocina', value: 'kitchen_name' },
]

const statusOptions = [
  { label: 'Disponible', value: 'true' },
  { label: 'No disponible', value: 'false' },
]

const sortOptions = [
  { label: 'Más recientes', value: 'created_at_desc' },
  { label: 'Más antiguos', value: 'created_at_asc' },
  { label: 'Nombre A-Z', value: 'name_asc' },
  { label: 'Nombre Z-A', value: 'name_desc' },
  { label: 'Precio menor', value: 'price_asc' },
  { label: 'Precio mayor', value: 'price_desc' },
  { label: 'Margen menor', value: 'margin_asc' },
  { label: 'Margen mayor', value: 'margin_desc' },
]

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
    :search-placeholder="searchPlaceholder"
    :show-date-range="false"
    :show-clear="hasActiveFilters"
    @search="onSearch"
    @clear="onClear"
  >
    <template #additional-filters>
      <UiFilterSelect
        v-model="categoryFilter"
        placeholder="Categoría"
        aria-label="Filtrar por categoría"
        :options="categories.map(c => ({ label: c.name, value: c.id }))"
      />

      <UiFilterSelect
        v-model="statusFilter"
        placeholder="Estado"
        aria-label="Filtrar por estado"
        :options="statusOptions"
      />

      <UiFilterSelect
        v-if="showStation && showComandasStations"
        v-model="stationFilter"
        placeholder="Estación"
        aria-label="Filtrar por estación de cocina"
        :options="stations.map(s => ({ label: s.name, value: s.id }))"
      />

      <UiFilterSelect
        v-model="sortFilter"
        placeholder="Ordenar"
        aria-label="Ordenar productos"
        :options="sortOptions"
        always-active
        hide-placeholder
      />

      <label v-if="showOnline" :class="filterChipClass(onlineOnly)">
        <input v-model="onlineOnly" type="checkbox" class="sr-only" aria-label="Solo visibles en domicilios" />
        <span class="text-sm font-semibold">Domicilios</span>
      </label>

      <label v-if="showQr" :class="filterChipClass(qrOnly)">
        <input v-model="qrOnly" type="checkbox" class="sr-only" aria-label="Solo visibles en QR mesa" />
        <span class="text-sm font-semibold">QR mesa</span>
      </label>

      <label v-if="showNoRecipe" :class="filterChipClass(noRecipeOnly)">
        <input v-model="noRecipeOnly" type="checkbox" class="sr-only" aria-label="Solo productos sin receta" />
        <span class="text-sm font-semibold">Sin receta</span>
      </label>

      <label :class="filterChipClass(marginNegativeOnly)">
        <input v-model="marginNegativeOnly" type="checkbox" class="sr-only" aria-label="Solo margen negativo" />
        <span class="text-sm font-semibold">Margen negativo</span>
      </label>

      <label v-if="showCostDrift" :class="filterChipClass(costDriftOnly)">
        <input v-model="costDriftOnly" type="checkbox" class="sr-only" aria-label="Solo desfase de costo" />
        <span class="text-sm font-semibold">Desfase costo</span>
      </label>
    </template>
  </UiAdvancedFiltersBar>
</template>
