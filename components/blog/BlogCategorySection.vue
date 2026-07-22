<script setup lang="ts">
interface ArticleSummary {
  id: number
  title: string
  slug: string
  description: string
  thumbnail: string
  cover: string
  tags: string
  pillar?: string | null
  views: number
  published: boolean
  created_at: string
  author_name: string | null
  author_avatar: string | null
}

defineProps<{
  pillarId: string
  label: string
  articles: ArticleSummary[]
  gradientClasses: string[]
}>()
</script>

<template>
  <section v-if="articles.length > 0" class="mb-12 sm:mb-16 lg:mb-20">
    <div class="flex items-end justify-between gap-4 mb-6 sm:mb-8">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-1 h-5 bg-action-primary-bg rounded-full shrink-0" />
        <h2 class="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary truncate">
          {{ label }}
        </h2>
      </div>
      <NuxtLink
        :to="`/blog?pillar=${pillarId}`"
        class="shrink-0 text-sm font-semibold text-badge-primary-text hover:text-action-primary-hover-bg transition-colors whitespace-nowrap"
      >
        Ver todos »
      </NuxtLink>
    </div>

    <BlogArticleGrid
      :articles="articles"
      :gradient-classes="gradientClasses"
      :columns="4"
      :show-header="false"
      :show-empty="false"
    />
  </section>
</template>
