<template>
  <header class="bg-shell-header-bg border-b border-shell-header-border px-3 py-2 md:px-5 xl:px-6 flex-shrink-0">
    <div class="flex min-w-0 items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <NuxtLink
          v-if="!hideLogo"
          :to="dashboardHome"
          class="dashboard-header-logo hidden xl:flex h-9 w-fit max-w-[160px] flex-shrink-0 items-center justify-start overflow-visible"
          :aria-label="t('shell.goToDashboardHome')"
        >
          <img
            :src="headerLogoSrc"
            alt="WARO"
            class="h-7 w-auto max-h-8 object-contain object-left"
          />
        </NuxtLink>
      </div>

      <TransitionGroup
        name="header-actions"
        tag="div"
        class="dashboard-header-actions relative flex w-fit min-w-0 max-w-full flex-shrink-0 items-center justify-end gap-1.5 overflow-x-auto lg:overflow-visible"
      >
        <!-- Actions: print mode, alerts, quick entry -->
        <div
          key="group-actions"
          class="flex items-center gap-1"
        >
          <PosCajaPrintThermalChip v-if="forceBrowserPrint" />

          <NotificationsNotificationBell class="hidden lg:flex shrink-0 [&_button]:!w-9 [&_button]:!h-9 [&_button]:rounded-lg [&_button]:border [&_button]:border-shell-action-border [&_button]:bg-shell-action-bg [&_svg]:!w-5 [&_svg]:!h-5" />

          <NuxtLink
            to="/abastecimiento/compras-directas/crear"
            class="flex flex-shrink-0 items-center justify-center gap-1.5 h-9 border border-shell-cta-bg bg-shell-cta-bg text-shell-cta-text px-2 xl:px-2.5 rounded-lg text-sm font-medium hover:bg-shell-cta-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring transition-all"
            :title="t('shell.uploadInvoiceAi')"
            :aria-label="t('shell.uploadInvoiceAi')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>
            <span class="hidden xl:inline">{{ t('shell.uploadInvoiceAi') }}</span>
          </NuxtLink>

          <button
            type="button"
            class="flex flex-shrink-0 items-center justify-center gap-1.5 h-9 bg-shell-action-bg border border-shell-action-border text-shell-action-text px-2 xl:px-2.5 rounded-lg text-sm font-medium hover:bg-shell-action-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring transition-colors"
            :title="t('nav.pos')"
            :aria-label="t('nav.pos')"
            @click="$emit('navigate-pos')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            <span class="hidden xl:inline">{{ t('nav.pos') }}</span>
          </button>

          <div id="dashboard-header-actions" class="flex items-center" />
        </div>

        <!-- Status -->
        <div
          key="group-status"
          class="flex items-center gap-1 ps-2 ms-0.5 border-s border-border/70"
        >
          <button
            v-if="headerAction"
            type="button"
            :class="[
              'h-9 flex-shrink-0 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 transition-colors flex items-center justify-center gap-1.5',
              headerAction.iconOnly
                ? 'bg-shell-action-bg border border-shell-action-border text-shell-icon-text hover:bg-shell-action-hover-bg focus:ring-shell-action-focus-ring w-9 px-0'
                : 'bg-shell-action-bg border border-shell-action-border text-shell-action-text hover:bg-shell-action-hover-bg focus:ring-shell-action-focus-ring max-w-40 px-2 xl:px-2.5',
            ]"
            :aria-label="headerAction.ariaLabel || headerAction.label"
            :title="headerAction.ariaLabel || headerAction.label"
            @click="headerAction.handler"
          >
            <svg v-if="headerAction.icon === 'printer' || headerAction.icon === true" class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9V3h12v6" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 14h12v7H6z" />
            </svg>
            <span v-if="!headerAction.iconOnly" class="truncate hidden xl:inline">{{ headerAction.label }}</span>
          </button>

          <span
            v-if="status"
            :class="['h-9 max-w-28 flex flex-shrink-0 items-center px-2 rounded-lg text-xs font-medium', status.color]"
          >
            <span class="truncate">{{ status.label }}</span>
          </span>

          <DashboardBusinessStatusToggle />

          <button
            type="button"
            :disabled="isRefreshing || isProgressiveLoading"
            :aria-label="t('shell.refreshData')"
            :aria-busy="isRefreshing || isProgressiveLoading"
            class="hidden md:flex w-9 h-9 items-center justify-center bg-shell-action-bg border border-shell-action-border rounded-lg text-shell-icon-text hover:bg-shell-action-hover-bg transition-all focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            :title="t('shell.refresh')"
            @click="$emit('refresh')"
          >
            <UiLoadingMatrix v-if="isRefreshing || isProgressiveLoading" size="5px" />
            <svg
              v-else
              class="w-4 h-4 transition-transform duration-300 hover:rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <!-- Identity -->
        <div
          key="group-identity"
          class="flex items-center ps-2 ms-0.5 border-s border-border/70"
        >
          <DashboardTenantSelector />
        </div>
      </TransitionGroup>
    </div>
  </header>
</template>

<script setup lang="ts">
import { getDashboardHome } from '~/utils/internalAccess'

const { t } = useI18n()
const accessStore = useAccessStore()
const { forceBrowser: forceBrowserPrint } = useCajaPrintPreference()

const dashboardHome = computed(() =>
  getDashboardHome(accessStore.modules, { isLoaded: accessStore.isLoaded }),
)

/** Same SVG as slide menu: navy outline + white letter fills. */
const headerLogoSrc = '/brand/waro-colombia-logo.svg'

defineProps<{
  status?: { label: string; color: string }
  headerAction?: { label: string; ariaLabel?: string; icon?: boolean | 'printer'; iconOnly?: boolean; handler: () => void }
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
