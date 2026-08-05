/**
 * Lightweight liveness probe for Docker HEALTHCHECK (#2133).
 * Must stay outside `/api/**` (Nitro proxies that prefix to the API).
 */
export default defineEventHandler(() => ({
  ok: true,
  service: 'warocol-nuxt',
}))
