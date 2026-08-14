<script setup lang="ts">
import { computed } from 'vue'
import { MapPinIcon } from '@heroicons/vue/24/outline'
import type { PublicCity } from '~/composables/useCityCatalog'

/**
 * Extra-country city hub (warocol.com#2296). Colombia stays at `/ciudades`
 * and `/{slug}`. AR/MX/US magazines live only under `/ciudades/{cc}`.
 */
definePageMeta({
  layout: 'default',
  publicAccess: true,
})

const EXTRA_DIRECTORY_COUNTRIES = new Set(['ar', 'mx', 'us'])
const COUNTRY_LABELS: Record<string, string> = {
  ar: 'Argentina',
  mx: 'México',
  us: 'Estados Unidos',
}

const route = useRoute()
const config = useRuntimeConfig()
const siteUrl = (config.public as Record<string, unknown>).siteUrl as string || 'https://warocol.com'

const ccParam = Array.isArray(route.params.cc) ? route.params.cc[0] : route.params.cc
const cc = String(ccParam || '').toLowerCase()

if (cc === 'co') {
  await navigateTo('/ciudades', { redirectCode: 301 })
  return
}
if (!EXTRA_DIRECTORY_COUNTRIES.has(cc)) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

const countryLabel = COUNTRY_LABELS[cc] || cc.toUpperCase()
const countryCode = cc.toUpperCase()

const { data: responseData } = await useAsyncData(
  () => `extra-city-hub-${cc}`,
  () => $fetch<{ data?: PublicCity[] }>('/api/public/restaurant/cities', {
    params: { country_code: countryCode, include_empty: false },
  }),
  { server: true },
)

const cities = computed(() => responseData.value?.data ?? [])

useSeoMeta({
  title: `Ciudades · ${countryLabel} · WaRo Colombia`,
  description: `Descubre los restaurantes en cada ciudad donde opera WaRo en ${countryLabel}.`,
  ogTitle: `Ciudades · ${countryLabel} · WaRo Colombia`,
  ogDescription: `Descubre los restaurantes en cada ciudad donde opera WaRo en ${countryLabel}.`,
  ogType: 'website',
  ogUrl: `${siteUrl}/ciudades/${cc}`,
  ogSiteName: 'Waro Colombia',
  ogLocale: 'es_CO',
  twitterCard: 'summary_large_image',
  twitterSite: '@warocolombia',
})

useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}/ciudades/${cc}` }],
})
</script>

<template>
  <div class="ciudades-page">
    <section class="ciudades-hero">
      <h1 class="ciudades-title font-quantico">RESTAURANTES EN {{ countryLabel.toUpperCase() }}</h1>
      <p class="ciudades-subtitle">
        Descubre restaurantes en las ciudades donde WaRo está presente en {{ countryLabel }}.
      </p>
    </section>

    <section v-if="cities.length > 0" class="ciudades-section">
      <h2 class="ciudades-section-title">
        <MapPinIcon class="ciudades-section-icon" aria-hidden="true" />
        Disponibles ahora
      </h2>
      <div class="ciudades-row">
        <NuxtLink
          v-for="city in cities"
          :key="city.city_slug"
          :to="`/ciudades/${cc}/${city.city_slug}`"
          class="city-card"
        >
          <div class="city-card__image">
            <div class="city-card__gradient">
              <span class="city-card__overlay-name">{{ city.city }}</span>
            </div>
            <div class="city-card__count-pill" aria-label="restaurantes activos">
              <span>{{ city.tenant_count }}</span>
              <span class="city-card__count-label">
                restaurante{{ city.tenant_count !== 1 ? 's' : '' }}
              </span>
            </div>
          </div>
          <div class="city-card__meta">
            <MapPinIcon class="city-card__meta-icon" aria-hidden="true" />
            <span class="city-card__meta-text">{{ city.city }}, {{ city.country || countryLabel }}</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section v-else class="ciudades-empty">
      <div class="text-6xl mb-4" aria-hidden="true">🗺️</div>
      <p class="text-base text-text-secondary">
        Aún no hay restaurantes publicados en {{ countryLabel }}.
      </p>
    </section>
  </div>
</template>

<style scoped>
.ciudades-page {
  padding: 0 0 3rem;
  width: 100%;
}

@media (min-width: 768px) {
  .ciudades-page {
    padding-bottom: 4rem;
  }
}

.ciudades-hero {
  text-align: center;
  margin-bottom: 3rem;
}
.ciudades-title {
  font-size: clamp(1.85rem, 4vw, 3rem);
  font-weight: 900;
  color: hsl(var(--text-primary));
  letter-spacing: -0.02em;
  text-transform: uppercase;
  line-height: 1.05;
  margin-bottom: 1rem;
}
.ciudades-subtitle {
  font-size: clamp(0.9375rem, 1.5vw, 1.125rem);
  font-weight: 300;
  color: hsl(var(--text-secondary));
  max-width: 34rem;
  margin: 0 auto;
  line-height: 1.55;
}

.ciudades-section {
  margin-bottom: 2.5rem;
}
.ciudades-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(var(--text-primary));
  opacity: 0.72;
  margin-bottom: 1.25rem;
}
.ciudades-section-icon {
  width: 16px;
  height: 16px;
  color: hsl(var(--badge-primary-text));
}

.ciudades-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
@media (min-width: 768px) {
  .ciudades-row {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

.city-card {
  display: block;
  min-width: 0;
  background: hsl(var(--surface));
  border-radius: 32px;
  padding: 8px;
  text-decoration: none;
  color: hsl(var(--text-primary));
  box-shadow: 0 1px 2px hsl(var(--foreground) / 0.04);
  border: 1px solid hsl(var(--border));
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.city-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -10px hsl(var(--badge-primary-text) / 0.18);
  border-color: hsl(var(--badge-primary-border));
}
.city-card:focus-visible {
  outline: 2px solid hsl(var(--badge-primary-text));
  outline-offset: 2px;
}
.city-card__image {
  position: relative;
  width: 100%;
  height: 192px;
  border-radius: 28px;
  overflow: hidden;
  margin-bottom: 12px;
}
.city-card__gradient {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(160deg, hsl(262, 83%, 62%) 0%, hsl(252, 83%, 48%) 100%);
}
.city-card__overlay-name {
  position: relative;
  z-index: 1;
  color: #ffffff;
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  text-align: center;
  padding: 0 20px;
  line-height: 1.15;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}

.city-card__count-pill {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  color: hsl(250, 30%, 16%);
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
.city-card__count-pill > span:first-child {
  font-size: 0.95rem;
  color: hsl(262, 83%, 50%);
}
.city-card__count-label {
  font-weight: 600;
  color: hsl(250, 10%, 35%);
}

.city-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px 8px;
}
.city-card__meta-icon {
  width: 16px;
  height: 16px;
  color: hsl(250, 10%, 55%);
  flex-shrink: 0;
}
.city-card__meta-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(250, 30%, 30%);
  line-height: 1.25;
}

.ciudades-empty {
  text-align: center;
  padding: 80px 24px;
}

@media (max-width: 767px) {
  .city-card {
    border-radius: 24px;
    padding: 6px;
  }
  .city-card__image {
    height: 140px;
    border-radius: 20px;
    margin-bottom: 8px;
  }
  .city-card__overlay-name {
    font-size: 1rem;
    padding: 0 10px;
  }
  .city-card__meta {
    padding: 0 8px 6px;
    gap: 6px;
  }
  .city-card__meta-text {
    font-size: 0.75rem;
  }
  .city-card__count-pill {
    bottom: 8px;
    right: 8px;
    padding: 3px 8px;
    font-size: 0.65rem;
  }
  .city-card__count-pill > span:first-child {
    font-size: 0.8rem;
  }
}

@media (max-width: 640px) {
  .ciudades-hero {
    margin-bottom: 40px;
  }
}
</style>
