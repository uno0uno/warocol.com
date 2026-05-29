import { useDebounceFn } from '@vueuse/core'

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

export const useProductSearch = () => {
  const results = ref<ProductRow[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const query = ref('')

  const doSearch = useDebounceFn(async (q: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ success?: boolean; data?: ProductRow[] }>('/api/menu/products', {
        query: q && q.trim().length > 0
          ? { search: q.trim(), limit: 50, page: 1 }
          : { limit: 50, page: 1 },
      })
      const items = Array.isArray(res?.data) ? res.data : []
      results.value = items.map((p) => ({ id: p.id, name: p.name }))
    } catch (e: any) {
      error.value = e
      results.value = []
    } finally {
      loading.value = false
    }
  }, 300)

  watch(query, (val) => {
    loading.value = true
    doSearch(val)
  })

  onMounted(() => {
    doSearch('')
  })

  return { query, results, loading, error }
}
