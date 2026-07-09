<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'dashboard',
  module: 'analitica',
})

const navigationItems = [
  { to: '/analitica/ventas', label: 'Ventas' },
  { to: '/analitica/rentabilidad', label: 'Rentabilidad' },
  { to: '/analitica/ingredientes', label: 'Ingredientes' },
  { to: '/analitica/clientes', label: 'Clientes' },
  { to: '/analitica/puntos', label: 'Puntos' },
]

useHead({
  title: 'Analítica - Warocol',
  meta: [{ name: 'description', content: 'Módulo de analítica para Warocol' }]
})
</script>
