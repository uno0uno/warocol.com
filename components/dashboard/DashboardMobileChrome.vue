<template>
  <div
    class="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-titan-300 shadow-lg"
    style="padding-bottom: env(safe-area-inset-bottom, 0px)"
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
      :notifications-count="notificationsCount"
    />
  </div>
</template>

<script setup lang="ts">
import type { ActivePage } from '~/constants/dashboardNavigation'

defineProps<{
  activePage: ActivePage
  notificationsCount: number
  showPosCartBar: boolean
  posCartItemCount: number
  posCartFormattedTotal: string
}>()

defineEmits<{
  (e: 'open-cart'): void
}>()
</script>
