<template>
  <div class="relative">
    <input
      type="text"
      v-model="searchTerm"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      class="w-full px-3 py-2 pl-8 pr-8 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
      :placeholder="placeholder"
      autocomplete="off"
    />
    <!-- Search icon (left) -->
    <span class="absolute left-2.5 top-2.5 text-text-secondary pointer-events-none">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
      </svg>
    </span>
    <!-- Loading spinner (right) -->
    <span v-if="loading" class="absolute right-2.5 top-2.5 text-text-secondary pointer-events-none">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    </span>
    <!-- Results dropdown -->
    <ul
      v-if="showResults && results.length"
      class="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
    >
      <li
        v-for="result in results"
        :key="result.id"
        @mousedown.prevent="select(result)"
        class="px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary cursor-pointer"
      >
        {{ result.name }} <span class="text-text-secondary">({{ result.unit }})</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Ingredient {
  id: string
  name: string
  unit: string
  [key: string]: any
}

interface Props {
  placeholder?: string
  initialValue?: string
}

interface Emits {
  (e: 'select', ingredient: Ingredient): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar ingrediente...',
  initialValue: ''
})

const emit = defineEmits<Emits>()

const searchTerm = ref(props.initialValue)
const showResults = ref(false)

const { query, results, loading } = useIngredientSearch()

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (!val || val.trim().length < 1) {
    showResults.value = false
    return
  }
  query.value = val
  showResults.value = true
}

function onFocus() {
  if (searchTerm.value && results.value.length) {
    showResults.value = true
  }
}

function onBlur() {
  setTimeout(() => { showResults.value = false }, 150)
}

function select(ingredient: Ingredient) {
  searchTerm.value = ingredient.name
  showResults.value = false
  query.value = ''
  emit('select', ingredient)
}
</script>
