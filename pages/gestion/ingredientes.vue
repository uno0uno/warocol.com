<template>
  <div class="page-layout flex flex-col h-full">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <div class="flex-1 min-h-0">
      <NuxtPage :key="route.fullPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

const route = useRoute()

const navigationItems = [
  { to: '/gestion/ingredientes', label: 'Catálogo Global', exact: true },
]

useHead({ title: 'Ingredientes Globales — WaRo Admin' })
</script>
