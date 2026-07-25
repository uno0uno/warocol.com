<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import { blogLeadSource } from '~/utils/blogLeadCta'
import type { BlogLeadCtaContent } from '~/utils/blogLeadCta'

interface Props {
  content: string
  slug?: string
  showBreadcrumb?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBreadcrumb: true,
  slug: '',
})

const md = new MarkdownIt({ html: true, linkify: true, typographer: true })
const renderedContent = computed(() => md.render(props.content))

const readingProgress = ref(0)
const articleRef = ref<HTMLElement | null>(null)
const leadModal = useLeadModal()
const insertedCtas: HTMLElement[] = []

function buildMidCta(cta: BlogLeadCtaContent, index: number, source: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.setAttribute('data-mid-cta', '')

  const content = document.createElement('div')
  content.setAttribute('data-mid-cta-content', '')

  const headline = document.createElement('p')
  headline.setAttribute('data-mid-cta-headline', '')
  headline.textContent = cta.headline

  const text = document.createElement('p')
  text.setAttribute('data-mid-cta-body', '')
  text.textContent = cta.body

  const microcopy = document.createElement('p')
  microcopy.setAttribute('data-mid-cta-microcopy', '')
  microcopy.textContent = cta.microcopy

  const btn = document.createElement('button')
  btn.setAttribute('data-blog-cta-btn', '')
  btn.textContent = cta.button
  btn.type = 'button'
  btn.setAttribute('aria-haspopup', 'dialog')
  btn.addEventListener('click', () => leadModal.open(source))

  content.appendChild(headline)
  content.appendChild(text)
  content.appendChild(microcopy)
  wrap.appendChild(content)
  wrap.appendChild(btn)
  wrap.setAttribute('data-mid-cta-position', String(index + 1))
  return wrap
}

function getMidCtaTargets(article: HTMLElement): HTMLElement[] {
  const headings = Array.from(article.querySelectorAll<HTMLElement>('h2'))
  if (headings.length <= 2) return headings.slice(1, 2)

  const firstTarget = headings[1]
  const secondTarget = headings[Math.max(2, Math.floor(headings.length * 0.62))]
  return Array.from(new Set([firstTarget, secondTarget])).slice(0, 2)
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

    // Inject contextual CTA banners at natural reading breaks.
    if (props.slug) {
      const source = blogLeadSource(props.slug)
      getMidCtaTargets(articleRef.value).forEach((h2, index) => {
        const cta = useBlogCta(props.slug, index === 0 ? 'benefit' : 'price')
        const banner = buildMidCta(cta, index, source)
        h2.parentNode!.insertBefore(banner, h2)
        insertedCtas.push(banner)
      })
    }
  })
})

onUnmounted(() => {
  insertedCtas.splice(0).forEach(node => node.remove())
})
</script>

<template>
  <div>
  <!-- Fixed top reading progress bar -->
  <div
    class="reading-progress-bar"
    :style="{ width: readingProgress + '%' }"
    aria-hidden="true"
  />

  <div class="w-full bg-background py-6 sm:py-10 lg:py-14">
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
        <hr class="my-12 border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent">

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
  background-color: hsl(var(--primary));
  z-index: 9999;
  transition: width 80ms linear;
  pointer-events: none;
}

:deep([data-mid-cta]) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  margin: 2rem 0 1.75rem;
  border: 1px solid hsl(var(--badge-primary-border));
  border-radius: 0.5rem;
  background:
    linear-gradient(135deg, hsl(var(--badge-primary-bg)), hsl(var(--surface)) 58%),
    hsl(var(--surface));
  box-shadow: 0 10px 28px hsl(var(--overlay-backdrop-bg) / 0.08);
}

:deep([data-mid-cta-content]) {
  min-width: 0;
}

:deep([data-mid-cta-eyebrow]) {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 999px;
  background-color: hsl(var(--badge-primary-hover-bg));
  color: hsl(var(--action-primary-active-bg));
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
}

:deep([data-mid-cta-headline]) {
  margin: 0;
  color: hsl(var(--text-primary));
  font-size: 0.9375rem;
  font-weight: 750;
  line-height: 1.35;
}

:deep([data-mid-cta-body]) {
  margin: 0.25rem 0 0;
  color: hsl(var(--text-secondary));
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.45;
}

:deep([data-mid-cta-microcopy]),
:deep([data-mid-cta-disclosure]) {
  margin: 0.5rem 0 0;
  color: hsl(var(--text-tertiary));
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.45;
}

:deep([data-mid-cta-disclosure] a) {
  color: hsl(var(--primary));
  font-weight: 700;
  text-underline-offset: 2px;
}

:deep([data-blog-cta-btn]) {
  flex-shrink: 0;
  min-height: 38px;
  padding: 0.5rem 0.875rem;
  border: none;
  border-radius: 0.4375rem;
  background-color: hsl(var(--primary));
  color: hsl(var(--action-primary-text));
  cursor: pointer;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition: background-color 120ms ease, transform 80ms ease;
}

:deep([data-blog-cta-btn]:hover) {
  background-color: hsl(var(--action-primary-hover-bg));
}

:deep([data-blog-cta-btn]:active) {
  transform: scale(0.98);
}

:deep([data-blog-cta-btn]:focus-visible) {
  outline: 2px solid hsl(var(--focus-ring-subtle));
  outline-offset: 3px;
}

@media (max-width: 639px) {
  :deep([data-mid-cta]) {
    flex-direction: column;
    gap: 0.875rem;
    padding: 1rem;
  }

  :deep([data-blog-cta-btn]) {
    width: 100%;
  }
}
</style>
