import { onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { createLatestRequestTracker } from '~/utils/latestRequestTracker'

export interface WarehouseCategoryRow {
  id: string
  tenant_id: string | null
  name: string
  normalized_name: string
  is_active: boolean
  scope: 'global' | 'tenant'
  can_manage: boolean
  ingredient_count: number
  global_count: number
  tenant_count: number
}

export const useWarehouseCategorySearch = () => {
  const results = ref<WarehouseCategoryRow[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const mutating = ref(false)
  const query = ref('')
  const requestTracker = createLatestRequestTracker()

  const doSearch = useDebounceFn(async (value: string, requestId: number) => {
    if (!requestTracker.isLatest(requestId)) return

    try {
      const trimmedValue = value.trim()
      const response = await $fetch<{ data: WarehouseCategoryRow[] }>(
        '/api/suppliers/warehouse-categories',
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

  async function createCategory(name: string) {
    mutating.value = true
    try {
      const response = await $fetch<{ data: WarehouseCategoryRow }>(
        '/api/suppliers/warehouse-categories',
        { method: 'POST', body: { name } },
      )
      results.value = [
        response.data,
        ...results.value.filter(category => category.id !== response.data.id),
      ]
      return response.data
    } finally {
      mutating.value = false
    }
  }

  async function renameCategory(categoryId: string, name: string) {
    mutating.value = true
    try {
      const response = await $fetch<{ data: WarehouseCategoryRow }>(
        `/api/suppliers/warehouse-categories/${categoryId}`,
        { method: 'PATCH', body: { name } },
      )
      results.value = results.value.map(category =>
        category.id === categoryId ? response.data : category,
      )
      return response.data
    } finally {
      mutating.value = false
    }
  }

  async function archiveCategory(categoryId: string) {
    mutating.value = true
    try {
      const response = await $fetch<{ data: WarehouseCategoryRow }>(
        `/api/suppliers/warehouse-categories/${categoryId}/archive`,
        { method: 'PATCH' },
      )
      results.value = results.value.filter(category => category.id !== categoryId)
      return response.data
    } finally {
      mutating.value = false
    }
  }

  return {
    query,
    results,
    loading,
    error,
    mutating,
    createCategory,
    renameCategory,
    archiveCategory,
  }
}
