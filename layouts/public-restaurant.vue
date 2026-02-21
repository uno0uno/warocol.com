<template>
  <div class="w-screen h-screen flex flex-col">
    <NuxtLoadingIndicator />
    <div class="flex flex-col pb-2 px-4 md:px-16 2xl:px-[30rem] w-full h-full">
      <Header />
      <div class="flex-1 pb-8">
        <slot />
      </div>
      <div v-if="cartStore.itemCount > 0" class="h-20" aria-hidden="true" />
      <Footer />
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from '~/components/layout/Header.vue'
import Footer from '~/components/layout/Footer.vue'
import { useOnlineCartStore } from '~/stores/online_cart'

const cartStore = useOnlineCartStore()
</script>
