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
const { t } = useI18n()
const lastMenuPath = useState<string | null>('menu-last-path', () => null)

// Key based on section only (/menu/recetas, /menu/productos, etc.)
// so navigating within a section (e.g. /menu/recetas/[id]) doesn't force a full remount
const sectionKey = computed(() => route.path.split('/').slice(0, 3).join('/'))

watch(
  () => route.fullPath,
  (_currentPath, previousPath) => {
    lastMenuPath.value = previousPath ?? null
  },
)

const navigationItems = computed(() => [
  { to: '/menu/recetas', label: t('menu.nav.recetas'), matchPath: '/menu/recetas' },
  { to: '/menu/productos', label: t('menu.nav.productos'), matchPath: '/menu/productos' },
  { to: '/menu/modificadores', label: t('menu.nav.modificadores'), matchPath: '/menu/modificadores' },
  { to: '/menu/categorias', label: t('menu.nav.categorias'), matchPath: '/menu/categorias' },
])

// Meta tags
useHead({
  title: () => t('menu.head.module'),
  meta: [
    { name: 'description', content: () => t('menu.head.moduleDesc') },
  ],
})
</script>
