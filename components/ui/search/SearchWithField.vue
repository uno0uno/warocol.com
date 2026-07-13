<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { cn } from '../utils'

const props = defineProps({
  placeholder: {
    type: String,
    default: 'Buscar...'
  },
  modelValue: {
    type: String,
    default: ''
  },
  fieldValue: {
    type: String,
    default: ''
  },
  fields: {
    type: Array,
    default: () => []
  },
  class: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'update:fieldValue', 'search'])

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const handleFieldChange = (event) => {
  emit('update:fieldValue', event.target.value)
  emit('search')
}
</script>

<template>
  <div :class="cn('flex items-center gap-2', props.class)">
    <!-- Search Input -->
    <div class="relative flex-1">
      <button
        @click="emit('search')"
        class="absolute start-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary transition-colors cursor-pointer"
      >
        <MagnifyingGlassIcon class="w-4 h-4" />
      </button>
      <input
        :value="modelValue"
        :placeholder="placeholder"
        @input="handleInput"
        @keydown.enter="emit('search')"
        class="w-full h-10 ps-9 pe-3 rounded-lg border-2 border-border bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>

    <!-- Field Select -->
    <div class="relative">
      <select
        :value="fieldValue"
        @change="handleFieldChange"
        class="h-10 ps-3 pe-8 rounded-lg border-2 border-border bg-transparent bg-none text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer min-w-[120px]"
      >
        <option v-for="field in fields" :key="field.value" :value="field.value">
          {{ field.label }}
        </option>
      </select>
      <div class="absolute end-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
</template>
