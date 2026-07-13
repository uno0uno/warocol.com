<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

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
const { data: articlesData, pending: isLoading, error: fetchError, refresh } = useFetch<ArticlesResponse>(
  '/api/blog',
  {
    query: computed(() => ({
      page: currentPage.value,
      limit: articlesPerPage,
      search: searchQuery.value || undefined
    })),
    server: true,
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

// Gradient classes for article images (fallback when no cover)
const gradientClasses = [
  'bg-gradient-to-br from-badge-primary-border via-badge-primary-bg to-surface-tertiary',
  'bg-gradient-to-br from-surface-tertiary via-border to-badge-primary-bg',
  'bg-gradient-to-br from-badge-primary-bg via-surface-tertiary to-surface-secondary',
  'bg-gradient-to-br from-surface-tertiary via-badge-primary-bg to-border',
  'bg-gradient-to-br from-surface-secondary via-badge-primary-bg to-surface-tertiary'
]

const getGradientClass = (index: number) => gradientClasses[index % gradientClasses.length]

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
  <div class="min-h-screen bg-background flex flex-col font-sans">

    <!-- ════════════════════════════════════════
         HERO SECTION
         Fondo del dashboard con dot-grid sutil + gradiente lateral púrpura
    ════════════════════════════════════════ -->
    <section class="relative bg-background overflow-hidden border-b border-border">
      <!-- Dot grid background -->
      <div class="dot-grid" aria-hidden="true"></div>
      <!-- Gradiente de color lateral izquierdo -->
      <div class="absolute inset-y-0 start-0 w-1/2 bg-gradient-to-r from-badge-primary-bg/60 to-transparent pointer-events-none" aria-hidden="true"></div>
      <!-- Accent blob superior derecho -->
      <div class="absolute -top-32 -end-32 w-96 h-96 bg-badge-primary-bg/40 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>

      <div class="relative z-10 max-w-5xl mx-auto px-5 lg:px-12 pt-16 pb-12 lg:pt-28 lg:pb-24 text-center">
        <!-- Eyebrow badge -->
        <div class="inline-flex items-center gap-2 mb-5 lg:mb-7">
          <span class="w-5 h-px bg-badge-primary-border"></span>
          <span class="text-xs font-bold uppercase tracking-[0.25em] text-badge-primary-text">Blog & Recursos</span>
          <span class="w-5 h-px bg-badge-primary-border"></span>
        </div>

        <!-- Título con typewriter -->
        <h1 class="font-quantico text-[1.85rem] sm:text-4xl lg:text-[4.5rem] font-black mb-5 lg:mb-7 text-text-primary tracking-tight leading-tight lg:leading-[1] uppercase">
          {{ displayedTitle }}
        </h1>

        <!-- Subtítulo -->
        <p class="text-sm sm:text-base text-text-secondary leading-relaxed font-light">
          Guías prácticas y estrategias probadas para controlar costos, optimizar inventarios y tomar decisiones con datos.
        </p>

        <!-- Stats pill -->
        <div class="inline-flex flex-wrap justify-center items-center gap-3 sm:gap-6 mt-6 lg:mt-10 px-4 sm:px-6 py-2.5 sm:py-3 bg-surface rounded-full border border-border text-xs sm:text-sm text-text-secondary">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-badge-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Contenido para restaurantes
          </span>
          <span class="w-px h-4 bg-border"></span>
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-badge-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
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
          <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar los artículos</p>
          <p class="text-sm text-text-secondary mb-4">{{ fetchError.message }}</p>
          <button @click="refresh" class="px-4 py-2 bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg transition-colors">
            Reintentar
          </button>
        </div>
      </div>

      <template v-else>

        <BlogFeaturedArticleCard
          v-if="filteredArticles[0]"
          :article="filteredArticles[0]"
          :gradient-class="getGradientClass(0)"
        />

        <BlogArticleGrid
          :articles="filteredArticles.slice(1)"
          :gradient-classes="gradientClasses"
          :show-empty="filteredArticles.length === 0"
        />

        <BlogPagination
          :current-page="currentPage"
          :total-pages="totalPages"
          @page="goToPage"
        />

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
  background-image: radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px);
  background-size: 28px 28px;
  opacity: 0.45;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%);
}
</style>
