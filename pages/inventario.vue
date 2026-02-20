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
import { provide, inject } from 'vue'

const route = useRoute()

definePageMeta({
  layout: 'dashboard'
})

// Navigation configuration
const navigationItems = [
  { to: '/inventario/stock', label: 'Stock' },
  { to: '/inventario/movimientos', label: 'Movimientos' },
  { to: '/inventario/ajustes', label: 'Ajustes' }
]

// Pass through the refresh handler from layout to child pages
const setRefreshHandler = inject('setRefreshHandler', () => {})
provide('setRefreshHandler', setRefreshHandler)

// Meta tags
useHead({
  title: 'Inventario - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de inventario y control de stock para Warocol' }
  ]
})
</script>
