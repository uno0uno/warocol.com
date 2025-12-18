<script setup lang="ts">
// Mock data for demonstration
const articles = ref([
  {
    id: '1',
    slug: 'introduccion-a-nuxt-3',
    title: 'Introducción a Nuxt 3: El Framework Vue para Aplicaciones Modernas',
    excerpt: 'Descubre cómo Nuxt 3 revoluciona el desarrollo web con Vue.js, ofreciendo server-side rendering, mejores herramientas y rendimiento excepcional...',
    publishedDate: '2024-12-17T10:00:00Z',
    gradient: 'purple' as const,
    imageText: 'Nuxt 3',
    author: {
      name: 'María González',
      avatar: 'https://i.pravatar.cc/150?img=5'
    },
    category: 'Desarrollo',
    readingTime: 8
  },
  {
    id: '2',
    slug: 'mejores-practicas-typescript',
    title: 'Mejores Prácticas con TypeScript en 2024',
    excerpt: 'Una guía completa sobre cómo escribir código TypeScript más limpio, mantenible y seguro siguiendo las mejores prácticas de la industria...',
    publishedDate: '2024-12-16T14:30:00Z',
    gradient: 'blue' as const,
    imageText: 'TypeScript Best Practices',
    author: {
      name: 'Carlos Ramírez',
      avatar: 'https://i.pravatar.cc/150?img=12'
    },
    category: 'Tutorial',
    readingTime: 6
  },
  {
    id: '3',
    slug: 'diseno-sistemas-escalables',
    title: 'Diseño de Sistemas Escalables con Microservicios',
    excerpt: 'Aprende a diseñar arquitecturas de microservicios robustas y escalables que puedan manejar millones de usuarios...',
    publishedDate: '2024-12-15T09:00:00Z',
    gradient: 'orange' as const,
    imageText: 'Microservicios',
    author: {
      name: 'Ana Martínez',
      avatar: 'https://i.pravatar.cc/150?img=9'
    },
    category: 'Arquitectura',
    readingTime: 12
  },
  {
    id: '4',
    slug: 'composables-vue-3',
    title: 'Composables en Vue 3: Reutilización de Lógica',
    excerpt: 'Descubre cómo crear composables efectivos en Vue 3 para reutilizar lógica y mejorar la organización de tu código...',
    publishedDate: '2024-11-18T11:20:00Z',
    gradient: 'purple' as const,
    imageText: 'Vue Composables',
    author: {
      name: 'Luis Torres',
      avatar: 'https://i.pravatar.cc/150?img=15'
    },
    category: 'Desarrollo',
    readingTime: 7
  },
  {
    id: '5',
    slug: 'optimizacion-rendimiento-web',
    title: 'Optimización de Rendimiento Web: Core Web Vitals',
    excerpt: 'Mejora el rendimiento de tu sitio web optimizando los Core Web Vitals: LCP, FID y CLS. Técnicas y herramientas prácticas...',
    publishedDate: '2024-11-07T16:45:00Z',
    gradient: 'teal' as const,
    imageText: 'Web Performance',
    author: {
      name: 'Sofia Ruiz',
      avatar: 'https://i.pravatar.cc/150?img=47'
    },
    category: 'Performance',
    readingTime: 10
  },
  {
    id: '6',
    slug: 'autenticacion-segura-jwt',
    title: 'Implementando Autenticación Segura con JWT',
    excerpt: 'Guía completa para implementar autenticación JWT segura en tus aplicaciones, incluyendo refresh tokens y mejores prácticas...',
    publishedDate: '2024-10-02T13:15:00Z',
    gradient: 'dark' as const,
    imageText: 'JWT Auth',
    author: {
      name: 'Diego López',
      avatar: 'https://i.pravatar.cc/150?img=33'
    },
    category: 'Seguridad',
    readingTime: 9
  }
])

const searchQuery = ref('')
const activeFilter = ref('All')

const filters = [
  'All',
  'Desarrollo',
  'Diseño',
  'AI',
  'Producto',
  'Tutorial',
  'News'
]

const { formatDate } = useArticle()

// Gradient classes for article images - subtle grays
const gradientClasses: Record<string, string> = {
  purple: 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50',
  blue: 'bg-gradient-to-br from-slate-100 via-gray-50 to-slate-50',
  orange: 'bg-gradient-to-br from-stone-100 via-gray-50 to-stone-50',
  dark: 'bg-gradient-to-br from-gray-300 via-gray-200 to-gray-100',
  teal: 'bg-gradient-to-br from-zinc-100 via-gray-50 to-zinc-50'
}

// Filtered articles based on search and filter
const filteredArticles = computed(() => {
  let result = articles.value

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query)
    )
  }

  // Apply category filter (in real app, articles would have categories)
  if (activeFilter.value !== 'All') {
    // This is mock - in real app you'd filter by actual categories
    result = result
  }

  return result
})

// Pagination
const currentPage = ref(1)
const articlesPerPage = 9
const totalPages = computed(() => Math.ceil(filteredArticles.value.length / articlesPerPage))

const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * articlesPerPage
  const end = start + articlesPerPage
  return filteredArticles.value.slice(start, end)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

useHead({
  title: 'Blog - Artículos y Tutoriales',
  meta: [
    {
      name: 'description',
      content: 'Lee nuestros últimos artículos sobre desarrollo web, tecnología y mejores prácticas.'
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
          Descubre artículos, tutoriales y noticias sobre desarrollo web, tecnología y el ecosistema de Waro.
        </p>
      </div>
    </section>

    <!-- Main Container -->
    <main class="max-w-7xl mx-auto px-6 lg:px-8 py-16 w-full flex-1">

      <!-- Featured Post Section -->
      <section class="mb-24" v-if="paginatedArticles[0]">
        <div class="flex items-center justify-start mb-8">
          <h2 class="inline-flex items-center px-6 py-2.5 rounded border-2 border-crocus-600/30 bg-white/50 backdrop-blur-sm text-crocus-600/90 font-semibold text-lg">
            Destacado
          </h2>
        </div>

        <article class="group relative bg-white rounded overflow-hidden border-2 border-crocus-600/30 hover:border-crocus-600/80 transition-colors duration-300 grid lg:grid-cols-2">
          <NuxtLink :to="`/blog/${paginatedArticles[0].slug}`" class="relative overflow-hidden h-96 lg:h-auto">
            <div :class="['absolute inset-0 transition-transform duration-700 group-hover:scale-105', gradientClasses[paginatedArticles[0].gradient]]"></div>
            <div class="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-500"></div>
            <div class="relative z-10 h-full flex items-center justify-center p-8">
               <span class="text-white text-5xl font-bold drop-shadow-lg text-center">{{ paginatedArticles[0].imageText }}</span>
            </div>
          </NuxtLink>

          <div class="p-8 lg:p-12 flex flex-col justify-center">
            <div class="flex items-center gap-3 mb-6">
              <span class="px-3 py-1 rounded bg-white text-crocus-600 text-xs font-bold uppercase tracking-wider border-2 border-crocus-600/30">
                {{ paginatedArticles[0].category }}
              </span>
              <span class="text-gray-300 text-sm">•</span>
              <span class="text-gray-500 text-sm font-medium">{{ paginatedArticles[0].readingTime }} min de lectura</span>
            </div>
            
            <NuxtLink :to="`/blog/${paginatedArticles[0].slug}`">
              <h3 class="text-3xl lg:text-4xl font-bold mb-6 text-ebony-900 leading-tight group-hover:text-crocus-600 transition-colors">
                {{ paginatedArticles[0].title }}
              </h3>
            </NuxtLink>
            
            <p class="text-gray-600 text-lg leading-relaxed mb-8 line-clamp-3">
              {{ paginatedArticles[0].excerpt }}
            </p>

            <div class="flex items-center gap-4 mt-auto pt-8 border-t border-gray-100">
              <img :src="paginatedArticles[0].author.avatar" :alt="paginatedArticles[0].author.name" class="w-10 h-10 rounded-full border border-gray-200">
              <div>
                <p class="text-sm font-bold text-ebony-900">{{ paginatedArticles[0].author.name }}</p>
                <p class="text-xs text-gray-500">{{ formatDate(paginatedArticles[0].publishedDate) }}</p>
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
          <!-- Optional: Filter tabs could go here -->
        </div>

        <div v-if="paginatedArticles.length > 1" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <article
            v-for="article in paginatedArticles.slice(1)"
            :key="article.id"
            class="group bg-white rounded overflow-hidden border-2 border-crocus-600/30 hover:border-crocus-600/80 transition-colors duration-300 flex flex-col h-full"
          >
            <NuxtLink :to="`/blog/${article.slug}`" class="relative h-56 overflow-hidden">
              <div :class="['absolute inset-0 transition-transform duration-500 group-hover:scale-105', gradientClasses[article.gradient]]"></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white text-2xl font-bold drop-shadow-md px-4 text-center">{{ article.imageText }}</span>
              </div>
            </NuxtLink>

            <div class="p-6 flex flex-col flex-1">
              <div class="flex items-center gap-2 mb-4">
                <span class="text-crocus-600 text-xs font-bold uppercase tracking-wide">
                  {{ article.category }}
                </span>
                <span class="text-gray-300">•</span>
                <span class="text-gray-400 text-xs">{{ article.readingTime }} min</span>
              </div>

              <NuxtLink :to="`/blog/${article.slug}`" class="block mb-3">
                <h3 class="text-xl font-bold text-ebony-900 leading-snug group-hover:text-crocus-600 transition-colors">
                  {{ article.title }}
                </h3>
              </NuxtLink>

              <p class="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3 flex-1">
                {{ article.excerpt }}
              </p>

              <div class="flex items-center gap-3 pt-5 border-t border-gray-50">
                <img :src="article.author.avatar" :alt="article.author.name" class="w-8 h-8 rounded-full border border-gray-100">
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-ebony-900">{{ article.author.name }}</span>
                  <span class="text-[10px] text-gray-500">{{ formatDate(article.publishedDate) }}</span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <div class="text-6xl mb-4">🔍</div>
          <h3 class="text-xl font-bold text-ebony-900 mb-2">No se encontraron artículos</h3>
          <p class="text-gray-500">Intenta ajustar tu búsqueda o filtros.</p>
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

    </main>

  </div>
</template>

<style scoped>
/* No custom CSS needed, using Tailwind utility classes */
</style>

