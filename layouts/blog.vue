<template>
  <div class="min-h-screen flex flex-col">
    <NuxtLoadingIndicator />
    <Header />
    <div class="flex-1">
      <slot />
    </div>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Header from '~/components/layout/Header.vue'
import Footer from '~/components/layout/Footer.vue'
</script>
