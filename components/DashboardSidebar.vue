<template>
  <!-- Loading Global Overlay -->
  <Teleport to="body">
    <div v-if="isLoggingOut" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div class="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <div class="w-16 h-16 mb-4">
          <div class="w-16 h-16 border-4 border-crocus-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p class="text-lg font-medium text-ebony-900">Cerrando sesión...</p>
        <p class="text-sm text-titan-400 mt-2">Por favor espera</p>
      </div>
    </div>
  </Teleport>

  <!-- Tenant Modal -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="showTenantModal"
        class="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center"
        @click.self="closeTenantModal"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeTenantModal" />

        <!-- Panel: bottom sheet en mobile, modal centrado en desktop -->
        <div class="relative w-full sm:w-[420px] sm:max-w-[90vw] bg-white sm:rounded-xl rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh] sm:max-h-[60vh]">

          <!-- Header -->
          <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-titan-200 flex-shrink-0">
            <p class="text-sm font-semibold text-ebony-800">Cambiar negocio</p>
            <button @click="closeTenantModal" class="p-1.5 rounded-lg text-titan-400 hover:bg-titan-100 hover:text-ebony-700 transition-colors">
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>

          <!-- Buscador -->
          <div class="px-4 py-3 flex-shrink-0">
            <div class="flex items-center gap-2 px-3 py-2 border-b border-titan-200 focus-within:border-crocus-400 transition-colors">
              <MagnifyingGlassIcon class="w-4 h-4 text-titan-400 flex-shrink-0" />
              <input
                ref="searchInputRef"
                v-model="tenantSearch"
                type="text"
                placeholder="Buscar negocio..."
                class="tenant-search-input flex-1 bg-transparent text-sm text-ebony-800 placeholder-titan-400"
              />
              <button v-if="tenantSearch" @click="tenantSearch = ''" class="text-titan-400 hover:text-ebony-700">
                <XMarkIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Lista -->
          <div class="overflow-y-auto px-3 pb-4 space-y-0.5">
            <div v-if="isLoadingTenants" class="px-3 py-3 text-sm text-titan-400 text-center">Cargando...</div>
            <div v-else-if="filteredTenants.length === 0" class="px-3 py-3 text-sm text-titan-400 text-center">Sin resultados</div>
            <button
              v-else
              v-for="tenant in filteredTenants"
              :key="tenant.id"
              @click="selectTenant(tenant)"
              :disabled="isLoadingTenants"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left disabled:opacity-50"
              :class="selectedTenant?.id === tenant.id
                ? 'bg-crocus-50 text-crocus-700 font-medium'
                : 'text-ebony-700 hover:bg-titan-50'"
            >
              <div class="w-2 h-2 rounded-full flex-shrink-0" :class="selectedTenant?.id === tenant.id ? 'bg-crocus-500' : 'bg-titan-300'"></div>
              <span class="truncate">{{ tenant.name }}</span>
              <CheckIcon v-if="selectedTenant?.id === tenant.id" class="w-4 h-4 ml-auto text-crocus-500 flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <UiBaseSidebar v-bind="$attrs">
    <!-- Tenant Selector -->
    <template #selector>
      <button
        @click="openTenantModal"
        :disabled="isLoadingTenants"
        class="w-full flex items-center justify-between px-3 py-2 border border-ebony-700 rounded-lg text-sm text-white bg-ebony-800 hover:bg-ebony-700 transition-all focus:outline-none focus:ring-2 focus:ring-crocus-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-2 h-2 bg-crocus-500 rounded-full flex-shrink-0"></div>
          <span v-if="isLoadingTenants" class="text-titan-400 truncate">Cargando...</span>
          <span v-else class="font-medium truncate">{{ selectedTenant?.name || 'Seleccionar' }}</span>
        </div>
      </button>
    </template>

    <!-- Navigation Links -->
    <template #navigation="{ collapsed }">

      <!-- ── OPERACIÓN (frecuente) ── -->
      <div class="space-y-0.5">
        <p v-if="!collapsed" class="nav-section-label">Operación</p>
        <NuxtLink
          v-for="item in primaryItems"
          :key="item.to"
          :to="item.to"
          :title="item.label"
          :class="[
            'nav-item group',
            collapsed ? 'justify-center' : '',
            activePage === item.page ? 'nav-item--active' : 'nav-item--idle',
          ]"
        >
          <component :is="item.icon" class="nav-icon" />
          <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">{{ item.label }}</span>
        </NuxtLink>
      </div>

      <!-- ── DIVIDER ── -->
      <div class="my-1.5 mx-1 border-t nav-divider" />

      <!-- ── HERRAMIENTAS ── -->
      <div class="space-y-0.5">
        <p v-if="!collapsed" class="nav-section-label">Herramientas</p>
        <NuxtLink
          v-for="item in secondaryItems"
          :key="item.to"
          :to="item.to"
          :title="item.label"
          :class="[
            'nav-item',
            collapsed ? 'justify-center' : '',
            activePage === item.page ? 'nav-item--active' : 'nav-item--idle',
          ]"
        >
          <component :is="item.icon" class="nav-icon" />
          <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">
            {{ item.label }}
            <span
              v-if="item.page === 'abastecimiento' && hasCriticalAlerts"
              class="inline-block w-1.5 h-1.5 rounded-full bg-destructive align-middle ml-1.5"
            />
          </span>
        </NuxtLink>
      </div>

      <!-- ── DIVIDER ── -->
      <div class="my-1.5 mx-1 border-t nav-divider" />

      <!-- ── APPS ── -->
      <div class="space-y-0.5">
        <p v-if="!collapsed" class="nav-section-label">Apps</p>
        <a
          href="https://warotickets.com/gestion/eventos"
          target="_blank"
          title="Eventos"
          :class="['nav-item nav-item--idle', collapsed ? 'justify-center' : '']"
        >
          <Squares2X2Icon class="nav-icon" />
          <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">Eventos</span>
        </a>
      </div>

      <!-- ── SPACER ── -->
      <div class="flex-1" style="min-height: 1rem;" />

      <!-- ── CUENTA (fondo) ── -->
      <div class="space-y-0.5">
        <p v-if="!collapsed" class="nav-section-label">Cuenta</p>
        <NuxtLink
          v-for="item in cuentaItems"
          :key="item.to"
          :to="item.to"
          :title="item.label"
          :class="[
            'nav-item',
            collapsed ? 'justify-center' : '',
            activePage === item.page ? 'nav-item--active' : 'nav-item--idle',
          ]"
        >
          <component :is="item.icon" class="nav-icon" />
          <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">{{ item.label }}</span>
        </NuxtLink>
      </div>

    </template>

    <!-- Logout (siempre visible, fijo abajo) -->
    <template #bottom="{ collapsed }">
      <button
        @click="handleLogout"
        :disabled="isLoggingOut"
        :class="[
          'nav-item nav-item--idle group w-full text-titan-500 hover:bg-red-900/20 hover:text-red-400',
          collapsed ? 'justify-center' : '',
        ]"
        title="Cerrar sesión"
      >
        <ArrowRightOnRectangleIcon class="nav-icon" />
        <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">Cerrar sesión</span>
      </button>
    </template>

    <!-- User Profile -->
    <template #footer>
      <div class="flex items-center gap-3 rounded-lg bg-ebony-800/50">
        <div class="relative flex-shrink-0">
          <div class="w-8 h-8 bg-crocus-600 rounded-full flex items-center justify-center font-semibold text-white text-xs">
            {{ userInitials }}
          </div>
          <span class="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-ebony-900 rounded-full"></span>
        </div>
        <div class="flex-1 min-w-0 text-left">
          <div class="text-sm font-medium text-white truncate">{{ userName }}</div>
          <div class="text-xs text-titan-400 truncate max-w-[120px]">{{ userEmail }}</div>
        </div>
      </div>
    </template>
  </UiBaseSidebar>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

import { computed, nextTick, ref } from 'vue'
import {
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CheckIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  CubeIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  TableCellsIcon,
  TruckIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

interface Props {
  activePage?: 'dashboard' | 'ventas' | 'pos' | 'domicilios' | 'financiero' | 'abastecimiento' | 'inventario' | 'menu' | 'pagos' | 'equipo' | 'integraciones' | 'analytics' | 'reportes' | 'configuracion' | 'admin' | 'negocio' | 'mesas' | 'finanzas'
}
interface Tenant { id: string; name: string; slug: string }

const props = withDefaults(defineProps<Props>(), { activePage: 'financiero' })

const showTenantModal = ref(false)
const tenantSearch = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const isLoggingOut = ref(false)
const router = useRouter()

const filteredTenants = computed(() =>
  tenantSearch.value.trim()
    ? tenants.value.filter(t => t.name.toLowerCase().includes(tenantSearch.value.toLowerCase()))
    : tenants.value
)

const openTenantModal = () => {
  tenantSearch.value = ''
  showTenantModal.value = true
  nextTick(() => searchInputRef.value?.focus())
}
const closeTenantModal = () => { showTenantModal.value = false }

const { hasCriticalAlerts } = useDataQualityStatus()
const { subscription: billingSubscription, fetchSubscription: fetchBillingSubscription } = useBilling()
const tenantsStore = useTenantsStore()
const tenants = computed(() => tenantsStore.tenants)
const selectedTenant = computed(() => tenantsStore.selectedTenant)
const isLoadingTenants = computed(() => tenantsStore.isLoading)

const authStore = useAuthStore()
const userName = computed(() => authStore.user?.name || authStore.session?.user?.name || 'Usuario')
const userEmail = computed(() => authStore.user?.email || authStore.session?.user?.email || 'No email')
const userInitials = computed(() => {
  const name = userName.value
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

// ── Nav items ──────────────────────────────────────────────
const primaryItems = [
  { to: '/pos',               page: 'pos',       label: 'POS',        icon: ComputerDesktopIcon },
  { to: '/ventas',            page: 'ventas',    label: 'Ventas',     icon: ShoppingCartIcon },
  { to: '/domicilios/pedidos',page: 'domicilios',label: 'Domicilios', icon: MapPinIcon },
]

const secondaryItems = [
  { to: '/analitica',                        page: 'analytics',     label: 'Analítica',      icon: ChartBarIcon },
  { to: '/finanzas/arqueo',                  page: 'finanzas',      label: 'Finanzas',       icon: BanknotesIcon },
  { to: '/menu/productos',                   page: 'menu',          label: 'Menú',           icon: CubeIcon },
  { to: '/mesas',                            page: 'mesas',         label: 'Mesas',          icon: TableCellsIcon },
  { to: '/abastecimiento/compras-directas',  page: 'abastecimiento',label: 'Abastecimiento', icon: TruckIcon },
  { to: '/equipo/miembros',                  page: 'equipo',        label: 'Equipo',         icon: UserGroupIcon },
  { to: '/equipo/nomina',                    page: 'equipo',        label: 'Nómina',         icon: TableCellsIcon },
  { to: '/integraciones',                    page: 'integraciones', label: 'Integraciones',  icon: KeyIcon },
]

const cuentaItems = [
  { to: '/negocio',         page: 'negocio', label: 'Mi Negocio', icon: BuildingStorefrontIcon },
  { to: '/gestion/billing', page: 'admin',   label: 'Mi Plan',    icon: CreditCardIcon },
]

const selectTenant = async (tenant: Tenant) => {
  closeTenantModal()
  const success = await tenantsStore.selectTenant(tenant)
  if (!success) return

  // billing-gate middleware only runs on route change, which doesn't happen on tenant switch.
  // Check billing directly for the new tenant and redirect if no active subscription.
  if (billingSubscription.value === undefined) {
    try { await fetchBillingSubscription() } catch { return }
  }
  const status = billingSubscription.value?.status
  const hasAccess = status === 'active' || status === 'past_due'
  if (!hasAccess) {
    await router.replace('/gestion/billing')
  }
}

const handleLogout = async () => {
  try {
    isLoggingOut.value = true
    await $fetch('/api/auth/signout', { method: 'POST', credentials: 'include' })
    authStore.clearAuth()
    if (typeof window !== 'undefined') { localStorage.clear(); sessionStorage.clear() }
    await router.push('/')
  } catch {
    authStore.clearAuth()
    await router.push('/')
  } finally {
    isLoggingOut.value = false
  }
}

// Cerrar modal con Escape
onMounted(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTenantModal() }
  document.addEventListener('keydown', onKey)
  onUnmounted(() => document.removeEventListener('keydown', onKey))
})
</script>

<style scoped>
/*
  Jerarquía monochromática — misma familia crocus/titan, solo opacidad varía.
  ─────────────────────────────────────────────────────────────────────────
  Group label   titan-300/35   ← lo más tenue (espaciador visual)
  Icon idle     crocus-400/45  ← cohesión con el acento, no gris puro
  Label idle    titan-300/60   ← legible pero recede
  Icon hover    crocus-400/75
  Label hover   titan-300/85
  Bg hover      crocus-600/8   ← píldora muy sutil
  Icon active   crocus-400     ← 100%, único elemento a plena saturación
  Label active  titan-300      ← 100%, font-medium
  Bg active     crocus-600/15  ← píldora de posición
  Divider       titan-300/6
*/

/* ── Nav item base ── */
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  transition: background-color 0.15s, color 0.15s;
  font-size: 0.9375rem;
  width: 100%;
  text-decoration: none;
}
/* Cuando colapsado: centrar ícono y eliminar gap del label invisible */
.nav-item.justify-center {
  gap: 0;
  padding-left: 0;
  padding-right: 0;
}
.nav-item--active {
  background-color: rgba(124, 58, 237, 0.15);
  font-weight: 500;
}
.nav-item--idle:hover {
  background-color: rgba(124, 58, 237, 0.08);
}

/* ── Nav icon ── */
.nav-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: color 0.15s;
}
.nav-item--active .nav-icon   { color: #A78BFA; }
.nav-item--idle .nav-icon     { color: rgba(167, 139, 250, 0.65); } /* 3.5:1 — pasa WCAG AA UI */
.nav-item--idle:hover .nav-icon { color: rgba(167, 139, 250, 0.85); }

/* ── Label text ── */
.nav-label-text {
  white-space: nowrap;
  overflow: hidden;
  transition: max-width 0.15s, opacity 0.15s;
  max-width: 200px;
  opacity: 1;
}
.nav-label-text--hidden { max-width: 0; opacity: 0; }

.nav-item--active .nav-label-text { color: #E0E5EB; }
.nav-item--idle .nav-label-text   { color: rgba(224, 229, 235, 0.60); }
.nav-item--idle:hover .nav-label-text { color: rgba(224, 229, 235, 0.90); }

/* ── Section label ── */
.nav-section-label {
  padding: 0.125rem 0.75rem 0.0625rem;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  white-space: nowrap;
  color: rgba(224, 229, 235, 0.30);
}

/* ── Dividers ── */
.nav-divider {
  border-color: rgba(224, 229, 235, 0.06);
}

/* ── Quitar focus ring nativo del input de búsqueda ── */
.tenant-search-input {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}
.tenant-search-input:focus {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

/* ── Modal fade ── */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
</style>
