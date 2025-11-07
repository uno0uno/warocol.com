<script setup>
import Header from '~/components/layout/Header.vue'
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <Header />
    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>