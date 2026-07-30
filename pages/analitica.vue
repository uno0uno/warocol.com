<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { t } = useI18n({ useScope: 'global' })

definePageMeta({
  layout: 'dashboard',
  module: 'analitica',
})

const navigationItems = computed(() => [
  { to: '/analitica/ventas', label: t('analitica.tabs.ventas') },
  { to: '/analitica/rentabilidad', label: t('analitica.tabs.rentabilidad') },
  { to: '/analitica/articulos-de-bodega', label: t('analitica.tabs.ingredientes') },
])

useHead({
  title: () => t('analitica.head.index'),
  meta: [{ name: 'description', content: () => t('analitica.head.description') }]
})
</script>
