<script setup lang="ts">
import { computed } from 'vue'
import { MapPinIcon } from '@heroicons/vue/24/outline'
import { useCityCatalog, type PublicCity } from '~/composables/useCityCatalog'

/**
 * Directory hub (warocol.com#619). Lists cities/municipalities in the
 * `public_cities` catalog only when they have active tenants. Empty catalog
 * rows remain valid for operators and direct routes, but are not mass-linked
 * here.
 *
 * The hub complements the discovery section on `/` — that one is a
 * marketing teaser, this one is the canonical entry point linked from
 * the global header / bottom nav.
 */

definePageMeta({
  layout: 'default',
  publicAccess: true,
})

const config = useRuntimeConfig()
const siteUrl = (config.public as Record<string, unknown>).siteUrl as string || 'https://warocol.com'

const { cities } = useCityCatalog()

const CITY_VISUALS: Record<string, { displayName: string; imageUrl: string }> = {
  bogota: {
    displayName: 'Bogotá',
    imageUrl: 'https://pub-bc8bb06ab87643fb88805fdddf1cab70.r2.dev/city-images/bogota.webp',
  },
  cali: {
    displayName: 'Cali',
    imageUrl: 'https://pub-bc8bb06ab87643fb88805fdddf1cab70.r2.dev/city-images/cali.webp',
  },
  mosquera: {
    displayName: 'Mosquera',
    imageUrl: 'https://pub-bc8bb06ab87643fb88805fdddf1cab70.r2.dev/city-images/mosquera.webp',
  },
}

const cityDisplayName = (city: PublicCity) => CITY_VISUALS[city.city_slug]?.displayName ?? city.city
const cityImageUrl = (city: PublicCity) => CITY_VISUALS[city.city_slug]?.imageUrl ?? null

// The SSR plugin already prefetches with include_empty=true, so the catalog is
// populated by the time this page renders. Only link populated directories:
// sitemap.xml uses the same active-only intent with include_empty=false.
const activeCities = computed(() => cities.value.filter((c) => c.tenant_count > 0))
const upcomingCities = computed(() => cities.value.filter((c) => c.tenant_count === 0))
const hasHiddenUpcomingCities = computed(() => upcomingCities.value.length > 0)

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
        Descubre restaurantes en las ciudades y municipios donde WaRo está presente.
      </p>
    </section>

    <!-- Active cities -->
    <section v-if="activeCities.length > 0" class="ciudades-section">
      <h2 class="ciudades-section-title">
        <MapPinIcon class="ciudades-section-icon" aria-hidden="true" />
        Disponibles ahora
      </h2>
      <div class="ciudades-row">
        <NuxtLink
          v-for="city in activeCities"
          :key="city.city_slug"
          :to="`/${city.city_slug}`"
          class="city-card"
        >
          <div class="city-card__image">
            <div class="city-card__gradient">
              <img
                v-if="cityImageUrl(city)"
                :src="cityImageUrl(city) || undefined"
                alt=""
                aria-hidden="true"
                class="city-card__photo"
              >
              <span class="city-card__overlay-name">{{ cityDisplayName(city) }}</span>
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
            <span class="city-card__meta-text">{{ cityDisplayName(city) }}, {{ city.country }}</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section v-if="hasHiddenUpcomingCities" class="ciudades-note">
      <MapPinIcon class="ciudades-note__icon" aria-hidden="true" />
      <p>
        El catálogo de WARO cubre municipios de Colombia. Aquí solo enlazamos lugares con restaurantes activos.
      </p>
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
  background: hsl(220, 14%, 97%);
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

/* Row — horizontal scroll on mobile, grid on wider viewports.
   Matches the "Próximos Viajes" card-strip pattern. */
.ciudades-row {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.ciudades-row > * {
  scroll-snap-align: start;
}
@media (min-width: 768px) {
  .ciudades-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    overflow: visible;
    padding-bottom: 0;
  }
}

/* Card — outer pill, inner image with rounded-[28px], meta row below. */
.city-card {
  display: block;
  flex: 0 0 240px;
  min-width: 240px;
  background: #ffffff;
  border-radius: 32px;
  padding: 8px;
  text-decoration: none;
  color: hsl(250, 30%, 16%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  border: 1px solid hsl(220, 14%, 92%);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
@media (min-width: 768px) {
  .city-card {
    flex: initial;
    min-width: 0;
  }
}
.city-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -10px rgba(124, 58, 237, 0.18);
  border-color: hsl(262, 83%, 88%);
}
.city-card:focus-visible {
  outline: 2px solid hsl(262, 83%, 58%);
  outline-offset: 2px;
}
/* Image area inside the card. Uses uploaded city artwork when available,
   otherwise falls back to the previous gradient placeholder. */
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
.city-card__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.city-card__gradient::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.04) 0%, rgba(15, 23, 42, 0.42) 100%),
    radial-gradient(circle at 70% 110%, rgba(255,255,255,0.18), transparent 55%);
  pointer-events: none;
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

/* Count pill bottom-right (active cities). Substitutes the "avatar
   stack" position from the reference design with a tenant-count chip. */
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

/* Meta row: pin + location text. */
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

.ciudades-note {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 680px;
  margin: 8px auto 48px;
  padding: 16px 18px;
  border: 1px solid hsl(220, 14%, 88%);
  border-radius: 8px;
  background: #ffffff;
  color: hsl(250, 10%, 35%);
  font-size: 0.95rem;
  line-height: 1.5;
}
.ciudades-note__icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  margin-top: 1px;
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
