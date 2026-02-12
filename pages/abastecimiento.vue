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

<script setup>
import { provide, inject } from 'vue'

const route = useRoute()

definePageMeta({
  layout: 'dashboard'
})

// Navigation configuration
const navigationItems = [
  { to: '/abastecimiento/lector-facturas', label: 'Lector de Facturas', matchPath: '/ocr' }
]

// Pass through the refresh handler from layout to child pages
const setRefreshHandler = inject('setRefreshHandler', () => {})
provide('setRefreshHandler', setRefreshHandler)

// Meta tags
useHead({
  title: 'Lector de Facturas - Warocol',
  meta: [
    { name: 'description', content: 'Lector de facturas para Warocol' }
  ]
})
</script>