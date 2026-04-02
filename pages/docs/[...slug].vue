<script setup lang="ts">
import MarkdownIt from 'markdown-it'

definePageMeta({ layout: 'docs' })

const route = useRoute()

const slug = computed(() => {
  const parts = route.params.slug
  return Array.isArray(parts) ? parts.join('/') : parts || 'README'
})

const { data, error, status } = await useFetch(() => `/docs-content/${slug.value}`)

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

const renderedContent = computed(() => {
  if (!data.value?.content) return ''
  return md.render(data.value.content as string)
})

const pageTitle = computed(() => {
  const match = (data.value?.content as string || '').match(/^#\s+(.+)/m)
  return match ? match[1] : 'Documentación'
})

useHead({ title: () => `${pageTitle.value} — Docs WARO` })

function handleClick(e: MouseEvent) {
  const anchor = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
  if (!anchor) return
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('http') || href.startsWith('#')) return
  e.preventDefault()
  const currentDir = slug.value.split('/').slice(0, -1).join('/')
  let resolved = href.replace(/\.md$/, '')
  if (resolved.startsWith('./')) {
    resolved = resolved.slice(2)
    resolved = currentDir ? `${currentDir}/${resolved}` : resolved
  } else if (!resolved.startsWith('/')) {
    resolved = currentDir ? `${currentDir}/${resolved}` : resolved
  }
  navigateTo(`/docs/${resolved}`)
}
</script>

<template>
  <!-- Loading -->
  <div v-if="status === 'pending'" class="flex items-center justify-center min-h-[40vh]">
    <p class="text-sm text-ebony-400">Cargando...</p>
  </div>

  <!-- 404 -->
  <div v-else-if="error" class="flex flex-col items-center justify-center min-h-[40vh] gap-4">
    <p class="text-ebony-500">Documento no encontrado.</p>
    <NuxtLink to="/docs" class="text-sm text-crocus-600 hover:underline">
      Volver al índice
    </NuxtLink>
  </div>

  <!-- Content -->
  <div v-else @click="handleClick">
    <article class="article-style" v-html="renderedContent" />
  </div>
</template>
