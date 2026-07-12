<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', module: 'mi_plan' })

const route = useRoute()
const { t } = useI18n({ useScope: 'global' })

const navigationItems = computed(() => [
  { to: '/gestion/billing', label: t('billing.history'), exact: true },
  { to: '/gestion/billing/uso', label: t('billing.remainingUsage') },
])
</script>
