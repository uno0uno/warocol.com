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

  <UiBaseSidebar v-bind="$attrs">
    <!-- Tenant Selector -->
    <template #selector>
      <div class="tenant-selector-container">
        <button
          @click="showTenantDropdown = !showTenantDropdown"
          :disabled="isLoadingTenants"
          class="w-full flex items-center justify-between px-3 py-2 border border-ebony-700 rounded-lg text-sm text-white bg-ebony-800 hover:bg-ebony-700 transition-all focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-crocus-500 rounded-full"></div>
            <span v-if="isLoadingTenants" class="text-titan-400">Loading...</span>
            <span v-else class="font-medium">{{ selectedTenant?.name || 'Select Tenant' }}</span>
          </div>
          <ChevronDownIcon :class="['w-4 h-4 text-titan-400 transition-transform', showTenantDropdown ? 'rotate-180' : '']" />
        </button>

        <!-- Expandable List -->
        <Transition name="tenant-expand">
          <div
            v-show="showTenantDropdown"
            class="mt-2 bg-ebony-800 border border-ebony-700 rounded-lg overflow-hidden"
          >
            <div class="py-1">
              <div v-if="isLoadingTenants" class="px-3 py-2 text-sm text-titan-400">
                Loading tenants...
              </div>
              <div v-else-if="tenants.length === 0" class="px-3 py-2 text-sm text-titan-400">
                No tenants available
              </div>
              <button
                v-else
                v-for="tenant in tenants"
                :key="tenant.id"
                @click="selectTenant(tenant)"
                :disabled="isLoadingTenants"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-ebony-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                :class="selectedTenant?.id === tenant.id ? 'bg-crocus-600/20 text-crocus-400 font-medium' : ''"
              >
                <div class="w-2 h-2 rounded-full" :class="selectedTenant?.id === tenant.id ? 'bg-crocus-500' : 'bg-titan-500'"></div>
                <span>{{ tenant.name }}</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </template>

    <!-- Navigation Links -->
    <template #navigation="{ collapsed }">
      <!-- Sección Ventas -->
      <div class="space-y-1">
        <span v-if="!collapsed" class="px-3 text-[10px] text-titan-500/70 uppercase tracking-widest font-medium">Ventas</span>
        <NuxtLink
          to="/ventas"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group',
            collapsed ? 'justify-center' : '',
            activePage === 'ventas'
              ? 'bg-crocus-600/20 text-crocus-400 font-medium'
              : 'text-titan-300 hover:bg-ebony-800 hover:text-white'
          ]"
          :title="collapsed ? 'Ventas' : ''"
        >
          <ShoppingCartIcon :class="['w-5 h-5 flex-shrink-0', activePage === 'ventas' ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']" />
          <span v-if="!collapsed" class="whitespace-nowrap">Ventas</span>
        </NuxtLink>

        <NuxtLink
          to="/pos"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group',
            collapsed ? 'justify-center' : '',
            activePage === 'pos'
              ? 'bg-crocus-600/20 text-crocus-400 font-medium'
              : 'text-titan-300 hover:bg-ebony-800 hover:text-white'
          ]"
          :title="collapsed ? 'POS' : ''"
        >
          <ComputerDesktopIcon :class="['w-5 h-5 flex-shrink-0', activePage === 'pos' ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']" />
          <span v-if="!collapsed" class="whitespace-nowrap">POS</span>
        </NuxtLink>
      </div>

      <!-- Sección Operaciones -->
      <div class="space-y-1 pt-4">
        <span v-if="!collapsed" class="px-3 text-[10px] text-titan-500/70 uppercase tracking-widest font-medium">Operaciones</span>
        <NuxtLink
          to="/abastecimiento"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group',
            collapsed ? 'justify-center' : '',
            activePage === 'abastecimiento'
              ? 'bg-crocus-600/20 text-crocus-400 font-medium'
              : 'text-titan-300 hover:bg-ebony-800 hover:text-white'
          ]"
          :title="collapsed ? 'Abastecimiento' : ''"
        >
          <TruckIcon :class="['w-5 h-5 flex-shrink-0', activePage === 'abastecimiento' ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']" />
          <span v-if="!collapsed" class="whitespace-nowrap">Abastecimiento</span>
        </NuxtLink>

        <NuxtLink
          to="/inventario"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group',
            collapsed ? 'justify-center' : '',
            activePage === 'inventario'
              ? 'bg-crocus-600/20 text-crocus-400 font-medium'
              : 'text-titan-300 hover:bg-ebony-800 hover:text-white'
          ]"
          :title="collapsed ? 'Inventario' : ''"
        >
          <ChartBarIcon :class="['w-5 h-5 flex-shrink-0', activePage === 'inventario' ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']" />
          <span v-if="!collapsed" class="whitespace-nowrap">Inventario</span>
        </NuxtLink>
      </div>

      <!-- Sección Gestión -->
      <div class="space-y-1 pt-4">
        <span v-if="!collapsed" class="px-3 text-[10px] text-titan-500/70 uppercase tracking-widest font-medium">Gestión</span>
        <NuxtLink
          to="/menu/productos"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group',
            collapsed ? 'justify-center' : '',
            activePage === 'menu'
              ? 'bg-crocus-600/20 text-crocus-400 font-medium'
              : 'text-titan-300 hover:bg-ebony-800 hover:text-white'
          ]"
          :title="collapsed ? 'Menú' : ''"
        >
          <CubeIcon :class="['w-5 h-5 flex-shrink-0', activePage === 'menu' ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']" />
          <span v-if="!collapsed" class="whitespace-nowrap">Menú</span>
        </NuxtLink>

        <NuxtLink
          to="/pagos"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group',
            collapsed ? 'justify-center' : '',
            activePage === 'pagos'
              ? 'bg-crocus-600/20 text-crocus-400 font-medium'
              : 'text-titan-300 hover:bg-ebony-800 hover:text-white'
          ]"
          :title="collapsed ? 'Pagos' : ''"
        >
          <BanknotesIcon :class="['w-5 h-5 flex-shrink-0', activePage === 'pagos' ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']" />
          <span v-if="!collapsed" class="whitespace-nowrap">Pagos</span>
        </NuxtLink>

        <NuxtLink
          to="/equipo"
          :class="[
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group',
            collapsed ? 'justify-center' : '',
            activePage === 'equipo'
              ? 'bg-crocus-600/20 text-crocus-400 font-medium'
              : 'text-titan-300 hover:bg-ebony-800 hover:text-white'
          ]"
          :title="collapsed ? 'Equipo' : ''"
        >
          <UsersIcon :class="['w-5 h-5 flex-shrink-0', activePage === 'equipo' ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']" />
          <span v-if="!collapsed" class="whitespace-nowrap">Equipo</span>
        </NuxtLink>
      </div>

      <!-- Cerrar sesión (separado visualmente) -->
      <div class="pt-4 mt-auto">
        <button
          @click="handleLogout"
          :disabled="isLoggingOut"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm group text-titan-400 hover:bg-red-900/20 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed',
            collapsed ? 'justify-center' : ''
          ]"
          :title="collapsed ? 'Cerrar sesión' : ''"
        >
          <ArrowRightOnRectangleIcon class="w-5 h-5 flex-shrink-0 text-titan-500 group-hover:text-red-400" />
          <span v-if="!collapsed" class="whitespace-nowrap">Cerrar sesión</span>
        </button>
      </div>
    </template>

    <!-- User Profile (display only, no menu) -->
    <template #footer>
      <div class="flex items-center gap-3 p-3 rounded-lg bg-ebony-800/50">
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
// Disable automatic attribute inheritance since this is a multi-root component
defineOptions({
  inheritAttrs: false
})

import { computed } from 'vue'
import {
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ComputerDesktopIcon,
  CubeIcon,
  ShoppingCartIcon,
  TruckIcon,
  UsersIcon
} from '@heroicons/vue/24/outline'

interface Props {
  activePage?: 'dashboard' | 'ventas' | 'pos' | 'financiero' | 'abastecimiento' | 'inventario' | 'menu' | 'pagos' | 'equipo' | 'analytics' | 'reportes' | 'configuracion' | 'admin'
}

interface Tenant {
  id: string
  name: string
  slug: string
}

const props = withDefaults(defineProps<Props>(), {
  activePage: 'financiero'
})

// State
const showTenantDropdown = ref(false)
const isLoggingOut = ref(false)
const route = useRoute()
const router = useRouter()

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
  showTenantDropdown.value = false

  const success = await tenantsStore.selectTenant(tenant)

  if (success) {
    // The reactive system will automatically refresh all data in components using useTenantReactive()
  } else {
    // Show error message if needed
  }
}

// Handle logout
const handleLogout = async () => {
  try {
    isLoggingOut.value = true
    showUserMenu.value = false

    // Call signout endpoint
    await $fetch('/api/auth/signout', {
      method: 'POST',
      credentials: 'include'
    })



    // Clear any local storage/session storage
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }

    // Redirect to login page
    await navigateTo('/auth/login')
  } catch (error) {

    // Even if the API call fails, redirect to login for security
    await navigateTo('/auth/login')
  } finally {
    isLoggingOut.value = false
  }
}

// Close tenant dropdown when clicking outside
onMounted(() => {
  const handleClickOutside = (event: Event) => {
    const target = event.target as Element
    const tenantSelector = document.querySelector('.tenant-selector-container')
    if (tenantSelector && !tenantSelector.contains(target)) {
      showTenantDropdown.value = false
    }
  }

  document.addEventListener('click', handleClickOutside)

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>

<style scoped>
/* Tenant dropdown expand/collapse transition */
.tenant-expand-enter-active,
.tenant-expand-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  opacity: 1;
}

.tenant-expand-enter-from,
.tenant-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>