<template>
  <!-- Bottom Navigation - Mobile & Tablet -->
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-titan-300 shadow-lg z-50 safe-area-bottom">
    <div class="flex items-center justify-around px-2 py-2">

      <!-- Financiero - Temporarily disabled -->
      <!-- <NuxtLink
        to="/financiero"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
          :class="activePage === 'financiero'
            ? 'bg-crocus-100'
            : 'hover:bg-titan-100'"
        >
          <ChartBarIcon
            class="w-5 h-5 transition-colors"
            :class="activePage === 'financiero'
              ? 'text-crocus-600'
              : 'text-titan-500'"
          />
        </div>
        <span
          class="text-xs font-medium transition-colors"
          :class="activePage === 'financiero'
            ? 'text-crocus-700 font-semibold'
            : 'text-titan-600'"
        >
          Financiero
        </span>
      </NuxtLink> -->

      <!-- POS -->
      <NuxtLink
        to="/pos"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
          :class="activePage === 'pos'
            ? 'bg-crocus-100'
            : 'hover:bg-titan-100'"
        >
          <ComputerDesktopIcon
            class="w-5 h-5 transition-colors"
            :class="activePage === 'pos'
              ? 'text-crocus-600'
              : 'text-titan-500'"
          />
        </div>
        <span
          class="text-xs font-medium transition-colors"
          :class="activePage === 'pos'
            ? 'text-crocus-700 font-semibold'
            : 'text-titan-600'"
        >
          POS
        </span>
      </NuxtLink>

      <!-- Abastecimiento -->
      <NuxtLink
        to="/abastecimiento"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
          :class="activePage === 'abastecimiento'
            ? 'bg-crocus-100'
            : 'hover:bg-titan-100'"
        >
          <TruckIcon
            class="w-5 h-5 transition-colors"
            :class="activePage === 'abastecimiento'
              ? 'text-crocus-600'
              : 'text-titan-500'"
          />
        </div>
        <span
          class="text-xs font-medium transition-colors"
          :class="activePage === 'abastecimiento'
            ? 'text-crocus-700 font-semibold'
            : 'text-titan-600'"
        >
          Abastecimiento
        </span>
      </NuxtLink>

      <!-- Pagos -->
      <NuxtLink
        to="/pagos"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
          :class="activePage === 'pagos'
            ? 'bg-crocus-100'
            : 'hover:bg-titan-100'"
        >
          <BanknotesIcon
            class="w-5 h-5 transition-colors"
            :class="activePage === 'pagos'
              ? 'text-crocus-600'
              : 'text-titan-500'"
          />
        </div>
        <span
          class="text-xs font-medium transition-colors"
          :class="activePage === 'pagos'
            ? 'text-crocus-700 font-semibold'
            : 'text-titan-600'"
        >
          Pagos
        </span>
      </NuxtLink>

      <!-- Refresh Button (solo si se proporciona onRefresh) -->
      <button
        v-if="onRefresh"
        @click="onRefresh"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100">
          <svg class="w-5 h-5 transition-transform group-hover:rotate-180 duration-300 text-titan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </div>
        <span class="text-xs font-medium transition-colors text-titan-600">
          Refrescar
        </span>
      </button>

      <!-- Configuración/Tenant -->
      <button
        @click="showTenantModal = true"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100">
          <Cog6ToothIcon class="w-5 h-5 transition-colors text-titan-500" />
        </div>
        <span class="text-xs font-medium transition-colors text-titan-600">
          Más
        </span>
      </button>

    </div>

    <!-- Tenant Selector Modal -->
    <UiBottomSheetModal v-model="showTenantModal" title="Configuración" max-height="lg">
      <div class="p-4 space-y-6">
        <!-- Equipo Link -->
        <div>
          <NuxtLink
            to="/equipo"
            @click="showTenantModal = false"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-titan-200 hover:border-crocus-300 hover:bg-titan-50 transition-colors"
          >
            <div class="w-10 h-10 bg-crocus-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-crocus-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div class="flex-1">
              <div class="font-semibold text-sm text-ebony-800">Miembros de equipo</div>
              <div class="text-xs text-titan-600">Gestionar usuarios y permisos</div>
            </div>
            <svg class="w-5 h-5 text-titan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </div>

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
  BanknotesIcon,
  ChartBarIcon,
  ComputerDesktopIcon,
  TruckIcon,
  Cog6ToothIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'
import { computed } from 'vue'

interface Props {
  activePage?: 'dashboard' | 'pos' | 'financiero' | 'abastecimiento' | 'pagos' | 'analytics' | 'reportes' | 'configuracion' | 'admin'
  onRefresh?: () => void | Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  activePage: 'financiero'
})

interface Tenant {
  id: string
  name: string
  slug: string
}

// Modal state
const showTenantModal = ref(false)

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
