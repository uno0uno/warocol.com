<template>
  <div class="min-h-screen flex flex-col">
    <NuxtLoadingIndicator />
    <Header />
    <div class="flex-1 pb-[58px] md:pb-0">
      <slot />
    </div>
    <Footer class="hidden md:block" />
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import Header from '~/components/layout/Header.vue'
import Footer from '~/components/layout/Footer.vue'
import BottomNav from '~/components/layout/BottomNav.vue'
</script>
