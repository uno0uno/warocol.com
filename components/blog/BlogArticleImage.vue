<script setup lang="ts">
interface Props {
  src: string
  alt: string
  caption?: string
}

const props = defineProps<Props>()
</script>

<template>
  <!-- Transición suave: superficie blanca del hero → titan-100 del content -->
  <div class="w-full bg-titan-100">
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
        class="mt-3 text-sm text-ebony-400 text-center italic"
      >
        {{ caption }}
      </p>
    </div>
  </div>
</template>
