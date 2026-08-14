<template>
  <div>
  <!-- Tenant Switch Modal -->
  <Teleport to="body">
    <Transition name="tenant-modal">
      <div
        v-if="showTenantModal"
        class="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center"
        @click.self="closeTenantModal"
      >
        <div
          class="absolute inset-0 bg-overlay-backdrop-strong/60 backdrop-blur-sm"
          aria-hidden="true"
          @click="closeTenantModal"
        />
        <div
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="relative w-full sm:w-[420px] sm:max-w-[90vw] bg-sheet-surface-bg sm:rounded-xl rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh] sm:max-h-[60vh]"
        >
          <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sheet-border flex-shrink-0">
            <h2 :id="titleId" class="text-sm font-semibold text-modal-surface-text">
              {{ t('shell.selectTenant') }}
            </h2>
            <button
              type="button"
              class="min-h-11 min-w-11 -me-2 flex items-center justify-center rounded-lg text-shell-notification-muted-text hover:bg-shell-notification-hover-bg hover:text-shell-notification-text focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors"
              :aria-label="t('common.close')"
              @click="closeTenantModal"
            >
              <XMarkIcon class="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <DashboardTenantPickerList
            ref="pickerRef"
            @select="selectTenant"
            @create="openCreatePanel"
          />
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Header: Tenant + User info (desktop only) -->
  <div class="hidden lg:flex items-center gap-1">
    <!-- Tenant selector — compact -->
    <button
      type="button"
      :disabled="isLoadingTenants"
      :aria-label="t('shell.switchTenant')"
      :aria-haspopup="true"
      :aria-expanded="showTenantModal"
      :title="isLoadingTenants ? t('shell.loadingTenants') : (selectedTenant?.name || t('shell.selectTenant'))"
      class="flex items-center gap-1.5 h-9 px-2 bg-shell-action-bg border border-shell-action-border rounded-lg text-xs font-medium text-shell-action-text hover:bg-shell-action-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      @click="openTenantModal"
    >
      <span class="w-1.5 h-1.5 bg-shell-account-indicator-bg rounded-full flex-shrink-0" aria-hidden="true" />
      <span class="truncate max-w-[7.5rem] xl:max-w-[9rem]">{{ isLoadingTenants ? t('common.loading') : (selectedTenant?.name || t('shell.selectTenant')) }}</span>
      <ChevronDownIcon class="w-3.5 h-3.5 text-shell-account-chevron-text flex-shrink-0" aria-hidden="true" />
    </button>

    <!-- User profile — avatar only (name in aria/title) -->
    <NuxtLink
      to="/perfil"
      :aria-label="t('perfil.navigation.open')"
      :title="userName"
      class="flex items-center justify-center h-9 w-9 bg-shell-action-bg border border-shell-action-border rounded-lg hover:bg-shell-action-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors"
    >
      <div class="w-7 h-7 bg-shell-account-avatar-bg border border-shell-account-avatar-border rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
        <img v-if="userAvatar" :src="userAvatar" :alt="t('perfil.avatar.alt', { name: userName })" class="h-full w-full object-cover">
        <span v-else class="text-[10px] font-bold text-shell-account-icon-text" aria-hidden="true">{{ userInitials }}</span>
      </div>
    </NuxtLink>
  </div>

  <CreateTenantPanel v-model="showCreatePanel" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted, watch } from 'vue'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import type { Tenant } from '~/stores/tenants'
import { useAuthStore } from '~/stores/auth'

const showTenantModal = ref(false)
const showCreatePanel = ref(false)
const pickerRef = ref<{ resetAndFocus: () => Promise<void> } | null>(null)
const titleId = useId()

const openTenantModal = async () => {
  showTenantModal.value = true
  await nextTick()
  await pickerRef.value?.resetAndFocus()
}
const closeTenantModal = () => { showTenantModal.value = false }

const openCreatePanel = () => {
  closeTenantModal()
  showCreatePanel.value = true
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !showTenantModal.value) return
  event.preventDefault()
  closeTenantModal()
}

watch(showTenantModal, (open) => {
  if (open) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const { t } = useI18n()
const tenantsStore = useTenantsStore()
const selectedTenant = computed(() => tenantsStore.selectedTenant)
const isLoadingTenants = computed(() => tenantsStore.isLoading)
const { selectTenantWithBillingGuard } = useDashboardTenantSwitch()

const authStore = useAuthStore()
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

<style scoped>
.tenant-modal-enter-active,
.tenant-modal-leave-active {
  transition: opacity 0.2s ease;
}
.tenant-modal-enter-from,
.tenant-modal-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .tenant-modal-enter-active,
  .tenant-modal-leave-active {
    transition: none;
  }
}
</style>
