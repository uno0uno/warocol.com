<script setup lang="ts">
definePageMeta({ layout: 'blog' })

const route = useRoute()
const config = useRuntimeConfig()

// Types
interface AuthorInfo {
  name: string | null
  avatar: string | null
  user_name: string | null
  description: string | null
  city: string | null
  country: string | null
}

interface Article {
  id: number
  title: string
  slug: string
  description: string
  content: string
  meta_title: string
  meta_descripcion: string
  thumbnail: string
  cover: string
  tags: string
  views: number
  published: boolean
  draft: boolean
  is_active: boolean
  author: string
  id_profile: string
  tenant_id: string
  lang: string
  planet: string
  country: string
  city: string
  created_at: string
  updated_at: string | null
  author_name: string | null
  author_info: AuthorInfo | null
  tenant_name: string | null
}

interface ArticleResponse {
  success: boolean
  data: Article
}

// Fetch article from API
const slug = route.params.slug as string

const articleApiUrl = typeof window === 'undefined'
  ? `${config.public.warolabsApiUrl}/blog/${slug}`
  : `/api/blog/${slug}`

const { data: articleData, pending, error: fetchError } = useAsyncData<ArticleResponse>(
  `blog-article-${slug}`,
  () => $fetch(articleApiUrl),
  { server: true }
)

const article = computed(() => articleData.value?.data || null)

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Get category from tags
const category = computed(() => {
  if (!article.value?.tags) return 'General'
  return article.value.tags.split(',')[0]?.trim() || 'General'
})

// Reading time from full content
const readingTime = computed(() => {
  if (!article.value?.content) return 5
  const words = article.value.content.split(/\s+/).length
  return Math.max(3, Math.ceil(words / 200))
})

// SEO Meta tags
const siteUrl = config.public.siteUrl || 'https://warocol.com'

// Build JSON-LD Article schema
const articleSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.value?.meta_title || article.value?.title || '',
  description: article.value?.meta_descripcion || article.value?.description || '',
  image: article.value?.cover || article.value?.thumbnail || '',
  datePublished: article.value?.created_at || '',
  dateModified: article.value?.updated_at || article.value?.created_at || '',
  author: {
    '@type': 'Person',
    name: article.value?.author_info?.name || article.value?.author_name || 'WARO Colombia'
  },
  publisher: {
    '@type': 'Organization',
    name: 'WARO Colombia',
    url: siteUrl
  },
  url: `${siteUrl}/blog/${article.value?.slug || ''}`,
  keywords: article.value?.tags || '',
  inLanguage: 'es-CO'
}))

useSeoMeta({
  title: () => article.value?.meta_title || article.value?.title || 'Artículo | Waro Colombia',
  description: () => article.value?.meta_descripcion || article.value?.description || '',
  ogType: 'article',
  ogSiteName: 'Waro Colombia',
  ogLocale: 'es_CO',
  ogTitle: () => article.value?.meta_title || article.value?.title || '',
  ogDescription: () => article.value?.meta_descripcion || article.value?.description || '',
  ogImage: () => article.value?.cover || article.value?.thumbnail || '',
  ogUrl: () => `${siteUrl}${route.path}`,
  twitterCard: 'summary_large_image',
  twitterSite: '@warocolombia',
  twitterTitle: () => article.value?.meta_title || article.value?.title || '',
  twitterDescription: () => article.value?.meta_descripcion || article.value?.description || '',
  twitterImage: () => article.value?.cover || article.value?.thumbnail || '',
  articlePublishedTime: () => article.value?.created_at || '',
  articleModifiedTime: () => article.value?.updated_at || article.value?.created_at || '',
  articleAuthor: () => article.value?.author_name || 'Waro Colombia',
})

useHead({
  link: [
    { rel: 'canonical', href: () => `${siteUrl}${route.path}` }
  ],
  script: [
    { type: 'application/ld+json', innerHTML: () => JSON.stringify(articleSchema.value) }
  ]
})
</script>

<template>
  <div class="bg-white">
    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center min-h-screen">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-screen">
      <div class="text-center px-4">
        <p class="text-2xl font-bold text-ebony-900 mb-2">Error al cargar el artículo</p>
        <p class="text-lg text-ebony-600 mb-4">{{ fetchError.message }}</p>
        <NuxtLink
          to="/blog"
          class="text-lg text-crocus-600 hover:text-crocus-700 underline"
        >
          Volver al blog
        </NuxtLink>
      </div>
    </div>

    <!-- Article Content -->
    <article
      v-else-if="article"
      itemscope
      itemtype="https://schema.org/BlogPosting"
      class="flex flex-col"
    >
      <!-- Hidden meta for SEO -->
      <meta itemprop="headline" :content="article.title">
      <meta itemprop="description" :content="article.meta_descripcion">

      <!-- Hero Section -->
      <BlogArticleHero
        :title="article.title"
        :description="article.description"
        :category="category"
        :author="{
          name: article.author_info?.name || article.author_name || 'Waro Colombia',
          profilePicture: article.author_info?.avatar || ''
        }"
        :published-date="article.created_at"
        :reading-time="readingTime"
      />

      <!-- Cover Image -->
      <BlogArticleImage
        v-if="article.cover"
        :src="article.cover"
        :alt="article.title"
      />

      <!-- Article Content -->
      <BlogArticleContent :content="article.content">
        <!-- Breadcrumb Slot -->
        <template #breadcrumb>
          <BlogBreadcrumb />
        </template>

        <!-- Author Card Slot -->
        <template #author>
          <BlogAuthorCard
            :author="{
              name: article.author_info?.name || article.author_name || 'Waro Colombia',
              userName: article.author_info?.user_name || '',
              profilePicture: article.author_info?.avatar || '',
              description: article.author_info?.description || 'Equipo de contenido de Waro Colombia, especialistas en eventos corporativos y organización.',
              city: article.author_info?.city || article.city || '',
              country: article.author_info?.country || article.country || 'Colombia'
            }"
          />
        </template>
      </BlogArticleContent>
    </article>

    <!-- Not Found State -->
    <div v-else class="flex items-center justify-center min-h-screen">
      <div class="text-center px-4">
        <p class="text-2xl font-bold text-ebony-900 mb-2">Artículo no encontrado</p>
        <NuxtLink
          to="/blog"
          class="text-lg text-crocus-600 hover:text-crocus-700 underline"
        >
          Volver al blog
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
