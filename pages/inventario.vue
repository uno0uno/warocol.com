<template>
  <div class="page-layout">
    <!-- Navigation -->
    <UiModuleNavigation
      :navigation-items="navigationItems"
    />

    <!-- Content -->
    <NuxtPage :page-key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'dashboard',
  module: 'abastecimiento',
})

// Navigation configuration
const navigationItems = [
  { to: '/inventario/stock', label: 'Stock' },
  { to: '/inventario/movimientos', label: 'Movimientos' },
  { to: '/inventario/ajustes', label: 'Ajustes' }
]

// Meta tags
useHead({
  title: 'Inventario - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de inventario y control de stock para Warocol' }
  ]
})
</script>
