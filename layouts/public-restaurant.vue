<template>
  <LayoutPublicShell
    root-class="w-screen h-screen flex flex-col"
    content-class="flex-1 pb-8"
    footer-class=""
    :show-footer="cartStore.itemCount === 0"
    :show-bottom-nav="false"
  >
    <slot />
  </LayoutPublicShell>
</template>

<script setup lang="ts">
import { useOnlineCartStore } from '~/stores/online_cart'

const cartStore = useOnlineCartStore()
</script>
