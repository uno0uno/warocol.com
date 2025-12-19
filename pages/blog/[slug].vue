<script setup lang="ts">
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

const { data: articleData, pending, error: fetchError } = useAsyncData<ArticleResponse>(
  `blog-article-${slug}`,
  () => $fetch(`/api/blog/${slug}`),
  {
    server: true
  }
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

// SEO Meta tags
const siteUrl = config.public.siteUrl || 'https://warocol.com'

useHead({
  title: () => article.value?.meta_title || article.value?.title || 'Artículo',
  meta: [
    {
      name: 'description',
      content: () => article.value?.meta_descripcion || article.value?.description
    },
    // Open Graph
    {
      property: 'og:type',
      content: 'article'
    },
    {
      property: 'og:title',
      content: () => article.value?.meta_title || article.value?.title
    },
    {
      property: 'og:description',
      content: () => article.value?.meta_descripcion || article.value?.description
    },
    {
      property: 'og:image',
      content: () => article.value?.cover || article.value?.thumbnail
    },
    {
      property: 'og:url',
      content: () => `${siteUrl}${route.path}`
    },
    // Twitter
    {
      name: 'twitter:card',
      content: 'summary_large_image'
    },
    {
      name: 'twitter:title',
      content: () => article.value?.meta_title || article.value?.title
    },
    {
      name: 'twitter:description',
      content: () => article.value?.meta_descripcion || article.value?.description
    },
    {
      name: 'twitter:image',
      content: () => article.value?.cover || article.value?.thumbnail
    },
    // Article specific
    {
      property: 'article:published_time',
      content: () => article.value?.created_at
    },
    {
      property: 'article:modified_time',
      content: () => article.value?.updated_at || article.value?.created_at
    },
    {
      property: 'article:author',
      content: () => article.value?.author_name || 'Waro Colombia'
    }
  ],
  link: [
    {
      rel: 'canonical',
      href: () => `${siteUrl}${route.path}`
    }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-16 h-16 border-4 border-crocus-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p class="text-lg text-ebony-600">Cargando artículo...</p>
      </div>
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
