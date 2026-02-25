export default defineNuxtRouteMiddleware(async (to) => {
  const headers = useRequestHeaders(['cookie'])
  try {
    await $fetch('/api/customer/me', { headers })
  } catch {
    return navigateTo('/auth/customer-verify?redirect=' + encodeURIComponent(to.fullPath))
  }
})
