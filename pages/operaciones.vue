<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const { plural } = useTableLabel()

definePageMeta({
  layout: 'dashboard',
  module: 'operaciones',
})

const navigationItems = computed(() => [
  { to: '/operaciones/comandas', label: t('operaciones.nav.comandasCocina') },
  { to: '/operaciones/impresoras', label: t('operaciones.nav.impresoras') },
  { to: '/operaciones/mesas', label: plural.value },
  { to: '/operaciones/pos', label: t('operaciones.nav.pos') },
  { to: '/operaciones/promociones', label: t('operaciones.nav.promociones') },
  { to: '/operaciones/bitacora', label: t('operaciones.nav.bitacora') },
  { to: '/operaciones/turnos', label: t('operaciones.nav.turnos') },
  { to: '/operaciones/personalizar', label: t('operaciones.nav.personalizar') },
  { to: '/operaciones/propinas', label: t('operaciones.nav.propinas') },
])

useHead({ title: () => t('operaciones.head.module') })
</script>
