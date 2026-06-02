/**
 * Invoice OCR proxy with extended timeout (Gemini can exceed default ~120s CDN/proxy limits).
 * Replaces the generic /api/** routeRule proxy for this path only.
 */
const OCR_PROXY_TIMEOUT_MS = 240_000 // 4 min (2× prior ~120s client/CDN cutoff)

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const base = String(config.public.warolabsApiUrl || 'https://api.warolabs.com').replace(/\/$/, '')
  const target = `${base}/suppliers/purchases/extract-invoice`

  return proxyRequest(event, target, {
    timeout: OCR_PROXY_TIMEOUT_MS,
  })
})
