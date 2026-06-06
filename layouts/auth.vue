<template>
  <div class="min-w-screen min-h-screen w-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
    
    <NuxtLoadingIndicator />

    <!-- Header with branding -->
    <header class="w-full px-4 py-6">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span class="text-primary-foreground font-bold text-xl">W</span>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">{{ organizationName }}</h1>
        </div>
        <div class="text-sm text-gray-600">
          Plataforma de Profesionales
        </div>
      </div>
    </header>

    <!-- Main content area -->
    <div class="flex-grow flex flex-col justify-center px-4 md:px-16 w-full py-8">
      <slot />
    </div>

    <!-- Footer -->
    <footer class="w-full px-4 py-6 border-t border-gray-200 bg-white/50">
      <div class="max-w-7xl mx-auto text-center text-sm text-gray-600">
        <p>&copy; 2024 {{ organizationName }}. Conectando talento profesional.</p>
      </div>
    </footer>

    <!-- Toast Provider -->
    <ToastProvider />

  </div>
</template>

<script setup lang="ts">
const {
  public: {
    organizationName
  }
} = useRuntimeConfig()
</script>
