export default defineNuxtPlugin(() => {
  if (!import.meta.dev) return

  const suspenseMessage = '<Suspense> is an experimental feature'
  const originalInfo = console.info

  console.info = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes(suspenseMessage)) return
    originalInfo(...args)
  }
})
