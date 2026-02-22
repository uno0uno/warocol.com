<template>
  <div class="min-h-screen flex flex-col bg-background">
    <NuxtLoadingIndicator />

    <header class="w-full border-b border-border bg-surface">
      <div class="max-w-6xl mx-auto px-4">
        <div class="flex h-16 md:h-20 items-center justify-between">
          <!-- Logo -->
          <NuxtLink to="/" class="flex-shrink-0">
            <img
              src="/logo_waro_10_octubre.png"
              alt="Waro Colombia"
              class="h-8 md:h-10 w-auto object-contain"
            />
          </NuxtLink>

          <!-- Nav -->
          <nav class="flex items-center gap-3 md:gap-6">
            <NuxtLink
              to="/blog"
              class="text-sm md:text-base text-muted-foreground hover:text-primary font-medium transition-colors"
            >
              Blog
            </NuxtLink>
            <NuxtLink
              :to="authStore.isSessionValid ? '/ventas' : '/auth/login'"
              class="text-sm md:text-base text-muted-foreground hover:text-primary font-medium transition-colors"
            >
              {{ authStore.isSessionValid ? 'Mi Panel' : 'Ingresar' }}
            </NuxtLink>
          </nav>

          <!-- CTA -->
          <NuxtLink
            to="/auth/login"
            class="px-3 sm:px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Comenzar
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import Footer from '~/components/layout/Footer.vue'

const authStore = useAuthStore()
</script>
