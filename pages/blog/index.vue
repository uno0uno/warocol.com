<script setup lang="ts">
// Types
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

interface ArticlesResponse {
  success: boolean
  total: number
  data: ArticleSummary[]
}

// State
const searchQuery = ref('')
const activeFilter = ref('All')
const currentPage = ref(1)
const articlesPerPage = 9

// Fetch articles from API
const { data: articlesData, pending: isLoading, error: fetchError, refresh } = useAsyncData<ArticlesResponse>(
  'blog-articles',
  () => $fetch('/api/blog', {
    query: {
      page: currentPage.value,
      limit: articlesPerPage,
      search: searchQuery.value || undefined
    }
  }),
  {
    server: true,
    watch: [currentPage],
    default: () => ({ success: true, total: 0, data: [] })
  }
)

// Computed
const articles = computed(() => articlesData.value?.data || [])
const totalPages = computed(() => Math.ceil((articlesData.value?.total || 0) / articlesPerPage))

// Filtered articles (client-side search for tags)
const filteredArticles = computed(() => {
  let result = articles.value

  if (activeFilter.value !== 'All') {
    result = result.filter(article =>
      article.tags.toLowerCase().includes(activeFilter.value.toLowerCase())
    )
  }

  return result
})

// Extract unique tags from articles for filters
const filters = computed(() => {
  const tags = new Set<string>(['All'])
  articles.value.forEach(article => {
    article.tags.split(',').forEach(tag => {
      const trimmed = tag.trim()
      if (trimmed) tags.add(trimmed)
    })
  })
  return Array.from(tags).slice(0, 7) // Limit to 7 filters
})

// Search handler
const performSearch = () => {
  currentPage.value = 1
  refresh()
}

// Pagination
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Gradient classes for article images
const gradientClasses = [
  'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50',
  'bg-gradient-to-br from-slate-100 via-gray-50 to-slate-50',
  'bg-gradient-to-br from-stone-100 via-gray-50 to-stone-50',
  'bg-gradient-to-br from-gray-300 via-gray-200 to-gray-100',
  'bg-gradient-to-br from-zinc-100 via-gray-50 to-zinc-50'
]

const getGradientClass = (index: number) => gradientClasses[index % gradientClasses.length]

// Estimate reading time from description
const getReadingTime = (description: string) => {
  const wordsPerMinute = 200
  const words = description.split(/\s+/).length * 5 // Estimate full content
  return Math.max(3, Math.ceil(words / wordsPerMinute))
}

// Get first tag as category
const getCategory = (tags: string) => {
  const firstTag = tags.split(',')[0]?.trim()
  return firstTag || 'General'
}

useHead({
  title: 'Blog - Artículos y Tutoriales',
  meta: [
    {
      name: 'description',
      content: 'Lee nuestros últimos artículos sobre eventos corporativos, organización y mejores prácticas.'
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
    <!-- Hero Section -->
    <section class="relative bg-crocus-900 overflow-hidden border-b border-crocus-800">
      <div class="relative z-10 max-w-6xl mx-auto px-6 lg:px-12 pt-24 pb-20 text-center">
        <span class="inline-block py-2.5 px-6 rounded bg-white/10 backdrop-blur-sm text-crocus-200 text-sm font-semibold mb-6 tracking-wide uppercase border-2 border-crocus-200/20">
          Blog & Recursos
        </span>
        <h1 class="text-5xl lg:text-7xl font-bold mb-6 text-white tracking-tight leading-tight">
          Explora nuestro Conocimiento
        </h1>
        <p class="text-lg text-crocus-200 max-w-2xl mx-auto leading-relaxed">
          Descubre artículos, tutoriales y noticias sobre eventos corporativos, organización y el ecosistema de Waro.
        </p>
      </div>
    </section>

    <!-- Main Container -->
    <main class="max-w-7xl mx-auto px-6 lg:px-8 py-16 w-full flex-1">

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <div class="w-16 h-16 border-4 border-crocus-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p class="text-lg text-ebony-600">Cargando artículos...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <p class="text-xl font-semibold text-ebony-800 mb-2">Error al cargar los artículos</p>
          <p class="text-sm text-ebony-600 mb-4">{{ fetchError.message }}</p>
          <button @click="refresh" class="px-4 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600">
            Reintentar
          </button>
        </div>
      </div>

      <template v-else>
        <!-- Featured Post Section -->
        <section class="mb-24" v-if="filteredArticles[0]">
          <div class="flex items-center justify-start mb-8">
            <h2 class="inline-flex items-center px-6 py-2.5 rounded border-2 border-crocus-600/30 bg-white/50 backdrop-blur-sm text-crocus-600/90 font-semibold text-lg">
              Destacado
            </h2>
          </div>

          <article class="group relative bg-white rounded overflow-hidden border-2 border-crocus-600/30 hover:border-crocus-600/80 transition-colors duration-300 grid lg:grid-cols-2">
            <NuxtLink :to="`/blog/${filteredArticles[0].slug}`" class="relative overflow-hidden h-96 lg:h-auto">
              <img
                v-if="filteredArticles[0].cover"
                :src="filteredArticles[0].cover"
                :alt="filteredArticles[0].title"
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div v-else :class="['absolute inset-0 transition-transform duration-700 group-hover:scale-105', getGradientClass(0)]"></div>
              <div class="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-500"></div>
            </NuxtLink>

            <div class="p-8 lg:p-12 flex flex-col justify-center">
              <div class="flex items-center gap-3 mb-6">
                <span class="px-3 py-1 rounded bg-white text-crocus-600 text-xs font-bold uppercase tracking-wider border-2 border-crocus-600/30">
                  {{ getCategory(filteredArticles[0].tags) }}
                </span>
                <span class="text-gray-300 text-sm">•</span>
                <span class="text-gray-500 text-sm font-medium">{{ getReadingTime(filteredArticles[0].description) }} min de lectura</span>
              </div>

              <NuxtLink :to="`/blog/${filteredArticles[0].slug}`">
                <h3 class="text-3xl lg:text-4xl font-bold mb-6 text-ebony-900 leading-tight group-hover:text-crocus-600 transition-colors">
                  {{ filteredArticles[0].title }}
                </h3>
              </NuxtLink>

              <p class="text-gray-600 text-lg leading-relaxed mb-8 line-clamp-3">
                {{ filteredArticles[0].description }}
              </p>

              <div class="flex items-center gap-4 mt-auto pt-8 border-t border-gray-100">
                <img
                  v-if="filteredArticles[0].author_avatar"
                  :src="filteredArticles[0].author_avatar"
                  :alt="filteredArticles[0].author_name || 'Autor'"
                  class="w-10 h-10 rounded-full object-cover border border-gray-200"
                />
                <div v-else class="w-10 h-10 rounded-full bg-crocus-100 flex items-center justify-center">
                  <span class="text-crocus-600 font-bold">{{ filteredArticles[0].author_name?.charAt(0) || 'W' }}</span>
                </div>
                <div>
                  <p class="text-sm font-bold text-ebony-900">{{ filteredArticles[0].author_name || 'Waro Colombia' }}</p>
                  <p class="text-xs text-gray-500">{{ formatDate(filteredArticles[0].created_at) }}</p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <!-- Blog Grid Section -->
        <section class="mb-20">
          <div class="flex items-center justify-start mb-10">
            <h2 class="inline-flex items-center px-6 py-2.5 rounded border-2 border-crocus-600/30 bg-white/50 backdrop-blur-sm text-crocus-600/90 font-semibold text-lg">
              Más Artículos
            </h2>
          </div>

          <div v-if="filteredArticles.length > 1" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <article
              v-for="(article, index) in filteredArticles.slice(1)"
              :key="article.id"
              class="group bg-white rounded overflow-hidden border-2 border-crocus-600/30 hover:border-crocus-600/80 transition-colors duration-300 flex flex-col h-full"
            >
              <NuxtLink :to="`/blog/${article.slug}`" class="relative h-56 overflow-hidden">
                <img
                  v-if="article.cover"
                  :src="article.cover"
                  :alt="article.title"
                  class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div v-else :class="['absolute inset-0 transition-transform duration-500 group-hover:scale-105', getGradientClass(index + 1)]"></div>
              </NuxtLink>

              <div class="p-6 flex flex-col flex-1">
                <div class="flex items-center gap-2 mb-4">
                  <span class="text-crocus-600 text-xs font-bold uppercase tracking-wide">
                    {{ getCategory(article.tags) }}
                  </span>
                  <span class="text-gray-300">•</span>
                  <span class="text-gray-400 text-xs">{{ getReadingTime(article.description) }} min</span>
                </div>

                <NuxtLink :to="`/blog/${article.slug}`" class="block mb-3">
                  <h3 class="text-xl font-bold text-ebony-900 leading-snug group-hover:text-crocus-600 transition-colors">
                    {{ article.title }}
                  </h3>
                </NuxtLink>

                <p class="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3 flex-1">
                  {{ article.description }}
                </p>

                <div class="flex items-center gap-3 pt-5 border-t border-gray-50">
                  <img
                    v-if="article.author_avatar"
                    :src="article.author_avatar"
                    :alt="article.author_name || 'Autor'"
                    class="w-8 h-8 rounded-full object-cover border border-gray-100"
                  />
                  <div v-else class="w-8 h-8 rounded-full bg-crocus-100 flex items-center justify-center">
                    <span class="text-crocus-600 text-xs font-bold">{{ article.author_name?.charAt(0) || 'W' }}</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs font-semibold text-ebony-900">{{ article.author_name || 'Waro Colombia' }}</span>
                    <span class="text-[10px] text-gray-500">{{ formatDate(article.created_at) }}</span>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredArticles.length === 0" class="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <div class="text-6xl mb-4">📝</div>
            <h3 class="text-xl font-bold text-ebony-900 mb-2">No hay artículos disponibles</h3>
            <p class="text-gray-500">Pronto publicaremos nuevo contenido.</p>
          </div>
        </section>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center mt-16">
          <nav class="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200">
            <button
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
              class="p-2 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>

            <button
              v-for="page in totalPages"
              :key="page"
              @click="goToPage(page)"
              :class="[
                'w-10 h-10 rounded-lg text-sm font-medium transition-all',
                currentPage === page
                  ? 'bg-ebony-900 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              ]"
            >
              {{ page }}
            </button>

            <button
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
              class="p-2 rounded-lg hover:bg-gray-50 text-gray-600 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </nav>
        </div>
      </template>

    </main>

  </div>
</template>

<style scoped>
/* No custom CSS needed, using Tailwind utility classes */
</style>
