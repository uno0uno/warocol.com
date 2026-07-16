import { onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { createLatestRequestTracker } from '~/utils/latestRequestTracker'

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
  const requestTracker = createLatestRequestTracker()

  const doSearch = useDebounceFn(async (q: string, requestId: number) => {
    if (!requestTracker.isLatest(requestId)) return

    try {
      const data = await $fetch<{ data: CategoryRow[] }>('/api/menu/categories', {
        query: q && q.trim().length > 0
          ? { search: q.trim(), limit: 50 }
          : { limit: 50 },
      })
      if (!requestTracker.isLatest(requestId)) return
      results.value = data?.data ?? []
    } catch (e: any) {
      if (!requestTracker.isLatest(requestId)) return
      error.value = e
      results.value = []
    } finally {
      if (requestTracker.isLatest(requestId)) {
        loading.value = false
      }
    }
  }, 300)

  function scheduleSearch(value: string) {
    const requestId = requestTracker.next()
    loading.value = true
    error.value = null
    void doSearch(value, requestId)
  }

  watch(query, scheduleSearch)

  // Initial load — show full list when the input is opened with empty query
  onMounted(() => {
    scheduleSearch(query.value)
  })

  return { query, results, loading, error }
}
