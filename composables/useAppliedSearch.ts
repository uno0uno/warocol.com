import { ref } from 'vue'

export function useAppliedSearch() {
  const localSearchTerm = ref('')
  const appliedSearch = ref('')

  const performSearch = (onApply?: () => void) => {
    appliedSearch.value = localSearchTerm.value.trim()
    onApply?.()
  }

  const clearSearch = () => {
    localSearchTerm.value = ''
    appliedSearch.value = ''
  }

  return {
    localSearchTerm,
    appliedSearch,
    performSearch,
    clearSearch,
  }
}
