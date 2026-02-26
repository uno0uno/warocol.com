/**
 * useOrderNotification
 * Orchestrates order status notifications:
 * - Sound (chime via Web Audio API oscillator — no MP3 file required)
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
      // Web Audio API oscillator — no file needed
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)         // A5
      oscillator.frequency.setValueAtTime(1108, ctx.currentTime + 0.15) // C#6
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.6)
      oscillator.onended = () => ctx.close()
    }
    catch {
      // Autoplay blocked or API not available — fail silently
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
