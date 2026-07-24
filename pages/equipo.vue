<template>
  <div class="page-layout">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :page-key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  module: 'equipo',
})

useHead({ title: 'Equipo' })

const route = useRoute()

const { t } = useI18n({ useScope: 'global' })
const { isColombiaPayroll } = useTenantFinancialProfile()

const navigationItems = computed(() => {
  const items = [
    { to: '/equipo/miembros', label: t('equipo.head.miembros') },
  ]
  if (isColombiaPayroll.value) {
    items.push(
      { to: '/equipo/salarios', label: t('equipo.head.salarios'), matchPath: '/equipo/salarios' },
      { to: '/equipo/nomina', label: t('equipo.head.nomina') },
    )
  }
  return items
})
</script>
