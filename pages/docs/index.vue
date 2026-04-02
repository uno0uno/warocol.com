<script setup lang="ts">
import MarkdownIt from 'markdown-it'

definePageMeta({ layout: 'docs' })

useHead({ title: 'Documentación — WARO' })

const { data, status } = await useFetch('/docs-content/README')

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

const renderedContent = computed(() => {
  if (!data.value?.content) return ''
  return md.render(data.value.content as string)
})

function handleClick(e: MouseEvent) {
  const anchor = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
  if (!anchor) return
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('http')) return
  e.preventDefault()
  const slug = href.replace(/^\.\//, '').replace(/\.md$/, '')
  navigateTo(`/docs/${slug}`)
}
</script>

<template>
  <div v-if="status === 'pending'" class="flex items-center justify-center min-h-[40vh]">
    <p class="text-sm text-ebony-400">Cargando...</p>
  </div>

  <div v-else @click="handleClick">
    <article class="article-style" v-html="renderedContent" />
  </div>
</template>
