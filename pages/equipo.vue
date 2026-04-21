<template>
  <div class="page-layout">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :page-key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Equipo' })

const route = useRoute()

const navigationItems = [
  { to: '/equipo/miembros', label: 'Miembros' },
  { to: '/equipo/salarios', label: 'Salarios', matchPath: '/equipo/salarios' },
  { to: '/equipo/nomina', label: 'Nómina' }
]
</script>
