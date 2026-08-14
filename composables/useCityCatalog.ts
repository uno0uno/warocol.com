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
  country_code?: string | null
  city: string
  city_slug: string
  tenant_count: number
  department?: string | null
  department_name?: string | null
}

/** Negocio countries with a catalog picker (warocol.com#2308). SSR dispatch stays CO-only. */
export const CURATED_CITY_COUNTRY_CODES = new Set([
  'CO', 'PA', 'CL', 'US', 'CA', 'DO', 'UY', 'AU', 'NZ', 'SG', 'AE',
  'AR', 'MX', 'PE', 'CR', 'BR', 'ES', 'GB', 'DE', 'FR', 'NL', 'IN', 'CN',
])

export function hasCuratedCityCatalog(countryCode?: string | null): boolean {
  const code = String(countryCode || 'CO').trim().toUpperCase() || 'CO'
  return CURATED_CITY_COUNTRY_CODES.has(code)
}

/** Common misspellings / spoken variants → catalog slug (warocol.com#1740). */
export const CITY_SEARCH_ALIASES: Record<string, string> = {
  aguasul: 'aguazul',
}

export function normalizeCitySearch(value: string | null | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase('es-CO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function cityDepartmentLabel(city: PublicCity): string | null {
  return city.department_name || city.department || null
}

export function citySearchHaystack(city: PublicCity): string {
  return normalizeCitySearch([
    city.city,
    city.city_slug,
    cityDepartmentLabel(city),
  ].filter(Boolean).join(' '))
}

export function filterCityCatalog(
  cities: PublicCity[],
  query: string,
  limit = 20,
): PublicCity[] {
  const normalized = normalizeCitySearch(query)
  if (!normalized) return cities.slice(0, limit)

  const aliasSlug = CITY_SEARCH_ALIASES[normalized]
  if (aliasSlug) {
    const aliased = cities.find((city) => city.city_slug === aliasSlug)
    if (aliased) return [aliased]
  }

  const startsWithMatches: PublicCity[] = []
  const includesMatches: PublicCity[] = []

  for (const city of cities) {
    const cityName = normalizeCitySearch(city.city)
    const haystack = citySearchHaystack(city)
    if (cityName.startsWith(normalized)) {
      startsWithMatches.push(city)
    } else if (haystack.includes(normalized)) {
      includesMatches.push(city)
    }
    if (startsWithMatches.length + includesMatches.length >= limit) break
  }

  return [...startsWithMatches, ...includesMatches].slice(0, limit)
}

export function resolveCityFromSearchTerm(
  cities: PublicCity[],
  term: string,
): PublicCity | null {
  const normalized = normalizeCitySearch(term)
  if (!normalized) return null

  const aliasSlug = CITY_SEARCH_ALIASES[normalized]
  if (aliasSlug) {
    return cities.find((city) => city.city_slug === aliasSlug) ?? null
  }

  const exactMatches = cities.filter((city) => normalizeCitySearch(city.city) === normalized)
  if (exactMatches.length === 1) return exactMatches[0]

  const filtered = filterCityCatalog(cities, term, 5)
  if (filtered.length === 1) {
    const only = filtered[0]
    const onlyName = normalizeCitySearch(only.city)
    if (onlyName === normalized || onlyName.startsWith(normalized)) return only
  }

  return null
}

export function formatApiValidationError(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string }
    if (typeof first?.msg === 'string') return first.msg
  }
  return fallback
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

  const extraCities = useState<PublicCity[]>('city-catalog-extra', () => [])
  const extraCountry = useState<string>('city-catalog-extra-cc', () => '')
  const extraLoading = useState<boolean>('city-catalog-extra-loading', () => false)
  const extraError = useState<string | null>('city-catalog-extra-error', () => null)
  const extraLoaded = useState<boolean>('city-catalog-extra-loaded', () => false)

  const fetchCatalogForCountry = async (
    countryCode: string,
    opts?: { includeEmpty?: boolean },
  ): Promise<void> => {
    const cc = String(countryCode || 'CO').trim().toUpperCase() || 'CO'
    if (cc === 'CO') {
      await fetchCatalog(opts)
      return
    }
    if (extraCountry.value === cc && extraCities.value.length > 0) {
      extraError.value = null
      extraLoaded.value = true
      return
    }
    extraCountry.value = cc
    extraLoading.value = true
    extraError.value = null
    extraLoaded.value = false
    extraCities.value = []
    try {
      const res = await $fetch<{ success: boolean; data: PublicCity[] }>(
        '/api/public/restaurant/cities',
        {
          params: {
            include_empty: opts?.includeEmpty ? 'true' : 'false',
            country_code: cc,
          },
        },
      )
      extraCities.value = res?.data ?? []
      extraLoaded.value = true
    } catch (err) {
      extraCities.value = []
      extraLoaded.value = true
      extraError.value = err instanceof Error ? err.message : 'No se pudo cargar el catálogo de ciudades.'
    } finally {
      extraLoading.value = false
    }
  }

  return {
    cities,
    citySlugSet,
    isCitySlug,
    findCity,
    isCityRoute,
    cityFromRoute,
    fetchCatalog,
    fetchCatalogForCountry,
    extraCities,
    extraLoading,
    extraError,
    extraLoaded,
    isLoading,
    error,
    hasLoaded,
  }
}
