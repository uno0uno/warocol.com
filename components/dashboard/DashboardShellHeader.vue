<template>
  <header class="bg-shell-header-bg border-b border-shell-header-border px-4 py-3 md:px-6 xl:px-8 md:py-4 flex-shrink-0">
    <div class="flex min-w-0 items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2 sm:gap-4">
        <NuxtLink
          to="/financiero"
          class="dashboard-header-logo hidden xl:flex h-12 w-fit min-w-[214px] flex-shrink-0 items-center justify-center overflow-visible"
          :aria-label="t('shell.goToDashboardHome')"
        >
          <img
            :key="route.fullPath"
            :src="logoAnimationSrc"
            alt="WARO Colombia"
            class="h-10 w-full object-contain"
          />
        </NuxtLink>

      </div>

      <TransitionGroup
        name="header-actions"
        tag="div"
          class="dashboard-header-actions relative flex w-fit min-w-0 max-w-full flex-shrink-0 items-center justify-end gap-1.5 overflow-x-auto md:gap-2 lg:overflow-visible"
      >
        <NotificationsNotificationBell key="notifications-bell" class="hidden lg:flex" />

        <NuxtLink
          key="upload-invoice"
          to="/abastecimiento/compras-directas/crear"
          class="flex flex-shrink-0 items-center gap-1 md:gap-2 h-11 bg-shell-cta-bg text-shell-cta-text px-2 lg:px-4 rounded-xl font-medium hover:bg-shell-cta-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring transition-all"
          :title="t('shell.uploadInvoiceAi')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>
          <span class="hidden lg:inline text-base">{{ t('shell.uploadInvoiceAi') }}</span>
        </NuxtLink>

        <button
          key="pos-link"
          type="button"
          class="flex flex-shrink-0 items-center gap-1 md:gap-2 h-11 bg-shell-action-bg border-2 border-shell-action-border text-shell-action-text px-2 lg:px-4 rounded-lg text-base font-medium hover:bg-shell-action-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors"
          :title="t('nav.pos')"
          @click="$emit('navigate-pos')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
          <span class="hidden lg:inline text-base">{{ t('nav.pos') }}</span>
        </button>

        <div key="portal-actions" id="dashboard-header-actions" class="flex items-center" />

        <button
          v-if="headerAction"
          key="dynamic-header-action"
          :class="[
            'h-11 flex-shrink-0 rounded-lg font-medium focus:outline-none focus:ring-2 transition-colors flex items-center justify-center gap-2',
            headerAction.iconOnly
              ? 'bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus:ring-shell-action-focus-ring'
              : 'bg-shell-cta-bg text-shell-cta-text hover:bg-shell-cta-hover-bg focus:ring-shell-cta-focus-ring',
            headerAction.iconOnly ? 'w-11 px-0' : 'max-w-48 px-3 lg:px-4',
          ]"
          :aria-label="headerAction.ariaLabel || headerAction.label"
          :title="headerAction.ariaLabel || headerAction.label"
          @click="headerAction.handler"
        >
          <svg v-if="headerAction.icon === 'printer' || headerAction.icon === true" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9V3h12v6" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 14h12v7H6z" />
          </svg>
          <span v-if="!headerAction.iconOnly" class="truncate">{{ headerAction.label }}</span>
        </button>

        <span
          v-if="status"
          key="dynamic-status"
          :class="['h-11 max-w-36 flex flex-shrink-0 items-center px-3 rounded-lg text-sm font-medium', status.color]"
        >
          <span class="truncate">{{ status.label }}</span>
        </span>

        <DashboardBusinessStatusToggle key="business-status-toggle" />

        <button
          key="refresh-button"
          :disabled="isRefreshing || isProgressiveLoading"
          :aria-label="t('shell.refreshData')"
          :aria-busy="isRefreshing || isProgressiveLoading"
          class="hidden md:flex w-11 h-11 items-center justify-center bg-shell-icon-bg border-0 rounded-lg text-shell-icon-text hover:bg-shell-icon-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
          :title="t('shell.refresh')"
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
const route = useRoute()
const { t } = useI18n()

const logoAnimationSrc = computed(() =>
  `/brand/waro-colombia-animated.svg?route=${encodeURIComponent(route.fullPath)}`,
)

defineProps<{
  status?: { label: string; color: string }
  headerAction?: { label: string; ariaLabel?: string; icon?: boolean | 'printer'; iconOnly?: boolean; handler: () => void }
  isRefreshing?: boolean
  isProgressiveLoading?: boolean
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
