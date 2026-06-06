<script setup lang="ts">
interface Props {
  src: string
  alt: string
  caption?: string
}

const props = defineProps<Props>()
</script>

<template>
  <!-- Soft transition from article hero surface to content surface -->
  <div class="w-full bg-surface-secondary">
    <div class="article-container py-6 lg:py-8">
      <!-- Imagen con esquinas redondeadas, sin texto encima -->
      <div class="w-full aspect-video max-h-[480px] overflow-hidden rounded-xl shadow-sm">
        <img
          itemprop="image"
          class="object-cover w-full h-full"
          :src="src"
          :alt="alt"
        >
      </div>

      <!-- Caption opcional -->
      <p
        v-if="caption"
        class="mt-3 text-sm text-text-tertiary text-center italic"
      >
        {{ caption }}
      </p>
    </div>
  </div>
</template>
