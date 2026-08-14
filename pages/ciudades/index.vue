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
  padding: 0 0 3rem;
  width: 100%;
}

@media (min-width: 768px) {
  .ciudades-page {
    padding-bottom: 4rem;
  }
}

/* Hero */
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

/* Sections */
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

/* Grid — 2 cols on mobile, auto-fit from md up. */
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

/* Card — outer pill, inner image with rounded-[28px], meta row below. */
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
  margin: 0.5rem auto 2.5rem;
  padding: 16px 18px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  background: hsl(var(--surface));
  color: hsl(var(--text-secondary));
  font-size: 0.9375rem;
  line-height: 1.5;
}
.ciudades-note__icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  margin-top: 1px;
  color: hsl(var(--badge-primary-text));
}

/* Empty (defensive) */
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
