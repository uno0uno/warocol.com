<template>
  <div class="page-layout">
    <!-- Navigation -->
    <UiModuleNavigation
      :navigation-items="navigationItems"
    />

    <!-- Content -->
    <Transition
      enter-active-class="transition-all duration-400 ease-out"
      enter-from-class="opacity-0 transform translate-y-[-20px]"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform translate-y-[-20px]"
      mode="out-in"
    >
      <NuxtPage />
    </Transition>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'dashboard'
})

// Navigation configuration based on conceptual document
const navigationItems = [
  { to: '/menu/productos', label: 'Productos' },
  { to: '/menu/recetas', label: 'Recetas', matchPath: '/recetas' },
  { to: '/menu/modificadores', label: 'Modificadores', matchPath: '/modificadores' },
  { to: '/menu/combos', label: 'Combos', matchPath: '/combos' }
]

// Meta tags
useHead({
  title: 'Menú - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de productos, recetas, modificadores y combos' }
  ]
})
</script>
