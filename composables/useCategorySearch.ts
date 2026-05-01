import { useDebounceFn } from '@vueuse/core'

/**
 * Composable for debounced server-side category search (issue #458).
 *
 * Backend filters by `(tenant_id IS NULL OR tenant_id = current_tenant)`,
 * so the result already respects the per-tenant scope — the frontend just
 * renders what arrives.
 *
 * Usage:
 *   const { query, results, loading } = useCategorySearch()
 *   // bind query to the search input v-model
 */
export interface CategoryRow {
  id: string
  name: string
  description: string | null
  tenant_id: string | null
  created_at: string
  updated_at: string
}

export const useCategorySearch = () => {
  const results = ref<CategoryRow[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const query = ref('')

  const doSearch = useDebounceFn(async (q: string) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<{ data: CategoryRow[] }>('/api/menu/categories', {
        query: q && q.trim().length > 0
          ? { search: q.trim(), limit: 50 }
          : { limit: 50 },
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
    loading.value = true // immediate spinner before the debounce fires
    doSearch(val)
  })

  // Initial load — show full list when the input is opened with empty query
  onMounted(() => {
    doSearch('')
  })

  return { query, results, loading, error }
}
