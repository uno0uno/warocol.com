/**
 * useFaviconBadge
 * Dynamically draws a number badge on the browser tab favicon using Canvas API.
 * Uses /favicon.png as the canvas source (Firefox cannot load .ico onto canvas).
 */
export function useFaviconBadge() {
  const FAVICON_SRC = '/favicon.png'
  const FAVICON_ORIGINAL = '/favicon.ico'

  function set(count: number) {
    if (!process.client) return

    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = FAVICON_SRC
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32)

      if (count > 0) {
        // Red badge circle in top-right corner
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

      const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
      if (link) link.href = canvas.toDataURL('image/png')
    }

    img.onerror = () => {
      // favicon.png not found — skip badge, don't crash
    }
  }

  function clear() {
    if (!process.client) return
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (link) link.href = FAVICON_ORIGINAL
  }

  return { set, clear }
}
