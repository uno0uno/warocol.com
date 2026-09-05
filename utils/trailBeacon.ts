export const TRAIL_SITE_KEY = 'warocol.com'
export const TRAIL_EVENTS_URL = '/api/public/trail/events'
export const TRAIL_SCROLL_THRESHOLDS = [25, 50, 75, 100] as const

export type TrailEventType = 'page_view' | 'scroll_depth' | 'page_leave' | 'cta_click'

export type TrailEventPayload = {
  visitor_key: string
  path: string
  site_key?: string
  event_type?: TrailEventType
  scroll_pct?: number
  dwell_ms?: number
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

/** Fire-and-forget CTA click. Placement rides in utm_content (stored column, SQL-queryable). */
export function fireCtaClick(visitorKey: string | null, path: string, placement: string): void {
  if (typeof window === 'undefined') return
  if (!visitorKey || !path || !placement) return
  sendTrailEvent({
    visitor_key: visitorKey,
    path,
    event_type: 'cta_click',
    utm_content: placement,
  })
}

export function sendTrailEvent(payload: TrailEventPayload): void {
  const body = JSON.stringify({
    site_key: TRAIL_SITE_KEY,
    ...payload,
  })
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        TRAIL_EVENTS_URL,
        new Blob([body], { type: 'application/json' }),
      )
      return
    }
  } catch {
    // fall through to fetch
  }
  fetch(TRAIL_EVENTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

/** Article-body progress vs viewport, not window/document chrome. */
export function articleScrollPct(el: HTMLElement): number {
  const height = el.offsetHeight
  if (height <= 0) return 0
  const top = el.getBoundingClientRect().top + window.scrollY
  const viewportBottom = window.scrollY + window.innerHeight
  return Math.min(100, Math.max(0, Math.round(((viewportBottom - top) / height) * 100)))
}
