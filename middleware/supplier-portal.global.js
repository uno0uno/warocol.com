export default defineNuxtRouteMiddleware(async (to, from) => {
  // Only run on supplier portal routes
  if (!to.path.startsWith('/proveedor/')) return

  // Extract token from route params
  const token = to.params.token
  if (!token) return

  // Get supplier from global state
  const supplier = useState('supplier-portal-supplier')

  // If supplier is already loaded for this token, skip
  if (supplier.value && supplier.value.token === token) {
    console.log('[Supplier Middleware] Using cached supplier for token:', token)
    return
  }

  console.log('[Supplier Middleware] Loading supplier for token:', token)

  try {
    // Verify token and load supplier data
    const response = await $fetch(`/api/supplier-portal/${token}/verify`)

    console.log('[Supplier Middleware] API response:', response)

    if (response.success && response.supplier) {
      // Store supplier with token for future checks
      supplier.value = {
        ...response.supplier,
        token: token
      }
      console.log('[Supplier Middleware] Supplier loaded successfully:', supplier.value.name)
    } else {
      // Invalid token - redirect to home
      console.error('[Supplier Middleware] Invalid token or no supplier data - redirecting to home')
      supplier.value = null
      return navigateTo('/')
    }
  } catch (err) {
    console.error('[Supplier Middleware] Error loading supplier:', err)
    supplier.value = null
    return navigateTo('/')
  }
})
