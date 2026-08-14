export default defineNuxtPlugin(() => {
  const router = useRouter()
  const visitorKey = ensureVisitorKey()

  router.afterEach((to) => {
    if (!shouldTrack(to.path)) return
    const query = to.query
    const payload = {
      visitor_key: visitorKey,
      site_key: 'warocol.com',
      path: to.path,
      referrer: document.referrer || undefined,
      utm_source: firstQuery(query.utm_source),
      utm_medium: firstQuery(query.utm_medium),
      utm_campaign: firstQuery(query.utm_campaign),
      utm_term: firstQuery(query.utm_term),
      utm_content: firstQuery(query.utm_content),
    }
    const body = JSON.stringify(payload)
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/public/trail/events',
          new Blob([body], { type: 'application/json' }),
        )
        return
      }
    } catch {
      // fall through to fetch
    }
    fetch('/api/public/trail/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  })
})

function shouldTrack(path: string): boolean {
  if (path === '/' || path.startsWith('/blog')) return true
  return false
}

function firstQuery(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined
  return typeof value === 'string' && value.trim() ? value : undefined
}

function ensureVisitorKey(): string {
  const cookie = useCookie('waro_visitor_key', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  })
  if (!cookie.value) {
    cookie.value = crypto.randomUUID()
  }
  return cookie.value
}
