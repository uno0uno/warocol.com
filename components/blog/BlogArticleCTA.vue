<script setup lang="ts">
import { blogLeadSource } from '~/utils/blogLeadCta'

const props = defineProps<{ slug: string }>()
const leadModal = useLeadModal()
const ctaContent = computed(() => useBlogCta(props.slug))
const openLeadModal = () => leadModal.open(blogLeadSource(props.slug))
</script>

<template>
  <div class="blog-cta-banner">
    <div class="blog-cta-inner">
      <div class="blog-cta-text">
        <p class="blog-cta-headline">{{ ctaContent.headline }}</p>
        <p class="blog-cta-body">{{ ctaContent.body }}</p>
        <p class="blog-cta-microcopy">{{ ctaContent.microcopy }}</p>
      </div>
      <button
        class="blog-cta-button"
        type="button"
        aria-haspopup="dialog"
        @click="openLeadModal"
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

.blog-cta-microcopy {
  margin: 0.125rem 0 0;
  color: hsl(var(--badge-primary-hover-bg));
  font-size: 0.75rem;
  line-height: 1.5;
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
