<template>
  <div class="relative" ref="containerRef">
    <div class="relative">
      <input
        ref="inputRef"
        v-model="searchTerm"
        type="text"
        :placeholder="placeholder"
        :required="required && !modelValue"
        :title="getSelectedLabel() || searchTerm || undefined"
        class="input-base w-full px-4 py-2 pe-8"
        @focus="handleFocus"
        @input="handleInput"
      />
      <button
        type="button"
        class="absolute end-2 top-1/2 -translate-y-1/2"
        @click="toggleDropdown"
      >
        <svg class="w-4 h-4 text-text-secondary transition-transform" :class="{ 'rotate-180': isOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <!-- Hidden input for form validation -->
    <input
      v-if="required"
      type="text"
      :value="modelValue"
      required
      tabindex="-1"
      class="absolute opacity-0 pointer-events-none"
      style="width: 0; height: 0;"
    />

    <!-- Dropdown -->
    <div
      v-show="isOpen"
      class="absolute z-50 mt-1 max-h-60 w-full overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
    >
      <div class="p-1">
        <div
          v-if="filteredOptions.length === 0"
          class="py-2 px-4 text-sm text-text-secondary"
        >
          No se encontraron resultados
        </div>
        <button
          v-for="option in filteredOptions"
          :key="option.value"
          type="button"
          :title="option.label"
          class="min-w-0 w-full text-start relative flex cursor-pointer select-none items-start gap-2 rounded-md px-4 py-2 text-sm outline-none whitespace-normal hover:bg-surface-secondary focus:bg-surface-secondary"
          :class="{ 'bg-surface-secondary': option.value === modelValue }"
          @click="selectOption(option)"
        >
          <span class="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] leading-snug">
            {{ option.label }}
          </span>
          <svg
            v-if="option.value === modelValue"
            class="mt-0.5 ms-auto w-4 h-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    required: true,
    // Expected format: [{ value: 'kg', label: 'Kilogramo (kg)' }]
  },
  placeholder: {
    type: String,
    default: 'Seleccionar...'
  },
  required: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const searchTerm = ref('')
const isOpen = ref(false)
const containerRef = ref(null)
const inputRef = ref(null)

// Initialize search term from selected value
const updateSearchTerm = () => {
  if (props.modelValue) {
    const selected = props.options.find(opt => opt.value === props.modelValue)
    if (selected) {
      searchTerm.value = selected.label
    }
  } else {
    searchTerm.value = ''
  }
}

// Watch for external changes to modelValue
watch(() => props.modelValue, () => {
  if (!isOpen.value) {
    updateSearchTerm()
  }
}, { immediate: true })

// Watch for options changes (when data loads)
watch(() => props.options, () => {
  updateSearchTerm()
}, { deep: true })

const filteredOptions = computed(() => {
  // If dropdown is not open, return all options
  if (!isOpen.value) {
    return props.options
  }

  // If search term is empty or matches selected value, show all options
  if (!searchTerm.value || searchTerm.value === getSelectedLabel()) {
    return props.options
  }

  // Otherwise filter by search term
  const term = searchTerm.value.toLowerCase()
  return props.options.filter(option =>
    option.label.toLowerCase().includes(term) ||
    option.value.toLowerCase().includes(term)
  )
})

const getSelectedLabel = () => {
  const selected = props.options.find(opt => opt.value === props.modelValue)
  return selected?.label || ''
}

const handleFocus = () => {
  // Just open dropdown, keep current value
  isOpen.value = true
}

const handleInput = () => {
  isOpen.value = true
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    inputRef.value?.focus()
  }
}

const selectOption = (option) => {
  emit('update:modelValue', option.value)
  searchTerm.value = option.label
  isOpen.value = false
}

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    isOpen.value = false
    updateSearchTerm()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
