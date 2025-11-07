export default defineNuxtRouteMiddleware((to, from) => {
  // This middleware ensures only admin users can access admin pages
  
  // For now, we'll implement a basic check
  // In a real implementation, this would check against the warolabs backend
  // to verify the user's role through the session
  
  const isAdmin = true // Placeholder - would be fetched from auth state
  
  if (!isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Acceso denegado: Solo administradores pueden acceder a esta página'
    })
  }
})