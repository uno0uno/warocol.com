<script setup lang="ts">
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  FunnelIcon,
} from '@heroicons/vue/24/outline'

export interface TableHeaderFilterOption {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    title: string
    columnKey?: string
    sortable?: boolean
    sortField?: string
    sortDirection?: 'asc' | 'desc'
    modelValue?: string | boolean
    filterType?: 'none' | 'select' | 'toggle' | 'number-range'
    options?: TableHeaderFilterOption[]
    allLabel?: string
    toggleLabel?: string
    minValue?: string | number | null
    maxValue?: string | number | null
    minPlaceholder?: string
    maxPlaceholder?: string
    align?: 'left' | 'center' | 'right'
  }>(),
  {
    sortable: false,
    sortDirection: 'asc',
    modelValue: '',
    filterType: 'select',
    options: () => [],
    allLabel: 'Todos',
    toggleLabel: 'Solo activos',
    minValue: '',
    maxValue: '',
    minPlaceholder: 'Mín.',
    maxPlaceholder: 'Máx.',
    align: 'left',
  },
)

const emit = defineEmits<{
  sort: [field: string]
  'update:modelValue': [value: string | boolean]
  'update:minValue': [value: string]
  'update:maxValue': [value: string]
}>()

const isSorted = computed(() => props.sortable && props.columnKey && props.sortField === props.columnKey)
const sortIcon = computed(() => {
  if (!props.sortable) return null
  if (!isSorted.value) return ChevronUpDownIcon
  return props.sortDirection === 'asc' ? ChevronUpIcon : ChevronDownIcon
})
const selectValue = computed(() => typeof props.modelValue === 'string' ? props.modelValue : '')
const isRangeOpen = ref(false)
const minRangeValue = computed(() => props.minValue == null ? '' : String(props.minValue))
const maxRangeValue = computed(() => props.maxValue == null ? '' : String(props.maxValue))
const hasFilter = computed(() => props.filterType !== 'none')
const isFilterActive = computed(() => {
  if (props.filterType === 'toggle') return Boolean(props.modelValue)
  if (props.filterType === 'select') return Boolean(selectValue.value)
  if (props.filterType === 'number-range') return Boolean(minRangeValue.value || maxRangeValue.value)
  return false
})
const activeFilterLabel = computed(() => {
  if (props.filterType === 'toggle') return props.toggleLabel
  if (props.filterType === 'number-range') {
    const min = minRangeValue.value || '...'
    const max = maxRangeValue.value || '...'
    return `${min} - ${max}`
  }
  return props.options.find(opt => opt.value === selectValue.value)?.label ?? props.allLabel
})
const filterIcon = computed(() => props.filterType === 'toggle' ? CheckCircleIcon : FunnelIcon)

const textAlignClass = computed(() => {
  if (props.align === 'center') return 'justify-center text-center'
  if (props.align === 'right') return 'justify-end text-end'
  return 'justify-start text-start'
})
const rangePanelClass = computed(() => {
  if (props.align === 'right') return 'end-0'
  if (props.align === 'center') return 'start-1/2 -translate-x-1/2'
  return 'start-0'
})

function onSort() {
  if (!props.sortable || !props.columnKey) return
  emit('sort', props.columnKey)
}
</script>

<template>
  <div :class="['flex min-w-0 w-full items-center gap-1.5', textAlignClass]">
    <button
      v-if="sortable"
      type="button"
      class="inline-flex min-w-0 items-center gap-1 text-xs font-semibold uppercase tracking-wider text-data-table-header-text transition-colors hover:text-data-table-cell-text"
      :aria-label="`Ordenar por ${title}`"
      @click="onSort"
    >
      <span class="truncate">{{ title }}</span>
      <component :is="sortIcon" v-if="sortIcon" class="h-3 w-3 shrink-0" />
    </button>
    <span
      v-else
      class="block min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-data-table-header-text"
    >
      {{ title }}
    </span>

    <div v-if="hasFilter" class="relative inline-flex h-6 w-6 shrink-0 items-center justify-center">
      <button
        v-if="filterType === 'number-range'"
        type="button"
        :class="[
          'inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
          isFilterActive
            ? 'border-primary bg-primary/10 text-primary shadow-sm'
            : 'border-transparent text-data-table-header-text/70 hover:border-data-table-border hover:bg-background hover:text-data-table-cell-text',
        ]"
        :title="`Filtrar ${title}: ${activeFilterLabel}`"
        :aria-label="`Filtrar ${title}`"
        @click.stop="isRangeOpen = !isRangeOpen"
      >
        <component :is="filterIcon" class="h-3.5 w-3.5" />
      </button>

      <span
        v-else
        :class="[
          'inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
          isFilterActive
            ? 'border-primary bg-primary/10 text-primary shadow-sm'
            : 'border-transparent text-data-table-header-text/70 hover:border-data-table-border hover:bg-background hover:text-data-table-cell-text',
        ]"
        :title="`Filtrar ${title}: ${activeFilterLabel}`"
      >
        <component :is="filterIcon" class="h-3.5 w-3.5" />
      </span>

      <select
        v-if="filterType === 'select'"
        :value="selectValue"
        class="absolute inset-0 h-6 w-6 cursor-pointer opacity-0"
        :aria-label="`Filtrar ${title}`"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ allLabel }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <input
        v-else-if="filterType === 'toggle'"
        :checked="Boolean(modelValue)"
        type="checkbox"
        class="absolute inset-0 h-6 w-6 cursor-pointer opacity-0"
        :aria-label="`Filtrar ${title}`"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />

      <div
        v-else-if="filterType === 'number-range' && isRangeOpen"
        :class="[
          'absolute top-8 z-30 w-44 rounded-lg border border-border bg-background p-2 shadow-lg',
          rangePanelClass,
        ]"
        @click.stop
      >
        <div class="grid grid-cols-2 gap-2">
          <input
            :value="minRangeValue"
            type="number"
            inputmode="decimal"
            step="any"
            min="0"
            class="h-8 min-w-0 rounded-md border border-border bg-surface px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            :placeholder="minPlaceholder"
            :aria-label="`${title} mínimo`"
            @input="emit('update:minValue', ($event.target as HTMLInputElement).value)"
          />
          <input
            :value="maxRangeValue"
            type="number"
            inputmode="decimal"
            step="any"
            min="0"
            class="h-8 min-w-0 rounded-md border border-border bg-surface px-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            :placeholder="maxPlaceholder"
            :aria-label="`${title} máximo`"
            @input="emit('update:maxValue', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <button
          v-if="minRangeValue || maxRangeValue"
          type="button"
          class="mt-2 w-full rounded-md px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
          @click="emit('update:minValue', ''); emit('update:maxValue', '')"
        >
          Limpiar
        </button>
      </div>
    </div>
  </div>
</template>
