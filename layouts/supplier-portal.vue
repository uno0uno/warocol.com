<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <SupplierPortalSidebar
      v-if="supplier"
      :token="token"
      :supplier-name="supplier?.name"
      :supplier-email="supplier?.email"
      :supplier-phone="supplier?.phone"
      :active-page="activePage"
    />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="bg-white border-b border-titan-300 px-8 py-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-ebony-800">{{ pageTitle }}</h1>
            <p class="text-sm text-ebony-400 mt-1">{{ currentDateTime }}</p>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto">
        <slot />
      </main>

      <!-- Footer -->
      <footer class="footer-main">
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const currentYear = computed(() => new Date().getFullYear())

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
  if (path.match(/\/proveedor\/[^/]+\/[^/]+$/)) return 'Detalle de Orden'
  return 'Mis Órdenes de Compra'
})

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
  flex-shrink: 0;
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
