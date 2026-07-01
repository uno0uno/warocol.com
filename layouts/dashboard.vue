<template>
  <div class="h-screen flex flex-col md:flex-row overflow-hidden">
    <!-- Dashboard Sidebar - Tablet/Desktop -->
    <DashboardSidebar
      :active-page="activePage"
      :billing-blocked="isBillingBlocked"
      toggle
      class="hidden md:flex"
      @expanded-change="isSidebarExpanded = $event"
    />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 min-h-0 h-screen md:h-auto">
      <DashboardShellHeader
        :status="dynamicStatus"
        :header-action="dynamicHeaderAction"
        :is-refreshing="isRefreshing"
        :is-progressive-loading="isProgressiveLoading"
        :hide-logo="isSidebarExpanded"
        @refresh="handleRefresh"
        @navigate-pos="navigateToPOS"
      />

      <!-- Subscription Banner -->
      <SubscriptionBanner
        v-if="accessStatus && (accessStatus.level === 'full_with_warning' || accessStatus.level === 'read_only')"
        :level="accessStatus.level"
        :message="accessStatus.message || (accessStatus.level === 'read_only' ? 'Tu suscripción está vencida. El acceso es de solo lectura.' : 'Tu suscripción vence pronto.')"
        :grace-days-remaining="accessStatus.grace_days_remaining"
      />

      <!-- Content Area with Overflow -->
      <div :class="['flex-1 min-h-0 overflow-y-auto', mobileContentBottomPadding]">
        <div class="p-4 sm:p-6 md:p-8">
          <!-- Breadcrumb (if provided) -->
          <nav v-if="showBreadcrumb" class="flex mb-6" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 md:space-x-3">
              <li class="inline-flex items-center">
                <NuxtLink to="/financiero"
                  class="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
                  Financiero
                </NuxtLink>
              </li>
              <li v-if="breadcrumbPage">
                <div class="flex items-center">
                  <ChevronRightIcon class="w-4 h-4 text-text-tertiary" />
                  <span class="ml-1 text-sm font-medium text-text-primary">{{ breadcrumbPage }}</span>
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

// Notifications SSE is owned by plugins/notifications.client.ts.
const { unreadCount: notificationsUnreadCount } = useNotifications()

// Billing access status — drives banner and blocked redirect
const { accessStatus, fetchAccessStatus } = useBilling()
const isBillingBlocked = computed(() => accessStatus.value?.level === 'blocked')

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

// Redirect to billing portal when subscription is expired
watch(accessStatus, (status) => {
  if (status?.level === 'blocked' && !route.path.startsWith('/gestion/billing')) {
    navigateTo('/gestion/billing')
  }
}, { immediate: true })

onMounted(() => {
  fetchAccessStatus()
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
main::-webkit-scrollbar {
  width: 8px;
}

main::-webkit-scrollbar-track {
  background: hsl(var(--surface-secondary));
}

main::-webkit-scrollbar-thumb {
  background: hsl(var(--surface-tertiary));
  border-radius: 4px;
}

main::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--border));
}
</style>
