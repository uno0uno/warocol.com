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
  { to: '/analitica/ingredientes', label: t('analitica.tabs.ingredientes') },
  { to: '/analitica/clientes', label: t('analitica.tabs.clientes') },
  { to: '/analitica/puntos', label: t('analitica.tabs.puntos') },
])

useHead({
  title: () => t('analitica.head.index'),
  meta: [{ name: 'description', content: () => t('analitica.head.description') }]
})
</script>
