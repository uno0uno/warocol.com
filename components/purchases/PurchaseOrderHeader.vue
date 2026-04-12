<template>
  <div class="bg-surface border-2 border-border rounded-lg mb-6">
    <div class="p-6">
      <h2 v-if="title" class="text-xl font-bold text-text-primary mb-4">{{ title }}</h2>
      <div :class="gridClass">
        <!-- Default slots for custom content -->
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  columns?: 3 | 4
}

const props = withDefaults(defineProps<Props>(), { columns: 3 })

const gridClass = computed(() =>
  props.columns === 4
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6'
    : 'grid grid-cols-1 md:grid-cols-3 gap-y-12 gap-x-6'
)
</script>
