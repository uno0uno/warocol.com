<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { $fetch } from 'ofetch'

// Efecto de máquina de escribir para el título del hero
const heroTitle = 'El conocimiento que necesita tu restaurante'
const displayedTitle = ref('')
const titleDone = ref(false)

onMounted(() => {
  let i = 0
  const speed = 28 // ms por caracter — rápido
  const type = () => {
    if (i < heroTitle.length) {
      displayedTitle.value += heroTitle[i]
      i++
      setTimeout(type, speed)
    } else {
      titleDone.value = true
    }
  }
  // Pequeño delay inicial para que el hero haya montado
  setTimeout(type, 120)
})

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

// Gradient classes for article images (fallback when no cover)
const gradientClasses = [
  'bg-gradient-to-br from-crocus-200 via-crocus-100 to-titan-200',
  'bg-gradient-to-br from-ebony-200 via-titan-200 to-crocus-100',
  'bg-gradient-to-br from-crocus-100 via-titan-300 to-ebony-100',
  'bg-gradient-to-br from-titan-300 via-crocus-100 to-titan-200',
  'bg-gradient-to-br from-ebony-100 via-crocus-50 to-titan-300'
]

const getGradientClass = (index: number) => gradientClasses[index % gradientClasses.length]

// Estimate reading time from description
const getReadingTime = (description: string) => {
  const wordsPerMinute = 200
  const words = description.split(/\s+/).length * 5 // Estimate full content
  return Math.max(3, Math.ceil(words / wordsPerMinute))
}

// Get first tag as category — truncado a 24 chars para badges
const getCategory = (tags: string) => {
  const firstTag = tags.split(',')[0]?.trim() || 'General'
  return firstTag.length > 24 ? firstTag.slice(0, 24) + '…' : firstTag
}

const route = useRoute()
const config = useRuntimeConfig()

const siteUrl = config.public.siteUrl || 'https://warocol.com'
const canonicalUrl = `${siteUrl}${route.path}`

const blogTitle = 'Blog - Artículos y Recursos | Waro Colombia'
const blogDescription = 'Descubre artículos, tutoriales y recursos sobre gestión de restaurantes, control de costos, inventarios y más. Aprende a optimizar tu negocio gastronómico.'

useHead({
  title: blogTitle,
  meta: [
    { name: 'description', content: blogDescription },
    // Open Graph
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: blogTitle },
    { property: 'og:description', content: blogDescription },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:image', content: `${siteUrl}/og-image.png` },
    { property: 'og:site_name', content: 'Waro Colombia' },
    { property: 'og:locale', content: 'es_CO' },
    // Twitter Cards
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: blogTitle },
    { name: 'twitter:description', content: blogDescription },
    { name: 'twitter:image', content: `${siteUrl}/og-image.png` },
    { name: 'twitter:site', content: '@warocolombia' }
  ],
  link: [
    { rel: 'canonical', href: canonicalUrl }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-titan-100 flex flex-col font-sans">

    <!-- ════════════════════════════════════════
         HERO SECTION
         Fondo blanco con dot-grid sutil + gradiente lateral púrpura
    ════════════════════════════════════════ -->
    <section class="relative bg-white overflow-hidden border-b border-titan-200">
      <!-- Dot grid background -->
      <div class="dot-grid" aria-hidden="true"></div>
      <!-- Gradiente de color lateral izquierdo -->
      <div class="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-crocus-50/60 to-transparent pointer-events-none" aria-hidden="true"></div>
      <!-- Accent blob superior derecho -->
      <div class="absolute -top-32 -right-32 w-96 h-96 bg-crocus-100/40 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>

      <div class="relative z-10 max-w-5xl mx-auto px-5 lg:px-12 pt-16 pb-12 lg:pt-28 lg:pb-24 text-center">
        <!-- Eyebrow badge -->
        <div class="inline-flex items-center gap-2 mb-5 lg:mb-7">
          <span class="w-5 h-px bg-crocus-400"></span>
          <span class="text-xs font-bold uppercase tracking-[0.25em] text-crocus-600">Blog & Recursos</span>
          <span class="w-5 h-px bg-crocus-400"></span>
        </div>

        <!-- Título con typewriter -->
        <h1 class="font-quantico text-[1.85rem] sm:text-4xl lg:text-[4.5rem] font-black mb-5 lg:mb-7 text-ebony-900 tracking-tight leading-[1.2] uppercase">
          {{ displayedTitle }}
        </h1>

        <!-- Subtítulo -->
        <p class="text-sm sm:text-base text-ebony-500 leading-relaxed font-light">
          Guías prácticas y estrategias probadas para controlar costos, optimizar inventarios y tomar decisiones con datos.
        </p>

        <!-- Stats pill -->
        <div class="inline-flex flex-wrap justify-center items-center gap-3 sm:gap-6 mt-6 lg:mt-10 px-4 sm:px-6 py-2.5 sm:py-3 bg-titan-100 rounded-full border border-titan-300 text-xs sm:text-sm text-ebony-500">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-crocus-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Contenido para restaurantes
          </span>
          <span class="w-px h-4 bg-titan-400"></span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-crocus-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Lectura rápida
          </span>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         MAIN CONTENT
    ════════════════════════════════════════ -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 w-full flex-1">

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
        <CommonsTheCustomLoader size="large" />
      </div>

      <!-- Error State -->
      <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <p class="text-xl font-semibold text-ebony-800 mb-2">Error al cargar los artículos</p>
          <p class="text-sm text-ebony-600 mb-4">{{ fetchError.message }}</p>
          <button @click="refresh" class="px-4 py-2 bg-crocus-600 text-white rounded-lg hover:bg-crocus-700 transition-colors">
            Reintentar
          </button>
        </div>
      </div>

      <template v-else>

        <!-- ─────────────────────────────────────────
             ARTÍCULO DESTACADO — Magazine style
        ───────────────────────────────────────── -->
        <section class="mb-10 sm:mb-14 lg:mb-20" v-if="filteredArticles[0]">

          <!-- Section label -->
          <div class="flex items-center gap-3 mb-5 sm:mb-8">
            <div class="w-1 h-5 bg-crocus-600 rounded-full"></div>
            <span class="text-xs font-bold uppercase tracking-[0.2em] text-ebony-400">Destacado</span>
          </div>

          <article class="group relative bg-white rounded-2xl overflow-hidden border border-titan-200 hover:border-crocus-400 transition-colors duration-300 grid lg:grid-cols-[1.1fr_1fr]">
            <!-- Imagen -->
            <NuxtLink :to="`/blog/${filteredArticles[0].slug}`" class="relative overflow-hidden min-h-[13rem] sm:min-h-[18rem] lg:min-h-[26rem]">
              <img
                v-if="filteredArticles[0].cover"
                :src="filteredArticles[0].cover"
                :alt="filteredArticles[0].title"
                class="absolute inset-0 w-full h-full object-cover"
              />
              <div v-else :class="['absolute inset-0', getGradientClass(0)]"></div>
              <!-- Overlay degradado para integrar con el contenido -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/10"></div>
            </NuxtLink>

            <!-- Contenido -->
            <div class="p-5 sm:p-8 lg:p-12 xl:p-14 flex flex-col justify-center">
              <!-- Meta -->
              <div class="flex items-center gap-2 mb-3 sm:mb-5 text-xs text-ebony-400 font-medium">
                <svg class="w-3.5 h-3.5 text-crocus-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ getReadingTime(filteredArticles[0].description) }} min de lectura
              </div>

              <NuxtLink :to="`/blog/${filteredArticles[0].slug}`">
                <h2 class="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold mb-3 sm:mb-5 text-ebony-900 leading-tight group-hover:text-crocus-700 transition-colors duration-300">
                  {{ filteredArticles[0].title }}
                </h2>
              </NuxtLink>

              <p class="text-ebony-500 text-sm sm:text-base lg:text-lg leading-relaxed mb-5 sm:mb-8 line-clamp-2 sm:line-clamp-3">
                {{ filteredArticles[0].description }}
              </p>

              <!-- CTA -->
              <NuxtLink
                :to="`/blog/${filteredArticles[0].slug}`"
                class="inline-flex items-center gap-2 self-start px-5 py-2.5 bg-crocus-600 hover:bg-crocus-700 text-white text-sm font-semibold rounded-full transition-all duration-200 hover:gap-3 mb-4 sm:mb-8"
              >
                Leer artículo
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
              </NuxtLink>

              <!-- Author -->
              <div class="flex items-center gap-3 pt-6 border-t border-titan-200">
                <img
                  v-if="filteredArticles[0].author_avatar"
                  :src="filteredArticles[0].author_avatar"
                  :alt="filteredArticles[0].author_name || 'Autor'"
                  class="w-9 h-9 rounded-full object-cover ring-2 ring-titan-200"
                />
                <div v-else class="w-9 h-9 rounded-full bg-crocus-100 flex items-center justify-center ring-2 ring-titan-200">
                  <span class="text-crocus-600 text-sm font-bold">{{ filteredArticles[0].author_name?.charAt(0) || 'W' }}</span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-ebony-900 leading-none mb-0.5">{{ filteredArticles[0].author_name || 'Waro Colombia' }}</p>
                  <p class="text-xs text-ebony-400">{{ formatDate(filteredArticles[0].created_at) }}</p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <!-- ─────────────────────────────────────────
             GRID DE ARTÍCULOS
        ───────────────────────────────────────── -->
        <section class="mb-10 lg:mb-20">
          <!-- Section label -->
          <div class="flex items-center gap-3 mb-6 sm:mb-10">
            <div class="w-1 h-5 bg-ebony-300 rounded-full"></div>
            <span class="text-xs font-bold uppercase tracking-[0.2em] text-ebony-400">Más Artículos</span>
          </div>

          <div v-if="filteredArticles.length > 1" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-7">
            <article
              v-for="(article, index) in filteredArticles.slice(1)"
              :key="article.id"
              class="group bg-white rounded-2xl overflow-hidden border border-titan-200 hover:border-crocus-400 transition-colors duration-300 flex flex-col h-full"
            >
              <!-- Imagen con badges flotantes -->
              <NuxtLink :to="`/blog/${article.slug}`" class="relative h-40 sm:h-48 lg:h-52 overflow-hidden flex-shrink-0">
                <img
                  v-if="article.cover"
                  :src="article.cover"
                  :alt="article.title"
                  class="absolute inset-0 w-full h-full object-cover"
                />
                <div v-else :class="['absolute inset-0', getGradientClass(index + 1)]"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

                <!-- Tiempo de lectura — pill flotante -->
                <span class="absolute bottom-3.5 right-3.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 text-white text-[10px] font-medium backdrop-blur-sm">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  {{ getReadingTime(article.description) }} min
                </span>
              </NuxtLink>

              <!-- Contenido -->
              <div class="p-4 sm:p-5 lg:p-6 flex flex-col flex-1">
                <NuxtLink :to="`/blog/${article.slug}`" class="block mb-3 flex-1">
                  <h3 class="text-lg font-bold text-ebony-900 leading-snug group-hover:text-crocus-700 transition-colors duration-200 line-clamp-2">
                    {{ article.title }}
                  </h3>
                </NuxtLink>

                <p class="text-ebony-400 text-sm leading-relaxed mb-5 line-clamp-2">
                  {{ article.description }}
                </p>

                <!-- Footer de card -->
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
                  <!-- Arrow link -->
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

          <!-- Empty State -->
          <div v-else-if="filteredArticles.length === 0" class="text-center py-24 bg-white rounded-2xl border border-dashed border-titan-400 shadow-sm">
            <div class="w-16 h-16 rounded-2xl bg-crocus-50 flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-crocus-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <h3 class="text-lg font-bold text-ebony-900 mb-2">No hay artículos disponibles</h3>
            <p class="text-sm text-ebony-400">Pronto publicaremos nuevo contenido.</p>
          </div>
        </section>

        <!-- ─────────────────────────────────────────
             PAGINACIÓN
        ───────────────────────────────────────── -->
        <div v-if="totalPages > 1" class="flex justify-center mt-12 mb-4">
          <nav class="flex items-center gap-1.5 bg-white p-1.5 rounded-xl shadow-sm border border-titan-200">
            <button
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
              class="p-2 rounded-lg hover:bg-titan-100 text-ebony-500 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              aria-label="Página anterior"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>

            <button
              v-for="page in totalPages"
              :key="page"
              @click="goToPage(page)"
              :class="[
                'w-9 h-9 rounded-lg text-sm font-medium transition-all',
                currentPage === page
                  ? 'bg-crocus-600 text-white shadow-sm'
                  : 'text-ebony-500 hover:bg-titan-100'
              ]"
            >
              {{ page }}
            </button>

            <button
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
              class="p-2 rounded-lg hover:bg-titan-100 text-ebony-500 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              aria-label="Página siguiente"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </nav>
        </div>

      </template>
    </main>
  </div>
</template>

<style scoped>
/* Dot grid background — sutil, no distrae */
.dot-grid {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, hsl(var(--titan-400)) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.45;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%);
}
</style>
