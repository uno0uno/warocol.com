<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', module: 'mi_negocio' })

const route = useRoute()

const navigationItems = [
  { to: '/gestion/promociones', label: 'Promociones', exact: true },
]
</script>
