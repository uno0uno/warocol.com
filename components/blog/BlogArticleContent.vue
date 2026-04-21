<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'

interface Props {
  content: string
  slug?: string
  showBreadcrumb?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBreadcrumb: true,
  slug: '',
})

// Markdown renderer
const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
const renderedContent = computed(() => md.render(props.content))

// Barra de progreso de lectura
const readingProgress = ref(0)

const articleRef = ref<HTMLElement | null>(null)

const leadModal = useLeadModal()

function buildMidCta(cta: { button: string }): HTMLElement {
  const wrap = document.createElement('div')
  wrap.setAttribute('data-mid-cta', '')
  wrap.style.cssText = [
    'display:flex',
    'align-items:center',
    'justify-content:space-between',
    'gap:1rem',
    'padding:0.875rem 1.125rem',
    'margin-bottom:1.75rem',
    'border-radius:0.625rem',
    'background-color:hsl(var(--crocus-50))',
    'border:1px solid hsl(var(--crocus-200))',
  ].join(';')

  const text = document.createElement('p')
  text.style.cssText = [
    'margin:0',
    'font-size:0.8125rem',
    'font-weight:500',
    'line-height:1.4',
    'color:hsl(var(--crocus-700))',
  ].join(';')
  text.textContent = 'El software más económico del mercado — desde $9.000/mes.'

  const btn = document.createElement('button')
  btn.setAttribute('data-blog-cta-btn', '')
  btn.style.cssText = [
    'flex-shrink:0',
    'min-height:34px',
    'padding:0.375rem 1rem',
    'border-radius:0.4375rem',
    'font-size:0.8125rem',
    'font-weight:600',
    'color:#ffffff',
    'background-color:hsl(var(--crocus-600))',
    'border:none',
    'cursor:pointer',
    'white-space:nowrap',
    'font-family:inherit',
    'transition:background-color 120ms ease',
  ].join(';')
  btn.textContent = cta.button

  btn.addEventListener('mouseenter', () => { btn.style.backgroundColor = 'hsl(var(--crocus-700))' })
  btn.addEventListener('mouseleave', () => { btn.style.backgroundColor = 'hsl(var(--crocus-600))' })
  btn.addEventListener('click', () => {
    leadModal.open(props.slug ? `blog:${props.slug}` : 'blog_cta')
  })

  wrap.appendChild(text)
  wrap.appendChild(btn)
  return wrap
}

onMounted(() => {
  const update = () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    readingProgress.value = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0
  }
  window.addEventListener('scroll', update, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', update))

  nextTick(() => {
    if (!articleRef.value) return

    // Wrap tables for mobile scroll
    articleRef.value.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('table-scroll-wrapper')) return
      const wrapper = document.createElement('div')
      wrapper.className = 'table-scroll-wrapper'
      table.parentNode!.insertBefore(wrapper, table)
      wrapper.appendChild(table)
    })

    // Inject CTA banner before each H2
    if (props.slug) {
      const cta = useBlogCta(props.slug)
      articleRef.value.querySelectorAll('h2').forEach((h2) => {
        const banner = buildMidCta(cta)
        h2.parentNode!.insertBefore(banner, h2)
      })
    }
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
