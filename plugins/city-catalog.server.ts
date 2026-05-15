/**
 * Server-side plugin (warocol.com#615) — prefetches the public city catalog
 * once per SSR request so any consumer (the `/[tenant]/` dispatch, the root
 * landing discovery section, `/negocio` selectors) can decide synchronously
 * without an extra round-trip.
 *
 * The catalog is small (~10 entries) and changes rarely. Fetching on every
 * SSR is acceptable; the result is cached in `useState('city-catalog')` and
 * shipped to the client as part of the Nuxt payload — no re-fetch on mount.
 *
 * If the fetch fails (backend unreachable), the catalog stays empty. The
 * dispatch then treats every single-segment slug as a tenant, which is the
 * pre-#615 behaviour — graceful degradation.
 */
export default defineNuxtPlugin(async () => {
  const { fetchCatalog } = useCityCatalog()
  // includeEmpty: true so the catalog can also feed the operator selector on
  // /negocio without a second request. The discovery section on / filters
  // the empty ones out client-side.
  await fetchCatalog({ includeEmpty: true })
})
