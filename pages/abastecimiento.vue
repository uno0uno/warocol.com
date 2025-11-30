<template>
  <div class="page-layout">
    <!-- Navigation -->
    <UiModuleNavigation 
      :navigation-items="navigationItems"
    />

    <!-- Content -->
    <NuxtPage />
  </div>
</template>

<script setup>

definePageMeta({
  layout: 'dashboard'
})

// Navigation configuration
const navigationItems = [
  { to: '/abastecimiento/proveedores', label: 'Proveedores' },
  // { to: '/abastecimiento/precios', label: 'Lista de Precios', matchPath: '/precios' }, // Temporarily disabled
  { to: '/abastecimiento/compras', label: 'Órdenes de Compra', matchPath: '/compras' }
]

// Meta tags
useHead({
  title: 'Abastecimiento - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de proveedores, compras y precios para Warocol' }
  ]
})
</script>