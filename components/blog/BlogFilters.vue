<script setup lang="ts">
import type { BlogPillar } from '~/utils/blogPillars'

defineProps<{
  pillars: BlogPillar[]
  activePillar: string | null
}>()
</script>

<template>
  <div class="flex gap-2 flex-wrap mb-8 sm:mb-10">
    <NuxtLink
      to="/blog"
      :class="[
        'px-4 py-2 rounded-xl text-sm font-medium transition-all',
        activePillar === null
          ? 'bg-text-primary text-surface ring-2 ring-badge-primary-border'
          : 'bg-text-primary text-surface hover:bg-action-primary-bg hover:text-action-primary-text'
      ]"
    >
      Todos
    </NuxtLink>
    <NuxtLink
      v-for="pillar in pillars"
      :key="pillar.id"
      :to="`/blog?pillar=${pillar.id}`"
      :class="[
        'px-4 py-2 rounded-xl text-sm font-medium transition-all',
        activePillar === pillar.id
          ? 'bg-text-primary text-surface ring-2 ring-badge-primary-border'
          : 'bg-text-primary text-surface hover:bg-action-primary-bg hover:text-action-primary-text'
      ]"
    >
      {{ pillar.label }}
    </NuxtLink>
  </div>
</template>
