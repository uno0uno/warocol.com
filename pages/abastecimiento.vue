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

<script setup>
import { provide, inject } from 'vue'

const route = useRoute()

definePageMeta({
  layout: 'dashboard'
})

// Navigation configuration
const navigationItems = [
  { to: '/abastecimiento/proveedores', label: 'Proveedores' },
  // { to: '/abastecimiento/precios', label: 'Lista de Precios', matchPath: '/precios' }, // Temporarily disabled
  { to: '/abastecimiento/compras', label: 'Órdenes de Compra', matchPath: '/compras' }
]

// Pass through the refresh handler from layout to child pages
const setRefreshHandler = inject('setRefreshHandler', () => {})
provide('setRefreshHandler', setRefreshHandler)

// Meta tags
useHead({
  title: 'Abastecimiento - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de proveedores, compras y precios para Warocol' }
  ]
})
</script>