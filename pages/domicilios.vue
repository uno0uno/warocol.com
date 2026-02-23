<template>
  <div class="page-layout flex flex-col h-full">
    <!-- Navigation -->
    <UiModuleNavigation
      :navigation-items="navigationItems"
    />

    <!-- Content -->
    <div class="flex-1 min-h-0">
      <NuxtPage :key="route.fullPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'dashboard'
})

const navigationItems = [
  { to: '/domicilios/pedidos', label: 'Pedidos' }
]

useHead({
  title: 'Domicilios - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de pedidos de domicilio' }
  ]
})
</script>
