<template>
  <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
    <!-- Search -->
    <div v-if="showSearch" class="relative flex-1 min-w-[200px]">
      <button
        type="button"
        class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary transition-colors cursor-pointer"
        aria-label="Buscar"
        @click="emit('search')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </button>
      <input
        :value="search"
        :placeholder="searchPlaceholder"
        class="w-full h-10 pl-9 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        @keydown.enter="emit('search')"
      />
    </div>

    <!-- Search field -->
    <select
      v-if="showSearch && searchFields.length > 0"
      :value="searchField"
      class="h-10 w-fit max-w-full [field-sizing:content] whitespace-nowrap py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
      @change="emit('update:searchField', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="field in searchFields" :key="field.value" :value="field.value">
        {{ field.label }}
      </option>
    </select>

    <!-- Date range -->
    <VueDatePicker
      v-if="showDateRange"
      :model-value="dateRange"
      range
      :preset-dates="presetDates"
      :enable-time-picker="false"
      :locale="es"
      placeholder="Rango de fechas"
      auto-apply
      :teleport="true"
      :max-date="new Date()"
      :format="formatDateRange"
      input-class-name="dp-custom-input"
      menu-class-name="dp-custom-menu"
      calendar-cell-class-name="dp-custom-cell"
      @update:model-value="emit('update:dateRange', $event)"
    />

    <slot name="additional-filters" />

    <!-- Clear -->
    <button
      v-if="showClear"
      type="button"
      class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
      aria-label="Limpiar filtros"
      @click="emit('clear')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <slot name="trailing" />
  </div>
</template>

<script setup lang="ts">
import { es } from 'date-fns/locale'

export interface SearchFieldOption {
  label: string
  value: string
}

interface Props {
  search?: string
  searchPlaceholder?: string
  searchField?: string
  searchFields?: SearchFieldOption[]
  dateRange?: Date[] | null
  presetDates?: { label: string; value: Date[] }[]
  formatDateRange?: (dates: Date[]) => string
  showSearch?: boolean
  showDateRange?: boolean
  showClear?: boolean
}

withDefaults(defineProps<Props>(), {
  search: '',
  searchPlaceholder: 'Buscar...',
  searchField: '',
  searchFields: () => [],
  dateRange: null,
  presetDates: () => [],
  formatDateRange: () => '',
  showSearch: true,
  showDateRange: true,
  showClear: false,
})

const emit = defineEmits<{
  'update:search': [value: string]
  'update:searchField': [value: string]
  'update:dateRange': [value: Date[] | null]
  search: []
  clear: []
}>()
</script>

<style>
.dp-custom-input {
  height: 40px !important;
  border: 2px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  background: hsl(var(--background)) !important;
  font-size: 0.875rem !important;
  color: hsl(var(--foreground)) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
  min-width: 150px;
}
.dp-custom-input:focus {
  outline: none !important;
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2) !important;
}
.dp-custom-input::placeholder {
  color: hsl(var(--muted-foreground)) !important;
}
.dp__theme_light {
  --dp-primary-color: hsl(var(--primary));
  --dp-primary-text-color: hsl(var(--primary-foreground));
  --dp-background-color: hsl(var(--card));
  --dp-text-color: hsl(var(--foreground));
  --dp-border-color: hsl(var(--border));
  --dp-menu-border-color: hsl(var(--border));
  --dp-hover-color: hsl(var(--accent));
  --dp-hover-text-color: hsl(var(--foreground));
  --dp-secondary-color: hsl(var(--muted));
  --dp-border-color-hover: hsl(var(--primary));
}
.dp-custom-menu {
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
}
</style>
