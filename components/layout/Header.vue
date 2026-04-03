<template>
  <header class="sticky top-0 z-[100] bg-white/95 backdrop-blur-sm border-b border-titan-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] w-full">
    <div class="flex items-center gap-4 px-6 h-[60px] max-w-[1400px] mx-auto w-full">

      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2.5 no-underline shrink-0">
        <img :src="logo" alt="WARO" class="h-[26px] w-auto object-contain" />
        <span v-if="badgeText" class="text-[10px] font-bold tracking-[0.1em] uppercase text-crocus-600 bg-crocus-50 border border-crocus-200 py-[2px] px-2 rounded-full">{{ badgeText }}</span>
      </NuxtLink>

      <!-- Nav principal (centro) — solo desktop -->
      <nav class="hidden md:flex items-center gap-1 ml-6">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="text-[13.5px] font-medium text-ebony-500 hover:text-ebony-900 hover:bg-titan-50 px-3 py-1.5 rounded-md transition-all no-underline whitespace-nowrap"
          :class="{ 'text-crocus-600 bg-crocus-50 font-semibold': isActive(link.to) }"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- Search — solo desktop -->
      <div class="hidden md:flex ml-auto relative items-center w-full max-w-[240px]">
        <svg class="absolute left-3 w-[14px] h-[14px] text-ebony-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          class="w-full py-[7px] pl-[34px] pr-[44px] border border-titan-200 rounded-full bg-titan-50 text-[13px] text-ebony-600 outline-none cursor-default font-inherit placeholder-ebony-400 focus:border-crocus-300 transition-colors"
          placeholder="Buscar..."
          readonly
        />
        <span class="absolute right-3 text-[10px] text-ebony-400 bg-white border border-titan-200 py-[1px] px-1.5 rounded tracking-[0.02em] font-mono">⌘K</span>
      </div>

      <!-- Acciones derecha -->
      <div class="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
        <!-- Ingresar — solo desktop -->
        <NuxtLink
          :to="authStore.isSessionValid ? '/ventas' : '/auth/login'"
          class="hidden md:block text-[13px] font-semibold text-ebony-600 hover:text-crocus-600 hover:bg-titan-50 px-3 py-1.5 rounded-md transition-all no-underline whitespace-nowrap"
        >
          {{ authStore.isSessionValid ? 'Mi Panel' : 'Ingresar' }}
        </NuxtLink>

        <button
          class="text-[13px] font-bold text-white bg-crocus-600 hover:bg-crocus-700 active:scale-[0.97] py-[7px] px-4 rounded-lg cursor-pointer transition-all font-inherit whitespace-nowrap shadow-sm"
          @click="leadModal.open('comenzar')"
        >
          <span class="hidden md:inline">Comenzar gratis</span>
          <span class="md:hidden">Comenzar</span>
        </button>
      </div>

    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import logo from '~/public/logo_waro_colombia.png'

const route = useRoute()
const authStore = useAuthStore()
const leadModal = useLeadModal()

const isDocs = computed(() => route.path.startsWith('/docs'))

const badgeText = computed(() => {
  if (route.path.startsWith('/docs')) return 'Docs'
  if (route.path.startsWith('/blog')) return 'Blog'
  if (route.path.startsWith('/bogota')) return 'Bogotá'
  return null
})

const navLinks = [
  { to: '/bogota', label: 'Bogotá' },
  { to: '/blog', label: 'Blog' },
  { to: '/docs', label: 'Docs' },
]

function isActive(path: string) {
  return route.path.startsWith(path)
}
</script>
