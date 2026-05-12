<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <!-- Navigation -->
    <UiModuleNavigation
      :navigation-items="navigationItems"
    />

    <!-- Content -->
    <NuxtPage :key="sectionKey" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  module: 'menu',
})

const route = useRoute()
const lastMenuPath = useState<string | null>('menu-last-path', () => null)

// Key based on section only (/menu/recetas, /menu/productos, etc.)
// so navigating within a section (e.g. /menu/recetas/[id]) doesn't force a full remount
const sectionKey = computed(() => route.path.split('/').slice(0, 3).join('/'))

watch(
  () => route.fullPath,
  (_currentPath, previousPath) => {
    lastMenuPath.value = previousPath ?? null
  }
)

// Navigation configuration based on conceptual document
const navigationItems = [
  { to: '/menu/recetas', label: 'Recetas', matchPath: '/menu/recetas' },
  { to: '/menu/productos', label: 'Productos' },
  { to: '/menu/reventa', label: 'Reventa', matchPath: '/menu/reventa' },
  { to: '/menu/modificadores', label: 'Modificadores', matchPath: '/menu/modificadores' }
]

// Meta tags
useHead({
  title: 'Menú - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de productos, recetas y modificadores' }
  ]
})
</script>
