import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    isDarkMode: true,
    isInitialized: false
  }),

  getters: {
    currentTheme: (state) => state.isDarkMode ? 'dark' : 'light',
    themeClass: (state) => state.isDarkMode ? 'dark' : 'light'
  },

  actions: {
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode
      this.applyTheme()
      this.persistTheme()
    },

    setTheme(isDark) {
      this.isDarkMode = isDark
      this.applyTheme()
      this.persistTheme()
    },

    applyTheme() {
      if (process.client) {
        const documentElement = document.documentElement
        
        // Remove both classes first
        documentElement.classList.remove('dark', 'light')
        
        // Add the current theme class
        if (this.isDarkMode) {
          documentElement.classList.add('dark')
        } else {
          documentElement.classList.add('light')
        }
      }
    },

    persistTheme() {
      if (process.client) {
        localStorage.setItem('theme', this.currentTheme)
      }
    },

    initializeTheme() {
      if (process.client && !this.isInitialized) {
        const savedTheme = localStorage.getItem('theme')
        
        if (savedTheme) {
          this.isDarkMode = savedTheme === 'dark'
        } else {
          // Use system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          this.isDarkMode = prefersDark
        }
        
        this.isInitialized = true
        this.applyTheme()
      }
    },

    watchSystemTheme() {
      if (process.client && !localStorage.getItem('theme')) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        
        const handleChange = (e) => {
          if (!localStorage.getItem('theme')) {
            this.setTheme(e.matches)
          }
        }
        
        mediaQuery.addEventListener('change', handleChange)
        
        return () => mediaQuery.removeEventListener('change', handleChange)
      }
    }
  }
})