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
  department?: string | null
  department_name?: string | null
}

export function useCityCatalog() {
  const cities = useState<PublicCity[]>('city-catalog', () => [])
  const isLoading = useState<boolean>('city-catalog-loading', () => false)
  const error = useState<string | null>('city-catalog-error', () => null)
  const hasLoaded = useState<boolean>('city-catalog-loaded', () => false)

  const fetchCatalog = async (opts?: { includeEmpty?: boolean }): Promise<void> => {
    // Skip when already hydrated from SSR. The catalog is small (~10 rows)
    // and changes rarely, so a per-request fetch is enough.
    if (cities.value.length > 0) {
      error.value = null
      hasLoaded.value = true
      return
    }
    isLoading.value = true
    error.value = null
    try {
      // Endpoint lives under the public_restaurant router (prefix
      // /public/restaurant), so the canonical path is
      // /public/restaurant/cities — NOT /public/cities. The /public/* path
      // hits the tenant-detection middleware and returns 404. See
      // api-warolabs/app/main.py:196 for the router registration.
      const res = await $fetch<{ success: boolean; data: PublicCity[] }>(
        '/api/public/restaurant/cities',
        { params: { include_empty: opts?.includeEmpty ? 'true' : 'false' } },
      )
      cities.value = res?.data ?? []
      hasLoaded.value = true
    } catch (err) {
      // Silent fail — UI fallback is "no cities" which renders an empty
      // discovery section and falls back to free-text on the selector.
      cities.value = []
      hasLoaded.value = true
      error.value = err instanceof Error ? err.message : 'No se pudo cargar el catálogo de ciudades.'
    } finally {
      isLoading.value = false
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

  // Prefixes that are NOT cities but live at the same path level. Listed
  // here so the route-aware helpers below short-circuit before doing a
  // catalog lookup. Keep alphabetised. Add new top-level literal routes
  // here as they are added to pages/.
  const NON_CITY_PREFIXES = new Set([
    '',          // root
    'admin',
    'analitica',
    'api',
    'auth',
    'blog',
    'ciudades',
    'cocina',
    'comandas',
    'docs',
    'equipo',
    'facturacion',
    'finanzas',
    'inventario',
    'menu',
    'mis-pedidos',
    'negocio',
    'operaciones',
    'pagos',
    'pos',
    'ventas',
  ])

  /**
   * First path segment, lowercased. `/bogota/foo` → `bogota`. Empty for `/`.
   * Used internally by `isCityRoute` and `cityFromRoute` to peel off the
   * candidate slug before catalog lookup.
   */
  const firstSegment = (path: string): string => {
    const trimmed = path.startsWith('/') ? path.slice(1) : path
    return trimmed.split('/')[0].toLowerCase()
  }

  /**
   * True when the route is a city directory (warocol.com#619).
   * Used by the Header desktop nav and the BottomNav mobile bar to
   * highlight the "Ciudades" link on both `/ciudades` and `/<city_slug>`.
   * Falls back to false for any known non-city top-level prefix.
   */
  const isCityRoute = (path: string): boolean => {
    const seg = firstSegment(path)
    if (NON_CITY_PREFIXES.has(seg)) return false
    return isCitySlug(seg)
  }

  /**
   * Resolve the catalog entry for the current route's city, or null when
   * the route is not a city directory. Used by the Header badge so it
   * shows "Bogotá" on `/bogota`, "Medellín" on `/medellin`, and nothing
   * on tenant URLs like `/sandwichito-monroy`.
   */
  const cityFromRoute = (path: string): PublicCity | null => {
    const seg = firstSegment(path)
    if (NON_CITY_PREFIXES.has(seg)) return null
    return findCity(seg)
  }

  return {
    cities,
    citySlugSet,
    isCitySlug,
    findCity,
    isCityRoute,
    cityFromRoute,
    fetchCatalog,
    isLoading,
    error,
    hasLoaded,
  }
}
