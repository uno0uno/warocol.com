/**
 * useFaviconBadge
 * Dynamically draws a number badge on the browser tab favicon using Canvas API.
 * Uses useHead() + a reactive ref so Nuxt does NOT revert the data URL on re-renders.
 * Source image: /favicon.png (48x48 PNG — Firefox cannot load .ico onto canvas).
 */
import { ref } from 'vue'

export function useFaviconBadge() {
  const FAVICON_PNG = '/favicon.png'
  const FAVICON_ICO = '/favicon.ico'

  // Reactive ref — Nuxt's useHead watches this and updates <link rel="icon"> itself
  const faviconHref = ref(FAVICON_ICO)
  useHead({ link: [{ rel: 'icon', type: 'image/x-icon', href: faviconHref }] })

  // ── Helpers ──────────────────────────────────────────────────────────────

  function drawBadge(ctx: CanvasRenderingContext2D, count: number) {
    if (count <= 0) return
    // Red circle in top-right corner
    ctx.beginPath()
    ctx.arc(24, 8, 9, 0, 2 * Math.PI)
    ctx.fillStyle = '#E8392A'
    ctx.fill()
    // White count number
    ctx.fillStyle = 'white'
    ctx.font = 'bold 11px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(count > 9 ? '9+' : String(count), 24, 8)
  }

  function applyCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, count: number) {
    drawBadge(ctx, count)
    faviconHref.value = canvas.toDataURL('image/png')
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function set(count: number) {
    if (!process.client) return

    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = FAVICON_PNG

    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32)
      applyCanvas(ctx, canvas, count)
    }

    img.onerror = () => {
      // favicon.png not found — draw badge on WARO brand-orange circle as fallback
      ctx.beginPath()
      ctx.arc(16, 16, 16, 0, 2 * Math.PI)
      ctx.fillStyle = '#E87020'
      ctx.fill()
      applyCanvas(ctx, canvas, count)
    }
  }

  function clear() {
    if (!process.client) return
    faviconHref.value = FAVICON_ICO
  }

  return { set, clear }
}
