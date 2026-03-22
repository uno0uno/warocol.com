export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()

  // If not authenticated at all, redirect to login
  if (!authStore.isSessionValid) {
    return navigateTo('/auth/login')
  }

  // Only superusers can access admin routes
  const role = authStore.displayUser?.role || authStore.session?.user?.role
  if (role !== 'superuser') {
    return navigateTo('/ventas')
  }
})