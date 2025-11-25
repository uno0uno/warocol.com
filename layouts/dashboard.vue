<template>
  <div class="h-screen flex flex-col md:flex-row overflow-hidden">
    <!-- Dashboard Sidebar - Desktop Only -->
    <DashboardSidebar :active-page="activePage" class="hidden md:flex" />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 h-screen md:h-auto">
      <!-- Main Content Header -->
      <header class="bg-surface border-b border-border px-6 py-4 md:px-8 md:py-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-[26px] md:text-3xl font-bold text-text-primary">{{ pageTitle }}</h1>
            <p class="text-xs sm:text-sm text-muted-foreground mt-1">{{ currentDateTime }}</p>
          </div>
          <div v-if="backButton || refreshHandler" class="hidden md:flex md:gap-3">
            <!-- Refresh Button (Desktop only) -->
            <button v-if="refreshHandler" @click="refreshHandler"
              class="w-11 h-11 flex items-center justify-center bg-surface-secondary border-0 rounded-lg text-primary transition-all focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refrescar orden">
              <svg class="w-5 h-5 transition-transform hover:rotate-180 duration-300" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                </path>
              </svg>
            </button>
            <!-- Back Button -->
            <button v-if="backButton" @click="goBack" class="btn-secondary px-4 py-2 rounded-lg text-sm font-semibold">
              {{ backButton.label }}
            </button>
          </div>
        </div>
      </header>

      <!-- Content Area with Overflow -->
      <div class="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div class="p-4 sm:p-6 md:p-8">
          <!-- Breadcrumb (if provided) -->
          <nav v-if="showBreadcrumb" class="flex mb-6" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 md:space-x-3">
              <li class="inline-flex items-center">
                <NuxtLink to="/financiero"
                  class="text-sm font-medium text-titan-600 hover:text-crocus-600 transition-colors">
                  Financiero
                </NuxtLink>
              </li>
              <li v-if="breadcrumbPage">
                <div class="flex items-center">
                  <ChevronRightIcon class="w-4 h-4 text-titan-400" />
                  <span class="ml-1 text-sm font-medium text-ebony-800">{{ breadcrumbPage }}</span>
                </div>
              </li>
            </ol>
          </nav>

          <!-- Page Content with Animation -->
          <Transition name="page-transition" mode="out-in">
            <slot />
          </Transition>
        </div>
      </div>
    </main>

    <!-- Bottom Navigation - Mobile Only -->
    <DashboardBottomNav :active-page="activePage" :on-refresh="refreshHandler" />

    <!-- Global Purchase Action Bar -->
    <!-- <PurchasesGlobalPurchaseActionBar /> -->
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import {
  ChevronRightIcon
} from '@heroicons/vue/24/outline'

// Get route-based configuration
const route = useRoute()
const router = useRouter()

// Go back function
const goBack = () => {
  router.back()
}

// Determine configuration based on route
const getPageConfig = () => {
  const path = route.path

  if (path === '/financiero' || path === '/dashboard') {
    return {
      pageTitle: 'Dashboard',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar métricas financieras...',
      activePage: 'financiero' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/financiero/tir') {
    return {
      pageTitle: 'Análisis TIR',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar métricas TIR...',
      activePage: 'financiero' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/financiero/analisis') {
    return {
      pageTitle: 'Análisis de Productos',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar productos...',
      activePage: 'financiero' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/financiero/obstaculos') {
    return {
      pageTitle: 'Obstáculos del TIR',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar obstáculos...',
      activePage: 'financiero' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento' || path === '/abastecimiento/') {
    return {
      pageTitle: 'Dashboard - Abastecimiento',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar en abastecimiento...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento/proveedores') {
    return {
      pageTitle: 'Gestión de Proveedores',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar proveedores...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento/precios') {
    return {
      pageTitle: 'Lista de Precios',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar precios...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento/compras') {
    return {
      pageTitle: 'Órdenes de Compra',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar órdenes...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.includes('/abastecimiento/compra/') && path.includes('/acciones')) {
    return {
      pageTitle: 'Acciones de la Orden',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path.includes('/abastecimiento/compra/') && path.includes('/transicion')) {
    // Transition pages open in new window, no back button needed
    return {
      pageTitle: 'Historial de Cambios',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento/compra/crear') {
    return {
      pageTitle: 'Crear Nueva Orden de Compra',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/abastecimiento/proveedor/crear') {
    return {
      pageTitle: 'Crear Proveedor',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path.startsWith('/abastecimiento/proveedor/') && path !== '/abastecimiento/proveedor/crear') {
    return {
      pageTitle: 'Editar Proveedor',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path.startsWith('/abastecimiento/compra/')) {
    return {
      pageTitle: 'Editar Orden de Compra',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/pagos/registrar') {
    return {
      pageTitle: 'Registrar Pago',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'pagos' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/pagos' || path === '/pagos/') {
    return {
      pageTitle: 'Gestión de Pagos',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar pagos...',
      activePage: 'pagos' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/equipo') {
    return {
      pageTitle: 'Miembros de equipo',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'dashboard' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.includes('/analytics')) {
    return {
      pageTitle: 'Dashboard - Analytics',
      pageSubtitle: 'Análisis avanzado de datos y métricas',
      searchPlaceholder: 'Buscar métricas...',
      activePage: 'analytics' as const,
      showBreadcrumb: true,
      breadcrumbPage: 'Analytics',
      backButton: undefined
    }
  } else if (path.includes('/reportes')) {
    return {
      pageTitle: 'Dashboard - Reportes',
      pageSubtitle: 'Generación y gestión de reportes',
      searchPlaceholder: 'Buscar reportes...',
      activePage: 'reportes' as const,
      showBreadcrumb: true,
      breadcrumbPage: 'Reportes',
      backButton: undefined
    }
  } else if (path.includes('/configuracion')) {
    return {
      pageTitle: 'Dashboard - Configuración',
      pageSubtitle: 'Configuración del sistema',
      searchPlaceholder: 'Buscar configuración...',
      activePage: 'configuracion' as const,
      showBreadcrumb: true,
      breadcrumbPage: 'Configuración',
      backButton: undefined
    }
  } else if (path.includes('/admin')) {
    return {
      pageTitle: 'Admin',
      pageSubtitle: 'Panel de administración del sistema',
      searchPlaceholder: 'Buscar en administración...',
      activePage: 'admin' as const,
      showBreadcrumb: true,
      breadcrumbPage: 'Administración',
      backButton: undefined
    }
  }

  return {
    pageTitle: 'Dashboard',
    pageSubtitle: undefined,
    searchPlaceholder: 'Buscar...',
    activePage: 'dashboard' as const,
    showBreadcrumb: false,
    breadcrumbPage: undefined,
    backButton: undefined
  }
}

const config = computed(() => getPageConfig())
const pageTitle = computed(() => config.value.pageTitle)
const pageSubtitle = computed(() => config.value.pageSubtitle)
const searchPlaceholder = computed(() => config.value.searchPlaceholder)
const activePage = computed(() => config.value.activePage)
const showBreadcrumb = computed(() => config.value.showBreadcrumb)
const breadcrumbPage = computed(() => config.value.breadcrumbPage)
const backButton = computed(() => config.value.backButton)

// Date and time functionality
const currentDateTime = ref('')

const updateDateTime = () => {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota'
  }
  currentDateTime.value = now.toLocaleDateString('es-CO', options)
}

// Update time immediately and then every minute
onMounted(() => {
  updateDateTime()
  setInterval(updateDateTime, 60000) // Update every minute
})

// Refresh handler - will be injected by pages that need it
const refreshHandler = ref<(() => void | Promise<void>) | undefined>(undefined)

// Provide refresh setter for child pages
provide('setRefreshHandler', (handler: (() => void | Promise<void>) | undefined) => {
  refreshHandler.value = handler
})

// Meta tags for dashboard
useHead({
  titleTemplate: '%s - Warocol Dashboard',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }, // Dashboard pages shouldn't be indexed
  ]
})
</script>

<style scoped>
/* Page transition animations */
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

/* Smooth sidebar navigation animation */
.sidebar-nav {
  transition: all 0.2s ease-in-out;
}

/* Content fade-in animation for better UX */
@keyframes contentFadeIn {
  from {
    opacity: 0;
    transform: translateY(-15px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-container {
  animation: contentFadeIn 0.5s ease-out;
}
</style>

<style scoped>
/* Custom scrollbar for main content */
main::-webkit-scrollbar {
  width: 8px;
}

main::-webkit-scrollbar-track {
  background: hsl(var(--titan-100));
}

main::-webkit-scrollbar-thumb {
  background: hsl(var(--titan-300));
  border-radius: 4px;
}

main::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--titan-400));
}
</style>