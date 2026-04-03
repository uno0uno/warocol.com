<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
  const html = md.render(data.value.content as string)
  // Eliminar el primer H1 (título principal) para renderizarlo con efecto localmente
  const noH1 = html.replace(/<h1>.*?<\/h1>/i, '')
  return noH1.replace(/<table>/g, '<div class="table-scroll-wrapper"><table>').replace(/<\/table>/g, '</table></div>')
})

const pageTitle = computed(() => {
  const match = (data.value?.content as string || '').match(/^#\s+(.+)/m)
  return match ? match[1] : 'Documentación'
})

const displayedTitle = ref('')
let typeTimeout: ReturnType<typeof setTimeout>

watch(pageTitle, (newTitle) => {
  if (typeTimeout) clearTimeout(typeTimeout)
  displayedTitle.value = ''
  let i = 0
  const speed = 25 // ms por caracter — rápido
  const type = () => {
    if (i < newTitle.length) {
      displayedTitle.value += newTitle[i]
      i++
      typeTimeout = setTimeout(type, speed)
    }
  }
  // Pequeño delay inicial simulando carga
  typeTimeout = setTimeout(type, 100)
}, { immediate: true })

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
  <div v-else class="doc-card" @click="handleClick">
    <article class="article-style">
      <h1>
        {{ displayedTitle }}<span class="animate-pulse text-crocus-500 font-light">|</span>
      </h1>
      <div v-html="renderedContent"></div>
    </article>
  </div>
</template>

<style scoped>
.doc-card {
  background: #fff;
  border: 1px solid hsl(220 13% 91%);
  border-radius: 14px;
  padding: 48px 56px 64px;
  max-width: 860px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

/* Tablet */
@media (max-width: 1023px) {
  .doc-card {
    padding: 28px 20px 48px;
    border-radius: 12px;
  }
}

/* Mobile — flat, sin card, contenido edge-to-edge */
@media (max-width: 639px) {
  .doc-card {
    border: none;
    border-radius: 0;
    box-shadow: none;
    padding: 24px 20px calc(40px + env(safe-area-inset-bottom, 0px));
    max-width: 100%;
    width: 100%;
  }
}
</style>
