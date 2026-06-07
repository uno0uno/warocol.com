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
    filterType?: 'none' | 'select' | 'toggle'
    options?: TableHeaderFilterOption[]
    allLabel?: string
    toggleLabel?: string
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
    align: 'left',
  },
)

const emit = defineEmits<{
  sort: [field: string]
  'update:modelValue': [value: string | boolean]
}>()

const isSorted = computed(() => props.sortable && props.columnKey && props.sortField === props.columnKey)
const sortIcon = computed(() => {
  if (!props.sortable) return null
  if (!isSorted.value) return ChevronUpDownIcon
  return props.sortDirection === 'asc' ? ChevronUpIcon : ChevronDownIcon
})
const selectValue = computed(() => typeof props.modelValue === 'string' ? props.modelValue : '')
const hasFilter = computed(() => props.filterType !== 'none')
const isFilterActive = computed(() => {
  if (props.filterType === 'toggle') return Boolean(props.modelValue)
  if (props.filterType === 'select') return Boolean(selectValue.value)
  return false
})
const activeFilterLabel = computed(() => {
  if (props.filterType === 'toggle') return props.toggleLabel
  return props.options.find(opt => opt.value === selectValue.value)?.label ?? props.allLabel
})
const filterIcon = computed(() => props.filterType === 'toggle' ? CheckCircleIcon : FunnelIcon)

const textAlignClass = computed(() => {
  if (props.align === 'center') return 'justify-center text-center'
  if (props.align === 'right') return 'justify-end text-right'
  return 'justify-start text-left'
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
      <span
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
    </div>
  </div>
</template>
