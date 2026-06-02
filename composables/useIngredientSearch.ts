import type { Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

/**
 * Composable for debounced server-side ingredient search.
 *
 * Returns `groupedResults` — a flat array with interleaved header rows
 * (_isHeader: true) for base ingredients, and selectable rows for variants
 * and standalone ingredients. Grouping is done client-side using `hierarchy_base_id`
 * and `hierarchy_base_name` fields returned by the backend (ingredient_global_hierarchy).
 *
 * The raw `results` array is also exported for callers that need a flat list.
 *
 * Usage:
 *   const { query, groupedResults, loading } = useIngredientSearch()
 *   // bind query to the search input v-model
 *   // bind groupedResults to the dropdown — skip rows where _isHeader === true
 */
export const useIngredientSearch = ({
  baseOnly = false,
  type,
}: {
  baseOnly?: boolean
  type?: Ref<string | undefined>
} = {}) => {
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
      const fetchQuery: Record<string, any> = { search: q.trim(), limit: 50 }
      if (baseOnly) fetchQuery.base_only = true
      const typeFilter = type?.value?.trim()
      if (typeFilter) fetchQuery.type = typeFilter
      const data = await $fetch<any>('/api/suppliers/ingredients', {
        query: fetchQuery
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

  /**
   * Flat results grouped by base ingredient.
   *
   * - Header rows (_isHeader: true) represent base ingredients — non-selectable.
   * - Variant rows are placed immediately after their base header, with hierarchy_base_id set.
   * - Standalone bases (hierarchy_base_id == null, no variants in results) are selectable directly.
   *
   * If a variant's base is not in the results, a synthetic header is created from
   * the variant's hierarchy_base_name field.
   */
  const groupedResults = computed(() => {
    const flat = results.value
    if (!flat.length) return []

    // Separate variants from potential bases
    const variants: any[] = []
    const potentialBases: any[] = []
    for (const item of flat) {
      if (item.hierarchy_base_id) variants.push(item)
      else potentialBases.push(item)
    }

    // Base objects by id — for when a base appears in results alongside its variants
    const baseMap = new Map<string, any>()
    for (const b of potentialBases) baseMap.set(b.id, b)

    // All variants grouped by hierarchy_base_id, preserving result order within each group
    const variantsByParent = new Map<string, any[]>()
    for (const v of variants) {
      const pid = v.hierarchy_base_id as string
      if (!variantsByParent.has(pid)) variantsByParent.set(pid, [])
      variantsByParent.get(pid)!.push(v)
    }

    const parentIdsWithVariants = new Set(variantsByParent.keys())
    const processedParentIds = new Set<string>()
    const output: any[] = []

    for (const item of flat) {
      if (item.hierarchy_base_id) {
        // Variant — on first encounter of this parent, emit header + all siblings
        const pid = item.hierarchy_base_id as string
        if (!processedParentIds.has(pid)) {
          processedParentIds.add(pid)
          const base = baseMap.get(pid)
          output.push({
            ...(base ?? {}),
            id: pid,
            name: base?.name ?? item.hierarchy_base_name ?? 'Ingrediente base',
            unit: base?.unit ?? '',
            _isHeader: true,
          })
          for (const v of variantsByParent.get(pid)!) {
            output.push(v)
          }
        }
        // else: already emitted as part of parent group — skip
      } else {
        // Potential base — skip if already emitted as a header
        if (processedParentIds.has(item.id)) continue
        if (parentIdsWithVariants.has(item.id)) {
          // Base appears before its variants in results — emit header + variants now
          processedParentIds.add(item.id)
          output.push({ ...item, _isHeader: true })
          for (const v of variantsByParent.get(item.id)!) {
            output.push(v)
          }
        } else {
          // True standalone — selectable directly
          output.push(item)
        }
      }
    }

    return output
  })

  return { query, results, groupedResults, loading, error }
}
