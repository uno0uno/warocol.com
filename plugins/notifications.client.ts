/**
 * Global notification plugin
 * Initialises the SSE notification connection once for any authenticated user,
 * regardless of which layout is active. Works across dashboard, admin, bogota,
 * and supplier-portal layouts without requiring each layout to call initNotifications().
 */
import { watch } from 'vue'

export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  const { init, disconnect } = useNotifications()

  // Start the SSE connection as soon as the user has a valid session
  if (authStore.isSessionValid) {
    init()
  }

  // React to auth state changes (login / logout / session expiry)
  watch(
    () => authStore.isSessionValid,
    (isValid, wasValid) => {
      if (isValid && !wasValid) {
        init()
      } else if (!isValid && wasValid) {
        disconnect()
      }
    }
  )
})
