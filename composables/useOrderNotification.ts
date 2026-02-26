/**
 * useOrderNotification
 * Orchestrates order status notifications:
 * - Sound (mixkit-gold-coin-prize-1999.wav via HTMLAudioElement)
 * - Favicon badge (canvas badge via useFaviconBadge)
 * - Tab title change
 * Automatically resets when user focuses the tab.
 */
import { onMounted, onUnmounted } from 'vue'

export function useOrderNotification() {
  const faviconBadge = useFaviconBadge()
  const originalTitle = process.client ? document.title : 'WARO'
  let badgeCount = 0

  // ── Sound ──────────────────────────────────────────────────────────────────

  function playChime() {
    if (!process.client) return
    try {
      const chime = new Audio('/sounds/order-confirmed.wav')
      chime.volume = 0.6
      chime.play().catch(() => {}) // silently ignore autoplay block
    }
    catch {
      // Audio API not available — fail silently
    }
  }

  // ── Notify ─────────────────────────────────────────────────────────────────

  function notify(message: string = 'Tu pedido fue actualizado') {
    badgeCount++
    playChime()
    faviconBadge.set(badgeCount)
    if (process.client) {
      document.title = `(${badgeCount}) ${message} — WARO`
    }
  }

  function reset() {
    badgeCount = 0
    faviconBadge.clear()
    if (process.client) {
      document.title = originalTitle
    }
  }

  // ── Auto-reset on tab focus ─────────────────────────────────────────────────

  function handleVisibilityChange() {
    if (!document.hidden) reset()
  }

  onMounted(() => {
    if (process.client) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  })

  onUnmounted(() => {
    if (process.client) {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  })

  return { notify, reset }
}
