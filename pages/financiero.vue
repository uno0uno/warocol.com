<template>
  <div class="page-layout">
    <!-- Navigation -->
    <UiModuleNavigation 
      :navigation-items="navigationItems"
      :disabled-items="disabledItems"
    />

    <!-- Content -->
    <Transition 
      enter-active-class="transition-all duration-400 ease-out"
      enter-from-class="opacity-0 transform translate-y-[-20px]" 
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-300 ease-in" 
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform translate-y-[-20px]" 
      mode="out-in">
        <NuxtPage />
    </Transition>
  </div>
</template>

<script setup>

definePageMeta({
  layout: 'dashboard'
})

// Navigation configuration
const navigationItems = [
  { to: '/financiero/tir', label: 'TIR' },
  { to: '/financiero/analisis', label: 'Análisis de Productos', matchPath: '/analisis' },
  { to: '/financiero/obstaculos', label: 'Obstáculos del TIR', matchPath: '/obstaculos' }
]

const disabledItems = ['ROI', 'Cash Flow']

// Meta tags
useHead({
  title: 'Financiero - Warocol',
  meta: [
    { name: 'description', content: 'Análisis financiero y TIR para Warocol' }
  ]
})
</script>