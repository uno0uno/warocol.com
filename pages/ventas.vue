<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

definePageMeta({
  layout: 'dashboard',
  module: 'ventas',
})

const navigationItems = computed(() => [
  { to: '/ventas/ordenes', label: t('ventas.nav.ordenes') },
  { to: '/ventas/productos', label: t('ventas.nav.productos') },
  { to: '/ventas/propinas', label: t('ventas.nav.propinas') },
])

useHead({
  title: () => t('ventas.head.module'),
})
</script>
