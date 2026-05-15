/**
 * useCityCatalog — global SSR-safe access to the curated city catalog
 * shipped in warocol.com#615.
 *
 * The catalog backs three independent surfaces, so it must be fetched once
 * per request and shared:
 *   - The dispatch in `pages/[tenant]/index.vue` (decides whether a slug
 *     resolves to a city directory or to a tenant profile). MUST be
 *     populated during SSR so the server and the client render the same
 *     tree — otherwise Vue throws a hydration mismatch.
 *   - The country/city selectors on `/negocio` (operator UI).
 *   - The discovery section on `/` (customer-facing tiles).
 *
 * Backed by Nuxt's `useState` so it survives SSR → client hydration and is
 * never refetched on the same page load. The server plugin
 * `plugins/city-catalog.server.ts` warms it on every SSR request.
 */
import { computed } from 'vue'

export interface PublicCity {
  country: string
  city: string
  city_slug: string
  tenant_count: number
}

export function useCityCatalog() {
  const cities = useState<PublicCity[]>('city-catalog', () => [])

  const fetchCatalog = async (opts?: { includeEmpty?: boolean }): Promise<void> => {
    // Skip when already hydrated from SSR. The catalog is small (~10 rows)
    // and changes rarely, so a per-request fetch is enough.
    if (cities.value.length > 0) return
    try {
      const res = await $fetch<{ success: boolean; data: PublicCity[] }>(
        '/api/public/cities',
        { params: { include_empty: opts?.includeEmpty ? 'true' : 'false' } },
      )
      cities.value = res?.data ?? []
    } catch {
      // Silent fail — UI fallback is "no cities" which renders an empty
      // discovery section and falls back to free-text on the selector.
      cities.value = []
    }
  }

  /** O(1) lookup set used by the `/[tenant]/` dispatch. */
  const citySlugSet = computed<Set<string>>(
    () => new Set(cities.value.map((c) => c.city_slug)),
  )

  /** True when the slug is a known active city, used by the dispatch. */
  const isCitySlug = (slug: string): boolean => citySlugSet.value.has(slug)

  /** Find the catalog entry for a slug (returns null if unknown). */
  const findCity = (slug: string): PublicCity | null =>
    cities.value.find((c) => c.city_slug === slug) ?? null

  return {
    cities,
    citySlugSet,
    isCitySlug,
    findCity,
    fetchCatalog,
  }
}
