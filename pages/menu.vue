<template>
  <div class="page-layout">
    <!-- Navigation -->
    <UiModuleNavigation
      :navigation-items="navigationItems"
    />

    <!-- Content -->
    <NuxtPage :key="sectionKey" />
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()

// Key based on section only (/menu/recetas, /menu/productos, etc.)
// so navigating within a section (e.g. /menu/recetas/[id]) doesn't force a full remount
const sectionKey = computed(() => route.path.split('/').slice(0, 3).join('/'))

// Navigation configuration based on conceptual document
const navigationItems = [
  { to: '/menu/recetas', label: 'Recetas', matchPath: '/recetas' },
  { to: '/menu/productos', label: 'Productos' },
  { to: '/menu/reventa', label: 'Reventa', matchPath: '/reventa' },
  { to: '/menu/modificadores', label: 'Modificadores', matchPath: '/modificadores' }
]

// Meta tags
useHead({
  title: 'Menú - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de productos, recetas y modificadores' }
  ]
})
</script>
