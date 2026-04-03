/**
 * Handles stale chunk errors after a new deployment.
 *
 * After a deploy, Vite generates new chunk hashes. Users with an open tab
 * still have HTML referencing the old hashes. When they navigate (SPA), the
 * browser requests a chunk that no longer exists → "Failed to fetch dynamically
 * imported module" → blank screen / 500.
 *
 * Fix: catch that error and force a full page reload (fetches fresh HTML +
 * new chunks). We use sessionStorage to avoid infinite reload loops in case
 * the new deploy itself is broken.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:chunkError', () => {
    const key = 'chunk_reload_attempted'
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      window.location.reload()
    }
  })
})
