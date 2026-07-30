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
  module: 'crm',
})

const navigationItems = computed(() => [
  { to: '/crm/clientes', label: t('crm.tabs.clientes') },
  { to: '/crm/waros', label: t('crm.tabs.waros') },
])

useHead({
  title: () => t('crm.head.index'),
  meta: [{ name: 'description', content: () => t('crm.head.description') }],
})
</script>
