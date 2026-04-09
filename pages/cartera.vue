<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'Cartera - Warocol',
  meta: [{ name: 'description', content: 'Gestión de cartera y cuentas por cobrar' }]
})
</script>
