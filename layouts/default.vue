<template>
  <div class="w-screen h-screen flex flex-col overflow-x-hidden">

    <NuxtLoadingIndicator />
    <Header />
    <div class="flex flex-col pb-2 w-full h-full">
      <div class="flex-1 pb-8 px-4 md:px-16 2xl:px-[30rem] pb-[calc(2rem+58px)] md:pb-8">
        <slot />
      </div>
      <Footer class="hidden md:block" />
    </div>
    <BottomNav />

  </div>
</template>

<script setup lang="ts">
import Header from '~/components/layout/Header.vue'
import Footer from '~/components/layout/Footer.vue'
import BottomNav from '~/components/layout/BottomNav.vue'
</script>
