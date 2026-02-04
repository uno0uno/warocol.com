<template>
  <div class="page-layout">
    <!-- Navigation Menu - Always visible -->
    <UiModuleNavigation :navigation-items="navigationItems" />

    <!-- Child pages rendered here -->
    <NuxtPage :page-key="route.fullPath" />
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
  { to: '/gastos', label: 'Gastos' }
]

// Pass through the refresh handler from layout to child pages
const setRefreshHandler = inject('setRefreshHandler', () => {})
provide('setRefreshHandler', setRefreshHandler)

// Meta tags
useHead({
  title: 'Gastos - Warocol',
  meta: [
    { name: 'description', content: 'Control de Gastos Warocol' }
  ]
})
</script>
