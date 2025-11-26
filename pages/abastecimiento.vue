<template>
  <div class="page-layout">
    <!-- Navigation -->
    <UiModuleNavigation 
      :navigation-items="navigationItems"
    />

    <!-- Content -->
    <Transition enter-active-class="transition-all duration-400 ease-out"
      enter-from-class="opacity-0 transform translate-y-[-20px]" 
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-300 ease-in" 
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform translate-y-[-20px]" 
      mode="out-in">
      <NuxtPage />
    </Transition>
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