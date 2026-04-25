<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'dashboard'
})

const navigationItems = [
  { to: '/operaciones/comandas', label: 'Comandas & Cocina' },
  { to: '/operaciones/mesas', label: 'Mesas' },
]

useHead({ title: 'Operaciones | WARO' })
</script>
