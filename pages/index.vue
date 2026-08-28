<template>
  <div class="index-page animate-fade-in">
    <PublicHomeFoodBackground />
    <PublicHomeHero />
    <PublicHomeTrustLogos />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { resolveAnonymousReaderMarket } from '~/utils/articleMarket'
import { articleLangToLocale } from '~/utils/articleLangToLocale'

definePageMeta({
  layout: 'home',
})

const route = useRoute()
const { public: config } = useRuntimeConfig()
const requestHeaders = useRequestHeaders(['accept-language', 'cf-ipcountry'])
const authStore = useAuthStore()
const { applyPersonalLocale } = useAppLocale()
const readerMarket = computed(() => resolveAnonymousReaderMarket({
  acceptLanguage: requestHeaders['accept-language'],
  cfIpCountry: requestHeaders['cf-ipcountry'],
}))

watch(
  () => authStore.session,
  async (session) => {
    if (session) return
    const code = articleLangToLocale(readerMarket.value.inLanguage)
    if (code) await applyPersonalLocale(code)
  },
  { immediate: true },
)

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
    { property: 'og:locale', content: () => readerMarket.value.ogLocale },
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
  background: transparent;
  color: hsl(250, 30%, 16%);
}
</style>
