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
  { to: '/abastecimiento/proveedores', label: 'Proveedores' },
  // { to: '/abastecimiento/precios', label: 'Lista de Precios', matchPath: '/precios' }, // Temporarily disabled
  { to: '/abastecimiento/compras', label: 'Órdenes de Compra', matchPath: '/compras' },
  { to: '/abastecimiento/compras-directas', label: 'Compras Directas', matchPath: '/compras-directas' },
  { to: '/abastecimiento/ocr', label: 'OCR - Extractor de Texto', matchPath: '/ocr' }
]

// Pass through the refresh handler from layout to child pages
const setRefreshHandler = inject('setRefreshHandler', () => {})
provide('setRefreshHandler', setRefreshHandler)

// Meta tags
useHead({
  title: 'Abastecimiento - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de proveedores, compras y precios para Warocol' }
  ]
})
</script>