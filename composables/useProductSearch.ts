import { onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { createLatestRequestTracker } from '~/utils/latestRequestTracker'

/**
 * Debounced server-side product search for pickers (promotions scope, etc.).
 *
 * Usage:
 *   const { query, results, loading } = useProductSearch()
 */
export interface ProductRow {
  id: string
  name: string
}

export interface UseProductSearchOptions {
  /** Include resale products (API default excludes them unless include_all_types=true). */
  includeAllTypes?: boolean
  /** When true, only resale products (`is_resale=true`). */
  resaleOnly?: boolean
  /** When true, exclude resale products (`is_resale=false`). */
  excludeResale?: boolean
}

export const useProductSearch = (options: UseProductSearchOptions = {}) => {
  const results = ref<ProductRow[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const query = ref('')
  const requestTracker = createLatestRequestTracker()

  const doSearch = useDebounceFn(async (q: string, requestId: number) => {
    if (!requestTracker.isLatest(requestId)) return

    try {
      const baseQuery: Record<string, string | number | boolean> = {
        limit: 50,
        page: 1,
      }
      if (q && q.trim().length > 0) {
        baseQuery.search = q.trim()
      }
      if (options.includeAllTypes) {
        baseQuery.include_all_types = true
      }
      if (options.resaleOnly) {
        baseQuery.is_resale = true
      } else if (options.excludeResale) {
        baseQuery.is_resale = false
      }
      const res = await $fetch<{ success?: boolean; data?: ProductRow[] }>('/api/menu/products', {
        query: baseQuery,
      })
      if (!requestTracker.isLatest(requestId)) return
      const items = Array.isArray(res?.data) ? res.data : []
      results.value = items.map((p) => ({ id: p.id, name: p.name }))
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

  onMounted(() => {
    scheduleSearch(query.value)
  })

  return { query, results, loading, error }
}
