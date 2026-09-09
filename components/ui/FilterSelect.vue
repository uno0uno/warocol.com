<script setup lang="ts">
import { computed, watch } from 'vue'
import { useFilterSelectAutoWidth } from '@/composables/useFilterSelectAutoWidth'
import { filterSelectClassFor } from '@/composables/useFilterSelectClass'

export interface FilterSelectOption {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder: string
    options: FilterSelectOption[]
    ariaLabel?: string
    /** Sort and search-field selects are always considered active. */
    alwaysActive?: boolean
    /** Never show the active (primary border) state. */
    neverActive?: boolean
    /** Shell-action tone (header buttons): border/focus tokens instead of primary. */
    shell?: boolean
    /** No placeholder row (e.g. sort always has a value). */
    hidePlaceholder?: boolean
  }>(),
  { alwaysActive: false, neverActive: false, shell: false, hidePlaceholder: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectClass = computed(() =>
  props.shell
    ? 'h-9 max-w-full min-w-0 whitespace-nowrap px-2.5 rounded-lg border border-shell-action-border bg-shell-action-bg text-sm font-medium text-shell-action-text hover:bg-shell-action-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring cursor-pointer flex-shrink-0 transition-colors'
    : filterSelectClassFor(modelValue, { active: neverActive ? false : (alwaysActive || undefined) }),
)

const displayLabel = computed(() => {
  if (props.modelValue) {
    const selected = props.options.find(o => o.value === props.modelValue)
    if (selected) return selected.label
  }
  return props.placeholder
})

const { measureRef, widthPx, remeasure } = useFilterSelectAutoWidth(displayLabel)

watch(() => props.options, remeasure, { deep: true })
</script>

<template>
  <div class="relative inline-flex shrink-0 max-w-full">
    <select
      :value="modelValue"
      :class="selectClass"
      :style="widthPx ? { width: `${widthPx}px`, minWidth: `${widthPx}px` } : undefined"
      :aria-label="ariaLabel ?? placeholder"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="!hidePlaceholder" value="" disabled hidden>
        {{ placeholder }}
      </option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
    <span
      ref="measureRef"
      class="pointer-events-none invisible absolute top-0 start-0 z-[-1] whitespace-nowrap text-sm h-10 inline-flex items-center ps-3 pe-8 font-medium"
      aria-hidden="true"
    >{{ displayLabel }}</span>
  </div>
</template>
