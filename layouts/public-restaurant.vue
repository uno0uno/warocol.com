<template>
  <div class="w-screen h-screen flex flex-col">
    <NuxtLoadingIndicator />
    <div class="flex flex-col pb-2 w-full h-full">
      <Header />
      <div class="flex-1 pb-8">
        <slot />
      </div>
      <Footer v-if="cartStore.itemCount === 0" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from '~/components/layout/Header.vue'
import Footer from '~/components/layout/Footer.vue'
import { useOnlineCartStore } from '~/stores/online_cart'

const cartStore = useOnlineCartStore()
</script>
