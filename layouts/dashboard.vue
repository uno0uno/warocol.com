<template>
  <div class="dashboard-shell h-screen flex flex-col md:flex-row overflow-hidden">
    <!-- Dashboard Sidebar - Tablet/Desktop -->
    <DashboardSidebar
      :active-page="activePage"
      :billing-blocked="isBillingBlocked"
      toggle
      class="hidden md:flex"
      @expanded-change="isSidebarExpanded = $event"
    />

    <!-- Main inset (Buzz SidebarInset): opaque rounded panel over canvas -->
    <main class="dashboard-shell-inset flex-1 flex flex-col min-w-0 min-h-0 h-screen md:h-auto">
      <DashboardShellHeader
        :status="dynamicStatus"
        :header-action="dynamicHeaderAction"
        :is-refreshing="isRefreshing"
        :is-progressive-loading="isProgressiveLoading"
        :hide-logo="isSidebarExpanded"
        @refresh="handleRefresh"
        @navigate-pos="navigateToPOS"
      />

      <!-- Subscription Banner: warning/read_only take priority over starter via access level -->
      <SubscriptionBanner
        v-if="showSubscriptionBanner && subscriptionBannerLevel"
        :level="subscriptionBannerLevel"
        :message="subscriptionBannerMessage"
        :message-pending="starterBannerPending"
        :grace-days-remaining="accessStatus?.grace_days_remaining"
      />

      <!-- Content Area with Overflow -->
      <div :class="['flex-1 min-h-0 overflow-y-auto', mobileContentBottomPadding]">
        <div class="p-4 sm:p-6 md:p-8">
          <!-- Breadcrumb (if provided) -->
          <nav v-if="showBreadcrumb" class="flex mb-6" :aria-label="t('shell.breadcrumb')">
            <ol class="inline-flex items-center space-x-1 md:space-x-3">
              <li class="inline-flex items-center">
                <NuxtLink :to="dashboardHome"
                  class="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
                  {{ t('shell.financiero') }}
                </NuxtLink>
              </li>
              <li v-if="breadcrumbPage">
                <div class="flex items-center">
                  <ChevronRightIcon class="w-4 h-4 text-text-tertiary" />
                  <span class="ms-1 text-sm font-medium text-text-primary">{{ breadcrumbPage }}</span>
                </div>
              </li>
            </ol>
          </nav>

          <!-- Page Content -->
          <slot />
        </div>
      </div>
    </main>

    <DashboardMobileChrome
      :active-page="activePage"
      :billing-blocked="isBillingBlocked"
      :notifications-count="notificationsUnreadCount"
      :is-sidebar-expanded="isSidebarExpanded"
      :show-pos-cart-bar="showPosMobileCartBar"
      :pos-cart-item-count="posMobileCartItemCount"
      :pos-cart-formatted-total="posMobileCartFormattedTotal"
      :pos-cart-sheet-open="posMobileCartSheetOpen"
      @open-cart="openPosMobileCart"
    />

    <!-- Mobile Order Toast — client-only to avoid SSR/Teleport hydration mismatch -->
    <ClientOnly>
      <NotificationsMobileOrderToast />
    </ClientOnly>

    <!-- Global Purchase Action Bar -->
    <!-- <PurchasesGlobalPurchaseActionBar /> -->
  </div>
</template>

<script setup lang="ts">
import { provide, ref, computed, watch, onMounted } from 'vue'
import {
  ChevronRightIcon
} from '@heroicons/vue/24/outline'
import { useNotifications } from '~/composables/useNotifications'
import { useBilling } from '~/composables/useBilling'
import { usePosMobileCart } from '~/composables/usePosMobileCart'
import { getDashboardHome } from '~/utils/internalAccess'
import { resolveTrialPriceAnchor } from '~/utils/publicCta'
import { useTenantFinancialProfile } from '~/composables/useTenantFinancialProfile'

const { t, locale } = useI18n()

// Notifications SSE is owned by plugins/notifications.client.ts.
const { unreadCount: notificationsUnreadCount } = useNotifications()

// Billing access status — drives banner and blocked redirect (Mi Plan roles only)
const accessStore = useAccessStore()
const dashboardHome = computed(() =>
  getDashboardHome(accessStore.modules, { isLoaded: accessStore.isLoaded }),
)
const { accessStatus, fetchAccessStatus } = useBilling({ overview: false })
const { profile: financialProfile } = useTenantFinancialProfile()
const isBillingBlocked = computed(() =>
  accessStore.can('mi_plan') && accessStatus.value?.level === 'blocked',
)

type SubscriptionBannerLevel = 'starter' | 'full_with_warning' | 'read_only'

const subscriptionBannerLevel = computed<SubscriptionBannerLevel | null>(() => {
  const level = accessStatus.value?.level
  if (level === 'full_with_warning' || level === 'read_only' || level === 'starter') {
    return level
  }
  return null
})

const showSubscriptionBanner = computed(() => subscriptionBannerLevel.value != null)

const starterBannerPending = computed(() => {
  if (subscriptionBannerLevel.value !== 'starter') return false
  return !resolveTrialPriceAnchor({
    locale: locale.value,
    countryCode: financialProfile.value?.country_code,
    currencyCode: financialProfile.value?.base_currency_code,
  })
})

const subscriptionBannerMessage = computed(() => {
  const status = accessStatus.value
  const level = subscriptionBannerLevel.value
  if (!status || !level) return ''
  // Prefer localized conversion copy for Starter; API starter message is operational, not CTA.
  if (level === 'starter') {
    const priceAnchor = resolveTrialPriceAnchor({
      locale: locale.value,
      countryCode: financialProfile.value?.country_code,
      currencyCode: financialProfile.value?.base_currency_code,
    })
    if (!priceAnchor) return ''
    return t('shell.subscriptionTrial', { priceAnchor })
  }
  if (status.message) return status.message
  if (level === 'read_only') return t('shell.subscriptionReadOnly')
  return t('shell.subscriptionExpiring')
})

// Get route-based configuration
const route = useRoute()
const router = useRouter()

// Go back function
const goBack = () => {
  // Special handling for POS sub-pages - always go back to POS
  if (route.path.startsWith('/pos/producto/') || route.path.startsWith('/pos/checkout')) {
    sessionStorage.setItem('posNavigation', 'true')
    router.push('/pos')
  } else {
    // Default: browser back (includes /pos main page)
    router.back()
  }
}

const {
  activePage,
  showBreadcrumb,
  breadcrumbPage,
  backButton,
} = useDashboardPageConfig()

// Redirect to billing portal when subscription is expired (Mi Plan roles only)
watch(accessStatus, (status) => {
  if (!accessStore.can('mi_plan')) return
  if (status?.level === 'blocked' && !route.path.startsWith('/gestion/billing')) {
    navigateTo('/gestion/billing')
  }
}, { immediate: true })

onMounted(() => {
  if (accessStore.can('mi_plan')) {
    fetchAccessStatus()
  }
})

// Refresh handler - shared via composable (provide/inject unreliable in Nuxt 3 layout↔page)
const {
  isRefreshing,
  isProgressiveLoading,
  lastUpdateText: composableLastUpdateText,
  triggerRefresh
} = useLayoutActions()
const handleRefresh = triggerRefresh

const isSidebarExpanded = ref(false)

// Last update text - shared via composable
const dynamicLastUpdateText = composableLastUpdateText

// Dynamic status badge - can be set by child pages
const dynamicStatus = ref<{ label: string; color: string } | undefined>(undefined)

// Provide status setter for child pages
provide('setPageStatus', (status: { label: string; color: string } | undefined) => {
  dynamicStatus.value = status
})

// Dynamic back button - can be set by child pages
const dynamicBackButton = ref<boolean>(false)
const dynamicBackHandler = ref<(() => void) | undefined>(undefined)

// Provide back button setters for child pages
provide('setShowBackButton', (show: boolean) => {
  dynamicBackButton.value = show
})

provide('setBackHandler', (handler: (() => void) | undefined) => {
  dynamicBackHandler.value = handler
})

// Dynamic header action (like print button) - can be set by child pages
type HeaderAction = { label: string; ariaLabel?: string; icon?: boolean | 'printer'; iconOnly?: boolean; handler: () => void }
const dynamicHeaderAction = ref<HeaderAction | undefined>(undefined)

// Provide header action setter for child pages
provide('setHeaderAction', (action: HeaderAction | undefined) => {
  dynamicHeaderAction.value = action
})

const showBackBtn = computed(() => dynamicBackButton.value || !!backButton.value)
const backBtnHandler = computed(() => dynamicBackHandler.value || (backButton.value ? goBack : undefined))

// Inject cart data from POS page
const { itemCount: posMobileCartItemCount, formattedTotal: posMobileCartFormattedTotal, openCart: openPosMobileCart, sheetOpen: posMobileCartSheetOpen } = usePosMobileCart()

const showPosMobileCartBar = computed(() =>
  (route.path === '/pos' || route.path === '/ventas/crear') && posMobileCartItemCount.value > 0,
)

const mobileContentBottomPadding = computed(() => {
  if (showPosMobileCartBar.value) {
    return 'pb-36 lg:pb-0'
  }
  return 'pb-20 lg:pb-0'
})

const navigateToPOS = () => {
  if (isBillingBlocked.value) return
  return navigateTo('/pos')
}

// Meta tags for dashboard
useHead({
  titleTemplate: '%s - Warocol Dashboard',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }, // Dashboard pages shouldn't be indexed
  ]
})
</script>

<style scoped>
.dashboard-shell {
  background: linear-gradient(
    180deg,
    hsl(var(--shell-canvas-top)) 0%,
    hsl(var(--shell-canvas-bottom)) 100%
  );
}

@media (min-width: 768px) {
  .dashboard-shell {
    padding: 0.625rem 0.625rem 0.625rem 0;
    gap: 0;
  }

  .dashboard-shell-inset {
    margin: 0.125rem 0.125rem 0.125rem 0;
    border-radius: var(--shell-inset-radius);
    background: hsl(var(--surface));
    box-shadow:
      0 1px 2px hsl(var(--ebony-900) / 0.05),
      0 8px 28px hsl(var(--ebony-900) / 0.08);
    overflow: hidden;
  }
}

/* Smooth sidebar navigation animation */
.sidebar-nav {
  transition: all 0.2s ease-in-out;
}

/* Content fade-in animation for better UX */
@keyframes contentFadeIn {
  from {
    opacity: 0;
    transform: translateY(-15px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-container {
  animation: contentFadeIn 0.5s ease-out;
}

</style>

<style scoped>
/* Custom scrollbar for main content */
.dashboard-shell-inset::-webkit-scrollbar {
  width: 8px;
}

.dashboard-shell-inset::-webkit-scrollbar-track {
  background: hsl(var(--surface-secondary));
}

.dashboard-shell-inset::-webkit-scrollbar-thumb {
  background: hsl(var(--surface-tertiary));
  border-radius: 4px;
}

.dashboard-shell-inset::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--border));
}
</style>
