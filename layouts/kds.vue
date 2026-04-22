<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white">
    <slot />
  </div>
</template>
