<template>
  <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
    <!-- Search Field -->
    <div v-if="showSearch" class="relative flex-1 min-w-[180px]">
      <UiSearchWithField
        v-if="searchFields.length > 0"
        :model-value="search"
        :field-value="searchField"
        :fields="searchFields"
        :placeholder="searchPlaceholder"
        class="w-full"
        @update:modelValue="$emit('update:search', $event)"
        @update:fieldValue="$emit('update:searchField', $event)"
        @search="$emit('search')"
      />
      <UiSearchBar
        v-else
        :model-value="search"
        :placeholder="searchPlaceholder"
        class="w-full"
        @update:modelValue="$emit('update:search', $event)"
        @keydown.enter="$emit('search')"
      />
    </div>

    <!-- Supplier Filter -->
    <select
      v-if="showSupplierFilter"
      :value="supplierFilter"
      @change="$emit('update:supplierFilter', $event.target.value)"
      class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer min-w-[140px] flex-shrink-0"
    >
      <option value="">Todos los proveedores</option>
      <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option>
    </select>

    <!-- Status Filter -->
    <select
      v-if="showStatusFilter"
      :value="statusFilter"
      @change="$emit('update:statusFilter', $event.target.value)"
      class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer min-w-[130px] flex-shrink-0"
    >
      <option value="">{{ statusPlaceholder }}</option>
      <option v-for="status in statusOptions" :key="status.value" :value="status.value">{{ status.label }}</option>
    </select>

    <!-- Date Filter -->
    <select
      v-if="showDateFilter"
      :value="dateFilter"
      @change="$emit('update:dateFilter', $event.target.value)"
      class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer min-w-[140px] flex-shrink-0"
    >
      <option value="">Todos</option>
      <option value="today">Hoy</option>
      <option value="yesterday">Ayer</option>
      <option value="last_week">Semana Pasada</option>
      <option value="15_days">Últimos 15 días</option>
      <option value="1_month">Último mes</option>
      <option value="3_months">Últimos 3 meses</option>
    </select>

    <!-- Additional Filters Slot -->
    <slot name="additional-filters" />

    <!-- Clear Filters Button -->
    <button
      v-if="showClearButton && hasActiveFilters"
      @click="$emit('clearFilters')"
      class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
      aria-label="Limpiar filtros"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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
  showSearch?: boolean
  search?: string
  searchField?: string
  searchFields?: SearchField[]
  searchLabel?: string
  searchPlaceholder?: string

  showSupplierFilter?: boolean
  supplierFilter?: string
  suppliers?: Supplier[]

  showStatusFilter?: boolean
  statusFilter?: string
  statusOptions?: StatusOption[]
  statusLabel?: string
  statusPlaceholder?: string

  showDateFilter?: boolean
  dateFilter?: string
  dateLabel?: string

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

const hasActiveFilters = computed(() =>
  props.search || props.supplierFilter || props.statusFilter || props.dateFilter
)
</script>
