<template>
  <div>
    <div class="flex items-center justify-between px-4 py-2">

      <!-- User Profile -->
      <div class="flex items-center gap-3">
        <div class="relative flex-shrink-0">
          <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center font-semibold text-primary-foreground text-sm">
            {{ userInitials }}
          </div>
          <span class="absolute bottom-0 end-0 w-2.5 h-2.5 bg-success border-2 border-shell-mobile-bg rounded-full"></span>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-semibold text-text-primary leading-tight">{{ userName }}</span>
          <span class="text-xs text-text-tertiary leading-tight">{{ selectedTenant?.name || t('shell.noTenant') }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <!-- Refresh Button - always visible -->
        <button
          @click="handleRefresh"
          :disabled="isLoading"
          :aria-label="t('shell.refreshPage')"
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-icon-button-neutral-hover-bg focus:outline-none focus:ring-2 focus:ring-icon-button-focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UiLoadingMatrix v-if="isLoading" size="5.5px" />
          <svg v-else
            class="w-5 h-5 text-icon-button-neutral-text transition-transform duration-300 hover:rotate-180"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>

        <!-- Notificaciones -->
        <button
          @click="openNotificationsModal"
          :aria-label="t('shell.viewNotifications')"
          class="relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-icon-button-neutral-hover-bg focus:outline-none focus:ring-2 focus:ring-icon-button-focus-ring"
        >
          <BellAlertIcon v-if="notificationsCount > 0" class="w-5 h-5 text-primary" aria-hidden="true" />
          <BellIcon v-else class="w-5 h-5 text-icon-button-neutral-text" aria-hidden="true" />
          <span
            v-if="notificationsCount > 0"
            class="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-badge-danger-bg text-badge-danger-text text-[10px] font-bold rounded-full leading-none"
            aria-hidden="true"
          >
            {{ notificationsCount > 9 ? '9+' : notificationsCount }}
          </span>
        </button>

        <!-- Menú (all navigation) -->
        <button
          @click="showMenuModal = true"
          :aria-label="t('shell.openNavigation')"
          class="w-10 h-10 flex md:hidden items-center justify-center rounded-full transition-all duration-200 hover:bg-icon-button-neutral-hover-bg focus:outline-none focus:ring-2 focus:ring-icon-button-focus-ring"
        >
          <Bars3Icon class="w-5 h-5 text-icon-button-neutral-text" />
        </button>

        <!-- Configuración/Tenant -->
        <button
          @click="showTenantModal = true"
          :aria-label="t('shell.settings')"
          class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-icon-button-neutral-hover-bg focus:outline-none focus:ring-2 focus:ring-icon-button-focus-ring"
        >
          <Cog6ToothIcon class="w-5 h-5 text-icon-button-neutral-text" />
        </button>
      </div>
    </div>

    <!-- Menu Modal (grid of icons) -->
    <UiBottomSheetModal v-model="showMenuModal" :title="t('nav.navigation')" max-height="sm">
      <div class="p-4">
        <!-- Module-gated grid (#560). Fail-open when enforcement is disabled. -->
        <div v-if="visibleGridItems.length > 0" class="grid grid-cols-4 gap-4">
          <NuxtLink
            v-for="item in visibleGridItems"
            :key="item.to"
            :to="item.to"
            class="flex flex-col items-center gap-1"
            :class="isNavItemBlocked(item) ? 'cursor-not-allowed opacity-40' : ''"
            :aria-disabled="isNavItemBlocked(item)"
            :tabindex="isNavItemBlocked(item) ? -1 : undefined"
            @click="(event) => handleGridItemClick(event, item)"
          >
            <div class="relative">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                :class="[
                  activePage === item.page ? 'bg-icon-button-primary-bg' : 'bg-badge-neutral-bg hover:bg-badge-neutral-hover-bg',
                  isNavItemBlocked(item) ? 'hover:bg-badge-neutral-bg' : '',
                ]"
              >
                <component
                  :is="item.icon"
                  class="w-6 h-6"
                  :class="activePage === item.page ? 'text-icon-button-primary-text' : 'text-badge-neutral-text'"
                />
              </div>
              <span
                v-if="item.showCriticalDot && hasCriticalAlerts"
                class="absolute -top-0.5 -end-0.5 w-2.5 h-2.5 bg-destructive border-2 border-shell-mobile-bg rounded-full"
                :aria-label="t('nav.criticalAlerts', { module: t(item.labelKey).toLowerCase() })"
              />
            </div>
            <span class="text-[10px] text-badge-neutral-text">{{ t(item.labelKey) }}</span>
          </NuxtLink>
        </div>

        <!-- Empty-state fallback — guarantees at least one navigation target. -->
        <div v-else class="grid grid-cols-4 gap-4">
          <NuxtLink
            to="/gestion/billing"
            class="flex flex-col items-center gap-1"
            @click="showMenuModal = false"
          >
            <div class="w-12 h-12 rounded-full flex items-center justify-center bg-icon-button-primary-bg">
              <CreditCardIcon class="w-6 h-6 text-icon-button-primary-text" />
            </div>
            <span class="text-[10px] text-badge-neutral-text">{{ t('nav.miPlan') }}</span>
          </NuxtLink>
        </div>
      </div>
    </UiBottomSheetModal>

    <!-- Notifications Modal -->
    <UiBottomSheetModal v-model="showNotificationsModal" :title="t('shell.notifications')" max-height="lg">
      <div class="flex items-center justify-between px-4 py-2 border-b border-sheet-border">
        <span class="text-xs text-text-secondary">{{ t('shell.alertSound') }}</span>
        <button
          type="button"
          @click="handleToggleDespachoSound"
          :aria-label="despachoSoundEnabled ? t('shell.muteAlerts') : t('shell.enableAlerts')"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-icon-button-neutral-hover-bg focus:outline-none focus:ring-2 focus:ring-icon-button-focus-ring transition-colors"
          :class="despachoSoundEnabled ? 'text-text-primary' : 'text-icon-button-neutral-text'"
        >
          <SpeakerWaveIcon v-if="despachoSoundEnabled" class="w-4 h-4" aria-hidden="true" />
          <SpeakerXMarkIcon v-else class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <!-- Empty state -->
      <div v-if="notifications.length === 0" class="flex flex-col items-center justify-center py-10 px-4 gap-2">
        <BellIcon class="w-8 h-8 text-muted-foreground/40" aria-hidden="true" />
        <p class="text-sm text-muted-foreground text-center">{{ t('shell.noNotifications') }}</p>
      </div>
      <!-- List -->
      <ul v-else class="divide-y divide-sheet-border">
        <li v-for="notification in notifications" :key="notification.id">
          <NuxtLink
            :to="notificationDespachoPath(notification)"
            @click="(event) => handleNotificationClick(notification, event)"
            class="flex items-start gap-3 px-4 py-3 hover:bg-icon-button-neutral-hover-bg transition-colors"
            :class="!notification.read_at ? 'bg-icon-button-primary-bg/40' : ''"
          >
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-icon-button-primary-bg flex items-center justify-center mt-0.5">
              <DocumentTextIcon
                v-if="notificationIsTermsAcceptanceRequired(notification)"
                class="w-4 h-4 text-icon-button-primary-text"
                aria-hidden="true"
              />
              <ShoppingBagIcon v-else class="w-4 h-4 text-icon-button-primary-text" aria-hidden="true" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-text-primary leading-snug">
                {{ notificationDespachoTitle(notification) }}
              </p>
              <p class="text-xs text-text-tertiary mt-0.5">{{ formatRelativeTime(notification.created_at) }}</p>
            </div>
            <span v-if="!notification.read_at" class="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" aria-hidden="true" />
          </NuxtLink>
        </li>
      </ul>
    </UiBottomSheetModal>

    <!-- Tenant Selector Modal -->
    <UiBottomSheetModal v-model="showTenantModal" :title="t('shell.settings')" max-height="lg">
      <div class="p-4 space-y-6">
        <!-- Tenant Selector -->
        <div>
          <label class="text-sm text-text-secondary font-medium mb-2 block">{{ t('shell.selectTenant') }}</label>
          <div class="space-y-2">
            <div v-if="isLoadingTenants" class="text-sm text-text-secondary py-2">
              {{ t('shell.loadingTenants') }}
            </div>
            <div v-else-if="tenants.length === 0" class="text-sm text-text-secondary py-2">
              {{ t('shell.noTenants') }}
            </div>
            <button
              v-else
              v-for="tenant in tenants"
              :key="tenant.id"
              @click="selectTenant(tenant)"
              :disabled="isLoadingTenants"
              class="w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :class="selectedTenant?.id === tenant.id
                ? 'border-primary bg-icon-button-primary-bg'
                : 'border-form-control-border hover:border-form-control-focus-border hover:bg-icon-button-neutral-hover-bg'"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-3 h-3 rounded-full"
                  :class="selectedTenant?.id === tenant.id ? 'bg-primary' : 'bg-badge-neutral-bg'"
                ></div>
                <span class="font-medium text-text-primary">{{ tenant.name }}</span>
              </div>
              <CheckCircleIcon
                v-if="selectedTenant?.id === tenant.id"
                class="w-5 h-5 text-primary"
              />
            </button>
          </div>
        </div>

        <!-- User Info -->
        <div class="pt-4 border-t border-sheet-border">
          <div class="flex items-center gap-3 px-4 py-3 bg-shell-account-hover-bg rounded-lg">
            <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center font-bold text-primary-foreground text-sm">
              {{ userInitials }}
            </div>
            <div>
              <div class="font-semibold text-sm text-text-primary">{{ userName }}</div>
              <div class="text-xs text-text-secondary">{{ userEmail }}</div>
            </div>
          </div>
        </div>
      </div>
    </UiBottomSheetModal>
  </div>
</template>

<script setup lang="ts">
import {
  Bars3Icon,
  BellAlertIcon,
  BellIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
} from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import { useLayoutActions } from '../composables/useLayoutActions'
import { notificationDespachoPath, notificationDespachoTitle, notificationIsTermsAcceptanceRequired } from '~/composables/useNotificationDespachoLink'
import { useDespachoNotificationAudio } from '~/composables/useDespachoNotificationAudio'
import { useTableQrNotificationNavigation } from '~/composables/useTableQrNotificationNavigation'
import { dashboardMobileGridItems, type ActivePage, type DashboardNavItem } from '~/constants/dashboardNavigation'
import type { Tenant } from '~/stores/tenants'
import type { Notification } from '~/composables/useNotifications'

interface Props {
  activePage?: ActivePage
  billingBlocked?: boolean
  notificationsCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  activePage: 'financiero',
  billingBlocked: false,
  notificationsCount: 0,
})

const { t } = useI18n()
const { can } = useModuleAccess()
const { hasFeature } = useFeatureAccess()
const canSeeNavItem = (item: DashboardNavItem) =>
  can(item.module).value && (!item.feature || hasFeature(item.feature).value)
const visibleGridItems = computed(() => dashboardMobileGridItems.filter(canSeeNavItem))
const isNavItemBlocked = (item: DashboardNavItem) =>
  props.billingBlocked && item.to !== '/gestion/billing'

const handleGridItemClick = (event: MouseEvent, item: DashboardNavItem) => {
  if (isNavItemBlocked(item)) {
    event.preventDefault()
    return
  }
  showMenuModal.value = false
}

// Data quality dot indicator
const { hasCriticalAlerts } = useDataQualityStatus()
const { selectTenantWithBillingGuard } = useDashboardTenantSwitch()

const { triggerRefresh, isRefreshing, isProgressiveLoading } = useLayoutActions()
const handleRefresh = triggerRefresh
const isLoading = computed(() => isRefreshing.value || isProgressiveLoading.value)

// Modal state
const showTenantModal = ref(false)
const showMenuModal = ref(false)
const showNotificationsModal = ref(false)

// Notifications
const { notifications, markAsRead } = useNotifications()
const { handleDespachoNotificationClick } = useTableQrNotificationNavigation()
const {
  enabled: despachoSoundEnabled,
  toggleEnabled: toggleDespachoSound,
  unlockFromGesture: unlockDespachoSound,
} = useDespachoNotificationAudio()

const handleMarkAsRead = async (id: string) => {
  await markAsRead(id)
}

const handleNotificationClick = async (notification: Notification, event?: MouseEvent) => {
  await handleDespachoNotificationClick(
    notification,
    event,
    () => { showNotificationsModal.value = false },
  )
}

const openNotificationsModal = () => {
  unlockDespachoSound()
  showNotificationsModal.value = true
}

const handleToggleDespachoSound = () => {
  unlockDespachoSound()
  toggleDespachoSound()
}

const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return t('shell.now')
  if (minutes < 60) return t('shell.minutesAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('shell.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  return t('shell.daysAgo', { n: days })
}

// Use tenants store
const tenantsStore = useTenantsStore()

// Computed properties from store
const tenants = computed(() => tenantsStore.tenants)
const selectedTenant = computed(() => tenantsStore.selectedTenant)
const isLoadingTenants = computed(() => tenantsStore.isLoading)

// Use auth store for user data
const authStore = useAuthStore()
const userName = computed(() => authStore.user?.name || authStore.session?.user?.name || 'Usuario')
const userEmail = computed(() => authStore.user?.email || authStore.session?.user?.email || 'No email')
const userInitials = computed(() => {
  const name = userName.value
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})
const isSuperuser = computed(() =>
  authStore.displayUser?.role === 'superuser' ||
  authStore.session?.user?.role === 'superuser'
)

// Handle tenant selection
const selectTenant = async (tenant: Tenant) => {
  showTenantModal.value = false  // close immediately, don't wait
  await selectTenantWithBillingGuard(tenant)
}
</script>

<style scoped>
/* Safe area para dispositivos con notch */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
