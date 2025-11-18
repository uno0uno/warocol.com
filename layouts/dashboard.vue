<template>
  <div class="h-screen flex overflow-hidden">
    <!-- Dashboard Sidebar - Fixed Viewport Height -->
    <DashboardSidebar :active-page="activePage" />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0">
      <!-- Main Content Header -->
      <header class="bg-white border-b border-titan-300 px-8 py-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-ebony-800">{{ pageTitle }}</h1>
            <p class="text-sm text-ebony-400 mt-1">{{ currentDateTime }}</p>
          </div>
          <div v-if="backButton">
            <button @click="goBack" class="btn-secondary px-4 py-2 rounded-lg text-sm">
              {{ backButton.label }}
            </button>
          </div>
        </div>
      </header>

      <!-- Content Area with Overflow -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-8">
          <!-- Breadcrumb (if provided) -->
          <nav v-if="showBreadcrumb" class="flex mb-6" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 md:space-x-3">
              <li class="inline-flex items-center">
                <NuxtLink to="/financiero" class="text-sm font-medium text-titan-600 hover:text-crocus-600 transition-colors">
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
          <Transition 
            name="page-transition"
            mode="out-in"
          >
            <slot />
          </Transition>
        </div>
      </div>
    </main>

    <!-- Global Purchase Action Bar -->
    <PurchasesGlobalPurchaseActionBar />
  </div>
</template>

<script setup lang="ts">
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