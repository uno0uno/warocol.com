<template>
  <div class="flex flex-col gap-3 md:gap-4 h-full">
    <!-- Navigation -->
    <UiModuleNavigation
      :navigation-items="navigationItems"
    />

    <!-- Content -->
    <div class="flex-1 min-h-0">
      <NuxtPage :key="route.fullPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const lastAbastecimientoPath = useState<string | null>('abastecimiento-last-path', () => null)

definePageMeta({
  layout: 'dashboard',
  module: 'abastecimiento',
})

watch(
  () => route.fullPath,
  (_currentPath, previousPath) => {
    lastAbastecimientoPath.value = previousPath ?? null
  },
)

// Navigation configuration
const navigationItems = computed(() => [
  { to: '/abastecimiento/proveedores', label: t('abastecimiento.nav.proveedores') },
  { to: '/abastecimiento/compras-directas', label: t('abastecimiento.nav.compraDirecta'), matchPath: '/abastecimiento/compras-directas' },
  { to: '/abastecimiento/stock', label: t('abastecimiento.nav.stock') },
  { to: '/abastecimiento/movimientos', label: t('abastecimiento.nav.movimientos') },
  { to: '/abastecimiento/ajustes', label: t('abastecimiento.nav.historialAjustes'), matchPath: '/abastecimiento/ajustes' },
  { to: '/abastecimiento/ingredientes-propios', label: t('abastecimiento.nav.catalogo') },
  { to: '/abastecimiento/calidad-datos', label: t('abastecimiento.nav.calidadDatos') },
])

// Meta tags
useHead({
  title: () => t('abastecimiento.head.module'),
  meta: [
    { name: 'description', content: () => t('abastecimiento.head.moduleDesc') },
  ],
})
</script>
