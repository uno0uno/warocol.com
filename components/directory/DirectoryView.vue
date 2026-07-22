<script setup lang="ts">
import { computed } from 'vue'
import { MapPinIcon, PhoneIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import { useCityCatalog } from '~/composables/useCityCatalog'

/**
 * Generic per-city restaurant directory (warocol.com#615). Replaces the
 * hardcoded /bogota page so any active city slug in the public_cities
 * catalog renders the same hero + restaurant grid + empty-state.
 *
 * Mounted by `pages/[tenant]/index.vue` when the URL slug matches a city
 * in the catalog. Tenant slugs continue to render the tenant profile.
 */
interface Props {
  citySlug: string
}
const props = defineProps<Props>()

const config = useRuntimeConfig()
const siteUrl = (config.public as Record<string, unknown>).siteUrl as string || 'https://warocol.com'

const { findCity } = useCityCatalog()
const catalogEntry = computed(() => findCity(props.citySlug))
const cityName = computed(() => catalogEntry.value?.city ?? props.citySlug)
const heroImageSrc = '/hero_bogota_waro_colombia.png'

const {
  data: responseData,
  error: fetchError,
  pending,
} = await useAsyncData(
  () => `restaurants-${props.citySlug}`,
  () => $fetch('/api/public/restaurant/list', {
    params: { city_slug: props.citySlug },
  }),
  { server: true, watch: [() => props.citySlug] },
)

const restaurants = computed(() => (responseData.value as { data?: unknown[] } | null)?.data ?? [])
const error = computed(() => (fetchError.value as { message?: string } | null)?.message ?? null)
const hasRestaurants = computed(() => restaurants.value.length > 0)
const isEmptyDirectory = computed(() => !pending.value && !error.value && !hasRestaurants.value)

const isOrderable = (restaurant: unknown) => {
  const row = restaurant as Record<string, unknown>
  return row.public_ordering_status === 'open'
}

useSeoMeta({
  title: () => `Restaurantes en ${cityName.value} - Waro Colombia`,
  description: () => `Descubre los mejores restaurantes en ${cityName.value}. Explora menús, precios y haz tus pedidos en línea.`,
  ogTitle: () => `Restaurantes en ${cityName.value} - Waro Colombia`,
  ogDescription: () => `Descubre los mejores restaurantes en ${cityName.value}. Explora menús, precios y haz tus pedidos en línea.`,
  ogType: 'website',
  ogUrl: () => `${siteUrl}/${props.citySlug}`,
  ogSiteName: 'Waro Colombia',
  ogLocale: 'es_CO',
  twitterCard: 'summary_large_image',
  twitterSite: '@warocolombia',
  twitterTitle: () => `Restaurantes en ${cityName.value} - Waro Colombia`,
  twitterDescription: () => `Descubre los mejores restaurantes en ${cityName.value}.`,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: `${siteUrl}/${props.citySlug}` }],
  meta: isEmptyDirectory.value
    ? [{ name: 'robots', content: 'noindex,follow' }]
    : [],
}))
</script>

<template>
  <div class="directory-view">
    <!-- Hero — full viewport width, aligned with public header edges -->
    <section class="directory-hero">
      <img
        :src="heroImageSrc"
        alt=""
        aria-hidden="true"
        class="directory-hero__image"
      >
      <div class="directory-hero__overlay" />
      <div class="directory-hero__content">
        <h1 class="directory-hero__title font-quantico">
          Restaurantes en {{ cityName }}
        </h1>
        <p class="directory-hero__subtitle">
          Descubre los mejores restaurantes de la ciudad
        </p>
        <span
          v-if="!pending && hasRestaurants"
          class="directory-hero__count"
        >
          {{ restaurants.length }} restaurante{{ restaurants.length !== 1 ? 's' : '' }}
        </span>
      </div>
    </section>

    <!-- Loading State -->
    <div v-if="pending" class="directory-body directory-state">
      <CommonsTheCustomLoader size="large" />
      <p class="directory-state__text">Cargando restaurantes...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="directory-body directory-state">
      <div class="text-6xl mb-6" aria-hidden="true">😕</div>
      <h2 class="text-2xl font-bold text-text-primary mb-4">Error al cargar restaurantes</h2>
      <p class="text-text-secondary mb-6">{{ error }}</p>
      <button
        class="directory-btn"
        @click="refreshNuxtData(`restaurants-${props.citySlug}`)"
      >
        Reintentar
      </button>
    </div>

    <!-- Restaurants Grid -->
    <section v-else-if="hasRestaurants" class="directory-body">
      <NuxtLink to="/ciudades" class="directory-back">
        <ChevronRightIcon class="directory-back__icon" aria-hidden="true" />
        Todas las ciudades
      </NuxtLink>

      <div class="directory-section-head">
        <h2 class="directory-section-title">
          <MapPinIcon class="directory-section-icon" aria-hidden="true" />
          Disponibles en {{ cityName }}
        </h2>
      </div>

      <div class="directory-row">
        <NuxtLink
          v-for="restaurant in restaurants"
          :key="(restaurant as any).id"
          :to="`/${(restaurant as any).slug}`"
          class="restaurant-card"
        >
          <div class="restaurant-card__image">
            <img
              v-if="(restaurant as any).banner_url && (restaurant as any).banner_url.startsWith('http')"
              :src="(restaurant as any).banner_url"
              :alt="(restaurant as any).display_name"
              class="restaurant-card__photo"
            >
            <img
              v-else-if="(restaurant as any).logo_url && (restaurant as any).logo_url.startsWith('http')"
              :src="(restaurant as any).logo_url"
              :alt="(restaurant as any).display_name"
              class="restaurant-card__photo restaurant-card__photo--contain"
            >
            <div v-else class="restaurant-card__placeholder" aria-hidden="true">🍽️</div>

            <div class="restaurant-card__shade" />

            <span
              v-if="(restaurant as any).neighborhood"
              class="restaurant-card__badge restaurant-card__badge--location"
            >
              {{ (restaurant as any).neighborhood }}
            </span>

            <span
              v-if="isOrderable(restaurant)"
              class="restaurant-card__badge restaurant-card__badge--open"
            >
              <span class="restaurant-card__status-dot restaurant-card__status-dot--open" aria-hidden="true" />
              Abierto
            </span>
            <span
              v-else
              class="restaurant-card__badge restaurant-card__badge--closed"
            >
              <span class="restaurant-card__status-dot" aria-hidden="true" />
              Cerrado
            </span>
          </div>

          <div class="restaurant-card__body">
            <div class="restaurant-card__content">
              <h3 class="restaurant-card__title">
                {{ (restaurant as any).display_name }}
              </h3>

              <p
                class="restaurant-card__description"
                :class="{ 'restaurant-card__description--muted': !(restaurant as any).description }"
              >
                {{ (restaurant as any).description || 'Explora el menú y haz tu pedido en línea.' }}
              </p>

              <div class="restaurant-card__meta-list">
                <div v-if="(restaurant as any).address" class="restaurant-card__meta">
                  <MapPinIcon class="restaurant-card__meta-icon" aria-hidden="true" />
                  <span class="line-clamp-1">{{ (restaurant as any).address }}</span>
                </div>

                <div v-if="(restaurant as any).phone_number" class="restaurant-card__meta">
                  <PhoneIcon class="restaurant-card__meta-icon" aria-hidden="true" />
                  <span>{{ (restaurant as any).phone_number }}</span>
                </div>
              </div>
            </div>

            <div class="restaurant-card__footer">
              <span class="restaurant-card__cta">
                Ver menú
                <ChevronRightIcon class="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Empty State -->
    <div v-else class="directory-body directory-state">
      <div class="text-6xl mb-6" aria-hidden="true">🍽️</div>
      <h2 class="text-2xl font-bold text-text-primary mb-4">Aún no hay restaurantes en {{ cityName }}</h2>
      <p class="text-text-secondary mb-6">Estamos sumando restaurantes en esta ciudad. Pronto vas a encontrar opciones aquí.</p>
      <NuxtLink to="/ciudades" class="directory-btn">
        Ver ciudades
        <ChevronRightIcon class="w-4 h-4" aria-hidden="true" />
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
/* Flush hero under header; cancel shell horizontal + top padding. */
.directory-view {
  margin-top: calc(-1 * var(--layout-public-page-padding-top));
  margin-inline: calc(-1 * var(--layout-public-page-padding-x));
  width: calc(100% + 2 * var(--layout-public-page-padding-x));
  background: hsl(var(--background));
}

@media (min-width: 640px) {
  .directory-view {
    margin-inline: calc(-1 * var(--layout-public-page-padding-x-sm));
    width: calc(100% + 2 * var(--layout-public-page-padding-x-sm));
  }
}

@media (min-width: 768px) {
  .directory-view {
    margin-top: calc(-1 * var(--layout-public-page-padding-top-md));
    margin-inline: calc(-1 * var(--layout-public-page-padding-x-md));
    width: calc(100% + 2 * var(--layout-public-page-padding-x-md));
  }
}

.directory-hero {
  position: relative;
  overflow: hidden;
  min-height: 280px;
  display: flex;
  align-items: center;
  width: 100vw;
  max-width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}

@media (min-width: 768px) {
  .directory-hero {
    min-height: 380px;
  }
}

.directory-hero__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.directory-hero__overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, hsl(var(--foreground) / 0.28) 0%, hsl(var(--foreground) / 0.62) 100%),
    linear-gradient(90deg, hsl(var(--foreground) / 0.18) 0%, transparent 55%);
}

.directory-hero__content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: var(--layout-public-page-max-width);
  margin-inline: auto;
  padding: 2.5rem var(--layout-public-page-padding-x);
  text-align: center;
}

@media (min-width: 640px) {
  .directory-hero__content {
    padding-inline: var(--layout-public-page-padding-x-sm);
  }
}

@media (min-width: 768px) {
  .directory-hero__content {
    padding-inline: var(--layout-public-page-padding-x-md);
  }
}

.directory-hero__title {
  font-size: clamp(1.85rem, 4vw, 3rem);
  font-weight: 900;
  color: hsl(0 0% 100%);
  letter-spacing: -0.02em;
  text-transform: uppercase;
  line-height: 1.05;
  margin-bottom: 0.75rem;
  text-shadow: 0 2px 18px hsl(var(--foreground) / 0.35);
}

.directory-hero__subtitle {
  font-size: clamp(0.9375rem, 1.5vw, 1.125rem);
  font-weight: 300;
  color: hsl(0 0% 100% / 0.92);
  max-width: 34rem;
  margin: 0 auto 1.25rem;
  line-height: 1.55;
}

.directory-hero__count {
  display: inline-block;
  padding: 0.375rem 0.875rem;
  border-radius: 999px;
  background: hsl(var(--surface) / 0.88);
  backdrop-filter: blur(6px);
  color: hsl(var(--text-primary));
  border: 1px solid hsl(var(--surface) / 0.6);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.directory-body {
  width: 100%;
  max-width: var(--layout-public-page-max-width);
  margin-inline: auto;
  padding: 1.5rem var(--layout-public-page-padding-x) 2.5rem;
}

@media (min-width: 640px) {
  .directory-body {
    padding-inline: var(--layout-public-page-padding-x-sm);
  }
}

@media (min-width: 768px) {
  .directory-body {
    padding-inline: var(--layout-public-page-padding-x-md);
    padding-top: 2rem;
    padding-bottom: 3rem;
  }
}

.directory-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-block: 4rem;
}

.directory-state__text {
  margin-top: 1rem;
  color: hsl(var(--text-secondary));
}

.directory-back {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 1.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: hsl(var(--text-secondary));
  text-decoration: none;
  transition: color 0.2s ease;
}

.directory-back:hover {
  color: hsl(var(--badge-primary-text));
}

.directory-back__icon {
  width: 0.875rem;
  height: 0.875rem;
  transform: rotate(180deg);
}

.directory-section-head {
  margin-bottom: 1.25rem;
}

.directory-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: hsl(var(--text-primary));
  opacity: 0.72;
}

.directory-section-icon {
  width: 1rem;
  height: 1rem;
  color: hsl(var(--badge-primary-text));
  flex-shrink: 0;
}

/* Same fill pattern as /ciudades — cards stretch to the header rail width. */
.directory-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

@media (min-width: 768px) {
  .directory-row {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

.restaurant-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100%;
  background: hsl(var(--surface));
  border-radius: 32px;
  padding: 8px;
  text-decoration: none;
  color: hsl(var(--text-primary));
  box-shadow: 0 1px 2px hsl(var(--foreground) / 0.04);
  border: 1px solid hsl(var(--border));
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.restaurant-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -10px hsl(var(--badge-primary-text) / 0.18);
  border-color: hsl(var(--badge-primary-border));
}

.restaurant-card:focus-visible {
  outline: 2px solid hsl(var(--badge-primary-text));
  outline-offset: 2px;
}

.restaurant-card__image {
  position: relative;
  width: 100%;
  height: 192px;
  border-radius: 28px;
  overflow: hidden;
  margin-bottom: 12px;
  flex-shrink: 0;
  background: linear-gradient(160deg, hsl(var(--badge-primary-text)) 0%, hsl(var(--action-primary-bg)) 100%);
}

.restaurant-card__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.restaurant-card__photo--contain {
  object-fit: contain;
  padding: 2rem;
}

.restaurant-card__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
}

.restaurant-card__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, hsl(var(--foreground) / 0.04) 0%, hsl(var(--foreground) / 0.42) 100%);
  pointer-events: none;
}

.restaurant-card__badge {
  position: absolute;
  top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  backdrop-filter: blur(4px);
  z-index: 1;
}

.restaurant-card__badge--location {
  left: 12px;
  background: hsl(var(--surface) / 0.92);
  color: hsl(var(--text-primary));
  border: 1px solid hsl(var(--border) / 0.65);
}

.restaurant-card__badge--open {
  right: 12px;
  background: hsl(var(--success) / 0.9);
  color: hsl(var(--success-foreground));
}

.restaurant-card__badge--closed {
  right: 12px;
  background: hsl(var(--surface) / 0.92);
  color: hsl(var(--text-secondary));
  border: 1px solid hsl(var(--border) / 0.65);
}

.restaurant-card__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: hsl(var(--text-tertiary));
  flex-shrink: 0;
}

.restaurant-card__status-dot--open {
  background: hsl(var(--success-foreground));
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.restaurant-card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0 12px 8px;
}

.restaurant-card__content {
  flex: 1;
  min-height: 0;
}

.restaurant-card__title {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 0.5rem;
  color: hsl(var(--text-primary));
  transition: color 0.2s ease;
}

.restaurant-card:hover .restaurant-card__title {
  color: hsl(var(--badge-primary-text));
}

.restaurant-card__description {
  font-size: 0.875rem;
  line-height: 1.5;
  color: hsl(var(--text-secondary));
  margin-bottom: 0.75rem;
  min-height: 2.625rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.restaurant-card__description--muted {
  color: hsl(var(--text-tertiary));
  font-style: italic;
}

.restaurant-card__meta-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.restaurant-card__meta {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: hsl(var(--text-tertiary));
}

.restaurant-card__meta-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.restaurant-card__footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid hsl(var(--border));
}

.restaurant-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  background: hsl(var(--text-primary));
  color: hsl(var(--surface));
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.restaurant-card:hover .restaurant-card__cta {
  background: hsl(var(--action-primary-bg));
  color: hsl(var(--action-primary-text));
}

.directory-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  background: hsl(var(--text-primary));
  color: hsl(var(--surface));
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.directory-btn:hover {
  background: hsl(var(--action-primary-bg));
  color: hsl(var(--action-primary-text));
}

@media (max-width: 767px) {
  .restaurant-card {
    border-radius: 24px;
    padding: 6px;
  }

  .restaurant-card__image {
    height: 140px;
    border-radius: 20px;
    margin-bottom: 8px;
  }

  .restaurant-card__body {
    padding: 0 8px 6px;
  }

  .restaurant-card__title {
    font-size: 1rem;
  }

  .restaurant-card__description,
  .restaurant-card__meta {
    font-size: 0.75rem;
  }

  .restaurant-card__badge {
    top: 8px;
    padding: 3px 8px;
    font-size: 0.65rem;
  }

  .restaurant-card__badge--location {
    left: 8px;
  }

  .restaurant-card__badge--open,
  .restaurant-card__badge--closed {
    right: 8px;
  }
}
</style>
