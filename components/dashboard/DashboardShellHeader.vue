<template>
  <header class="bg-shell-header-bg border-b border-shell-header-border px-4 py-3 md:px-8 md:py-4 flex-shrink-0">
    <div class="flex min-w-0 items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2 sm:gap-4">
        <NuxtLink
          v-if="!hideLogo"
          to="/financiero"
          class="dashboard-header-logo hidden lg:flex h-11 w-40 flex-shrink-0 items-center justify-center overflow-hidden px-1"
          aria-label="Ir al inicio del dashboard"
        >
          <img
            :src="logoSrc"
            alt="Waro Colombia"
            class="h-9 w-full object-contain"
          />
        </NuxtLink>

      </div>

      <TransitionGroup
        name="header-actions"
        tag="div"
        class="dashboard-header-actions relative flex min-w-0 max-w-full flex-1 items-center justify-end gap-1.5 overflow-x-auto md:gap-2 lg:flex-none lg:overflow-visible"
      >
        <NotificationsNotificationBell key="notifications-bell" class="hidden lg:flex" />

        <NuxtLink
          key="upload-invoice"
          to="/abastecimiento/compras-directas/crear"
          class="flex items-center gap-1 md:gap-2 h-11 bg-shell-cta-bg text-shell-cta-text px-2 md:px-4 rounded-xl font-medium hover:bg-shell-cta-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring transition-all"
          title="Cargar Factura IA"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>
          <span class="hidden sm:inline">Cargar Factura IA</span>
        </NuxtLink>

        <button
          key="pos-link"
          type="button"
          class="flex items-center gap-1 md:gap-2 h-11 bg-shell-action-bg border-2 border-shell-action-border text-shell-action-text px-2 md:px-4 rounded-lg text-sm font-medium hover:bg-shell-action-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors"
          title="Venta POS"
          @click="$emit('navigate-pos')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
          <span class="hidden sm:inline">Venta POS</span>
        </button>

        <div key="portal-actions" id="dashboard-header-actions" class="flex items-center" />

        <button
          v-if="headerAction"
          key="dynamic-header-action"
          class="h-11 px-4 bg-shell-cta-bg text-shell-cta-text rounded-lg font-medium hover:bg-shell-cta-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring transition-colors flex items-center gap-2"
          @click="headerAction.handler"
        >
          <svg v-if="headerAction.icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 0 2 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4h10z" />
          </svg>
          {{ headerAction.label }}
        </button>

        <span
          v-if="status"
          key="dynamic-status"
          :class="['h-11 flex items-center px-3 rounded-lg text-sm font-medium', status.color]"
        >
          {{ status.label }}
        </span>

        <DashboardBusinessStatusToggle key="business-status-toggle" />

        <button
          key="refresh-button"
          :disabled="isRefreshing || isProgressiveLoading"
          aria-label="Refrescar datos"
          :aria-busy="isRefreshing || isProgressiveLoading"
          class="hidden md:flex w-11 h-11 items-center justify-center bg-shell-icon-bg border-0 rounded-lg text-shell-icon-text hover:bg-shell-icon-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refrescar"
          @click="$emit('refresh')"
        >
          <UiLoadingMatrix v-if="isRefreshing || isProgressiveLoading" size="5.5px" />
          <svg
            v-else
            class="w-5 h-5 transition-transform duration-300 hover:rotate-180"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <DashboardTenantSelector key="tenant-selector" />
      </TransitionGroup>
    </div>
  </header>
</template>

<script setup lang="ts">
import logoSrc from '~/public/logo_waro_colombia.png'

defineProps<{
  status?: { label: string; color: string }
  headerAction?: { label: string; icon?: boolean; handler: () => void }
  isRefreshing?: boolean
  isProgressiveLoading?: boolean
  hideLogo?: boolean
}>()

defineEmits<{
  (e: 'refresh'): void
  (e: 'navigate-pos'): void
}>()
</script>

<style scoped>
#dashboard-header-actions {
  position: relative;
}

#dashboard-header-actions:empty {
  display: none;
}

#dashboard-header-actions > * {
  animation: dashboard-header-portal-in 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.dashboard-header-actions {
  scrollbar-width: none;
}

.dashboard-header-actions::-webkit-scrollbar {
  display: none;
}

@keyframes dashboard-header-portal-in {
  from {
    opacity: 0;
    transform: translateX(14px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.header-actions-move,
.header-actions-enter-active,
.header-actions-leave-active {
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.24s ease,
    filter 0.24s ease;
}

.header-actions-enter-from {
  opacity: 0;
  filter: blur(2px);
  transform: translateX(14px);
}

.header-actions-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateX(-10px);
}

.header-actions-leave-active {
  position: absolute;
  pointer-events: none;
}
</style>
