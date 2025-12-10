<template>
  <div class="h-screen flex flex-col lg:flex-row overflow-hidden">
    <!-- Dashboard Sidebar - Desktop Only -->
    <DashboardSidebar :active-page="activePage" class="hidden lg:flex" />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 h-screen md:h-auto">
      <!-- Main Content Header -->
      <header class="bg-surface border-b border-border px-6 py-4 md:px-8 md:py-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <!-- Back Button (if dynamic back is enabled) -->
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
              <p class="text-xs sm:text-sm text-muted-foreground mt-1">{{ displaySubtitle || currentDateTime }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Header Action Button (e.g., Print) -->
            <button
              v-if="dynamicHeaderAction"
              @click="dynamicHeaderAction.handler"
              class="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <svg v-if="dynamicHeaderAction.icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {{ dynamicHeaderAction.label }}
            </button>

            <!-- Status Badge -->
            <span v-if="dynamicStatus" :class="['px-3 py-1.5 rounded-full text-sm font-medium', dynamicStatus.color]">
              {{ dynamicStatus.label }}
            </span>

            <div v-if="backButton || refreshHandler" class="flex gap-2 md:gap-3">
              <!-- Refresh Button (Desktop only) -->
              <button v-if="refreshHandler" @click="refreshHandler"
                class="hidden md:flex w-11 h-11 items-center justify-center bg-surface-secondary border-0 rounded-lg text-primary transition-all focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refrescar orden">
                <svg class="w-5 h-5 transition-transform hover:rotate-180 duration-300" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                  </path>
                </svg>
              </button>
              <!-- Back Button -->
              <button v-if="backButton" @click="goBack" class="btn-secondary px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold">
                {{ backButton.label }}
              </button>
            </div>
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
    <DashboardBottomNav
      :active-page="activePage"
      :on-refresh="refreshHandler"
      :show-cart-button="route.path === '/pos'"
      :cart-items-count="posCartItemsCount"
      @open-cart="posOpenCartModal"
    />

    <!-- Global Purchase Action Bar -->
    <!-- <PurchasesGlobalPurchaseActionBar /> -->
  </div>
</template>

<script setup lang="ts">
import { provide, inject, ref, computed, onMounted, type Ref, type ComputedRef } from 'vue'
import {
  ChevronRightIcon
} from '@heroicons/vue/24/outline'

// Get route-based configuration
const route = useRoute()
const router = useRouter()

// Go back function
const goBack = () => {
  // Special handling for POS sub-pages - always go back to POS
  if (route.path.startsWith('/pos/producto/') || route.path.startsWith('/pos/checkout')) {
    router.push('/pos')
  } else {
    // Default: browser back (includes /pos main page)
    router.back()
  }
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
  // } else if (path === '/abastecimiento/precios') {
  //   return {
  //     pageTitle: 'Lista de Precios',
  //     pageSubtitle: undefined,
  //     searchPlaceholder: 'Buscar precios...',
  //     activePage: 'abastecimiento' as const,
  //     showBreadcrumb: false,
  //     breadcrumbPage: undefined,
  //     backButton: undefined
  //   }
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
  } else if (path.includes('/pos/producto/')) {
    return {
      pageTitle: 'Personalizar Producto',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'pos' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/pos/checkout') {
    return {
      pageTitle: 'Confirmar Orden',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'pos' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/pos' || path.includes('/pos')) {
    return {
      pageTitle: 'Punto de Venta',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'pos' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/ventas' || path === '/ventas/') {
    return {
      pageTitle: 'Ventas',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar ventas...',
      activePage: 'ventas' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/menu/productos') {
    return {
      pageTitle: 'Productos',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar productos...',
      activePage: 'menu' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/menu/recetas') {
    return {
      pageTitle: 'Recetas',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar recetas...',
      activePage: 'menu' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/menu/modificadores') {
    return {
      pageTitle: 'Modificadores',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar modificadores...',
      activePage: 'menu' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/menu/combos') {
    return {
      pageTitle: 'Combos',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar combos...',
      activePage: 'menu' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/menu' || path === '/menu/') {
    return {
      pageTitle: 'Menú',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar...',
      activePage: 'menu' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
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

// Dynamic title - can be set by child pages
const dynamicTitle = ref<string | undefined>(undefined)

// Provide title setter for child pages
provide('setPageTitle', (title: string | undefined) => {
  dynamicTitle.value = title
})

// Dynamic subtitle - can be set by child pages
const dynamicSubtitle = ref<string | undefined>(undefined)

// Provide subtitle setter for child pages
provide('setPageSubtitle', (subtitle: string | undefined) => {
  dynamicSubtitle.value = subtitle
})

// Dynamic status badge - can be set by child pages
const dynamicStatus = ref<{ label: string; color: string } | undefined>(undefined)

// Provide status setter for child pages
provide('setPageStatus', (status: { label: string; color: string } | undefined) => {
  dynamicStatus.value = status
})

// Dynamic back button - can be set by child pages
const dynamicBackButton = ref<boolean>(false)
const dynamicBackHandler = ref<(() => void) | undefined>(undefined)

// Provide back button setters for child pages
provide('setShowBackButton', (show: boolean) => {
  dynamicBackButton.value = show
})

provide('setBackHandler', (handler: (() => void) | undefined) => {
  dynamicBackHandler.value = handler
})

// Dynamic header action (like print button) - can be set by child pages
const dynamicHeaderAction = ref<{ label: string; icon?: boolean; handler: () => void } | undefined>(undefined)

// Provide header action setter for child pages
provide('setHeaderAction', (action: { label: string; icon?: boolean; handler: () => void } | undefined) => {
  dynamicHeaderAction.value = action
})

// Combined values (dynamic takes precedence)
const displayTitle = computed(() => dynamicTitle.value || pageTitle.value)
const displaySubtitle = computed(() => dynamicSubtitle.value || pageSubtitle.value)
const showBackBtn = computed(() => dynamicBackButton.value || !!backButton.value)
const backBtnHandler = computed(() => dynamicBackHandler.value || (backButton.value ? goBack : undefined))

// Inject cart data from POS page
const posCartItemsCount = inject<ComputedRef<number> | Ref<number>>('posCartItemsCount', ref(0))
const posOpenCartModal = inject<() => void>('posOpenCartModal', () => {})

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