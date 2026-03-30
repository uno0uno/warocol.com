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
const lastAbastecimientoPath = useState<string | null>('abastecimiento-last-path', () => null)

definePageMeta({
  layout: 'dashboard'
})

watch(
  () => route.fullPath,
  (_currentPath, previousPath) => {
    lastAbastecimientoPath.value = previousPath ?? null
  }
)

// Navigation configuration
const navigationItems = [
  { to: '/abastecimiento/proveedores', label: 'Proveedores' },
  { to: '/abastecimiento/compras-directas', label: 'Compra Directa', matchPath: '/abastecimiento/compras-directas' },
  { to: '/abastecimiento/stock', label: 'Stock' },
  { to: '/abastecimiento/ajustes', label: 'Ajustes', matchPath: '/abastecimiento/ajustes' },
  { to: '/abastecimiento/calidad-datos', label: 'Calidad de Datos' }
]

// Meta tags
useHead({
  title: 'Abastecimiento - Warocol',
  meta: [
    { name: 'description', content: 'Módulo de abastecimiento para Warocol' }
  ]
})
</script>
