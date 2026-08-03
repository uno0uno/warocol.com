<template>
  <div class="index-page animate-fade-in">
    <PublicHomeFoodBackground />
    <PublicHomeHero />
    <PublicHomeTrustLogos />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  layout: 'home',
})

const route = useRoute()
const { public: config } = useRuntimeConfig()

const canonicalUrl = computed(() => {
  const baseUrl = config.siteUrl || 'https://warocol.com'
  return `${baseUrl}${route.path === '/' ? '' : route.path}`
})

useHead({
  title: config.seoTitle,
  meta: [
    { name: 'description', content: config.seoDescription },
    { property: 'og:title', content: config.ogTitle },
    { property: 'og:description', content: config.ogDescription },
    { property: 'og:url', content: canonicalUrl },
    { name: 'twitter:title', content: config.twitterTitle },
    { name: 'twitter:description', content: config.twitterDescription }
  ],
  link: [
    { rel: 'canonical', href: canonicalUrl }
  ]
})
</script>

<style scoped>
.index-page {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: transparent;
  color: hsl(250, 30%, 16%);
}
</style>
