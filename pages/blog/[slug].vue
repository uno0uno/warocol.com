<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()

// Article type definition
interface Article {
  id: string
  slug: string
  title: string
  titleSeo: string
  description: string
  descriptionSeo: string
  content: string
  cover: string
  thumbnail: string
  category: string
  author: {
    name: string
    userName?: string
    profilePicture: string
    description?: string
    city?: string
    country?: string
  }
  publishedDate: string
  updatedDate?: string
}

// Mock articles data (replace with real API call in production)
const mockArticles: Record<string, Article> = {
  'introduccion-a-nuxt-3': {
    id: '1',
    slug: 'introduccion-a-nuxt-3',
    title: 'Introducción a Nuxt 3: El Framework Vue para Aplicaciones Modernas',
    titleSeo: 'Introducción a Nuxt 3 - Guía Completa',
    description: 'Descubre cómo Nuxt 3 revoluciona el desarrollo web con Vue.js, ofreciendo server-side rendering, mejores herramientas y un rendimiento excepcional.',
    descriptionSeo: 'Aprende los conceptos básicos de Nuxt 3 y cómo crear aplicaciones web modernas con Vue.js',
    cover: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=630&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop',
    category: 'Desarrollo',
    author: {
      name: 'María González',
      userName: 'mariagonzalez',
      profilePicture: 'https://i.pravatar.cc/150?img=5',
      description: 'Desarrolladora Full Stack especializada en Vue.js y Nuxt. Apasionada por crear experiencias web excepcionales y compartir conocimiento con la comunidad.',
      city: 'Medellín',
      country: 'Colombia',
      socialLinks: {
        twitter: 'https://twitter.com/mariagonzalez',
        linkedin: 'https://linkedin.com/in/mariagonzalez'
      }
    },
    publishedDate: '2024-01-15T10:00:00Z',
    content: `
# ¿Qué es Nuxt 3?

Nuxt 3 es la última versión del popular framework de Vue.js que facilita la creación de aplicaciones web universales. Con mejoras significativas en rendimiento, developer experience y nuevas características, Nuxt 3 se ha convertido en la opción preferida para desarrolladores que buscan crear aplicaciones Vue escalables.

## Características Principales

### 1. Motor Nitro
Nuxt 3 incluye Nitro, un nuevo motor de servidor que proporciona:
- Server-side rendering optimizado
- Generación de sitios estáticos
- API routes integradas
- Deploy universal a múltiples plataformas

### 2. Composition API
Totalmente compatible con la Composition API de Vue 3, ofreciendo:
- Mejor organización del código
- Reutilización de lógica mejorada
- TypeScript de primera clase

### 3. Rendimiento Mejorado
- Menor tamaño de bundle
- Carga más rápida
- Mejor optimización automática

## Primeros Pasos

Para crear un nuevo proyecto Nuxt 3, simplemente ejecuta:

\`\`\`bash
npx nuxi init mi-proyecto
cd mi-proyecto
npm install
npm run dev
\`\`\`

## Estructura de Directorios

Nuxt 3 utiliza una estructura basada en convenciones:

- **pages/**: Rutas automáticas basadas en archivos
- **components/**: Auto-importación de componentes
- **composables/**: Funciones reutilizables
- **layouts/**: Plantillas de página
- **server/**: API endpoints

## Conclusión

Nuxt 3 representa un gran salto hacia adelante en el desarrollo de aplicaciones Vue. Con sus nuevas características y mejoras de rendimiento, es el momento perfecto para empezar a utilizarlo en tus proyectos.
    `
  },
  'mejores-practicas-typescript': {
    id: '2',
    slug: 'mejores-practicas-typescript',
    title: 'Mejores Prácticas con TypeScript en 2024',
    titleSeo: 'Mejores Prácticas TypeScript 2024',
    description: 'Una guía completa sobre cómo escribir código TypeScript más limpio, mantenible y seguro siguiendo las mejores prácticas de la industria.',
    descriptionSeo: 'Descubre cómo escribir código TypeScript más limpio y mantenible con estas mejores prácticas',
    cover: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=630&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=450&fit=crop',
    category: 'Tutorial',
    author: {
      name: 'Carlos Ramírez',
      userName: 'carlosdev',
      profilePicture: 'https://i.pravatar.cc/150?img=12',
      description: 'Senior Software Engineer con más de 10 años de experiencia. Especializado en TypeScript, Node.js y arquitectura de software.',
      city: 'Bogotá',
      country: 'Colombia',
      socialLinks: {
        twitter: 'https://twitter.com/carlosdev',
        linkedin: 'https://linkedin.com/in/carlosramirez',
        website: 'https://carlosdev.co'
      }
    },
    publishedDate: '2024-01-10T14:30:00Z',
    content: `
# Mejores Prácticas con TypeScript

TypeScript se ha convertido en el estándar de facto para desarrollo JavaScript a gran escala. En este artículo, exploraremos las mejores prácticas para escribir código TypeScript de calidad.

## 1. Usa Tipos Estrictos

Activa el modo estricto en tu \`tsconfig.json\`:

\`\`\`json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
\`\`\`

## 2. Evita el Tipo 'any'

El tipo \`any\` elimina las ventajas de TypeScript. En su lugar:

- Usa \`unknown\` cuando no conozcas el tipo
- Define interfaces específicas
- Usa genéricos para flexibilidad

## 3. Aprovecha las Interfaces y Types

\`\`\`typescript
interface User {
  id: string
  name: string
  email: string
}

type UserRole = 'admin' | 'user' | 'guest'
\`\`\`

## 4. Utiliza Utility Types

TypeScript ofrece tipos de utilidad poderosos:

- \`Partial<T>\`: Hace todas las propiedades opcionales
- \`Required<T>\`: Hace todas las propiedades requeridas
- \`Pick<T, K>\`: Selecciona propiedades específicas
- \`Omit<T, K>\`: Omite propiedades específicas

## 5. Documenta tu Código

Usa JSDoc para documentación:

\`\`\`typescript
/**
 * Calcula el total de una orden
 * @param items - Array de items
 * @param tax - Porcentaje de impuesto
 * @returns Total con impuestos incluidos
 */
function calculateTotal(items: Item[], tax: number): number {
  // ...
}
\`\`\`

## Conclusión

Siguiendo estas prácticas, escribirás código TypeScript más robusto y mantenible. La inversión en tipos fuertes paga dividendos en la detección temprana de errores y mejor experiencia de desarrollo.
    `
  }
}

// Get article from mock data
const article = ref<Article | null>(null)
const pending = ref(true)
const error = ref<string | null>(null)

// Simulate async loading
setTimeout(() => {
  const slug = route.params.slug as string
  if (mockArticles[slug]) {
    article.value = mockArticles[slug]
  } else {
    error.value = 'Artículo no encontrado'
  }
  pending.value = false
}, 300)

// SEO Meta tags
const siteUrl = config.public.siteUrl || ''

useHead({
  title: () => article.value?.titleSeo || article.value?.title,
  meta: [
    {
      name: 'description',
      content: () => article.value?.descriptionSeo || article.value?.description
    },
    // Open Graph
    {
      property: 'og:type',
      content: 'article'
    },
    {
      property: 'og:title',
      content: () => article.value?.titleSeo || article.value?.title
    },
    {
      property: 'og:description',
      content: () => article.value?.descriptionSeo || article.value?.description
    },
    {
      property: 'og:image',
      content: () => article.value?.thumbnail || article.value?.cover
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
      content: () => article.value?.titleSeo || article.value?.title
    },
    {
      name: 'twitter:description',
      content: () => article.value?.descriptionSeo || article.value?.description
    },
    {
      name: 'twitter:image',
      content: () => article.value?.thumbnail || article.value?.cover
    },
    // Article specific
    {
      property: 'article:published_time',
      content: () => article.value?.publishedDate
    },
    {
      property: 'article:modified_time',
      content: () => article.value?.updatedDate || article.value?.publishedDate
    },
    {
      property: 'article:author',
      content: () => article.value?.author.name
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
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center px-4">
        <p class="text-2xl font-bold text-ebony-900 mb-2">Error al cargar el artículo</p>
        <p class="text-lg text-ebony-600">{{ error }}</p>
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
      <meta itemprop="description" :content="article.descriptionSeo">

      <!-- Hero Section -->
      <BlogArticleHero
        :title="article.title"
        :description="article.description"
        :category="article.category"
        :author="{
          name: article.author.name,
          profilePicture: article.author.profilePicture
        }"
        :published-date="article.publishedDate"
      />

      <!-- Cover Image -->
      <BlogArticleImage
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
          <BlogAuthorCard :author="article.author" />
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
