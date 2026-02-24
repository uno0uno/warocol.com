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
          @click="onRefresh ? onRefresh() : $router.go(0)"
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100"
        >
          <svg class="w-5 h-5 text-titan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>

        <!-- Menú (all navigation) -->
        <button
          @click="showMenuModal = true"
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100"
        >
          <Bars3Icon class="w-5 h-5 text-titan-500" />
        </button>

        <!-- Configuración/Tenant -->
        <button
          @click="showTenantModal = true"
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100"
        >
          <Cog6ToothIcon class="w-5 h-5 text-titan-500" />
        </button>
      </div>

    </div>

    <!-- Menu Modal (grid of icons) -->
    <UiBottomSheetModal v-model="showMenuModal" title="Navegación" max-height="sm">
      <div class="p-4">
        <div class="grid grid-cols-4 gap-4">
          <NuxtLink
            to="/ventas"
            @click="showMenuModal = false"
            class="flex flex-col items-center gap-1"
          >
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              :class="activePage === 'ventas' ? 'bg-crocus-100' : 'bg-titan-100 hover:bg-titan-200'"
            >
              <ShoppingCartIcon
                class="w-6 h-6"
                :class="activePage === 'ventas' ? 'text-crocus-600' : 'text-titan-600'"
              />
            </div>
            <span class="text-[10px] text-titan-600">Ventas</span>
          </NuxtLink>

          <NuxtLink
            to="/pos"
            @click="showMenuModal = false"
            class="flex flex-col items-center gap-1"
          >
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              :class="activePage === 'pos' ? 'bg-crocus-100' : 'bg-titan-100 hover:bg-titan-200'"
            >
              <ComputerDesktopIcon
                class="w-6 h-6"
                :class="activePage === 'pos' ? 'text-crocus-600' : 'text-titan-600'"
              />
            </div>
            <span class="text-[10px] text-titan-600">POS</span>
          </NuxtLink>

          <NuxtLink
            to="/abastecimiento/compras-directas"
            @click="showMenuModal = false"
            class="flex flex-col items-center gap-1"
          >
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              :class="activePage === 'abastecimiento' ? 'bg-crocus-100' : 'bg-titan-100 hover:bg-titan-200'"
            >
              <DocumentTextIcon
                class="w-6 h-6"
                :class="activePage === 'abastecimiento' ? 'text-crocus-600' : 'text-titan-600'"
              />
            </div>
            <span class="text-[10px] text-titan-600">Abastecimiento</span>
          </NuxtLink>

          <NuxtLink
            to="/menu/productos"
            @click="showMenuModal = false"
            class="flex flex-col items-center gap-1"
          >
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              :class="activePage === 'menu' ? 'bg-crocus-100' : 'bg-titan-100 hover:bg-titan-200'"
            >
              <CubeIcon
                class="w-6 h-6"
                :class="activePage === 'menu' ? 'text-crocus-600' : 'text-titan-600'"
              />
            </div>
            <span class="text-[10px] text-titan-600">Menú</span>
          </NuxtLink>

          <NuxtLink
            to="/analitica"
            @click="showMenuModal = false"
            class="flex flex-col items-center gap-1"
          >
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              :class="activePage === 'analytics' ? 'bg-crocus-100' : 'bg-titan-100 hover:bg-titan-200'"
            >
              <ChartBarIcon
                class="w-6 h-6"
                :class="activePage === 'analytics' ? 'text-crocus-600' : 'text-titan-600'"
              />
            </div>
            <span class="text-[10px] text-titan-600">Analítica</span>
          </NuxtLink>

          <NuxtLink
            to="/equipo/miembros"
            @click="showMenuModal = false"
            class="flex flex-col items-center gap-1"
          >
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              :class="activePage === 'equipo' ? 'bg-crocus-100' : 'bg-titan-100 hover:bg-titan-200'"
            >
              <UserGroupIcon
                class="w-6 h-6"
                :class="activePage === 'equipo' ? 'text-crocus-600' : 'text-titan-600'"
              />
            </div>
            <span class="text-[10px] text-titan-600">Equipo</span>
          </NuxtLink>

          <NuxtLink
            to="/integraciones"
            @click="showMenuModal = false"
            class="flex flex-col items-center gap-1"
          >
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
              :class="activePage === 'integraciones' ? 'bg-crocus-100' : 'bg-titan-100 hover:bg-titan-200'"
            >
              <KeyIcon
                class="w-6 h-6"
                :class="activePage === 'integraciones' ? 'text-crocus-600' : 'text-titan-600'"
              />
            </div>
            <span class="text-[10px] text-titan-600">Integraciones</span>
          </NuxtLink>

          <NuxtLink
            to="/domicilios/pedidos"
            @click="showMenuModal = false"
            class="flex flex-col items-center gap-1"
          >
            <div class="relative">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                :class="activePage === 'domicilios' ? 'bg-crocus-100' : 'bg-titan-100 hover:bg-titan-200'"
              >
                <MapPinIcon
                  class="w-6 h-6"
                  :class="activePage === 'domicilios' ? 'text-crocus-600' : 'text-titan-600'"
                />
              </div>
              <span
                v-if="props.notificationsCount > 0"
                aria-label="`${props.notificationsCount} notificaciones sin leer`"
                class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-crocus-500 text-white text-[10px] font-bold rounded-full leading-none"
              >
                {{ props.notificationsCount > 9 ? '9+' : props.notificationsCount }}
              </span>
            </div>
            <span class="text-[10px] text-titan-600">Domicilios</span>
          </NuxtLink>
        </div>
      </div>
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
  ComputerDesktopIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  Bars3Icon,
  KeyIcon,
  MapPinIcon,
  ShoppingCartIcon,
  CubeIcon,
  ChartBarIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import { computed } from 'vue'

interface Props {
  activePage?: 'dashboard' | 'pos' | 'domicilios' | 'financiero' | 'abastecimiento' | 'pagos' | 'analytics' | 'analitica' | 'reportes' | 'configuracion' | 'admin' | 'ventas' | 'inventario' | 'menu' | 'equipo' | 'integraciones'
  onRefresh?: () => void | Promise<void>
  notificationsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  activePage: 'financiero',
  notificationsCount: 0
})

interface Tenant {
  id: string
  name: string
  slug: string
}

// Modal state
const showTenantModal = ref(false)
const showMenuModal = ref(false)

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

// Handle tenant selection
const selectTenant = async (tenant: Tenant) => {
  const success = await tenantsStore.selectTenant(tenant)

  if (success) {
    showTenantModal.value = false
    console.log(`✅ Tenant switched successfully to: ${tenant.name}`)
  } else {
    console.error('Failed to switch tenant')
  }
}
</script>

<style scoped>
/* Safe area para dispositivos con notch */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
