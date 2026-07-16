import { onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { createLatestRequestTracker } from '~/utils/latestRequestTracker'

export interface WarehouseCategoryRow {
  name: string
  ingredient_count: number
  global_count: number
  tenant_count: number
}

export const useWarehouseCategorySearch = () => {
  const results = ref<WarehouseCategoryRow[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const query = ref('')
  const requestTracker = createLatestRequestTracker()

  const doSearch = useDebounceFn(async (value: string, requestId: number) => {
    if (!requestTracker.isLatest(requestId)) return

    try {
      const trimmedValue = value.trim()
      const response = await $fetch<{ data: WarehouseCategoryRow[] }>(
        '/api/suppliers/ingredients/categories',
        {
          query: trimmedValue
            ? { search: trimmedValue, limit: 100 }
            : { limit: 100 },
        },
      )
      if (!requestTracker.isLatest(requestId)) return
      results.value = response?.data ?? []
    } catch (searchError: any) {
      if (!requestTracker.isLatest(requestId)) return
      error.value = searchError
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
