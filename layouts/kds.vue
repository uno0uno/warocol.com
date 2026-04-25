<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-background text-text-primary">
    <slot />
  </div>
</template>
