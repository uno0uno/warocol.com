<template>
  <div>
  <!-- Tenant Switch Modal -->
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="showTenantModal"
        class="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center"
        @click.self="closeTenantModal"
      >
        <div class="absolute inset-0 bg-overlay-backdrop-strong/60 backdrop-blur-sm" @click="closeTenantModal" />
        <div class="relative w-full sm:w-[420px] sm:max-w-[90vw] bg-sheet-surface-bg sm:rounded-xl rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh] sm:max-h-[60vh]">
          <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sheet-border flex-shrink-0">
            <p class="text-sm font-semibold text-modal-surface-text">Cambiar negocio</p>
            <button @click="closeTenantModal" class="p-1.5 rounded-lg text-shell-notification-muted-text hover:bg-shell-notification-hover-bg hover:text-shell-notification-text focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors">
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
          <div class="px-4 py-3 flex-shrink-0">
            <div class="flex items-center gap-2 px-3 py-2 border-b border-form-control-border focus-within:border-form-control-focus-border transition-colors">
              <MagnifyingGlassIcon class="w-4 h-4 text-form-control-placeholder flex-shrink-0" />
              <input
                ref="searchInputRef"
                v-model="tenantSearch"
                type="text"
                placeholder="Buscar negocio..."
                class="flex-1 bg-transparent text-sm text-form-control-text placeholder-form-control-placeholder outline-none"
              />
              <button v-if="tenantSearch" @click="tenantSearch = ''" class="text-form-control-placeholder hover:text-form-control-text">
                <XMarkIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div class="overflow-y-auto px-3 pb-4 space-y-0.5">
            <div v-if="isLoadingTenants" class="px-3 py-3 text-sm text-form-control-help text-center">Cargando...</div>
            <div v-else-if="filteredTenants.length === 0" class="px-3 py-3 text-sm text-form-control-help text-center">Sin resultados</div>
            <button
              v-else
              v-for="tenant in filteredTenants"
              :key="tenant.id"
              @click="selectTenant(tenant)"
              :disabled="isLoadingTenants"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left disabled:opacity-50"
              :class="selectedTenant?.id === tenant.id ? 'bg-shell-notification-accent-bg text-shell-notification-text font-medium' : 'text-shell-notification-muted-text hover:bg-shell-notification-hover-bg'"
            >
              <div class="w-2 h-2 rounded-full flex-shrink-0" :class="selectedTenant?.id === tenant.id ? 'bg-shell-account-indicator-bg' : 'bg-badge-neutral-bg'" />
              <span class="truncate">{{ tenant.name }}</span>
              <CheckIcon v-if="selectedTenant?.id === tenant.id" class="w-4 h-4 ml-auto text-shell-account-icon-text flex-shrink-0" />
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
      class="flex items-center gap-2 h-11 px-3 bg-shell-account-bg border-2 border-shell-account-border rounded-lg text-sm font-medium text-shell-account-text hover:bg-shell-account-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span class="w-2 h-2 bg-shell-account-indicator-bg rounded-full flex-shrink-0" />
      <span class="truncate max-w-[150px]">{{ isLoadingTenants ? 'Cargando...' : (selectedTenant?.name || 'Seleccionar') }}</span>
      <ChevronDownIcon class="w-3.5 h-3.5 text-shell-account-chevron-text flex-shrink-0" />
    </button>

    <!-- User info — name + purple avatar icon -->
    <div class="flex items-center gap-2 h-11 px-3 bg-shell-account-bg border-2 border-shell-account-border rounded-lg">
      <span class="text-sm font-medium text-shell-account-text truncate max-w-[120px]">{{ userName }}</span>
      <div class="w-8 h-8 bg-shell-account-avatar-bg border border-shell-account-avatar-border rounded-lg flex items-center justify-center flex-shrink-0">
        <UserIcon class="w-4 h-4 text-shell-account-icon-text" />
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { XMarkIcon, MagnifyingGlassIcon, CheckIcon, ChevronDownIcon, UserIcon } from '@heroicons/vue/24/outline'
import type { Tenant } from '~/stores/tenants'
import { useAuthStore } from '~/stores/auth'

const showTenantModal = ref(false)
const tenantSearch = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

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

const tenantsStore = useTenantsStore()
const tenants = computed(() => tenantsStore.tenants)
const selectedTenant = computed(() => tenantsStore.selectedTenant)
const isLoadingTenants = computed(() => tenantsStore.isLoading)
const { selectTenantWithBillingGuard } = useDashboardTenantSwitch()

const authStore = useAuthStore()
const userName = computed(() => authStore.user?.name || authStore.session?.user?.name || 'Usuario')
const userEmail = computed(() => authStore.user?.email || authStore.session?.user?.email || '')
const userInitials = computed(() => {
  const name = userName.value
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
})

const selectTenant = async (tenant: Tenant) => {
  closeTenantModal()
  await selectTenantWithBillingGuard(tenant)
}
</script>
