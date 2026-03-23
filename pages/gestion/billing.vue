<template>
  <div class="page-layout flex flex-col h-full">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <div class="flex-1 min-h-0">
      <NuxtPage :key="route.fullPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const route = useRoute()

const navigationItems = [
  { to: '/gestion/billing', label: 'Historial', exact: true },
  { to: '/gestion/billing/uso', label: 'Uso de IA' },
]
</script>
