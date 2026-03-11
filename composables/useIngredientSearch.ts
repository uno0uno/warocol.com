import { useDebounceFn } from '@vueuse/core'

/**
 * Composable for debounced server-side ingredient search.
 *
 * Replaces the bulk-fetch + in-memory filter pattern used in compra/compras-directas
 * selectors. The backend GET /suppliers/ingredients?search=&limit=50 is already in place.
 *
 * Usage:
 *   const { query, results, loading } = useIngredientSearch()
 *   // bind query to the search input v-model
 *   // bind results to the dropdown list
 */
export const useIngredientSearch = () => {
  const results = ref<any[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const query = ref('')

  const doSearch = useDebounceFn(async (q: string) => {
    if (!q || q.trim().length < 1) {
      results.value = []
      loading.value = false
      return
    }
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<any>('/api/suppliers/ingredients', {
        query: { search: q.trim(), limit: 50 }
      })
      results.value = data?.data ?? []
    } catch (e: any) {
      error.value = e
      results.value = []
    } finally {
      loading.value = false
    }
  }, 300)

  watch(query, (val) => {
    if (!val || val.trim().length < 1) {
      results.value = []
      loading.value = false
      return
    }
    loading.value = true // show loading immediately on keystroke, before debounce fires
    doSearch(val)
  })

  return { query, results, loading, error }
}
