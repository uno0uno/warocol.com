<template>
  <div class="flex flex-col gap-4">
    <!-- Header section matching warocol style -->
    <div class="bg-surface border-border border rounded-lg">
      <div class="p-6">
        <!-- Navigation area -->
        <div class="">
          <nav class="flex space-x-8">
            <NuxtLink to="/financiero/tir" :class="[
              $route.path === '/financiero/tir'
                ? 'text-primary font-medium'
                : 'text-text-secondary hover:text-primary']"
              class="text-sm transition-colors">
              TIR
            </NuxtLink>
            <NuxtLink to="/financiero/analisis" :class="[
              $route.path.includes('/analisis') 
                ? 'text-primary font-medium'
                : 'text-text-secondary hover:text-primary']"
              class="text-sm transition-colors">
              Análisis de Productos
            </NuxtLink>
            <NuxtLink to="/financiero/obstaculos" :class="[
              $route.path.includes('/obstaculos')
                ? 'text-primary font-medium'
                : 'text-text-secondary hover:text-primary']"
              class="text-sm transition-colors">
              Obstáculos del TIR
            </NuxtLink>
            <span class="text-text-tertiary opacity-50 cursor-not-allowed text-sm">
              ROI
            </span>
            <span class="text-text-tertiary opacity-50 cursor-not-allowed text-sm">
              Cash Flow
            </span>
          </nav>
        </div>
      </div>
    </div>

    <!-- Content -->
    <Transition enter-active-class="transition-all duration-400 ease-out"
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

// Meta tags
useHead({
  title: 'Financiero - Warocol',
  meta: [
    { name: 'description', content: 'Análisis financiero y TIR para Warocol' }
  ]
})
</script>