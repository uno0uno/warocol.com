<template>
  <div class="advanced-filters-bar flex flex-wrap items-center gap-2 w-full">
    <div class="advanced-filters-bar__controls flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <!-- Search -->
      <div
        v-if="showSearch"
        class="relative w-full min-w-[12rem] max-w-full sm:w-auto sm:max-w-xs shrink-0"
      >
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
      <UiFilterSelect
        v-if="showSearch && searchFields.length > 0"
        :model-value="searchField"
        placeholder="Campo"
        :options="searchFields"
        always-active
        hide-placeholder
        aria-label="Campo de búsqueda"
        @update:model-value="emit('update:searchField', $event)"
      />

      <!-- Date range — fixed width so flex-wrap does not stretch to full row -->
      <div
        v-if="showDateRange"
        class="advanced-filters-bar__date shrink-0 w-[12.5rem] sm:w-[13.5rem]"
      >
        <VueDatePicker
          class="advanced-filters-bar__date-picker"
          :model-value="dateRange"
          range
          :preset-dates="presetDates"
          :enable-time-picker="false"
          :locale="es"
          placeholder="Rango de fechas"
          auto-apply
          :teleport="true"
          :timezone="effectiveTimezone"
          :max-date="effectiveMaxDate"
          :format="formatDateRange"
          input-class-name="dp-custom-input"
          menu-class-name="dp-custom-menu"
          calendar-cell-class-name="dp-custom-cell"
          @update:model-value="handleDateRangeUpdate"
        />
      </div>

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
    </div>

    <div
      v-if="$slots.trailing"
      class="advanced-filters-bar__trailing ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-none"
    >
      <slot name="trailing" />
    </div>
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
  timezone?: string
  maxDate?: Date
  showSearch?: boolean
  showDateRange?: boolean
  showClear?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  search: '',
  searchPlaceholder: 'Buscar...',
  searchField: '',
  searchFields: () => [],
  dateRange: null,
  presetDates: () => [],
  formatDateRange: () => '',
  timezone: undefined,
  maxDate: undefined,
  showSearch: true,
  showDateRange: true,
  showClear: false,
})

const { timezone: tenantTimezone, todayISO, dateAtEndOfDay } = useTenantTimezone()
const effectiveTimezone = computed(() => props.timezone ?? tenantTimezone.value)
const effectiveMaxDate = computed(() => props.maxDate ?? dateAtEndOfDay(todayISO()))

const emit = defineEmits<{
  'update:search': [value: string]
  'update:searchField': [value: string]
  'update:dateRange': [value: Date[] | null]
  'update:date-range': [value: Date[] | null]
  search: []
  clear: []
}>()

function handleDateRangeUpdate(value: Date[] | null) {
  emit('update:dateRange', value)
  emit('update:date-range', value)
}
</script>

<style scoped>
.advanced-filters-bar__date-picker :deep(.dp__main),
.advanced-filters-bar__date-picker :deep(.dp__input_wrap) {
  width: 100%;
  max-width: 100%;
}

.advanced-filters-bar__date-picker :deep(.dp__input) {
  width: 100%;
  max-width: 100%;
}
</style>

<style>
.advanced-filters-bar .dp-custom-input {
  box-sizing: border-box;
  height: 40px !important;
  width: 100% !important;
  max-width: 100% !important;
  border: 2px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  background: hsl(var(--background)) !important;
  font-size: 0.875rem !important;
  line-height: 1.25rem !important;
  color: hsl(var(--foreground)) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.advanced-filters-bar .dp-custom-input:focus {
  outline: none !important;
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2) !important;
}
.advanced-filters-bar .dp-custom-input::placeholder {
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
  box-shadow: 0 10px 15px -3px hsl(var(--foreground) / 0.1), 0 4px 6px -4px hsl(var(--foreground) / 0.1) !important;
}
</style>
