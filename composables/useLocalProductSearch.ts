import { computed, ref, type ComputedRef, type Ref } from 'vue'

type SearchableProduct = {
  name?: string | null
  description?: string | null
}

/**
 * Client-side product search (POS / public menu) — no HTTP round-trips.
 */
export function useLocalProductSearch<T extends SearchableProduct>(
  products: Ref<T[]> | ComputedRef<T[]>,
) {
  const searchQuery = ref('')
  const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())
  const hasSearch = computed(() => normalizedQuery.value.length > 0)

  function matchesSearch(product: T): boolean {
    const q = normalizedQuery.value
    if (!q) return true
    const name = (product.name ?? '').toLowerCase()
    if (name.includes(q)) return true
    const description = (product.description ?? '').toLowerCase()
    return description.includes(q)
  }

  function filterBySearch(list: T[]): T[] {
    if (!hasSearch.value) return list
    return list.filter(matchesSearch)
  }

  const searchFilteredProducts = computed(() => filterBySearch(products.value))

  return {
    searchQuery,
    hasSearch,
    matchesSearch,
    filterBySearch,
    searchFilteredProducts,
  }
}
