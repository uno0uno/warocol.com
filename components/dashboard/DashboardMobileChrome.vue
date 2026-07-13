<template>
  <div
    class="lg:hidden fixed bottom-0 start-0 end-0 z-50 bg-shell-mobile-bg border-t border-shell-mobile-border shadow-lg transition-all"
    :class="[
      posCartSheetOpen ? 'pointer-events-none opacity-0' : '',
      isSidebarExpanded ? 'md:start-56' : 'md:start-[4.25rem]',
    ]"
    style="padding-bottom: env(safe-area-inset-bottom, 0px)"
    :aria-hidden="posCartSheetOpen"
  >
    <PosCartBottomBar
      v-if="showPosCartBar"
      :visible="posCartItemCount > 0"
      :item-count="posCartItemCount"
      :formatted-total="posCartFormattedTotal"
      @open-cart="$emit('open-cart')"
    />
    <DashboardBottomNav
      :active-page="activePage"
      :billing-blocked="billingBlocked"
      :notifications-count="notificationsCount"
    />
  </div>
</template>

<script setup lang="ts">
import type { ActivePage } from '~/constants/dashboardNavigation'

defineProps<{
  activePage: ActivePage
  billingBlocked: boolean
  notificationsCount: number
  isSidebarExpanded: boolean
  showPosCartBar: boolean
  posCartItemCount: number
  posCartFormattedTotal: string
  posCartSheetOpen: boolean
}>()

defineEmits<{
  (e: 'open-cart'): void
}>()
</script>
