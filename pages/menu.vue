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

function isResaleProductosQuery(tipo: unknown): boolean {
  return tipo === 'reventa' || tipo === 'resale'
}

// Navigation configuration based on conceptual document
const navigationItems = [
  { to: '/menu/recetas', label: 'Recetas', matchPath: '/menu/recetas' },
  {
    to: '/menu/productos',
    label: 'Productos',
    isActive: (r) => {
      if (r.path.startsWith('/menu/productos/')) return true
      if (r.path !== '/menu/productos') return false
      return !isResaleProductosQuery(r.query.tipo)
    },
  },
  {
    to: '/menu/productos?tipo=reventa',
    label: 'Reventa',
    isActive: (r) =>
      (r.path === '/menu/productos' && isResaleProductosQuery(r.query.tipo))
      || r.path === '/menu/reventa',
  },
  { to: '/menu/modificadores', label: 'Modificadores', matchPath: '/menu/modificadores' },
  { to: '/menu/categorias', label: 'Categorías', matchPath: '/menu/categorias' },
]

// Meta tags
useHead({
  title: 'Menú - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de productos, recetas y modificadores' }
  ]
})
</script>
