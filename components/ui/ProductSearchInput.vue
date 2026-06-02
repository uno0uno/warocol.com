<template>
  <div class="relative">
    <input
      :id="inputId"
      type="text"
      v-model="searchTerm"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      role="combobox"
      :aria-expanded="showResults && visibleResults.length > 0"
      aria-autocomplete="list"
      aria-controls="product-search-results"
      class="w-full px-3 py-2 pl-8 pr-8 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
      :placeholder="placeholder"
      autocomplete="off"
    />
    <span class="absolute left-2.5 top-2.5 text-text-secondary pointer-events-none" aria-hidden="true">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
      </svg>
    </span>
    <span v-if="loading" class="absolute right-2.5 top-2.5 text-text-secondary pointer-events-none" aria-hidden="true">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    </span>
    <ul
      v-if="showResults && (visibleResults.length > 0 || (!!query.trim() && !loading))"
      id="product-search-results"
      role="listbox"
      class="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
    >
      <li
        v-for="product in visibleResults"
        :key="product.id"
        role="option"
        @mousedown.prevent="select(product)"
        class="px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary cursor-pointer min-h-[44px] flex items-center"
      >
        {{ product.name }}
      </li>
      <li
        v-if="!visibleResults.length && !loading && query.trim()"
        role="presentation"
        aria-hidden="true"
        class="px-3 py-2 text-sm text-text-secondary/60 select-none"
      >
        Sin resultados
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProductSearch, type ProductRow } from '~/composables/useProductSearch'

interface Props {
  placeholder?: string
  inputId?: string
  initialValue?: string
  excludeIds?: string[]
  /** Include resale products in search results (promotions scope picker). */
  includeAllTypes?: boolean
}

interface Emits {
  (e: 'select', product: ProductRow): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar producto…',
  inputId: 'product-search-input',
  initialValue: '',
  excludeIds: () => [],
  includeAllTypes: false,
})

const emit = defineEmits<Emits>()

const searchTerm = ref(props.initialValue)
const showResults = ref(false)

const { query, results, loading } = useProductSearch({
  includeAllTypes: props.includeAllTypes,
})

watch(() => props.initialValue, (val) => {
  searchTerm.value = val ?? ''
  if (val) {
    query.value = ''
    showResults.value = false
  }
})

const excludeSet = computed(() => new Set(props.excludeIds))

const visibleResults = computed(() =>
  results.value.filter((p) => !excludeSet.value.has(p.id)),
)

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  query.value = val
  showResults.value = true
}

function onFocus() {
  query.value = searchTerm.value
  showResults.value = true
}

function onBlur() {
  setTimeout(() => { showResults.value = false }, 150)
}

function select(product: ProductRow) {
  searchTerm.value = product.name
  showResults.value = false
  query.value = ''
  emit('select', product)
}
</script>
