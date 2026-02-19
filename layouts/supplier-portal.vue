<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar - Hidden on mobile, visible on desktop -->
    <SupplierPortalSidebar
      v-if="supplier"
      :token="token"
      :supplier-name="supplier?.name"
      :supplier-email="supplier?.email"
      :supplier-phone="supplier?.phone"
      :active-page="activePage"
      class="hidden md:flex"
    />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="bg-white border-b border-titan-300 px-4 md:px-8 py-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-ebony-800">{{ pageTitle }}</h1>
            <p class="text-xs md:text-sm text-ebony-400 mt-1">{{ currentDateTime }}</p>
          </div>
          <div class="flex items-center gap-2 md:gap-3">
            <!-- Refresh Button - Always show when there's a refresh handler -->
            <button
              v-if="refreshHandler"
              @click="handleRefresh"
              :disabled="isRefreshing"
              class="hidden md:flex h-[42px] px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary hover:bg-surface-secondary hover:border-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary group disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refrescar"
            >
              <svg
                class="w-5 h-5 transition-transform group-hover:rotate-180 duration-300"
                :class="{ 'animate-spin': isRefreshing }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <!-- Back Button -->
            <button
              v-if="showBackButton"
              @click="goBack"
              class="px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary hover:bg-surface-secondary hover:border-primary transition-all text-sm font-medium"
            >
              Volver
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content with Footer (scrollable together) -->
      <div class="flex-1 overflow-y-auto">
        <main class="p-4 md:p-8 pb-20 md:pb-8">
          <slot />
        </main>

        <!-- Footer -->
        <footer class="footer-main hidden md:block">
          <div class="footer-content">
            <div class="footer-security">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Conexión segura - SSL encriptado</span>
            </div>

            <div class="footer-copyright">
              <p>&copy; {{ currentYear }} Warolabs. Todos los derechos reservados.</p>
            </div>

            <div class="footer-links">
              <a href="mailto:hola@warolabs.com">Contacto</a>
              <span>|</span>
              <a href="https://warolabs.com" target="_blank" rel="noopener">Sobre Warolabs</a>
            </div>
          </div>
        </footer>
      </div>
    </div>

    <!-- Mobile Bottom Navigation -->
    <SupplierPortalBottomNav
      v-if="supplier"
      :token="token"
      :active-page="activePage"
      :supplier-name="supplier?.name"
      :supplier-email="supplier?.email"
      :supplier-phone="supplier?.phone"
      :on-refresh="handleRefresh"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const currentYear = computed(() => new Date().getFullYear())

// Refresh handling
const isRefreshing = ref(false)
const refreshHandler = ref<(() => void | Promise<void>) | null>(null)

// Provide refresh handler setter for child pages
provide('setRefreshHandler', (handler: () => void | Promise<void>) => {
  refreshHandler.value = handler
})

// Handle refresh click
const handleRefresh = async () => {
  if (refreshHandler.value && !isRefreshing.value) {
    isRefreshing.value = true
    try {
      await refreshHandler.value()
    } finally {
      // Keep spinning for at least 300ms for visual feedback
      setTimeout(() => {
        isRefreshing.value = false
      }, 300)
    }
  }
}

// Get token from route params
const token = computed(() => route.params.token as string)

// Determine active page based on route path
const activePage = computed(() => {
  const path = route.path
  if (path.includes('/facturacion')) return 'billing'
  return 'purchases'
})

// Page title based on route
const pageTitle = computed(() => {
  const path = route.path
  if (path.includes('/facturacion')) return 'Facturación'
  if (path.includes('/transicion/')) return 'Historial de Cambios'
  if (path.includes('/acciones')) return 'Acciones de la Orden'
  if (path.match(/\/proveedor\/[^/]+\/[^/]+/)) return 'Detalle de Orden'
  return 'Mis Órdenes de Compra'
})

// Show back button on detail pages and actions pages (not on transition pages which open in new window)
const showBackButton = computed(() => {
  const path = route.path
  // Show on purchase detail page: /proveedor/[token]/[purchaseId]
  // Show on actions page: /proveedor/[token]/[purchaseId]/acciones
  // But NOT on transition pages (they open in new window)
  return (path.match(/\/proveedor\/[^/]+\/[^/]+/) !== null && !path.includes('/facturacion') && !path.includes('/transicion/'))
})

// Go back function
const goBack = () => {
  router.back()
}

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
let dateTimeInterval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  updateDateTime()
  dateTimeInterval = setInterval(updateDateTime, 60000)
})
onUnmounted(() => {
  if (dateTimeInterval) clearInterval(dateTimeInterval)
})

// Get supplier from global state (set by pages)
const supplier = useState<any>('supplier-portal-supplier', () => null)
</script>

<style scoped>
/* Main Content */
main {
  background: hsl(220, 14%, 97%);
}

/* Footer Styles */
.footer-main {
  background: hsla(0, 0%, 100%, 0.95);
  border-top: 1px solid hsl(220, 11%, 90%);
  padding: 16px 40px;
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.footer-security {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: hsl(220, 13%, 46%);
}

.footer-copyright {
  font-size: 14px;
  color: hsl(220, 13%, 46%);
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: hsl(220, 13%, 46%);
}

.footer-links a {
  text-decoration: none;
  color: hsl(220, 13%, 46%);
  transition: color 0.3s;
}

.footer-links a:hover {
  color: hsl(262, 83%, 58%);
}

/* Responsive */
@media (max-width: 768px) {
  .footer-main {
    padding: 20px;
  }

  .footer-content {
    gap: 12px;
  }
}

@media (min-width: 769px) {
  .footer-content {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
