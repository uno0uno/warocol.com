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

const props = withDefaults(defineProps<{
  articles: ArticleSummary[]
  gradientClasses: string[]
  showEmpty?: boolean
  showHeader?: boolean
  columns?: 2 | 3 | 4
}>(), {
  showEmpty: true,
  showHeader: true,
  columns: 3,
})

const gridClass = computed(() => {
  if (props.columns === 4) {
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-7'
  }
  if (props.columns === 2) {
    return 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5'
  }
  return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-7'
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

const getGradientClass = (index: number) => props.gradientClasses[index % props.gradientClasses.length]
</script>

<template>
  <section :class="showHeader ? 'mb-10 lg:mb-20' : 'mb-0'">
    <div v-if="showHeader" class="flex items-center gap-3 mb-6 sm:mb-10">
      <div class="w-1 h-5 bg-border rounded-full"></div>
      <span class="text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">Más Artículos</span>
    </div>

    <div v-if="props.articles.length > 0" :class="[gridClass, 'items-stretch auto-rows-fr']">
      <article
        v-for="(article, index) in props.articles"
        :key="article.id"
        class="group bg-surface rounded-2xl overflow-hidden border border-border hover:border-badge-primary-border transition-colors duration-300 flex flex-col h-full min-h-0"
      >
        <NuxtLink :to="`/blog/${article.slug}`" class="relative h-40 sm:h-48 lg:h-52 overflow-hidden flex-shrink-0">
          <img
            v-if="article.cover"
            :src="article.cover"
            :alt="article.title"
            class="absolute inset-0 w-full h-full object-cover"
          />
          <div v-else :class="['absolute inset-0', getGradientClass(index + 1)]"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

          <span class="absolute bottom-3.5 end-3.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-overlay-backdrop/50 text-action-primary-text text-[10px] font-medium backdrop-blur-sm">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {{ getReadingTime(article.description) }} min
          </span>
        </NuxtLink>

        <div class="p-4 sm:p-5 lg:p-6 flex flex-col flex-1 min-h-0">
          <div class="flex-1 min-h-0">
            <NuxtLink :to="`/blog/${article.slug}`" class="block mb-3">
              <h3 class="text-lg font-bold text-text-primary leading-snug group-hover:text-badge-primary-text transition-colors duration-200 line-clamp-2">
                {{ article.title }}
              </h3>
            </NuxtLink>

            <p class="text-text-tertiary text-sm leading-relaxed line-clamp-2">
              {{ article.description }}
            </p>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-border mt-5 shrink-0">
            <div class="flex items-center gap-2.5">
              <img
                v-if="article.author_avatar"
                :src="article.author_avatar"
                :alt="article.author_name || 'Autor'"
                class="w-7 h-7 rounded-full object-cover ring-1 ring-border"
              />
              <div v-else class="w-7 h-7 rounded-full bg-badge-primary-bg flex items-center justify-center ring-1 ring-badge-primary-border">
                <span class="text-badge-primary-text text-[10px] font-bold">{{ article.author_name?.charAt(0) || 'W' }}</span>
              </div>
              <div>
                <p class="text-xs font-semibold text-text-primary leading-none">{{ article.author_name || 'Waro Colombia' }}</p>
                <p class="text-[10px] text-text-tertiary mt-0.5">{{ formatDate(article.created_at) }}</p>
              </div>
            </div>

            <NuxtLink
              :to="`/blog/${article.slug}`"
              class="w-8 h-8 rounded-full bg-text-primary text-surface hover:bg-action-primary-bg hover:text-action-primary-text flex items-center justify-center transition-colors duration-200 group/btn"
              aria-label="Leer artículo"
            >
              <svg class="w-3.5 h-3.5 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
              </svg>
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>

    <div v-else-if="props.showEmpty" class="text-center py-24 bg-surface rounded-2xl border border-dashed border-border shadow-sm">
      <div class="w-16 h-16 rounded-2xl bg-badge-primary-bg flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-badge-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <h3 class="text-lg font-bold text-text-primary mb-2">No hay artículos disponibles</h3>
      <p class="text-sm text-text-tertiary">Pronto publicaremos nuevo contenido.</p>
    </div>
  </section>
</template>
