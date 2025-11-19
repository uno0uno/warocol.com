<template>
  <!-- Bottom Navigation - Solo Mobile -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-titan-300 shadow-lg z-50 safe-area-bottom">
    <div class="flex items-center justify-around px-2 py-2">

      <!-- Financiero -->
      <NuxtLink
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
          class="text-[10px] font-medium transition-colors"
          :class="activePage === 'financiero'
            ? 'text-crocus-700 font-semibold'
            : 'text-titan-600'"
        >
          Financiero
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
          class="text-[10px] font-medium transition-colors"
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
          class="text-[10px] font-medium transition-colors"
          :class="activePage === 'pagos'
            ? 'text-crocus-700 font-semibold'
            : 'text-titan-600'"
        >
          Pagos
        </span>
      </NuxtLink>

      <!-- Configuración/Tenant -->
      <button
        @click="showTenantModal = true"
        class="flex flex-col items-center gap-0.5 flex-1 group"
      >
        <div class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-titan-100">
          <Cog6ToothIcon class="w-5 h-5 transition-colors text-titan-500" />
        </div>
        <span class="text-[10px] font-medium transition-colors text-titan-600">
          Más
        </span>
      </button>

    </div>

    <!-- Tenant Selector Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showTenantModal"
          class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-end md:hidden"
          @click="showTenantModal = false"
        >
          <Transition
            enter-active-class="transition-transform duration-300"
            enter-from-class="translate-y-full"
            enter-to-class="translate-y-0"
            leave-active-class="transition-transform duration-300"
            leave-from-class="translate-y-0"
            leave-to-class="translate-y-full"
          >
            <div
              v-if="showTenantModal"
              class="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto"
              @click.stop
            >
              <!-- Header -->
              <div class="sticky top-0 bg-white border-b border-titan-300 px-4 py-4 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-ebony-800">Configuración</h3>
                <button @click="showTenantModal = false" class="p-2 hover:bg-titan-100 rounded-lg">
                  <XMarkIcon class="w-5 h-5 text-titan-500" />
                </button>
              </div>

              <!-- Content -->
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
                      SA
                    </div>
                    <div>
                      <div class="font-semibold text-sm text-ebony-800">Saifer Admin</div>
                      <div class="text-xs text-titan-600">saifer@warocol.com</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </nav>
</template>

<script setup lang="ts">
import {
  BanknotesIcon,
  ChartBarIcon,
  TruckIcon,
  Cog6ToothIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/vue/24/outline'
import { computed } from 'vue'

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

// Modal state
const showTenantModal = ref(false)

// Use tenants store
const tenantsStore = useTenantsStore()

// Computed properties from store
const tenants = computed(() => tenantsStore.tenants)
const selectedTenant = computed(() => tenantsStore.selectedTenant)
const isLoadingTenants = computed(() => tenantsStore.isLoading)

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
