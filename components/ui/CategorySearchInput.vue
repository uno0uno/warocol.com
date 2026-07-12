<template>
  <div class="relative">
    <input
      type="text"
      v-model="searchTerm"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      role="combobox"
      :aria-expanded="showResults && (results.length > 0 || (allowCreate && !!query.trim()))"
      aria-autocomplete="list"
      aria-controls="category-search-results"
      class="w-full px-3 py-2 pl-8 pr-8 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface"
      :placeholder="placeholder"
      autocomplete="off"
    />
    <!-- Search icon (left) -->
    <span class="absolute left-2.5 top-2.5 text-text-secondary pointer-events-none" aria-hidden="true">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
      </svg>
    </span>
    <!-- Loading spinner (right) -->
    <span v-if="loading" class="absolute right-2.5 top-2.5 text-text-secondary pointer-events-none" aria-hidden="true">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
      </svg>
    </span>
    <!-- Results dropdown — shown when there are results OR when allowCreate and query has value -->
    <ul
      v-if="showResults && (results.length > 0 || (allowCreate && !!query.trim()))"
      id="category-search-results"
      role="listbox"
      class="absolute z-50 w-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
    >
      <li
        v-for="cat in results"
        :key="cat.id"
        role="option"
        @mousedown.prevent="select(cat)"
        class="px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary cursor-pointer flex items-start gap-1.5"
      >
        <span class="min-w-0 flex-1 break-words whitespace-normal leading-snug">{{ cat.name }}</span>
        <span v-if="!cat.tenant_id" class="text-xs bg-surface-secondary text-text-secondary rounded px-1 flex-shrink-0">{{ t('abastecimiento.glossary.globalLabel') }}</span>
      </li>
      <!-- "No results" message -->
      <li
        v-if="!results.length && !loading && query.trim()"
        role="presentation"
        aria-hidden="true"
        class="px-3 py-2 text-sm text-text-secondary/60 select-none"
      >
        {{ t('abastecimiento.glossary.noSearchResults') }}
      </li>
      <!-- "Crear" footer — only when allowCreate, query has text, and no exact case-insensitive match -->
      <li
        v-if="allowCreate && query.trim() && !loading && !exactMatch"
        role="option"
        @mousedown.prevent="$emit('create', query.trim())"
        class="px-3 py-2 text-sm text-primary border-t border-border hover:bg-surface-secondary cursor-pointer flex items-start gap-1.5"
      >
        <svg class="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="min-w-0 flex-1 whitespace-normal break-words leading-snug">{{ t('abastecimiento.glossary.createNamed', { name: query.trim() }) }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCategorySearch, type CategoryRow } from '~/composables/useCategorySearch'

const { t } = useI18n({ useScope: 'global' })

interface Props {
  placeholder?: string
  initialValue?: string
  allowCreate?: boolean
}

interface Emits {
  (e: 'select', category: CategoryRow): void
  (e: 'create', term: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar categoría...',
  initialValue: '',
  allowCreate: false,
})

const emit = defineEmits<Emits>()

const searchTerm = ref(props.initialValue)
const showResults = ref(false)

const { query, results, loading } = useCategorySearch()

// Keep input synced when parent updates initialValue (e.g. after loading product in edit mode)
watch(() => props.initialValue, (val) => {
  searchTerm.value = val
})

// Hide "Crear" button if the typed name matches an existing category exactly (case-insensitive).
// Avoids accidental duplicates and respects the unique constraint.
const exactMatch = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return false
  return results.value.some(cat => cat.name.toLowerCase() === q)
})

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  query.value = val
  showResults.value = true
}

function onFocus() {
  // Show dropdown on focus so the user sees existing categories before typing
  query.value = searchTerm.value
  showResults.value = true
}

function onBlur() {
  // Delay closing so mousedown.prevent on options can fire first
  setTimeout(() => { showResults.value = false }, 150)
}

function select(category: CategoryRow) {
  searchTerm.value = category.name
  showResults.value = false
  query.value = ''
  emit('select', category)
}
</script>
