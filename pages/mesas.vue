<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Mesas' })

const navigationItems = [
  { to: '/mesas', label: 'Salón', matchPath: '/mesas', exact: true },
  { to: '/mesas/gestionar', label: 'Gestionar', matchPath: '/mesas/gestionar' },
]
</script>
