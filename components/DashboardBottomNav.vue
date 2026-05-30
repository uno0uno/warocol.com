<template>
  <!-- Bottom Navigation - Mobile & Tablet -->
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-titan-300 shadow-lg z-50 safe-area-bottom">
    <div class="flex items-center justify-between px-4 py-2">

      <!-- User Profile -->
      <div class="flex items-center gap-3">
        <div class="relative flex-shrink-0">
          <div class="w-10 h-10 bg-crocus-600 rounded-full flex items-center justify-center font-semibold text-white text-sm">
            {{ userInitials }}
          </div>
          <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-semibold text-ebony-800 leading-tight">{{ userName }}</span>
          <span class="text-xs text-titan-500 leading-tight">{{ selectedTenant?.name || 'Sin tenant' }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <!-- Refresh Button - always visible -->
        <button
          @click="handleRefresh"
          :disabled="isLoading"
          aria-label="Actualizar página"
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UiLoadingMatrix v-if="isLoading" size="5.5px" />
          <svg v-else
            class="w-5 h-5 text-titan-500 transition-transform duration-300 hover:rotate-180"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>

        <!-- Notificaciones -->
        <button
          @click="openNotificationsModal"
          aria-label="Ver notificaciones"
          class="relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100"
        >
          <BellAlertIcon v-if="notificationsCount > 0" class="w-5 h-5 text-primary" aria-hidden="true" />
          <BellIcon v-else class="w-5 h-5 text-titan-500" aria-hidden="true" />
          <span
            v-if="notificationsCount > 0"
            class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-crocus-500 text-white text-[10px] font-bold rounded-full leading-none"
            aria-hidden="true"
          >
            {{ notificationsCount > 9 ? '9+' : notificationsCount }}
          </span>
        </button>

        <!-- Menú (all navigation) -->
        <button
          @click="showMenuModal = true"
          aria-label="Abrir navegación"
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100"
        >
          <Bars3Icon class="w-5 h-5 text-titan-500" />
        </button>

        <!-- Configuración/Tenant -->
        <button
          @click="showTenantModal = true"
          aria-label="Configuración"
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100"
        >
          <Cog6ToothIcon class="w-5 h-5 text-titan-500" />
        </button>
      </div>

    </div>

    <!-- Menu Modal (grid of icons) -->
    <UiBottomSheetModal v-model="showMenuModal" title="Navegación" max-height="sm">
      <div class="p-4">
        <!-- Module-gated grid (#560). Fail-open when enforcement is disabled. -->
        <div v-if="visibleGridItems.length > 0" class="grid grid-cols-4 gap-4">
          <NuxtLink
            v-for="item in visibleGridItems"
            :key="item.to"
            :to="item.to"
            class="flex flex-col items-center gap-1"
            @click="showMenuModal = false"
          >
            <div class="relative">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                :class="activePage === item.page ? 'bg-crocus-100' : 'bg-titan-100 hover:bg-titan-200'"
              >
                <component
                  :is="item.icon"
                  class="w-6 h-6"
                  :class="activePage === item.page ? 'text-crocus-600' : 'text-titan-600'"
                />
              </div>
              <span
                v-if="item.showCriticalDot && hasCriticalAlerts"
                class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive border-2 border-white rounded-full"
                :aria-label="`Alertas críticas en ${item.label.toLowerCase()}`"
              />
            </div>
            <span class="text-[10px] text-titan-600">{{ item.label }}</span>
          </NuxtLink>
        </div>

        <!-- Empty-state fallback — guarantees at least one navigation target. -->
        <div v-else class="grid grid-cols-4 gap-4">
          <NuxtLink
            to="/"
            class="flex flex-col items-center gap-1"
            @click="showMenuModal = false"
          >
            <div class="w-12 h-12 rounded-full flex items-center justify-center bg-crocus-100">
              <HomeIcon class="w-6 h-6 text-crocus-600" />
            </div>
            <span class="text-[10px] text-titan-600">Inicio</span>
          </NuxtLink>
        </div>
      </div>
    </UiBottomSheetModal>

    <!-- Notifications Modal -->
    <UiBottomSheetModal v-model="showNotificationsModal" title="Notificaciones" max-height="lg">
      <div class="flex items-center justify-between px-4 py-2 border-b border-titan-100">
        <span class="text-xs text-titan-600">Sonido de alertas</span>
        <button
          type="button"
          @click="handleToggleDespachoSound"
          :aria-label="despachoSoundEnabled ? 'Silenciar alertas sonoras' : 'Activar alertas sonoras'"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-titan-100 transition-colors"
          :class="despachoSoundEnabled ? 'text-ebony-800' : 'text-titan-400'"
        >
          <SpeakerWaveIcon v-if="despachoSoundEnabled" class="w-4 h-4" aria-hidden="true" />
          <SpeakerXMarkIcon v-else class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <!-- Empty state -->
      <div v-if="notifications.length === 0" class="flex flex-col items-center justify-center py-10 px-4 gap-2">
        <BellIcon class="w-8 h-8 text-muted-foreground/40" aria-hidden="true" />
        <p class="text-sm text-muted-foreground text-center">Sin notificaciones nuevas</p>
      </div>
      <!-- List -->
      <ul v-else class="divide-y divide-titan-100">
        <li v-for="notification in notifications" :key="notification.id">
          <NuxtLink
            :to="notificationDespachoPath(notification)"
            @click="handleMarkAsRead(notification.id); showNotificationsModal = false"
            class="flex items-start gap-3 px-4 py-3 hover:bg-titan-50 transition-colors"
            :class="!notification.read_at ? 'bg-crocus-50/40' : ''"
          >
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-crocus-100 flex items-center justify-center mt-0.5">
              <ShoppingBagIcon class="w-4 h-4 text-crocus-600" aria-hidden="true" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-ebony-800 leading-snug">
                {{ notificationDespachoTitle(notification) }}
              </p>
              <p class="text-xs text-titan-500 mt-0.5">{{ formatRelativeTime(notification.created_at) }}</p>
            </div>
            <span v-if="!notification.read_at" class="flex-shrink-0 w-2 h-2 rounded-full bg-crocus-500 mt-1.5" aria-hidden="true" />
          </NuxtLink>
        </li>
      </ul>
    </UiBottomSheetModal>

    <!-- Tenant Selector Modal -->
    <UiBottomSheetModal v-model="showTenantModal" title="Configuración" max-height="lg">
      <div class="p-4 space-y-6">
        <!-- Tenant Selector -->
        <div>
          <label class="text-sm text-titan-600 font-medium mb-2 block">Seleccionar Tenant</label>
          <div class="space-y-2">
            <div v-if="isLoadingTenants" class="text-sm text-titan-600 py-2">
              Cargando tenants...
            </div>
            <div v-else-if="tenants.length === 0" class="text-sm text-titan-600 py-2">
              No hay tenants disponibles
            </div>
            <button
              v-else
              v-for="tenant in tenants"
              :key="tenant.id"
              @click="selectTenant(tenant)"
              :disabled="isLoadingTenants"
              class="w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :class="selectedTenant?.id === tenant.id
                ? 'border-crocus-600 bg-crocus-50'
                : 'border-titan-200 hover:border-crocus-300 hover:bg-titan-50'"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-3 h-3 rounded-full"
                  :class="selectedTenant?.id === tenant.id ? 'bg-crocus-600' : 'bg-titan-400'"
                ></div>
                <span class="font-medium text-ebony-800">{{ tenant.name }}</span>
              </div>
              <CheckCircleIcon
                v-if="selectedTenant?.id === tenant.id"
                class="w-5 h-5 text-crocus-600"
              />
            </button>
          </div>
        </div>

        <!-- User Info -->
        <div class="pt-4 border-t border-titan-300">
          <div class="flex items-center gap-3 px-4 py-3 bg-titan-50 rounded-lg">
            <div class="w-10 h-10 bg-ebony-800 rounded-full flex items-center justify-center font-bold text-white text-sm">
              {{ userInitials }}
            </div>
            <div>
              <div class="font-semibold text-sm text-ebony-800">{{ userName }}</div>
              <div class="text-xs text-titan-600">{{ userEmail }}</div>
            </div>
          </div>
        </div>
      </div>
    </UiBottomSheetModal>
  </nav>
</template>

<script setup lang="ts">
import {
  AdjustmentsHorizontalIcon,
  BanknotesIcon,
  Bars3Icon,
  BellAlertIcon,
  BellIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  CubeIcon,
  DocumentTextIcon,
  HomeIcon,
  KeyIcon,
  MapPinIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import type { FunctionalComponent } from 'vue'
import { useLayoutActions } from '../composables/useLayoutActions'
import { notificationDespachoPath, notificationDespachoTitle } from '~/composables/useNotificationDespachoLink'
import { useDespachoNotificationAudio } from '~/composables/useDespachoNotificationAudio'
import type { Module } from '~/stores/access'

type ActivePage =
  | 'dashboard'
  | 'ventas' | 'pos' | 'despacho' | 'comandas'
  | 'financiero' | 'finanzas' | 'facturacion'
  | 'abastecimiento' | 'inventario' | 'menu' | 'operaciones'
  | 'analytics' | 'analitica' | 'reportes' | 'pagos'
  | 'equipo' | 'integraciones'
  | 'negocio' | 'admin' | 'configuracion'

interface Props {
  activePage?: ActivePage
  notificationsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  activePage: 'financiero',
  notificationsCount: 0,
})

// Epic 4 (#560): each grid item declares the backend module it requires.
// useModuleAccess().can() fails open while enforcementMode !== 'enforce',
// so today's full grid is preserved until Epic 6 flips a tenant.
interface GridItem {
  to: string
  page: ActivePage
  label: string
  icon: FunctionalComponent
  module: Module
  showCriticalDot?: boolean
}

const gridItems: GridItem[] = [
  { to: '/ventas',                          page: 'ventas',         label: 'Ventas',         icon: ShoppingCartIcon,          module: 'ventas' },
  { to: '/pos',                             page: 'pos',            label: 'POS',            icon: ComputerDesktopIcon,       module: 'pos' },
  { to: '/abastecimiento/compras-directas', page: 'abastecimiento', label: 'Abastecimiento', icon: DocumentTextIcon,          module: 'abastecimiento', showCriticalDot: true },
  { to: '/menu/productos',                  page: 'menu',           label: 'Menú',           icon: CubeIcon,                  module: 'menu' },
  { to: '/operaciones/comandas',            page: 'operaciones',    label: 'Operaciones',    icon: AdjustmentsHorizontalIcon, module: 'operaciones' },
  { to: '/analitica',                       page: 'analytics',      label: 'Analítica',      icon: ChartBarIcon,              module: 'analitica' },
  { to: '/finanzas/cartera',                page: 'finanzas',       label: 'Finanzas',       icon: BanknotesIcon,             module: 'finanzas' },
  { to: '/facturacion',                     page: 'facturacion',    label: 'Facturación',    icon: ReceiptPercentIcon,        module: 'facturacion' },
  { to: '/equipo/miembros',                 page: 'equipo',         label: 'Equipo',         icon: UserGroupIcon,             module: 'equipo' },
  { to: '/integraciones',                   page: 'integraciones',  label: 'Integraciones',  icon: KeyIcon,                   module: 'integraciones' },
  { to: '/despacho/domicilios',             page: 'despacho',       label: 'Domicilios',     icon: MapPinIcon,                module: 'despacho' },
  { to: '/negocio',                         page: 'negocio',        label: 'Mi Negocio',     icon: BuildingStorefrontIcon,    module: 'mi_negocio' },
  { to: '/gestion/billing',                 page: 'admin',          label: 'Mi Plan',        icon: CreditCardIcon,            module: 'mi_plan' },
]

const { can } = useModuleAccess()
const visibleGridItems = computed(() => gridItems.filter((item) => can(item.module).value))

// Data quality dot indicator
const { hasCriticalAlerts } = useDataQualityStatus()
const { subscription: billingSubscription, fetchSubscription: fetchBillingSubscription } = useBilling()

const { triggerRefresh, isRefreshing, isProgressiveLoading } = useLayoutActions()
const handleRefresh = triggerRefresh
const isLoading = computed(() => isRefreshing.value || isProgressiveLoading.value)

interface Tenant {
  id: string
  name: string
  slug: string
}

// Modal state
const showTenantModal = ref(false)
const showMenuModal = ref(false)
const showNotificationsModal = ref(false)

// Notifications
const { notifications, markAsRead } = useNotifications()
const {
  enabled: despachoSoundEnabled,
  toggleEnabled: toggleDespachoSound,
  unlockFromGesture: unlockDespachoSound,
} = useDespachoNotificationAudio()

const handleMarkAsRead = async (id: string) => {
  await markAsRead(id)
}

const openNotificationsModal = () => {
  unlockDespachoSound()
  showNotificationsModal.value = true
}

const handleToggleDespachoSound = () => {
  unlockDespachoSound()
  toggleDespachoSound()
}

const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `Hace ${days} d`
}

// Use tenants store
const tenantsStore = useTenantsStore()

// Computed properties from store
const tenants = computed(() => tenantsStore.tenants)
const selectedTenant = computed(() => tenantsStore.selectedTenant)
const isLoadingTenants = computed(() => tenantsStore.isLoading)

// Use auth store for user data
const authStore = useAuthStore()
const userName = computed(() => authStore.user?.name || authStore.session?.user?.name || 'Usuario')
const userEmail = computed(() => authStore.user?.email || authStore.session?.user?.email || 'No email')
const userInitials = computed(() => {
  const name = userName.value
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})
const isSuperuser = computed(() =>
  authStore.displayUser?.role === 'superuser' ||
  authStore.session?.user?.role === 'superuser'
)

const router = useRouter()

// Handle tenant selection
const selectTenant = async (tenant: Tenant) => {
  showTenantModal.value = false  // close immediately, don't wait
  const success = await tenantsStore.selectTenant(tenant)

  if (!success) return

  // billing-gate middleware only runs on route change, which doesn't happen on tenant switch.
  // Check billing directly for the new tenant and redirect if no active subscription.
  // stores/tenants.ts already invalidated ['billing'] on tenant switch — query auto-refetches.
  if (billingSubscription.value === undefined) {
    try { await fetchBillingSubscription() } catch { return }
  }
  const status = billingSubscription.value?.status
  const hasAccess = status === 'active' || status === 'past_due'
  if (!hasAccess) {
    await router.replace('/gestion/billing')
  }
}
</script>

<style scoped>
/* Safe area para dispositivos con notch */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
