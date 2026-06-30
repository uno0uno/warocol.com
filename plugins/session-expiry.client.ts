type WaroFetch = typeof globalThis.$fetch & {
  __waroSessionExpiryWrapped?: boolean
}

export default defineNuxtPlugin(() => {
  const originalFetch = globalThis.$fetch as WaroFetch

  if (!originalFetch || originalFetch.__waroSessionExpiryWrapped) return

  const wrappedFetch = (async (request: any, options?: any) => {
    try {
      return await originalFetch(request, options)
    } catch (err) {
      await useSessionExpiry().handleSessionExpiry(err)
      throw err
    }
  }) as WaroFetch

  Object.assign(wrappedFetch, originalFetch)
  wrappedFetch.__waroSessionExpiryWrapped = true

  if (typeof originalFetch.raw === 'function') {
    wrappedFetch.raw = (async (request: any, options?: any) => {
      try {
        return await originalFetch.raw(request, options)
      } catch (err) {
        await useSessionExpiry().handleSessionExpiry(err)
        throw err
      }
    }) as typeof originalFetch.raw
  }

  globalThis.$fetch = wrappedFetch
})
