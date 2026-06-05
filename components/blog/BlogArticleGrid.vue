<script setup lang="ts">
interface ArticleSummary {
  id: number
  title: string
  slug: string
  description: string
  thumbnail: string
  cover: string
  tags: string
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
}>(), {
  showEmpty: true,
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
  <section class="mb-10 lg:mb-20">
    <div class="flex items-center gap-3 mb-6 sm:mb-10">
      <div class="w-1 h-5 bg-ebony-300 rounded-full"></div>
      <span class="text-xs font-bold uppercase tracking-[0.2em] text-ebony-400">Más Artículos</span>
    </div>

    <div v-if="props.articles.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-7">
      <article
        v-for="(article, index) in props.articles"
        :key="article.id"
        class="group bg-white rounded-2xl overflow-hidden border border-titan-200 hover:border-crocus-400 transition-colors duration-300 flex flex-col h-full"
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

          <span class="absolute bottom-3.5 right-3.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 text-white text-[10px] font-medium backdrop-blur-sm">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {{ getReadingTime(article.description) }} min
          </span>
        </NuxtLink>

        <div class="p-4 sm:p-5 lg:p-6 flex flex-col flex-1">
          <NuxtLink :to="`/blog/${article.slug}`" class="block mb-3 flex-1">
            <h3 class="text-lg font-bold text-ebony-900 leading-snug group-hover:text-crocus-700 transition-colors duration-200 line-clamp-2">
              {{ article.title }}
            </h3>
          </NuxtLink>

          <p class="text-ebony-400 text-sm leading-relaxed mb-5 line-clamp-2">
            {{ article.description }}
          </p>

          <div class="flex items-center justify-between pt-4 border-t border-titan-200 mt-auto">
            <div class="flex items-center gap-2.5">
              <img
                v-if="article.author_avatar"
                :src="article.author_avatar"
                :alt="article.author_name || 'Autor'"
                class="w-7 h-7 rounded-full object-cover ring-1 ring-titan-200"
              />
              <div v-else class="w-7 h-7 rounded-full bg-crocus-50 flex items-center justify-center ring-1 ring-crocus-200">
                <span class="text-crocus-600 text-[10px] font-bold">{{ article.author_name?.charAt(0) || 'W' }}</span>
              </div>
              <div>
                <p class="text-xs font-semibold text-ebony-800 leading-none">{{ article.author_name || 'Waro Colombia' }}</p>
                <p class="text-[10px] text-ebony-400 mt-0.5">{{ formatDate(article.created_at) }}</p>
              </div>
            </div>

            <NuxtLink
              :to="`/blog/${article.slug}`"
              class="w-8 h-8 rounded-full bg-titan-100 hover:bg-crocus-600 flex items-center justify-center transition-colors duration-200 group/btn"
              aria-label="Leer artículo"
            >
              <svg class="w-3.5 h-3.5 text-ebony-500 group-hover/btn:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
              </svg>
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>

    <div v-else-if="props.showEmpty" class="text-center py-24 bg-white rounded-2xl border border-dashed border-titan-400 shadow-sm">
      <div class="w-16 h-16 rounded-2xl bg-crocus-50 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-crocus-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <h3 class="text-lg font-bold text-ebony-900 mb-2">No hay artículos disponibles</h3>
      <p class="text-sm text-ebony-400">Pronto publicaremos nuevo contenido.</p>
    </div>
  </section>
</template>
