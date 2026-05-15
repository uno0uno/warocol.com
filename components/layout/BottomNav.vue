<template>
  <nav aria-label="Navegación móvil" class="md:hidden fixed bottom-0 left-0 right-0 z-[50] bg-white/95 backdrop-blur-sm border-t border-titan-200 shadow-[0_-1px_4px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
    <div class="flex items-stretch h-[58px]">

      <!-- Inicio -->
      <NuxtLink to="/" class="nav-item" :class="route.path === '/' ? 'active' : 'inactive'">
        <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
        </svg>
        <span>Inicio</span>
      </NuxtLink>

      <!-- Ciudades (warocol.com#619) — replaces the hardcoded /bogota entry.
           Active on /ciudades AND on any /<city_slug> directory page. -->
      <NuxtLink to="/ciudades" class="nav-item" :class="isCitiesActive ? 'active' : 'inactive'">
        <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Ciudades</span>
      </NuxtLink>

      <!-- Blog -->
      <NuxtLink to="/blog" class="nav-item" :class="route.path.startsWith('/blog') ? 'active' : 'inactive'">
        <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <span>Blog</span>
      </NuxtLink>

      <!-- Docs — en docs pages abre el sheet, fuera navega -->
      <button v-if="isOnDocs" class="nav-item" :class="'active'" @click="showDocsNav = true">
        <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <span>Índice</span>
      </button>
      <NuxtLink v-else to="/docs" class="nav-item inactive">
        <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span>Docs</span>
      </NuxtLink>

      <!-- Ingresar / Mi Panel -->
      <NuxtLink
        :to="authStore.isSessionValid ? '/ventas' : '/auth/login'"
        class="nav-item"
        :class="(route.path.startsWith('/ventas') || route.path.startsWith('/auth')) ? 'active' : 'inactive'"
      >
        <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>{{ authStore.isSessionValid ? 'Mi Panel' : 'Ingresar' }}</span>
      </NuxtLink>

    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useDocsNav } from '~/composables/useDocsNav'
import { useCityCatalog } from '~/composables/useCityCatalog'

const route = useRoute()
const authStore = useAuthStore()
const { showDocsNav } = useDocsNav()
const { isCityRoute } = useCityCatalog()

const isOnDocs = computed(() => route.path.startsWith('/docs'))
// "Ciudades" item highlights on the hub and on every city directory page.
const isCitiesActive = computed(
  () => route.path === '/ciudades' || isCityRoute(route.path),
)
</script>

<style scoped>
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  text-decoration: none;
  transition: color 0.15s;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.nav-item span {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.active { color: hsl(var(--crocus-600)); }
.inactive { color: hsl(var(--ebony-400)); }
.inactive:hover { color: hsl(var(--ebony-700)); }
</style>
