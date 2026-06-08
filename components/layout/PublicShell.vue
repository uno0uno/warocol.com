<template>
  <div :class="rootClass">
    <NuxtLoadingIndicator />
    <LayoutHeader />
    <div :class="contentClass">
      <slot />
    </div>
    <LayoutFooter v-if="showFooter" :class="footerClass" />
    <LayoutBottomNav v-if="showBottomNav" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  rootClass?: string
  contentClass?: string
  footerClass?: string
  showFooter?: boolean
  showBottomNav?: boolean
}>(), {
  rootClass: 'min-h-screen flex flex-col',
  contentClass: 'flex-1 pb-[58px] md:pb-0',
  footerClass: 'hidden md:block',
  showFooter: true,
  showBottomNav: true,
})
</script>
