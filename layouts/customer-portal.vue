<template>
  <div class="h-screen flex flex-col lg:flex-row overflow-hidden">

    <!-- Sidebar - Desktop Only -->
    <UiBaseSidebar class="hidden lg:flex">
      <!-- No tenant selector slot -->

      <!-- Navigation: single item -->
      <template #navigation="{ collapsed }">
        <div class="space-y-1">
          <span v-if="!collapsed" class="px-3 text-[10px] text-titan-500/70 uppercase tracking-widest font-medium">
            Mi cuenta
          </span>
          <NuxtLink
            to="/mis-pedidos"
            :class="[
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group',
              collapsed ? 'justify-center' : '',
              route.path.startsWith('/mis-pedidos')
                ? 'bg-crocus-600/20 text-crocus-400 font-medium'
                : 'text-titan-300 hover:bg-ebony-800 hover:text-white'
            ]"
            :title="collapsed ? 'Mis pedidos' : ''"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              :class="['w-5 h-5 flex-shrink-0', route.path.startsWith('/mis-pedidos') ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
            </svg>
            <span v-if="!collapsed" class="whitespace-nowrap">Mis pedidos</span>
          </NuxtLink>
        </div>

        <!-- Logout -->
        <div class="pt-4 mt-auto">
          <button
            :disabled="loggingOut"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group text-titan-400 hover:bg-red-900/20 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed',
              collapsed ? 'justify-center' : ''
            ]"
            :title="collapsed ? 'Cerrar sesión' : ''"
            @click="handleLogout"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 flex-shrink-0 text-titan-500 group-hover:text-red-400"
              fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            <span v-if="!collapsed" class="whitespace-nowrap">Cerrar sesión</span>
          </button>
        </div>
      </template>

      <!-- Customer info in footer -->
      <template #footer>
        <div class="flex items-center gap-3 p-3 rounded-lg bg-ebony-800/50">
          <div class="relative flex-shrink-0">
            <div class="w-8 h-8 bg-crocus-600 rounded-full flex items-center justify-center font-semibold text-white text-xs">
              {{ customerInitials }}
            </div>
            <span class="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-ebony-900 rounded-full"></span>
          </div>
          <div class="flex-1 min-w-0 text-left">
            <div class="text-xs text-titan-400 truncate max-w-[120px]">{{ customerEmail || '...' }}</div>
          </div>
        </div>
      </template>
    </UiBaseSidebar>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 h-screen md:h-auto">
      <!-- Header -->
      <header class="bg-surface border-b border-border px-6 py-4 md:px-8 md:py-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <!-- Back Button -->
            <button
              v-if="showBackBtn && backBtnHandler"
              @click="backBtnHandler"
              class="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
            >
              <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div>
              <h1 class="text-[26px] md:text-3xl font-bold text-text-primary">{{ displayTitle }}</h1>
              <p class="text-xs sm:text-sm text-muted-foreground mt-1">{{ currentDateTime }}</p>
            </div>
          </div>

          <div class="flex gap-2 md:gap-3">
            <!-- Refresh Button (Desktop) -->
            <button
              @click="refreshHandler ? refreshHandler() : $router.go(0)"
              class="hidden md:flex w-11 h-11 items-center justify-center bg-surface-secondary border-0 rounded-lg text-primary transition-all focus:outline-none focus:ring-2 focus:ring-ring"
              title="Refrescar"
            >
              <svg class="w-5 h-5 transition-transform hover:rotate-180 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto pb-20 lg:pb-0">
        <div class="p-4 sm:p-6 md:p-8">
          <Transition name="page-transition" mode="out-in">
            <slot />
          </Transition>
        </div>
      </div>
    </main>

    <!-- Mobile Bottom Nav -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-titan-300 shadow-lg z-50 safe-area-bottom">
      <div class="flex items-center justify-between px-4 py-2">
        <!-- Customer email -->
        <div class="flex items-center gap-3">
          <div class="relative flex-shrink-0">
            <div class="w-10 h-10 bg-crocus-600 rounded-full flex items-center justify-center font-semibold text-white text-sm">
              {{ customerInitials }}
            </div>
            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
          <span class="text-xs text-titan-500 leading-tight truncate max-w-[140px]">{{ customerEmail || '...' }}</span>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <!-- Refresh -->
          <button
            @click="refreshHandler ? refreshHandler() : $router.go(0)"
            aria-label="Actualizar página"
            class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100"
          >
            <svg class="w-5 h-5 text-titan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <!-- Logout -->
          <button
            :disabled="loggingOut"
            aria-label="Cerrar sesión"
            class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-red-50 disabled:opacity-50"
            @click="handleLogout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-titan-500 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </nav>

  </div>
</template>

<script setup lang="ts">
import { provide, ref, computed, onMounted, onUnmounted } from 'vue'

const route = useRoute()
const router = useRouter()

// Customer identity — fetched client-side only (ssr: false on pages)
const customerEmail = ref('')
const customerInitials = computed(() => {
  const email = customerEmail.value
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
})

onMounted(async () => {
  try {
    const me = await $fetch<{ customer_id: string; email: string }>('/api/customer/me')
    customerEmail.value = me.email ?? ''
  } catch {
    // customer-auth middleware will redirect if not authenticated
  }
})

// Logout
const loggingOut = ref(false)
async function handleLogout() {
  loggingOut.value = true
  try {
    await $fetch('/api/customer/logout', { method: 'POST' })
  } catch {
    // Ignore — clear session regardless
  } finally {
    loggingOut.value = false
    await router.push('/auth/customer-verify')
  }
}

// Date/time
const currentDateTime = ref('')
const updateDateTime = () => {
  const now = new Date()
  currentDateTime.value = now.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota'
  })
}
let dateTimeInterval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  updateDateTime()
  dateTimeInterval = setInterval(updateDateTime, 60000)
})
onUnmounted(() => {
  if (dateTimeInterval) clearInterval(dateTimeInterval)
})

// Page title (route-based, same pattern as dashboard)
const pageTitle = computed(() => {
  if (route.path.startsWith('/mis-pedidos/')) return 'Detalle del pedido'
  return 'Mis pedidos'
})

// Dynamic title/back button — provided so pages can override if needed
const dynamicTitle = ref<string | undefined>(undefined)
provide('setPageTitle', (title: string | undefined) => { dynamicTitle.value = title })

const dynamicBackButton = ref(false)
const dynamicBackHandler = ref<(() => void) | undefined>(undefined)
provide('setShowBackButton', (show: boolean) => { dynamicBackButton.value = show })
provide('setBackHandler', (handler: (() => void) | undefined) => { dynamicBackHandler.value = handler })

const refreshHandler = ref<(() => void | Promise<void>) | undefined>(undefined)
provide('setRefreshHandler', (handler: (() => void | Promise<void>) | undefined) => {
  refreshHandler.value = handler
})

const displayTitle = computed(() => dynamicTitle.value || pageTitle.value)
const showBackBtn = computed(() => dynamicBackButton.value)
const backBtnHandler = computed(() => dynamicBackHandler.value)

useHead({
  titleTemplate: '%s — WARO',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})
</script>

<style scoped>
.page-transition-enter-active {
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}
.page-transition-leave-active {
  transition: all 0.3s cubic-bezier(0.755, 0.05, 0.855, 0.06);
}
.page-transition-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.98);
}
.page-transition-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(1.02);
}
.page-transition-enter-to,
.page-transition-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

main::-webkit-scrollbar { width: 8px; }
main::-webkit-scrollbar-track { background: hsl(var(--titan-100)); }
main::-webkit-scrollbar-thumb { background: hsl(var(--titan-300)); border-radius: 4px; }
main::-webkit-scrollbar-thumb:hover { background: hsl(var(--titan-400)); }
</style>
