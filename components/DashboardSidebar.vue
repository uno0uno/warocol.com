<template>
  <aside class="w-64 bg-ebony-800 text-white h-screen flex flex-col flex-shrink-0">
    <div class="p-6 border-b border-ebony-600">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-crocus-500 rounded-lg flex items-center justify-center font-bold text-lg">
          W
        </div>
        <span class="font-bold text-lg">Warocol</span>
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
              <div class="w-2 h-2 bg-crocus-500 rounded-full"></div>
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
                <div class="w-2 h-2 bg-crocus-500 rounded-full"></div>
                <span>{{ tenant.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <nav class="flex-1 p-4 overflow-y-auto">
      <NuxtLink 
        to="/financiero" 
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors',
          activePage === 'financiero' 
            ? 'bg-ebony-600 text-white' 
            : 'text-titan-600 hover:bg-ebony-600 hover:text-white'
        ]"
      >
        <ChartBarIcon class="w-5 h-5" />
        <span>Financiero</span>
      </NuxtLink>


    </nav>

    <!-- User Profile -->
    <div class="p-4 border-t border-ebony-600">
      <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-ebony-600 cursor-pointer">
        <div class="w-10 h-10 bg-crocus-500 rounded-full flex items-center justify-center font-bold">
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
import { 
  ChartBarIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'

interface Props {
  activePage?: 'dashboard' | 'financiero' | 'analytics' | 'reportes' | 'configuracion' | 'admin'
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