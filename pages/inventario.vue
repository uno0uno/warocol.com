<template>
  <div class="page-layout">
    <!-- Navigation -->
    <UiModuleNavigation
      :navigation-items="navigationItems"
    />

    <!-- Content -->
    <NuxtPage :page-key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

definePageMeta({
  layout: 'dashboard',
  module: 'abastecimiento',
})

// Navigation configuration
const navigationItems = computed(() => [
  { to: '/inventario/stock', label: t('abastecimiento.nav.stock') },
  { to: '/inventario/movimientos', label: t('abastecimiento.nav.movimientos') },
  { to: '/inventario/ajustes', label: t('abastecimiento.nav.ajustes') },
])

// Meta tags
useHead({
  title: () => t('abastecimiento.head.inventarioModule'),
  meta: [
    { name: 'description', content: () => t('abastecimiento.head.inventarioDesc') },
  ],
})
</script>
