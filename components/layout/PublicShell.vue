<template>
  <div :class="[rootClass, 'public-shell bg-surface text-text-primary']">
    <NuxtLoadingIndicator />
    <LayoutHeader />
    <main :class="[contentClass, 'public-shell__content']">
      <slot />
    </main>
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
  rootClass: 'min-h-dvh flex flex-col',
  contentClass: 'flex-1 w-full',
  footerClass: 'hidden md:block',
  showFooter: true,
  showBottomNav: true,
})
</script>

<style scoped>
.public-shell {
  min-height: 100dvh;
}

.public-shell__content {
  flex: 1 1 auto;
  width: 100%;
}
</style>
