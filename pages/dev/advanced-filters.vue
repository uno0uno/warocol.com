<script setup lang="ts">
import { ref, computed } from 'vue'

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

useHead({ title: 'Advanced Filters Bar — Dev' })

const { dateRangeDates, presetDates, formatDateRange } = useDateRangePresets()
const { localSearchTerm, appliedSearch, performSearch, clearSearch } = useAppliedSearch()

const searchField = ref('name')
const demoStatus = ref<string | null>(null)
const demoChip = ref(false)

const searchFields = [
  { label: 'Nombre', value: 'name' },
  { label: 'Descripción', value: 'description' },
]

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!dateRangeDates.value
    || !!demoStatus.value
    || demoChip.value,
)

const clearAll = () => {
  clearSearch()
  dateRangeDates.value = null
  searchField.value = 'name'
  demoStatus.value = null
  demoChip.value = false
}
</script>

<template>
  <div class="page-layout max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-6">
    <div>
      <h1 class="text-lg font-semibold text-text-primary">UiAdvancedFiltersBar</h1>
      <p class="text-sm text-text-secondary mt-1">
        Dev-only showcase. Applied search: <code class="text-xs">{{ appliedSearch || '—' }}</code>
      </p>
    </div>

    <UiAdvancedFiltersBar
      v-model:search="localSearchTerm"
      v-model:search-field="searchField"
      v-model:date-range="dateRangeDates"
      :search-fields="searchFields"
      search-placeholder="Buscar demo..."
      :preset-dates="presetDates"
      :format-date-range="formatDateRange"
      :show-clear="hasActiveFilters"
      @search="performSearch()"
      @clear="clearAll"
    >
      <template #additional-filters>
        <select
          v-model="demoStatus"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
        >
          <option :value="null">Estado</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>

        <label
          class="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-colors flex-shrink-0"
          :class="demoChip
            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-emerald-400'"
        >
          <input v-model="demoChip" type="checkbox" class="sr-only" aria-label="Chip demo" />
          <span class="text-sm font-semibold">Chip demo</span>
        </label>
      </template>

      <template #trailing>
        <button
          type="button"
          class="hidden md:flex h-10 px-3 items-center gap-2 rounded-lg border-2 border-border bg-background text-text-secondary text-sm font-medium hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
        >
          Trailing CTA
        </button>
      </template>
    </UiAdvancedFiltersBar>
  </div>
</template>
