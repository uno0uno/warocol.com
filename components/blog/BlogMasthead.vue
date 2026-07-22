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

const props = defineProps<{
  articles: ArticleSummary[]
  gradientClasses: string[]
}>()

const leftArticle = computed(() => props.articles[0] ?? null)
const rightArticle = computed(() => props.articles[1] ?? null)

const getGradientClass = (index: number) =>
  props.gradientClasses[index % props.gradientClasses.length]
</script>

<template>
  <section v-if="leftArticle" class="mb-12 sm:mb-16 lg:mb-20">
    <div class="flex items-center gap-3 mb-5 sm:mb-6">
      <div class="w-1 h-6 bg-action-primary-bg rounded-full" />
      <h2 class="text-sm sm:text-base font-bold uppercase tracking-[0.15em] text-text-primary">
        Lo más reciente
      </h2>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-7 items-stretch auto-rows-fr">
      <BlogFeaturedArticleCard
        class="h-full min-h-0"
        :article="leftArticle"
        :gradient-class="getGradientClass(0)"
        embedded
        compact
        stacked
      />

      <BlogFeaturedArticleCard
        v-if="rightArticle"
        class="h-full min-h-0"
        :article="rightArticle"
        :gradient-class="getGradientClass(1)"
        embedded
        compact
        stacked
      />
    </div>
  </section>
</template>
