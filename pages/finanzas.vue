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
  { to: '/finanzas/cartera', label: 'Cartera' },
  { to: '/finanzas/gastos',  label: 'Gastos' },
  { to: '/finanzas/cierre',  label: 'Cierre' },
]

useHead({ title: 'Finanzas - Warocol' })
</script>
