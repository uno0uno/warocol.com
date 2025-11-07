<template>
  <div>
    <!-- Header section matching warocol style -->
    <div class="bg-white">
      <div class="p-6">
        <!-- Navigation area -->
        <div class="">
          <nav class="flex space-x-8">
            <NuxtLink to="/financiero/tir" :class="[
              $route.path === '/financiero/tir'
                ? 'text-crocus-600 font-medium border-b-2 border-crocus-600 pb-3'
                : 'text-titan-600 hover:text-crocus-600 pb-3']"
              class="text-sm transition-colors">
              TIR
            </NuxtLink>
            <NuxtLink to="/financiero/analisis" :class="[
              $route.path.includes('/analisis')
                ? 'text-crocus-600 font-medium border-b-2 border-crocus-600 pb-3'
                : 'text-titan-600 hover:text-crocus-600 pb-3']"
              class="text-sm transition-colors">
              Análisis de Productos
            </NuxtLink>
            <NuxtLink to="/financiero/obstaculos" :class="[
              $route.path.includes('/obstaculos')
                ? 'text-crocus-600 font-medium border-b-2 border-crocus-600 pb-3'
                : 'text-titan-600 hover:text-crocus-600 pb-3']"
              class="text-sm transition-colors">
              Obstáculos del TIR
            </NuxtLink>
            <span class="text-titan-400 opacity-50 cursor-not-allowed pb-3 text-sm">
              ROI
            </span>
            <span class="text-titan-400 opacity-50 cursor-not-allowed pb-3 text-sm">
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