<template>
  <header
    class="relative z-10 flex items-center py-2 sm:py-3 backdrop-blur-md border-b transition-colors duration-300"
    :class="isDarkHeader
      ? 'bg-crocus-900 border-crocus-800'
      : 'bg-white/95 border-titan-200'"
  >
    <div
      class="flex justify-between items-center w-full max-w-7xl mx-auto px-4 gap-3 sm:gap-4 transition-all duration-300"
    >
      <!-- Logo -->
      <NuxtLink to="/" class="flex-shrink-0">
        <img
          src="/logo_waro_10_octubre.png"
          alt="Waro"
          class="h-6 sm:h-8 md:h-9 w-auto object-contain transition-all duration-300"
          :class="isDarkHeader ? 'brightness-0 invert' : ''"
        >
      </NuxtLink>

      <!-- Navigation - Always visible -->
      <nav class="flex items-center gap-3 sm:gap-4 md:gap-5">
        <NuxtLink
          to="/blog"
          class="text-xs sm:text-sm font-medium tracking-wide transition-colors whitespace-nowrap"
          :class="isDarkHeader
            ? 'text-white hover:text-crocus-200'
            : 'text-ebony-600 hover:text-crocus-600'"
        >
          Blog
        </NuxtLink>

        <NuxtLink
          to="/bogota"
          class="text-xs sm:text-sm font-medium tracking-wide transition-colors whitespace-nowrap"
          :class="isDarkHeader
            ? 'text-white hover:text-crocus-200'
            : 'text-ebony-600 hover:text-crocus-600'"
        >
          Bogotá
        </NuxtLink>

        <NuxtLink
          :to="authStore.isSessionValid ? '/ventas' : '/auth/login'"
          class="text-xs sm:text-sm font-medium tracking-wide transition-colors whitespace-nowrap"
          :class="isDarkHeader
            ? 'text-white hover:text-crocus-200'
            : 'text-ebony-600 hover:text-crocus-600'"
        >
          {{ authStore.isSessionValid ? 'Mi Panel' : 'Ingresar' }}
        </NuxtLink>

        <button
          class="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm font-semibold rounded-md border-2 transition-all whitespace-nowrap"
          :class="isDarkHeader
            ? 'bg-transparent border-white text-white hover:bg-white hover:text-crocus-900'
            : 'bg-white border-crocus-600 text-crocus-600 hover:bg-crocus-600 hover:text-white'"
        >
          Comenzar
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const isDarkHeader = computed(() => {
  return route.path.startsWith('/blog')
})
</script>
