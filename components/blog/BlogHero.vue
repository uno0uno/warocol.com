<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  link?: string
}

const props = defineProps<Props>()
</script>

<template>
  <NuxtLink
    :to="link || '#'"
    class="block relative bg-gradient-to-br from-crocus-500 via-crocus-600 to-crocus-700 rounded-2xl overflow-hidden min-h-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-crocus-500/30 cursor-pointer"
  >
    <!-- Dark overlay for better contrast -->
    <div class="absolute inset-0 bg-black/10" />

    <!-- Decorative Element -->
    <div
      class="absolute top-0 left-0 w-2/5 h-full bg-gradient-to-b from-crocus-400 to-crocus-600 opacity-80"
      style="clip-path: polygon(0 0, 100% 0, 70% 100%, 0 100%)"
    />

    <!-- Content -->
    <div class="relative z-10 h-full flex items-center justify-center text-center p-12">
      <div>
        <h1
          class="text-6xl lg:text-8xl font-bold text-white leading-none tracking-tight mb-4 drop-shadow-2xl"
          style="text-shadow: 0 4px 12px rgba(0,0,0,0.4)"
        >
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="text-2xl lg:text-3xl font-medium text-white/95 drop-shadow-lg"
          style="text-shadow: 0 2px 8px rgba(0,0,0,0.3)"
        >
          {{ subtitle }}
        </p>
      </div>
    </div>
  </NuxtLink>
</template>
