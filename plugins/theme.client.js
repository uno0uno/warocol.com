import { useThemeStore } from '~/stores/theme'

export default defineNuxtPlugin(() => {
  const themeStore = useThemeStore()
  
  // Initialize theme on client side
  themeStore.initializeTheme()
  
  // Watch for system theme changes if no saved preference
  themeStore.watchSystemTheme()
})