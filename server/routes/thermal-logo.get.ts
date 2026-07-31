/**
 * Same-origin image proxy for ESC/POS logo raster (#1965 follow-up).
 * Avoids canvas CORS when receipt logos are on S3/CDN without ACAO.
 * GET /thermal-logo?url=https%3A%2F%2F...
 */
export default defineEventHandler(async (event) => {
  const raw = String(getQuery(event).url || '').trim()
  if (!raw) {
    throw createError({ statusCode: 400, message: 'url is required' })
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, message: 'invalid url' })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw createError({ statusCode: 400, message: 'only http(s) urls allowed' })
  }

  let upstream: Response
  try {
    upstream = await fetch(parsed.toString(), {
      redirect: 'follow',
      headers: { Accept: 'image/*,*/*;q=0.8' },
    })
  } catch {
    throw createError({ statusCode: 502, message: 'logo fetch failed' })
  }

  if (!upstream.ok) {
    throw createError({ statusCode: 502, message: `logo upstream ${upstream.status}` })
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
  if (!contentType.startsWith('image/')) {
    throw createError({ statusCode: 415, message: 'upstream is not an image' })
  }

  const buf = Buffer.from(await upstream.arrayBuffer())
  // Cap ~1.5MB — thermal logos are small
  if (buf.length > 1_500_000) {
    throw createError({ statusCode: 413, message: 'logo too large' })
  }

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'private, max-age=300')
  return buf
})
