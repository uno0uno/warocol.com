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
  stacked?: boolean
}>(), {
  embedded: false,
  compact: false,
  stacked: false,
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const getReadingTime = (description: string) => {
  const wordsPerMinute = 200
  const words = description.split(/\s+/).length * 5
  return Math.max(3, Math.ceil(words / wordsPerMinute))
}
</script>

<template>
  <section :class="embedded ? 'mb-0 h-full min-h-0 flex flex-col' : 'mb-10 sm:mb-14 lg:mb-20'">
    <div v-if="!embedded" class="flex items-center gap-3 mb-5 sm:mb-8">
      <div class="w-1 h-5 bg-action-primary-bg rounded-full" />
      <span class="text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">Destacado</span>
    </div>

    <article
      class="group relative bg-surface rounded-2xl overflow-hidden border border-border hover:border-badge-primary-border transition-colors duration-300 h-full min-h-0"
      :class="[
        stacked || embedded ? 'flex flex-col flex-1' : '',
        !stacked ? 'grid ' + (compact ? 'lg:grid-cols-[1.05fr_1fr]' : 'lg:grid-cols-[1.1fr_1fr]') : '',
      ]"
    >
      <NuxtLink
        :to="`/blog/${article.slug}`"
        class="relative overflow-hidden block w-full shrink-0"
        :class="stacked
          ? 'aspect-[16/10]'
          : compact
            ? 'aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-0 lg:h-full lg:max-h-[220px]'
            : 'min-h-[13rem] sm:min-h-[18rem] lg:min-h-[26rem]'"
      >
        <img
          v-if="article.cover"
          :src="article.cover"
          :alt="article.title"
          class="absolute inset-0 w-full h-full object-cover"
        />
        <div v-else :class="['absolute inset-0', gradientClass]" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/10" />
      </NuxtLink>

      <div
        class="flex flex-col flex-1 min-h-0"
        :class="[
          compact ? 'p-5 sm:p-6 lg:py-5 lg:px-7' : 'p-5 sm:p-8 lg:p-12 xl:p-14',
          stacked ? '' : 'justify-center',
        ]"
      >
        <div :class="stacked ? 'flex-1 min-h-0' : ''">
          <div class="flex items-center gap-2 mb-2 text-xs text-text-tertiary font-medium">
            <svg class="w-3.5 h-3.5 text-badge-primary-text shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ getReadingTime(article.description) }} min de lectura
          </div>

          <NuxtLink :to="`/blog/${article.slug}`">
            <h2
              class="font-bold text-text-primary leading-snug group-hover:text-badge-primary-text transition-colors duration-300"
              :class="compact
                ? 'text-lg sm:text-xl lg:text-2xl mb-2 line-clamp-3'
                : 'text-xl sm:text-2xl lg:text-3xl xl:text-4xl mb-3 sm:mb-5 leading-tight'"
            >
              {{ article.title }}
            </h2>
          </NuxtLink>

          <p
            class="text-text-secondary leading-relaxed"
            :class="compact
              ? (stacked ? 'text-sm line-clamp-3' : 'text-sm mb-4 line-clamp-2 hidden sm:block')
              : 'text-sm sm:text-base lg:text-lg mb-5 sm:mb-8 line-clamp-2 sm:line-clamp-3'"
          >
            {{ article.description }}
          </p>
        </div>

        <NuxtLink
          :to="`/blog/${article.slug}`"
          class="inline-flex items-center gap-2 self-start px-4 py-2 bg-text-primary text-surface hover:bg-action-primary-bg hover:text-action-primary-text text-sm font-semibold rounded-xl transition-all duration-200 hover:gap-2.5 shrink-0"
          :class="stacked ? 'mt-4 mb-3' : (compact ? 'mb-3' : 'mb-4 sm:mb-8')"
        >
          Leer artículo
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </NuxtLink>

        <div class="flex items-center gap-2.5 pt-3 border-t border-border mt-auto shrink-0">
          <img
            v-if="article.author_avatar"
            :src="article.author_avatar"
            :alt="article.author_name || 'Autor'"
            class="w-8 h-8 rounded-full object-cover ring-1 ring-border"
          />
          <div v-else class="w-8 h-8 rounded-full bg-badge-primary-bg flex items-center justify-center ring-1 ring-border">
            <span class="text-badge-primary-text text-xs font-bold">{{ article.author_name?.charAt(0) || 'W' }}</span>
          </div>
          <div>
            <p class="text-xs font-semibold text-text-primary leading-none">{{ article.author_name || 'Waro Colombia' }}</p>
            <p class="text-[11px] text-text-tertiary mt-0.5">{{ formatDate(article.created_at) }}</p>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
