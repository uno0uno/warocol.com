<template>
  <div class="h-screen flex flex-col lg:flex-row overflow-hidden">
    <!-- Dashboard Sidebar - Desktop Only -->
    <DashboardSidebar :active-page="activePage" class="hidden lg:flex" />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 min-h-0 h-screen lg:h-auto">
      <DashboardShellHeader
        :title="animatedDisplayTitle"
        :subtitle="dynamicLastUpdateText || displaySubtitle"
        :is-typing-title="isTypingTitle"
        :status="dynamicStatus"
        :header-action="dynamicHeaderAction"
        :is-refreshing="isRefreshing"
        :is-progressive-loading="isProgressiveLoading"
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
      <div :class="['flex-1 min-h-0 overflow-y-auto lg:pb-0', mobileContentBottomPadding]">
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
      :notifications-count="notificationsUnreadCount"
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
import { provide, ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  ChevronRightIcon
} from '@heroicons/vue/24/outline'
import { useNotifications } from '~/composables/useNotifications'
import { useBilling } from '~/composables/useBilling'
import { usePosMobileCart } from '~/composables/usePosMobileCart'

// Notifications — init here so SSE starts on all screen sizes (not just when bell mounts)
const { unreadCount: notificationsUnreadCount, init: initNotifications, disconnect: disconnectNotifications } = useNotifications()

// Billing access status — drives banner and blocked redirect
const { accessStatus, fetchAccessStatus } = useBilling()

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
  pageTitle,
  pageSubtitle,
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
  if (process.client) initNotifications()
  fetchAccessStatus()
})

onUnmounted(() => {
  disconnectNotifications()
})

// Refresh handler - shared via composable (provide/inject unreliable in Nuxt 3 layout↔page)
const {
  isRefreshing,
  isProgressiveLoading,
  lastUpdateText: composableLastUpdateText,
  triggerRefresh
} = useLayoutActions()
const handleRefresh = triggerRefresh

// Dynamic title - can be set by child pages
const dynamicTitle = ref<string | undefined>(undefined)

// Provide title setter for child pages
provide('setPageTitle', (title: string | undefined) => {
  dynamicTitle.value = title
})

// Dynamic subtitle - can be set by child pages
const dynamicSubtitle = ref<string | undefined>(undefined)

// Provide subtitle setter for child pages
provide('setPageSubtitle', (subtitle: string | undefined) => {
  dynamicSubtitle.value = subtitle
})

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
const dynamicHeaderAction = ref<{ label: string; icon?: boolean; handler: () => void } | undefined>(undefined)

// Provide header action setter for child pages
provide('setHeaderAction', (action: { label: string; icon?: boolean; handler: () => void } | undefined) => {
  dynamicHeaderAction.value = action
})

// Combined values (dynamic takes precedence)
const displayTitle = computed(() => dynamicTitle.value || pageTitle.value)
const displaySubtitle = computed(() => dynamicSubtitle.value || pageSubtitle.value)
const showBackBtn = computed(() => dynamicBackButton.value || !!backButton.value)
const backBtnHandler = computed(() => dynamicBackHandler.value || (backButton.value ? goBack : undefined))

const animatedDisplayTitle = ref(displayTitle.value)
const isTypingTitle = ref(false)
let titleTypingTimeout: ReturnType<typeof setTimeout> | null = null

const clearTitleTypingTimeout = () => {
  if (titleTypingTimeout) {
    clearTimeout(titleTypingTimeout)
    titleTypingTimeout = null
  }
}

const typeTitle = (nextTitle: string) => {
  clearTitleTypingTimeout()

  if (!nextTitle) {
    animatedDisplayTitle.value = ''
    isTypingTitle.value = false
    return
  }

  animatedDisplayTitle.value = ''
  isTypingTitle.value = true
  let index = 0

  const step = () => {
    index += 1
    animatedDisplayTitle.value = nextTitle.slice(0, index)

    if (index >= nextTitle.length) {
      isTypingTitle.value = false
      titleTypingTimeout = null
      return
    }

    titleTypingTimeout = setTimeout(step, 22)
  }

  titleTypingTimeout = setTimeout(step, 22)
}

watch(displayTitle, (nextTitle, previousTitle) => {
  if (!previousTitle || nextTitle === previousTitle) {
    animatedDisplayTitle.value = nextTitle
    isTypingTitle.value = false
    clearTitleTypingTimeout()
    return
  }

  typeTitle(nextTitle)
}, { immediate: true })

// Inject cart data from POS page
const { itemCount: posMobileCartItemCount, formattedTotal: posMobileCartFormattedTotal, openCart: openPosMobileCart, sheetOpen: posMobileCartSheetOpen } = usePosMobileCart()

const showPosMobileCartBar = computed(() =>
  route.path === '/pos' && posMobileCartItemCount.value > 0,
)

const mobileContentBottomPadding = computed(() => {
  if (showPosMobileCartBar.value) {
    return 'pb-36'
  }
  return 'pb-20'
})

const navigateToPOS = () => navigateTo('/pos')

// Meta tags for dashboard
useHead({
  titleTemplate: '%s - Warocol Dashboard',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }, // Dashboard pages shouldn't be indexed
  ]
})

onUnmounted(() => {
  clearTitleTypingTimeout()
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
