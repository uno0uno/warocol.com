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
    <template #navigation>
      <!-- Financiero - Temporarily disabled -->
      <!-- <NuxtLink
        to="/financiero"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium group',
          activePage === 'financiero'
            ? 'bg-crocus-600/20 text-crocus-400'
            : 'text-titan-400 hover:bg-ebony-800 hover:text-white'
        ]"
      >
        <ChartBarIcon :class="['w-5 h-5', activePage === 'financiero' ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']" />
        <span>Financiero</span>
      </NuxtLink> -->

      <NuxtLink
        to="/abastecimiento"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium group',
          activePage === 'abastecimiento'
            ? 'bg-crocus-600/20 text-crocus-400'
            : 'text-titan-400 hover:bg-ebony-800 hover:text-white'
        ]"
      >
        <TruckIcon :class="['w-5 h-5', activePage === 'abastecimiento' ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']" />
        <span>Abastecimiento</span>
      </NuxtLink>

      <NuxtLink
        to="/pagos"
        :class="[
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium group',
          activePage === 'pagos'
            ? 'bg-crocus-600/20 text-crocus-400'
            : 'text-titan-400 hover:bg-ebony-800 hover:text-white'
        ]"
      >
        <BanknotesIcon :class="['w-5 h-5', activePage === 'pagos' ? 'text-crocus-500' : 'text-titan-500 group-hover:text-titan-300']" />
        <span>Pagos</span>
      </NuxtLink>
    </template>

    <!-- User Profile -->
    <template #footer>
      <div class="relative user-menu-container">
        <!-- Popover Menu -->
        <div
          v-show="showUserMenu"
          class="absolute bottom-full left-0 right-0 mb-2 bg-ebony-800 border border-ebony-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2"
        >
          <!-- Menu Header -->
          <div class="p-3 border-b border-ebony-700 flex items-center gap-3 bg-ebony-900/30">
            <div class="w-8 h-8 bg-crocus-600 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0">
              {{ userInitials }}
            </div>
            <div class="flex-1 overflow-hidden">
              <div class="text-sm font-medium text-white truncate">{{ userName }}</div>
              <div class="text-xs text-titan-400 truncate">{{ userEmail }}</div>
            </div>
          </div>

          <!-- Menu Options -->
          <div class="p-1">
            <NuxtLink
              to="/equipo"
              class="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-titan-300 hover:bg-ebony-700 rounded-md transition-colors"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Equipo
            </NuxtLink>
            <div class="h-px bg-ebony-700 my-1 mx-2"></div>
            <button
              @click="handleLogout"
              :disabled="isLoggingOut"
              class="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-titan-300 hover:bg-ebony-700 rounded-md transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                class="w-3.5 h-3.5 group-hover:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span class="group-hover:text-red-400 transition-colors">
                Cerrar sesión
              </span>
            </button>
          </div>
        </div>

        <!-- User Button -->
        <button
          @click="showUserMenu = !showUserMenu"
          :class="[
            'w-full flex items-center justify-between p-3 rounded-lg transition-colors',
            showUserMenu ? 'bg-crocus-600/20 border border-crocus-600/30' : 'hover:bg-ebony-800'
          ]"
        >
          <div class="flex items-center gap-3">
            <div class="relative flex-shrink-0">
              <div class="w-8 h-8 bg-crocus-600 rounded-full flex items-center justify-center font-semibold text-white text-xs">
                {{ userInitials }}
              </div>
              <span class="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-ebony-900 rounded-full"></span>
            </div>
            <div class="flex-1 min-w-0 text-left">
              <div :class="['text-sm font-medium', showUserMenu ? 'text-crocus-400' : 'text-white']">{{ userName }}</div>
              <div :class="['text-xs truncate max-w-[120px]', showUserMenu ? 'text-crocus-400/60' : 'text-titan-400']">{{ userEmail }}</div>
            </div>
          </div>
          <svg class="w-3.5 h-3.5 text-titan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </button>
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
  BanknotesIcon,
  ChartBarIcon,
  ChevronDownIcon,
  TruckIcon
} from '@heroicons/vue/24/outline'

interface Props {
  activePage?: 'dashboard' | 'financiero' | 'abastecimiento' | 'pagos' | 'analytics' | 'reportes' | 'configuracion' | 'admin'
}

interface Tenant {
  id: string
  name: string
  slug: string
}

const props = withDefaults(defineProps<Props>(), {
  activePage: 'financiero'
})

// Tenant selector state
const showTenantDropdown = ref(false)
const showUserMenu = ref(false)
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
    console.log(`✅ Tenant switched successfully to: ${tenant.name}`)
  } else {
    // Show error message if needed
    console.error('Failed to switch tenant')
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

    console.log('✅ Logged out successfully')

    // Clear any local storage/session storage
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }

    // Redirect to login page
    await navigateTo('/auth/login')
  } catch (error) {
    console.error('❌ Logout error:', error)
    // Even if the API call fails, redirect to login for security
    await navigateTo('/auth/login')
  } finally {
    isLoggingOut.value = false
  }
}

// Close dropdowns when clicking outside
onMounted(() => {
  const handleClickOutside = (event: Event) => {
    const target = event.target as Element

    // Close tenant dropdown if clicking outside
    const tenantSelector = document.querySelector('.tenant-selector-container')
    if (tenantSelector && !tenantSelector.contains(target)) {
      showTenantDropdown.value = false
    }

    // Close user menu if clicking outside
    const userMenu = document.querySelector('.user-menu-container')
    if (userMenu && !userMenu.contains(target)) {
      showUserMenu.value = false
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