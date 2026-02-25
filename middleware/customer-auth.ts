export default defineNuxtRouteMiddleware(async (to) => {
  // useRequestFetch() forwards cookies automatically:
  // - On SSR: clones the incoming request's Cookie header
  // - On client: browser attaches waro_customer_session automatically
  const apiFetch = useRequestFetch()
  try {
    await apiFetch('/api/customer/me')
  } catch {
    return navigateTo('/auth/customer-verify?redirect=' + encodeURIComponent(to.fullPath))
  }
})
