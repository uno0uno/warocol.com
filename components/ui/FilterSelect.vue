<script setup lang="ts">
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
</script>

<template>
  <select
    :value="modelValue"
    :class="filterSelectClassFor(modelValue, { active: alwaysActive || undefined })"
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
</template>
