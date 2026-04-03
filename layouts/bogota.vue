<template>
  <div class="min-h-screen flex flex-col bg-background">
    <NuxtLoadingIndicator />

    <Header />

    <main class="flex-1 pb-[58px] md:pb-0">
      <slot />
    </main>

    <Footer class="hidden md:block" />
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import Header from '~/components/layout/Header.vue'
import Footer from '~/components/layout/Footer.vue'
import BottomNav from '~/components/layout/BottomNav.vue'

const authStore = useAuthStore()
</script>
