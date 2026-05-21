<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { plural } = useTableLabel()

definePageMeta({
  layout: 'dashboard',
  module: 'operaciones',
})

const navigationItems = computed(() => [
  { to: '/operaciones/comandas', label: 'Comandas & Cocina' },
  { to: '/operaciones/mesas', label: plural.value },
  { to: '/operaciones/bitacora', label: 'Bitácora' },
  { to: '/operaciones/turnos', label: 'Turnos' },
  { to: '/operaciones/personalizar', label: 'Personalizar' },
  { to: '/operaciones/propinas', label: 'Propinas' },
])

useHead({ title: 'Operaciones | WARO' })
</script>
