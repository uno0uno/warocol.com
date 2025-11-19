<template>
  <!-- Desktop Sidebar Only -->
  <aside
    class="w-64 py-4 px-6 bg-ebony-800 text-white h-screen flex flex-col justify-between flex-shrink-0"
  >
      <div class="flex flex-col gap-8">

        <div class="border-b border-ebony-600 flex flex-col gap-8">
          <div class="flex border border-ebony-600 px-5 py-2 rounded-lg">
            <div class="w-full h-full rounded-lg flex items-center justify-center">
              <img src="/logo_waro_10_octubre.png" alt="Waro" class="w-5/6 h-full px-2 object-contain" style="filter: brightness(0) invert(1);">
            </div>
          </div>
          
          <!-- Tenant Selector -->
          <div class="relative">
            <label class="text-xs text-titan-600 font-medium mb-2 block">Tenant</label>
            <div class="relative">
              <button 
                @click="showTenantDropdown = !showTenantDropdown"
                :disabled="isLoadingTenants"
                class="w-full flex items-center justify-between px-3 py-2 bg-ebony-700 border border-ebony-600 rounded-lg text-sm text-white hover:bg-ebony-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 bg-titan-600 rounded-full"></div>
                  <span v-if="isLoadingTenants">Loading...</span>
                  <span v-else>{{ selectedTenant?.name || 'Select Tenant' }}</span>
                </div>
                <ChevronDownIcon :class="['w-4 h-4 transition-transform', showTenantDropdown ? 'rotate-180' : '']" />
              </button>
              
              <!-- Dropdown -->
              <div 
                v-show="showTenantDropdown" 
                class="absolute top-full left-0 right-0 mt-1 bg-ebony-700 border border-ebony-600 rounded-lg shadow-lg z-50"
              >
                <div class="py-1">
                  <div v-if="isLoadingTenants" class="px-3 py-2 text-sm text-titan-600">
                    Loading tenants...
                  </div>
                  <div v-else-if="tenants.length === 0" class="px-3 py-2 text-sm text-titan-600">
                    No tenants available
                  </div>
                  <button
                    v-else
                    v-for="tenant in tenants"
                    :key="tenant.id"
                    @click="selectTenant(tenant)"
                    :disabled="isLoadingTenants"
                    class="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-ebony-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    :class="selectedTenant?.id === tenant.id ? 'bg-ebony-600' : ''"
                  >
                    <div class="w-2 h-2 bg-titan-600 rounded-full"></div>
                    <span>{{ tenant.name }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav class="flex flex-col gap-1 overflow-y-auto">
          <NuxtLink 
            to="/financiero" 
            :class="[
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              activePage === 'financiero' 
                ? 'bg-ebony-600 text-white' 
                : 'text-titan-600 hover:bg-ebony-600 hover:text-white'
            ]"
          >
            <ChartBarIcon class="w-5 h-5" />
            <span>Financiero</span>
          </NuxtLink>

          <NuxtLink
            to="/abastecimiento"
            :class="[
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              activePage === 'abastecimiento'
                ? 'bg-ebony-600 text-white'
                : 'text-titan-600 hover:bg-ebony-600 hover:text-white'
            ]"
          >
            <TruckIcon class="w-5 h-5" />
            <span>Abastecimiento</span>
          </NuxtLink>

          <NuxtLink
            to="/pagos"
            :class="[
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              activePage === 'pagos'
                ? 'bg-ebony-600 text-white'
                : 'text-titan-600 hover:bg-ebony-600 hover:text-white'
            ]"
          >
            <BanknotesIcon class="w-5 h-5" />
            <span>Pagos</span>
          </NuxtLink>
        </nav>
        
      </div>
      <!-- User Profile -->
      <div class="">
        <div class="flex items-center gap-3 rounded-lg hover:bg-ebony-600 cursor-pointer">
          <div class="w-10 h-10 bg-ebony-900 rounded-full flex items-center justify-center font-bold">
            SA
          </div>
          <div>
            <div class="font-semibold text-sm">Saifer Admin</div>
            <div class="text-xs text-titan-600">saifer@warocol.com</div>
          </div>
        </div>
      </div>

  </aside>
</template>

<script setup lang="ts">
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
const route = useRoute()
const router = useRouter()

// Use tenants store
const tenantsStore = useTenantsStore()

// Computed properties from store
const tenants = computed(() => tenantsStore.tenants)
const selectedTenant = computed(() => tenantsStore.selectedTenant)
const isLoadingTenants = computed(() => tenantsStore.isLoading)

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

// Close dropdown when clicking outside
onMounted(() => {
  const handleClickOutside = (event: Event) => {
    const target = event.target as Element
    if (!target.closest('.relative')) {
      showTenantDropdown.value = false
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})
</script>