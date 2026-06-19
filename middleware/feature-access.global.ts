export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return

  const skipExact = ['/', '/bogota']
  const skipPrefixes = [
    '/auth/',
    '/proveedor/',
    '/blog',
    '/docs',
    '/403',
  ]
  const skipLayouts = ['public-restaurant', 'customer-portal', 'kds']

  if (
    skipExact.includes(to.path) ||
    skipPrefixes.some((p) => to.path.startsWith(p)) ||
    skipLayouts.includes(to.meta?.layout as string) ||
    to.meta?.publicAccess === true
  ) return

  const feature = to.meta.feature
  if (!feature) return

  const accessStore = useAccessStore()
  if (!accessStore.isLoaded) {
    await accessStore.load()
  }

  if (!accessStore.hasFeature(feature)) {
    return navigateTo('/403')
  }
})
