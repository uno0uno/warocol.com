<script setup lang="ts">
interface Props {
  src: string
  alt: string
  caption?: string
}

const props = defineProps<Props>()
</script>

<template>
  <div class="w-full bg-crocus-900">
    <div class="w-full h-fit">
      <!-- Image Container -->
      <div class="w-full aspect-video max-h-[45vh]">
        <img
          itemprop="image"
          class="object-cover w-full h-full"
          :src="src"
          :alt="alt"
        >
      </div>

      <!-- Optional Caption -->
      <div class="article-container">
        <p
          v-if="caption"
          class="mt-4 text-sm lg:text-base text-crocus-200 text-center italic"
        >
          {{ caption }}
        </p>
      </div>
    </div>
  </div>
</template>
