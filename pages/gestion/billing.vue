<template>
  <div class="page-layout flex flex-col h-full">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <div class="flex-1 min-h-0">
      <NuxtPage :key="route.fullPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'admin-only' })

const route = useRoute()

const navigationItems = [
  { to: '/gestion/billing', label: 'Resumen' },
  { to: '/gestion/billing/planes', label: 'Planes' },
  { to: '/gestion/billing/suscripciones', label: 'Suscripciones' },
  { to: '/gestion/billing/eventos', label: 'Eventos' },
]
</script>
