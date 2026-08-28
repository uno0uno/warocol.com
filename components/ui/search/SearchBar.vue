<script setup lang="ts">
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { cn } from '../utils'

const props = defineProps({
  placeholder: {
    type: String,
    default: 'Search...'
  },
  modelValue: {
    type: String,
    default: ''
  },
  class: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div :class="cn('flex items-center bg-transparent border border-border rounded-lg px-3 py-2 transition-all duration-200 focus-within:ring-2 focus-within:ring-form-control-focus-ring focus-within:border-form-control-focus-border', props.class)">
    <MagnifyingGlassIcon class="w-4 h-4 text-muted-foreground flex-shrink-0" />
    <input
      :value="modelValue"
      :placeholder="placeholder"
      @input="handleInput"
      class="ms-2 min-w-0 flex-1 bg-transparent border-none outline-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none text-sm text-foreground placeholder:text-muted-foreground"
    />
  </div>
</template>
