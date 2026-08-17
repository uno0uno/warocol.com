<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.path" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
const route = useRoute()

definePageMeta({
  layout: 'dashboard',
  module: 'integraciones',
})

const navigationItems = computed(() => [
  { to: '/integraciones/claves', label: t('integraciones.nav.claves') },
  { to: '/integraciones/pasarela', label: t('integraciones.nav.pasarela') },
])

useHead({ title: () => t('nav.integraciones') })
</script>
