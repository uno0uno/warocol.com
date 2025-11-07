<script setup>
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

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
  <div :class="cn('flex items-center bg-gray-800 rounded-lg px-3 py-2', props.class)">
    <MagnifyingGlassIcon class="w-4 h-4 text-gray-400" />
    <input
      :value="modelValue"
      :placeholder="placeholder"
      @input="handleInput"
      class="ml-2 bg-transparent border-none outline-none text-sm flex-1 text-white placeholder:text-gray-400"
    />
  </div>
</template>

<script>
import { cn } from '../utils'
</script>