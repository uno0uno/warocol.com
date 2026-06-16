<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', module: 'mi_plan' })

const route = useRoute()

const navigationItems = [
  { to: '/gestion/billing', label: 'Historial', exact: true },
  { to: '/gestion/billing/uso', label: 'Uso restante' },
]
</script>
