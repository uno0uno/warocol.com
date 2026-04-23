<template>
  <!-- Tenant Switch Modal -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="showTenantModal"
        class="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center"
        @click.self="closeTenantModal"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeTenantModal" />
        <div class="relative w-full sm:w-[420px] sm:max-w-[90vw] bg-white sm:rounded-xl rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh] sm:max-h-[60vh]">
          <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-titan-200 flex-shrink-0">
            <p class="text-sm font-semibold text-ebony-800">Cambiar negocio</p>
            <button @click="closeTenantModal" class="p-1.5 rounded-lg text-titan-400 hover:bg-titan-100 hover:text-ebony-700 transition-colors">
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
          <div class="px-4 py-3 flex-shrink-0">
            <div class="flex items-center gap-2 px-3 py-2 border-b border-titan-200 focus-within:border-crocus-400 transition-colors">
              <MagnifyingGlassIcon class="w-4 h-4 text-titan-400 flex-shrink-0" />
              <input
                ref="searchInputRef"
                v-model="tenantSearch"
                type="text"
                placeholder="Buscar negocio..."
                class="flex-1 bg-transparent text-sm text-ebony-800 placeholder-titan-400 outline-none"
              />
              <button v-if="tenantSearch" @click="tenantSearch = ''" class="text-titan-400 hover:text-ebony-700">
                <XMarkIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
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
              :class="selectedTenant?.id === tenant.id ? 'bg-crocus-50 text-crocus-700 font-medium' : 'text-ebony-700 hover:bg-titan-50'"
            >
              <div class="w-2 h-2 rounded-full flex-shrink-0" :class="selectedTenant?.id === tenant.id ? 'bg-crocus-500' : 'bg-titan-300'" />
              <span class="truncate">{{ tenant.name }}</span>
              <CheckIcon v-if="selectedTenant?.id === tenant.id" class="w-4 h-4 ml-auto text-crocus-500 flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Header: Tenant + User info (desktop only) -->
  <div class="hidden lg:flex items-center gap-2">
    <!-- Tenant selector button — same style as refresh button -->
    <button
      @click="openTenantModal"
      :disabled="isLoadingTenants"
      aria-label="Cambiar negocio"
      class="flex items-center gap-2 h-11 px-3 bg-surface-secondary rounded-lg text-sm font-medium text-text-primary hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span class="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
      <span class="truncate max-w-[150px]">{{ isLoadingTenants ? 'Cargando...' : (selectedTenant?.name || 'Seleccionar') }}</span>
      <ChevronDownIcon class="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
    </button>

    <!-- User info — name + purple avatar icon -->
    <div class="flex items-center gap-2 h-11 px-3 bg-surface-secondary rounded-lg">
      <span class="text-sm font-medium text-text-primary truncate max-w-[120px]">{{ userName }}</span>
      <div class="w-8 h-8 bg-white border border-white rounded-lg flex items-center justify-center flex-shrink-0">
        <UserIcon class="w-4 h-4 text-primary" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon, MagnifyingGlassIcon, CheckIcon, ChevronDownIcon, UserIcon } from '@heroicons/vue/24/outline'

interface Tenant { id: string; name: string; slug: string }

const showTenantModal = ref(false)
const tenantSearch = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const router = useRouter()

const filteredTenants = computed(() =>
  tenantSearch.value.trim()
    ? tenants.value.filter((t: Tenant) => t.name.toLowerCase().includes(tenantSearch.value.toLowerCase()))
    : tenants.value
)

const openTenantModal = () => {
  tenantSearch.value = ''
  showTenantModal.value = true
  nextTick(() => searchInputRef.value?.focus())
}
const closeTenantModal = () => { showTenantModal.value = false }

const { subscription: billingSubscription, fetchSubscription: fetchBillingSubscription } = useBilling()
const tenantsStore = useTenantsStore()
const tenants = computed(() => tenantsStore.tenants)
const selectedTenant = computed(() => tenantsStore.selectedTenant)
const isLoadingTenants = computed(() => tenantsStore.isLoading)

const authStore = useAuthStore()
const userName = computed(() => authStore.user?.name || authStore.session?.user?.name || 'Usuario')
const userEmail = computed(() => authStore.user?.email || authStore.session?.user?.email || '')
const userInitials = computed(() => {
  const name = userName.value
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
})

const selectTenant = async (tenant: Tenant) => {
  closeTenantModal()
  const success = await tenantsStore.selectTenant(tenant)
  if (!success) return

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
