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

withDefaults(defineProps<{
  article: ArticleSummary
  gradientClass: string
  embedded?: boolean
  compact?: boolean
}>(), {
  embedded: false,
  compact: false,
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getReadingTime = (description: string) => {
  const wordsPerMinute = 200
  const words = description.split(/\s+/).length * 5
  return Math.max(3, Math.ceil(words / wordsPerMinute))
}
</script>

<template>
  <section :class="embedded ? 'mb-0' : 'mb-10 sm:mb-14 lg:mb-20'">
    <div v-if="!embedded" class="flex items-center gap-3 mb-5 sm:mb-8">
      <div class="w-1 h-5 bg-action-primary-bg rounded-full"></div>
      <span class="text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">Destacado</span>
    </div>

    <article
      class="group relative bg-surface rounded-2xl overflow-hidden border border-border hover:border-badge-primary-border transition-colors duration-300 grid"
      :class="compact ? 'lg:grid-cols-[1.15fr_1fr]' : 'lg:grid-cols-[1.1fr_1fr]'"
    >
      <NuxtLink
        :to="`/blog/${article.slug}`"
        class="relative overflow-hidden"
        :class="compact ? 'min-h-[12rem] sm:min-h-[14rem] lg:min-h-[16rem]' : 'min-h-[13rem] sm:min-h-[18rem] lg:min-h-[26rem]'"
      >
        <img
          v-if="article.cover"
          :src="article.cover"
          :alt="article.title"
          class="absolute inset-0 w-full h-full object-cover"
        />
        <div v-else :class="['absolute inset-0', gradientClass]"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/10"></div>
      </NuxtLink>

      <div class="p-5 sm:p-8 lg:p-12 xl:p-14 flex flex-col justify-center">
        <div class="flex items-center gap-2 mb-3 sm:mb-5 text-xs text-text-tertiary font-medium">
          <svg class="w-3.5 h-3.5 text-badge-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ getReadingTime(article.description) }} min de lectura
        </div>

        <NuxtLink :to="`/blog/${article.slug}`">
          <h2 class="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold mb-3 sm:mb-5 text-text-primary leading-tight group-hover:text-badge-primary-text transition-colors duration-300">
            {{ article.title }}
          </h2>
        </NuxtLink>

        <p class="text-text-secondary text-sm sm:text-base lg:text-lg leading-relaxed mb-5 sm:mb-8 line-clamp-2 sm:line-clamp-3">
          {{ article.description }}
        </p>

        <NuxtLink
          :to="`/blog/${article.slug}`"
          class="inline-flex items-center gap-2 self-start px-5 py-2.5 bg-action-primary-bg hover:bg-action-primary-hover-bg text-action-primary-text text-sm font-semibold rounded-full transition-all duration-200 hover:gap-3 mb-4 sm:mb-8"
        >
          Leer artículo
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
          </svg>
        </NuxtLink>

        <div class="flex items-center gap-3 pt-6 border-t border-border">
          <img
            v-if="article.author_avatar"
            :src="article.author_avatar"
            :alt="article.author_name || 'Autor'"
            class="w-9 h-9 rounded-full object-cover ring-2 ring-border"
          />
          <div v-else class="w-9 h-9 rounded-full bg-badge-primary-bg flex items-center justify-center ring-2 ring-border">
            <span class="text-badge-primary-text text-sm font-bold">{{ article.author_name?.charAt(0) || 'W' }}</span>
          </div>
          <div>
            <p class="text-sm font-semibold text-text-primary leading-none mb-0.5">{{ article.author_name || 'Waro Colombia' }}</p>
            <p class="text-xs text-text-tertiary">{{ formatDate(article.created_at) }}</p>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
