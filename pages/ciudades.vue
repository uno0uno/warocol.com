<script setup lang="ts">
import { computed } from 'vue'
import { MapPinIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { useCityCatalog } from '~/composables/useCityCatalog'

/**
 * Directory hub (warocol.com#619). Lists every city in the curated
 * `public_cities` catalog: cities with active tenants get a count badge;
 * cities seeded for future expansion get a muted "Próximamente" tag.
 *
 * The hub complements the discovery section on `/` — that one is a
 * marketing teaser, this one is the canonical entry point linked from
 * the global header / bottom nav.
 */

definePageMeta({
  layout: 'default',
})

const config = useRuntimeConfig()
const siteUrl = (config.public as Record<string, unknown>).siteUrl as string || 'https://warocol.com'

const { cities } = useCityCatalog()

// The SSR plugin already prefetches with include_empty=true, so the
// catalog is populated by the time this page renders. Sort: active first,
// then by sort_order from the backend (already applied server-side).
const activeCities = computed(() => cities.value.filter((c) => c.tenant_count > 0))
const upcomingCities = computed(() => cities.value.filter((c) => c.tenant_count === 0))

useSeoMeta({
  title: 'Ciudades · WaRo Colombia',
  description: 'Descubre los restaurantes en cada ciudad donde opera WaRo Colombia.',
  ogTitle: 'Ciudades · WaRo Colombia',
  ogDescription: 'Descubre los restaurantes en cada ciudad donde opera WaRo Colombia.',
  ogType: 'website',
  ogUrl: `${siteUrl}/ciudades`,
  ogSiteName: 'Waro Colombia',
  ogLocale: 'es_CO',
  twitterCard: 'summary_large_image',
  twitterSite: '@warocolombia',
})

useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}/ciudades` }],
})
</script>

<template>
  <div class="ciudades-page">
    <!-- Hero -->
    <section class="ciudades-hero">
      <h1 class="ciudades-title font-quantico">RESTAURANTES POR CIUDAD</h1>
      <p class="ciudades-subtitle">
        Descubre los restaurantes en cada ciudad donde WaRo está presente.
      </p>
    </section>

    <!-- Active cities -->
    <section v-if="activeCities.length > 0" class="ciudades-section">
      <h2 class="ciudades-section-title">
        <MapPinIcon class="ciudades-section-icon" aria-hidden="true" />
        Disponibles ahora
      </h2>
      <div class="ciudades-grid">
        <NuxtLink
          v-for="city in activeCities"
          :key="city.city_slug"
          :to="`/${city.city_slug}`"
          class="city-tile city-tile--active"
        >
          <span class="city-name">{{ city.city }}</span>
          <span class="city-count">
            {{ city.tenant_count }} restaurante{{ city.tenant_count !== 1 ? 's' : '' }}
          </span>
          <ChevronRightIcon class="city-arrow" aria-hidden="true" />
        </NuxtLink>
      </div>
    </section>

    <!-- Upcoming cities -->
    <section v-if="upcomingCities.length > 0" class="ciudades-section">
      <h2 class="ciudades-section-title">
        <MapPinIcon class="ciudades-section-icon" aria-hidden="true" />
        Próximamente
      </h2>
      <div class="ciudades-grid">
        <NuxtLink
          v-for="city in upcomingCities"
          :key="city.city_slug"
          :to="`/${city.city_slug}`"
          class="city-tile city-tile--upcoming"
        >
          <span class="city-name">{{ city.city }}</span>
          <span class="city-badge">Próximamente</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Defensive empty state (only fires if the catalog is unreachable) -->
    <section v-if="cities.length === 0" class="ciudades-empty">
      <div class="text-6xl mb-4" aria-hidden="true">🗺️</div>
      <p class="text-base text-text-secondary">
        Estamos cargando las ciudades disponibles…
      </p>
    </section>
  </div>
</template>

<style scoped>
.ciudades-page {
  min-height: calc(100vh - 60px);
  padding: 48px 24px 80px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Hero */
.ciudades-hero {
  text-align: center;
  margin-bottom: 56px;
}
.ciudades-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  color: hsl(250, 30%, 16%);
  letter-spacing: -1px;
  text-transform: uppercase;
  line-height: 1.05;
  margin-bottom: 16px;
}
.ciudades-subtitle {
  font-size: clamp(1rem, 1.5vw, 1.125rem);
  color: hsl(250, 10%, 45%);
  max-width: 540px;
  margin: 0 auto;
  line-height: 1.5;
}

/* Sections */
.ciudades-section {
  margin-bottom: 48px;
}
.ciudades-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(250, 30%, 16%);
  opacity: 0.7;
  margin-bottom: 20px;
}
.ciudades-section-icon {
  width: 16px;
  height: 16px;
  color: hsl(262, 83%, 58%);
}

/* Grid */
.ciudades-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

/* Tiles */
.city-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-height: 112px;
  padding: 20px 20px;
  background: #ffffff;
  border: 1px solid hsl(220, 14%, 88%);
  border-radius: 14px;
  text-decoration: none;
  color: hsl(250, 30%, 16%);
  transition: all 0.2s ease;
}
.city-tile:hover {
  border-color: hsl(262, 83%, 58%);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px -6px rgba(124, 58, 237, 0.15);
}
.city-tile:focus-visible {
  outline: 2px solid hsl(262, 83%, 58%);
  outline-offset: 2px;
}
.city-tile--upcoming {
  opacity: 0.75;
}
.city-tile--upcoming:hover {
  opacity: 1;
}

.city-name {
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.city-count {
  font-size: 0.875rem;
  color: hsl(250, 10%, 45%);
}
.city-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  background: hsl(38, 92%, 95%);
  color: hsl(28, 80%, 32%);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.city-arrow {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: hsl(250, 10%, 60%);
  transition: transform 0.2s ease, color 0.2s ease;
}
.city-tile--active:hover .city-arrow {
  transform: translateY(-50%) translateX(2px);
  color: hsl(262, 83%, 58%);
}

/* Empty (defensive) */
.ciudades-empty {
  text-align: center;
  padding: 80px 24px;
}

@media (max-width: 640px) {
  .ciudades-page {
    padding: 32px 16px 64px;
  }
  .ciudades-hero {
    margin-bottom: 40px;
  }
}
</style>
