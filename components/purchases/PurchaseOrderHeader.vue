<template>
  <div class="bg-surface border-2 border-border rounded-lg mb-6">
    <div class="p-6">
      <h2 v-if="title" class="text-xl font-bold text-text-primary mb-4">{{ title }}</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Default slots for custom content -->
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
}

const props = defineProps<Props>()
</script>
