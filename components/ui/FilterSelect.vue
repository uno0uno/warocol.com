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
    /** No placeholder row (e.g. sort always has a value). */
    hidePlaceholder?: boolean
  }>(),
  { alwaysActive: false, hidePlaceholder: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isActive = computed(
  () => props.alwaysActive || (props.modelValue != null && props.modelValue !== ''),
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
      :class="filterSelectClassFor(modelValue, { active: alwaysActive || undefined })"
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
      class="pointer-events-none invisible absolute top-0 left-0 z-[-1] whitespace-nowrap text-sm h-10 inline-flex items-center pl-3 pr-8 font-medium"
      aria-hidden="true"
    >{{ displayLabel }}</span>
  </div>
</template>
