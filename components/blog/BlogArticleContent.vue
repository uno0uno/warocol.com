<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'

interface Props {
  content: string
  showBreadcrumb?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBreadcrumb: true
})

// Markdown renderer
const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
const renderedContent = computed(() => md.render(props.content))

// Barra de progreso de lectura
const readingProgress = ref(0)

const articleRef = ref<HTMLElement | null>(null)

onMounted(() => {
  const update = () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    readingProgress.value = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0
  }
  window.addEventListener('scroll', update, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', update))

  // Wrap tables in a scrollable container for mobile
  nextTick(() => {
    if (!articleRef.value) return
    articleRef.value.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('table-scroll-wrapper')) return
      const wrapper = document.createElement('div')
      wrapper.className = 'table-scroll-wrapper'
      table.parentNode!.insertBefore(wrapper, table)
      wrapper.appendChild(table)
    })
  })
})
</script>

<template>
  <div>
  <!-- Barra de progreso fija en el top — 2px, crocus-600 -->
  <div
    class="reading-progress-bar"
    :style="{ width: readingProgress + '%' }"
    aria-hidden="true"
  />

  <div class="w-full bg-titan-100 py-6 sm:py-10 lg:py-14">
    <div class="article-container">

      <!-- Breadcrumb -->
      <div v-if="showBreadcrumb" class="mb-4 sm:mb-6">
        <slot name="breadcrumb" />
      </div>

      <!-- Prose container — max-w-3xl centrado para ~65ch -->
      <div class="w-full sm:max-w-3xl sm:mx-auto">
        <article
          ref="articleRef"
          class="article-style"
          itemprop="articleBody"
          v-html="renderedContent"
        />

        <!-- CTA banner -->
        <slot name="cta" />

        <!-- Separador antes del autor -->
        <hr class="my-12 border-0 h-px bg-gradient-to-r from-transparent via-titan-300 to-transparent">

        <!-- Author Card -->
        <slot name="author" />
      </div>

    </div>
  </div>
  </div>
</template>

<style scoped>
.reading-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  background-color: hsl(var(--crocus-600));
  z-index: 9999;
  transition: width 80ms linear;
  pointer-events: none;
}
</style>
