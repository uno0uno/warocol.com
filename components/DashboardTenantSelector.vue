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
            <p class="text-sm font-semibold text-modal-surface-text">{{ t('shell.selectTenant') }}</p>
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
                :placeholder="t('shell.searchTenants')"
                class="flex-1 bg-transparent text-sm text-form-control-text placeholder-form-control-placeholder outline-none"
              />
              <button v-if="tenantSearch" @click="tenantSearch = ''" class="text-form-control-placeholder hover:text-form-control-text">
                <XMarkIcon class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div class="overflow-y-auto px-3 pb-4 space-y-0.5">
            <div v-if="isLoadingTenants" class="px-3 py-3 text-sm text-form-control-help text-center">{{ t('shell.loadingTenants') }}</div>
            <template v-else>
              <div v-if="filteredTenants.length === 0" class="px-3 py-3 text-sm text-form-control-help text-center">{{ t('shell.noTenantResults') }}</div>
              <button
                v-for="tenant in filteredTenants"
                :key="tenant.id"
                @click="selectTenant(tenant)"
                :disabled="isLoadingTenants"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-start disabled:opacity-50"
                :class="selectedTenant?.id === tenant.id ? 'bg-shell-notification-accent-bg text-shell-notification-text font-medium' : 'text-shell-notification-muted-text hover:bg-shell-notification-hover-bg'"
              >
                <div class="w-2 h-2 rounded-full flex-shrink-0" :class="selectedTenant?.id === tenant.id ? 'bg-shell-account-indicator-bg' : 'bg-badge-neutral-bg'" />
                <span class="truncate">{{ tenant.name }}</span>
                <CheckIcon v-if="selectedTenant?.id === tenant.id" class="w-4 h-4 ms-auto text-shell-account-icon-text flex-shrink-0" />
              </button>
              <button
                v-if="isSuperuser"
                type="button"
                class="w-full flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg text-sm font-medium text-shell-notification-text hover:bg-shell-notification-hover-bg transition-colors text-start"
                @click="openCreatePanel"
              >
                <PlusIcon class="w-4 h-4 flex-shrink-0" />
                <span>{{ t('shell.createTenant') }}</span>
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Header: Tenant + User info (desktop only) -->
  <div class="hidden lg:flex items-center gap-1">
    <!-- Tenant selector — compact -->
    <button
      @click="openTenantModal"
      :disabled="isLoadingTenants"
      aria-label="Cambiar negocio"
      :title="isLoadingTenants ? 'Cargando...' : (selectedTenant?.name || 'Seleccionar')"
      class="flex items-center gap-1.5 h-9 px-2 bg-shell-action-bg border border-shell-action-border rounded-lg text-xs font-medium text-shell-action-text hover:bg-shell-action-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span class="w-1.5 h-1.5 bg-shell-account-indicator-bg rounded-full flex-shrink-0" />
      <span class="truncate max-w-[7.5rem] xl:max-w-[9rem]">{{ isLoadingTenants ? 'Cargando...' : (selectedTenant?.name || 'Seleccionar') }}</span>
      <ChevronDownIcon class="w-3.5 h-3.5 text-shell-account-chevron-text flex-shrink-0" />
    </button>

    <!-- User profile — avatar only (name in aria/title) -->
    <NuxtLink
      to="/perfil"
      :aria-label="t('perfil.navigation.open')"
      :title="userName"
      class="flex items-center justify-center h-9 w-9 bg-shell-action-bg border border-shell-action-border rounded-lg hover:bg-shell-action-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors"
    >
      <div class="w-7 h-7 bg-shell-account-avatar-bg border border-shell-account-avatar-border rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
        <img v-if="userAvatar" :src="userAvatar" :alt="t('perfil.avatar.alt', { name: userName })" class="h-full w-full object-cover" />
        <span v-else class="text-[10px] font-bold text-shell-account-icon-text" aria-hidden="true">{{ userInitials }}</span>
      </div>
    </NuxtLink>
  </div>

  <CreateTenantPanel v-model="showCreatePanel" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { XMarkIcon, MagnifyingGlassIcon, CheckIcon, ChevronDownIcon, PlusIcon } from '@heroicons/vue/24/outline'
import type { Tenant } from '~/stores/tenants'
import { useAuthStore } from '~/stores/auth'

const showTenantModal = ref(false)
const showCreatePanel = ref(false)
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

const openCreatePanel = () => {
  closeTenantModal()
  showCreatePanel.value = true
}

const { t } = useI18n()
const tenantsStore = useTenantsStore()
const tenants = computed(() => tenantsStore.tenants)
const selectedTenant = computed(() => tenantsStore.selectedTenant)
const isLoadingTenants = computed(() => tenantsStore.isLoading)
const { selectTenantWithBillingGuard } = useDashboardTenantSwitch()

const authStore = useAuthStore()
const isSuperuser = computed(() =>
  authStore.displayUser?.role === 'superuser' ||
  authStore.session?.user?.role === 'superuser'
)
const userName = computed(() => authStore.displayUser.name)
const userAvatar = computed(() => authStore.displayUser.avatar)
const userInitials = computed(() => {
  const name = userName.value
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
})

const selectTenant = async (tenant: Tenant) => {
  closeTenantModal()
  await selectTenantWithBillingGuard(tenant)
}
</script>
