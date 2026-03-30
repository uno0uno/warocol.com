<template>
  <div class="flex flex-col gap-3 md:gap-4 h-full">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <div class="flex-1 min-h-0">
      <NuxtPage :key="route.fullPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'dashboard'
})

const navigationItems = [
  { to: '/analitica/ventas', label: 'Ventas' },
  { to: '/analitica/rentabilidad', label: 'Rentabilidad' },
  { to: '/analitica/clientes', label: 'Clientes' },
  { to: '/analitica/puntos', label: 'Puntos' },
]

useHead({
  title: 'Analítica - Warocol',
  meta: [{ name: 'description', content: 'Módulo de analítica para Warocol' }]
})
</script>
