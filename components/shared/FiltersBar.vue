<template>
  <div class="w-full">
    <!-- Mobile: Compact Search + Filter Button -->
    <div class="md:hidden bg-surface border-2 border-border rounded-lg p-3 w-full">
      <div class="flex gap-2">
        <!-- Search Field -->
        <div v-if="showSearch" class="relative flex-1">
          <UiSearchWithField
            :model-value="search"
            :field-value="searchField"
            :fields="searchFields"
            :placeholder="searchPlaceholder"
            class="w-full"
            @update:modelValue="$emit('update:search', $event)"
            @update:fieldValue="$emit('update:searchField', $event)"
            @search="$emit('search')"
          />
        </div>

        <!-- Filters Button (only if has other filters) -->
        <button
          v-if="hasFilters"
          @click="showFiltersModal = true"
          class="px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary hover:bg-surface-secondary transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span class="text-sm font-medium">Filtros</span>
          <span v-if="activeFiltersCount > 0" class="px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">
            {{ activeFiltersCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- Desktop: Full Filters -->
    <div class="hidden md:block bg-surface border-2 border-border rounded-lg p-4 sm:p-6 w-full">
      <div :class="['grid gap-3 sm:gap-4 w-full', gridColsClass]">
        <!-- Search Field -->
        <div v-if="showSearch" class="w-full">
          <UiSearchWithField
            :model-value="search"
            :field-value="searchField"
            :fields="searchFields"
            :placeholder="searchPlaceholder"
            class="w-full"
            @update:modelValue="$emit('update:search', $event)"
            @update:fieldValue="$emit('update:searchField', $event)"
            @search="$emit('search')"
          />
        </div>

        <!-- Supplier Filter -->
        <div v-if="showSupplierFilter" class="w-full">
          <select
            :value="supplierFilter"
            @change="$emit('update:supplierFilter', $event.target.value)"
            class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Todos los proveedores</option>
            <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
              {{ supplier.name }}
            </option>
          </select>
        </div>

        <!-- Status Filter -->
        <div v-if="showStatusFilter" class="w-full">
          <select
            :value="statusFilter"
            @change="$emit('update:statusFilter', $event.target.value)"
            class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">{{ statusPlaceholder }}</option>
            <option v-for="status in statusOptions" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
        </div>

        <!-- Date Filter -->
        <div v-if="showDateFilter" class="w-full">
          <select
            :value="dateFilter"
            @change="$emit('update:dateFilter', $event.target.value)"
            class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="today">Hoy</option>
            <option value="yesterday">Ayer</option>
            <option value="last_week">Semana Pasada</option>
            <option value="15_days">Últimos 15 días</option>
            <option value="1_month">Último mes</option>
            <option value="3_months">Últimos 3 meses</option>
          </select>
        </div>

        <!-- Custom Filters Slot -->
        <slot name="customFilters" />
      </div>

      <!-- Clear Filters Button -->
      <div v-if="showClearButton && hasActiveFilters" class="mt-4 flex justify-end">
        <button
          @click="$emit('clearFilters')"
          class="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center space-x-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Limpiar filtros</span>
        </button>
      </div>
    </div>

    <!-- Filters Modal (Mobile) -->
    <UiBottomSheetModal v-model="showFiltersModal" title="Filtros" max-height="lg">
      <div class="p-4 space-y-4">
        <!-- Supplier Filter -->
        <div v-if="showSupplierFilter">
          <select
            :value="supplierFilter"
            @change="$emit('update:supplierFilter', $event.target.value)"
            class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Todos los proveedores</option>
            <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
              {{ supplier.name }}
            </option>
          </select>
        </div>

        <!-- Status Filter -->
        <div v-if="showStatusFilter">
          <select
            :value="statusFilter"
            @change="$emit('update:statusFilter', $event.target.value)"
            class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">{{ statusPlaceholder }}</option>
            <option v-for="status in statusOptions" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
        </div>

        <!-- Date Filter -->
        <div v-if="showDateFilter">
          <select
            :value="dateFilter"
            @change="$emit('update:dateFilter', $event.target.value)"
            class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Todos</option>
            <option value="today">Hoy</option>
            <option value="yesterday">Ayer</option>
            <option value="last_week">Semana Pasada</option>
            <option value="15_days">Últimos 15 días</option>
            <option value="1_month">Último mes</option>
            <option value="3_months">Últimos 3 meses</option>
          </select>
        </div>

        <!-- Custom Filters Slot -->
        <slot name="customMobileFilters" />
      </div>

      <template #footer>
        <div class="px-4 py-3 flex gap-3">
          <button
            @click="$emit('clearFilters')"
            class="flex-1 px-4 py-2 border-2 border-titan-300 rounded-lg text-titan-700 hover:bg-titan-50 transition-colors text-sm font-medium"
          >
            Limpiar
          </button>
          <button
            @click="showFiltersModal = false"
            class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Aplicar
          </button>
        </div>
      </template>
    </UiBottomSheetModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface SearchField {
  label: string
  value: string
}

interface StatusOption {
  label: string
  value: string
}

interface Supplier {
  id: string
  name: string
}

interface Props {
  // Search props
  showSearch?: boolean
  search?: string
  searchField?: string
  searchFields?: SearchField[]
  searchLabel?: string
  searchPlaceholder?: string

  // Supplier filter props
  showSupplierFilter?: boolean
  supplierFilter?: string
  suppliers?: Supplier[]

  // Status filter props
  showStatusFilter?: boolean
  statusFilter?: string
  statusOptions?: StatusOption[]
  statusLabel?: string
  statusPlaceholder?: string

  // Date filter props
  showDateFilter?: boolean
  dateFilter?: string
  dateLabel?: string

  // UI props
  showClearButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true,
  search: '',
  searchField: '',
  searchFields: () => [],
  searchLabel: 'Buscar',
  searchPlaceholder: 'Buscar...',

  showSupplierFilter: false,
  supplierFilter: '',
  suppliers: () => [],

  showStatusFilter: false,
  statusFilter: '',
  statusOptions: () => [],
  statusLabel: 'Estado',
  statusPlaceholder: 'Todos los estados',

  showDateFilter: false,
  dateFilter: '',
  dateLabel: 'Período',

  showClearButton: true
})

defineEmits<{
  'update:search': [value: string]
  'update:searchField': [value: string]
  'update:supplierFilter': [value: string]
  'update:statusFilter': [value: string]
  'update:dateFilter': [value: string]
  'search': []
  'clearFilters': []
}>()

const showFiltersModal = ref(false)

// Check if component has any filters besides search
const hasFilters = computed(() =>
  props.showSupplierFilter || props.showStatusFilter || props.showDateFilter
)

// Count visible filters (including search)
const visibleFiltersCount = computed(() => {
  let count = 0
  if (props.showSearch) count++
  if (props.showSupplierFilter) count++
  if (props.showStatusFilter) count++
  if (props.showDateFilter) count++
  return count
})

// Dynamic grid columns class based on visible filters
const gridColsClass = computed(() => {
  const count = visibleFiltersCount.value
  if (count === 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2'
  if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
})

// Count active filters (excluding search)
const activeFiltersCount = computed(() => {
  let count = 0
  if (props.showSupplierFilter && props.supplierFilter) count++
  if (props.showStatusFilter && props.statusFilter) count++
  if (props.showDateFilter && props.dateFilter) count++
  return count
})

// Check if any filter is active (including search)
const hasActiveFilters = computed(() =>
  props.search || props.supplierFilter || props.statusFilter || props.dateFilter
)
</script>
