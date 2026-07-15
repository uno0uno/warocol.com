<script setup lang="ts">
import { activatePublicCta } from '~/utils/publicCta'

const props = defineProps<{ slug: string }>()
const router = useRouter()
const ctaContent = computed(() => useBlogCta(props.slug))
const startRegistration = () => router.push(activatePublicCta(
  ctaContent.value,
  { source: 'blog_article', content: `${props.slug}_final` },
  undefined,
  import.meta.client ? window.sessionStorage : null,
))
</script>

<template>
  <div class="blog-cta-banner">
    <div class="blog-cta-inner">
      <div class="blog-cta-text">
        <p class="blog-cta-eyebrow">{{ ctaContent.eyebrow }}</p>
        <p class="blog-cta-headline">{{ ctaContent.headline }}</p>
        <p class="blog-cta-body">{{ ctaContent.body }}</p>
        <p class="blog-cta-microcopy">{{ ctaContent.microcopy }}</p>
        <p v-if="ctaContent.comparison" class="blog-cta-disclosure">
          {{ ctaContent.comparison.scope }} {{ ctaContent.comparison.disclosure }}
          <a :href="ctaContent.comparison.url" target="_blank" rel="noopener noreferrer">
            {{ ctaContent.comparison.source }} · {{ ctaContent.comparison.asOf }}
          </a>
        </p>
      </div>
      <button
        class="blog-cta-button"
        type="button"
        @click="startRegistration"
      >
        {{ ctaContent.button }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.blog-cta-banner {
  margin-top: 3rem;
  border-radius: 0.875rem;
  background-color: hsl(var(--primary));
}

.blog-cta-inner {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: flex-start;
}

@media (min-width: 640px) {
  .blog-cta-inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: 1.75rem 2rem;
  }
}

.blog-cta-text {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
}

.blog-cta-eyebrow {
  margin: 0;
  color: hsl(var(--badge-primary-hover-bg));
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.blog-cta-headline {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  color: hsl(var(--action-primary-text));
  margin: 0;
}

@media (min-width: 640px) {
  .blog-cta-headline {
    font-size: 1.0625rem;
  }
}

.blog-cta-body {
  font-size: 0.875rem;
  line-height: 1.55;
  color: hsl(var(--badge-primary-hover-bg));
  margin: 0;
}

.blog-cta-microcopy,
.blog-cta-disclosure {
  margin: 0.125rem 0 0;
  color: hsl(var(--badge-primary-hover-bg));
  font-size: 0.75rem;
  line-height: 1.5;
}

.blog-cta-disclosure a {
  color: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.blog-cta-button {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--action-primary-text));
  background-color: hsl(var(--surface));
  color: hsl(var(--action-primary-hover-bg));
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 120ms ease, transform 80ms ease;
  font-family: inherit;
}

.blog-cta-button:hover {
  background-color: hsl(var(--badge-primary-bg));
}

.blog-cta-button:active {
  transform: scale(0.97);
}

.blog-cta-button:focus-visible {
  outline: 2px solid hsl(var(--action-primary-text));
  outline-offset: 3px;
}
</style>
