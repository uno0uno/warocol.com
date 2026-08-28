<script setup lang="ts">
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline'
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
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  clearAriaLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n({ useScope: 'global' })

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

const clearSearch = () => {
  emit('update:modelValue', '')
}

const resolvedClearAriaLabel = computed(
  () => props.clearAriaLabel || t('common.clearSearch'),
)
</script>

<template>
  <div
    :class="cn(
      'relative flex items-center min-h-10 bg-transparent border border-border rounded-lg px-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-form-control-focus-ring focus-within:border-form-control-focus-border',
      clearable && modelValue ? 'pe-9' : '',
      props.class,
    )"
  >
    <MagnifyingGlassIcon class="w-4 h-4 text-muted-foreground flex-shrink-0" />
    <input
      :value="modelValue"
      :placeholder="placeholder"
      @input="handleInput"
      class="ms-2 min-w-0 flex-1 bg-transparent border-none outline-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none text-sm text-foreground placeholder:text-muted-foreground"
    >
    <button
      v-if="clearable && modelValue"
      type="button"
      class="absolute end-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-form-control-focus-ring"
      :aria-label="resolvedClearAriaLabel"
      @click="clearSearch"
    >
      <XMarkIcon class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
</template>
