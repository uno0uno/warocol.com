<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { BLOG_PILLARS, getPillarLabel } from '~/utils/blogPillars'
import { resolveAnonymousReaderMarket } from '~/utils/articleMarket'
import { articleLangToLocale } from '~/utils/articleLangToLocale'

definePageMeta({
  layout: 'blog',
  publicAccess: true,
})

const heroTitle = 'El conocimiento que necesita tu restaurante'
const displayedTitle = ref('')
const titleDone = ref(false)

onMounted(() => {
  let i = 0
  const speed = 28
  const type = () => {
    if (i < heroTitle.length) {
      displayedTitle.value += heroTitle[i]
      i++
      setTimeout(type, speed)
    } else {
      titleDone.value = true
    }
  }
  setTimeout(type, 120)
})

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
  lang?: string | null
  country_code?: string | null
}

interface ArticlesResponse {
  success: boolean
  total: number
  data: ArticleSummary[]
}

const route = useRoute()
const config = useRuntimeConfig()

const activePillar = computed(() => {
  const pillar = route.query.pillar
  return typeof pillar === 'string' && pillar.length > 0 ? pillar : null
})

const isFilteredMode = computed(() => activePillar.value !== null)

const currentPage = ref(1)
const articlesPerPage = 9
const magazineLimit = 50

watch(() => route.query.pillar, () => {
  currentPage.value = 1
})

const fetchQuery = computed(() => {
  if (isFilteredMode.value && activePillar.value) {
    return {
      page: currentPage.value,
      limit: articlesPerPage,
      pillar: activePillar.value,
    }
  }
  return { limit: magazineLimit }
})

const { data: articlesData, pending: isLoading, error: fetchError, refresh } = useFetch<ArticlesResponse>(
  '/api/blog',
  {
    query: fetchQuery,
    server: true,
    default: () => ({ success: true, total: 0, data: [] }),
  }
)

const articles = computed(() => articlesData.value?.data || [])
const totalPages = computed(() =>
  Math.ceil((articlesData.value?.total || 0) / articlesPerPage)
)

const requestHeaders = useRequestHeaders(['accept-language', 'cf-ipcountry'])
const authStore = useAuthStore()
const { applyPersonalLocale } = useAppLocale()
const readerMarket = computed(() => resolveAnonymousReaderMarket({
  acceptLanguage: requestHeaders['accept-language'],
  cfIpCountry: requestHeaders['cf-ipcountry'],
}))

watch(
  () => authStore.session,
  async (session) => {
    if (session) return
    const code = articleLangToLocale(readerMarket.value.inLanguage)
    if (code) await applyPersonalLocale(code)
  },
  { immediate: true },
)

const articlesByPillar = computed(() => {
  const grouped: Record<string, ArticleSummary[]> = {}
  for (const pillar of BLOG_PILLARS) {
    grouped[pillar.id] = articles.value
      .filter(article => article.pillar === pillar.id)
      .slice(0, 4)
  }
  return grouped
})

const filteredViewTitle = computed(() =>
  getPillarLabel(activePillar.value) ?? 'Artículos'
)

const gradientClasses = [
  'bg-gradient-to-br from-badge-primary-border via-badge-primary-bg to-surface-tertiary',
  'bg-gradient-to-br from-surface-tertiary via-border to-badge-primary-bg',
  'bg-gradient-to-br from-badge-primary-bg via-surface-tertiary to-surface-secondary',
  'bg-gradient-to-br from-surface-tertiary via-badge-primary-bg to-border',
  'bg-gradient-to-br from-surface-secondary via-badge-primary-bg to-surface-tertiary',
]

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const siteUrl = config.public.siteUrl || 'https://warocol.com'
const canonicalUrl = `${siteUrl}${route.path}`

const blogTitle = 'Blog - Artículos y Recursos | Waro Colombia'
const blogDescription = 'Descubre artículos, tutoriales y recursos sobre gestión de restaurantes, control de costos, inventarios y más. Aprende a optimizar tu negocio gastronómico.'

useHead({
  title: blogTitle,
  meta: [
    { name: 'description', content: blogDescription },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: blogTitle },
    { property: 'og:description', content: blogDescription },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:image', content: `${siteUrl}/og-image.png` },
    { property: 'og:site_name', content: 'Waro Colombia' },
    { property: 'og:locale', content: 'es_CO' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: blogTitle },
    { name: 'twitter:description', content: blogDescription },
    { name: 'twitter:image', content: `${siteUrl}/og-image.png` },
    { name: 'twitter:site', content: '@warocolombia' },
  ],
  link: [{ rel: 'canonical', href: canonicalUrl }],
})
</script>

<template>
  <div class="min-h-dvh bg-background flex flex-col font-sans">
    <section class="relative bg-background overflow-hidden border-b border-border">
      <div class="dot-grid" aria-hidden="true" />
      <div class="absolute inset-y-0 start-0 w-1/2 bg-gradient-to-r from-badge-primary-bg/60 to-transparent pointer-events-none" aria-hidden="true" />
      <div class="absolute -top-32 -end-32 w-96 h-96 bg-badge-primary-bg/40 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div class="relative z-10 public-page-container pt-16 pb-12 lg:pt-28 lg:pb-24 text-center">
        <div class="inline-flex items-center gap-2 mb-5 lg:mb-7">
          <span class="w-5 h-px bg-badge-primary-border" />
          <span class="text-xs font-bold uppercase tracking-[0.25em] text-badge-primary-text">Blog & Recursos</span>
          <span class="w-5 h-px bg-badge-primary-border" />
        </div>

        <h1 class="font-quantico text-[1.85rem] sm:text-4xl lg:text-[4.5rem] font-black mb-5 lg:mb-7 text-text-primary tracking-tight leading-tight lg:leading-[1] uppercase">
          {{ displayedTitle }}
        </h1>

        <p class="text-sm sm:text-base text-text-secondary leading-relaxed font-light">
          Guías prácticas y estrategias probadas para controlar costos, optimizar inventarios y tomar decisiones con datos.
        </p>

        <div class="inline-flex flex-wrap justify-center items-center gap-3 sm:gap-6 mt-6 lg:mt-10 px-4 sm:px-6 py-2.5 sm:py-3 bg-surface rounded-xl border border-border text-xs sm:text-sm text-text-secondary">
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-badge-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Contenido para restaurantes
          </span>
          <span class="w-px h-4 bg-border" />
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4 text-badge-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Lectura rápida
          </span>
        </div>
      </div>
    </section>

    <div class="public-page-container flex-1 w-full py-8 sm:py-12 lg:py-16 pb-[calc(2rem+var(--layout-public-bottom-nav-height))] md:pb-16">
      <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
        <CommonsTheCustomLoader size="large" />
      </div>

      <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
        <div class="text-center">
          <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar los artículos</p>
          <p class="text-sm text-text-secondary mb-4">{{ fetchError.message }}</p>
          <button
            class="px-4 py-2 bg-text-primary text-surface rounded-xl hover:bg-action-primary-bg hover:text-action-primary-text transition-colors"
            @click="refresh()"
          >
            Reintentar
          </button>
        </div>
      </div>

      <template v-else-if="isFilteredMode">
        <BlogFilters :pillars="BLOG_PILLARS" :active-pillar="activePillar" />

        <div class="flex items-center gap-3 mb-6 sm:mb-8">
          <div class="w-1 h-5 bg-action-primary-bg rounded-full" />
          <h2 class="text-xl sm:text-2xl font-bold text-text-primary">
            {{ filteredViewTitle }}
          </h2>
          <span class="text-sm text-text-tertiary">({{ articlesData?.total ?? 0 }})</span>
        </div>

        <BlogArticleGrid
          :articles="articles"
          :gradient-classes="gradientClasses"
          :show-header="false"
          :columns="3"
        />

        <BlogPagination
          :current-page="currentPage"
          :total-pages="totalPages"
          @page="goToPage"
        />
      </template>

      <template v-else>
        <BlogMasthead
          :articles="articles"
          :gradient-classes="gradientClasses"
        />

        <BlogCategorySection
          v-for="pillar in BLOG_PILLARS"
          :key="pillar.id"
          :pillar-id="pillar.id"
          :label="pillar.label"
          :articles="articlesByPillar[pillar.id] || []"
          :gradient-classes="gradientClasses"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
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
