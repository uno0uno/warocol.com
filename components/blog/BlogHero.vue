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
    class="block relative bg-gradient-to-br from-badge-primary-text via-action-primary-bg to-action-primary-hover-bg rounded-2xl overflow-hidden min-h-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-action-primary-bg/30 cursor-pointer"
  >
    <!-- Dark overlay for better contrast -->
    <div class="absolute inset-0 bg-overlay-backdrop-subtle/10" />

    <!-- Decorative Element -->
    <div
      class="absolute top-0 left-0 w-2/5 h-full bg-gradient-to-b from-badge-primary-border to-action-primary-bg opacity-80"
      style="clip-path: polygon(0 0, 100% 0, 70% 100%, 0 100%)"
    />

    <!-- Content -->
    <div class="relative z-10 h-full flex items-center justify-center text-center p-12">
      <div>
        <h1
          class="text-6xl lg:text-8xl font-bold text-action-primary-text leading-tight tracking-tight mb-4 drop-shadow-2xl"
          style="text-shadow: 0 4px 12px hsl(var(--overlay-backdrop-bg) / 0.4)"
        >
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="text-2xl lg:text-3xl font-medium text-action-primary-text/95 drop-shadow-lg"
          style="text-shadow: 0 2px 8px hsl(var(--overlay-backdrop-bg) / 0.3)"
        >
          {{ subtitle }}
        </p>
      </div>
    </div>
  </NuxtLink>
</template>
