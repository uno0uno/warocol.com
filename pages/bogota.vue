<script setup lang="ts">
import { MapPinIcon, PhoneIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'bogota' })

const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || 'https://warocol.com'

// SSR data fetching
const { data: responseData, error: fetchError, pending } = await useAsyncData(
  'restaurants-bogota',
  () => $fetch('/api/public/restaurant/list', { params: { city: 'Bogotá' } }),
  { server: true }
)

const restaurants = computed(() => responseData.value?.data || [])
const error = computed(() => fetchError.value?.message || null)

// SEO
useSeoMeta({
  title: 'Restaurantes en Bogotá - Waro Colombia',
  description: 'Descubre los mejores restaurantes en Bogotá. Explora menús, precios y haz tus pedidos en línea.',
  ogTitle: 'Restaurantes en Bogotá - Waro Colombia',
  ogDescription: 'Descubre los mejores restaurantes en Bogotá. Explora menús, precios y haz tus pedidos en línea.',
  ogType: 'website',
  ogUrl: `${siteUrl}/bogota`,
  ogSiteName: 'Waro Colombia',
  ogLocale: 'es_CO',
  twitterCard: 'summary_large_image',
  twitterSite: '@warocolombia',
  twitterTitle: 'Restaurantes en Bogotá - Waro Colombia',
  twitterDescription: 'Descubre los mejores restaurantes en Bogotá. Explora menús, precios y haz tus pedidos en línea.',
})

useHead({
  link: [{ rel: 'canonical', href: `${siteUrl}/bogota` }]
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <div class="relative overflow-hidden min-h-[280px] md:min-h-[380px] flex items-center">
      <img
        src="/hero_bogota_waro_colombia.png"
        alt="Bogotá"
        class="absolute inset-0 w-full h-full object-cover"
      />
      <div class="absolute inset-0 bg-foreground/50" />
      <div class="relative max-w-6xl mx-auto text-center w-full px-4 py-12">
        <h1 class="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-white">Restaurantes en Bogotá</h1>
        <p class="text-xl text-white/80 mb-6">Descubre los mejores restaurantes de la ciudad</p>
        <span
          v-if="!pending && restaurants.length > 0"
          class="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold text-white"
        >
          {{ restaurants.length }} restaurante{{ restaurants.length !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="max-w-6xl mx-auto px-4 py-16">
      <div class="text-center">
        <CommonsTheCustomLoader size="large" />
        <p class="text-muted-foreground mt-4">Cargando restaurantes...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-6xl mx-auto px-4 py-16">
      <div class="text-center">
        <div class="text-6xl mb-6">😕</div>
        <h2 class="text-2xl font-bold text-foreground mb-4">Error al cargar restaurantes</h2>
        <p class="text-muted-foreground mb-6">{{ error }}</p>
        <button
          @click="refreshNuxtData('restaurants-bogota')"
          class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Restaurants Grid -->
    <div v-else-if="restaurants.length > 0" class="max-w-6xl mx-auto px-4 py-10">
      <!-- Section Header -->
      <div class="flex items-center gap-4 mb-8">
        <h2 class="text-xl font-semibold text-foreground whitespace-nowrap">Todos los restaurantes · Bogotá</h2>
        <div class="flex-1 h-px bg-border"></div>
        <span class="text-sm text-muted-foreground font-medium whitespace-nowrap">
          {{ restaurants.length }} resultado{{ restaurants.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="restaurant in restaurants"
          :key="restaurant.id"
          :to="`/${restaurant.slug}`"
          class="card-item group bg-card rounded-xl border border-border overflow-hidden"
        >
          <!-- Restaurant Banner/Image -->
          <div class="relative h-48 bg-gradient-to-br from-primary to-primary/70 overflow-hidden">
            <!-- Banner image if URL available, else logo image, else emoji -->
            <img
              v-if="restaurant.banner_url && restaurant.banner_url.startsWith('http')"
              :src="restaurant.banner_url"
              :alt="restaurant.display_name"
              class="absolute inset-0 w-full h-full object-cover"
            />
            <img
              v-else-if="restaurant.logo_url && restaurant.logo_url.startsWith('http')"
              :src="restaurant.logo_url"
              :alt="restaurant.display_name"
              class="absolute inset-0 w-full h-full object-contain p-8"
            />
            <span v-else class="absolute inset-0 flex items-center justify-center text-6xl">🍽️</span>

            <!-- Dark gradient overlay for depth -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>

            <!-- Neighborhood badge top-left -->
            <span
              v-if="restaurant.neighborhood"
              class="absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold bg-background/80 backdrop-blur-sm text-foreground rounded-xl"
            >
              {{ restaurant.neighborhood }}
            </span>

            <!-- Open/Closed badge top-right -->
            <span
              v-if="restaurant.is_currently_open"
              class="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-success/90 text-success-foreground rounded-xl backdrop-blur-sm"
            >
              <span class="w-1.5 h-1.5 bg-success-foreground rounded-full animate-pulse" aria-hidden="true" />
              Abierto
            </span>
            <span
              v-else
              class="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-background/80 backdrop-blur-sm text-muted-foreground rounded-xl"
            >
              <span class="w-1.5 h-1.5 bg-muted-foreground rounded-full" aria-hidden="true" />
              Cerrado
            </span>
          </div>

          <!-- Restaurant Info -->
          <div class="p-6">
            <h3 class="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {{ restaurant.display_name }}
            </h3>

            <p v-if="restaurant.description" class="text-muted-foreground text-base mb-4 line-clamp-2">
              {{ restaurant.description }}
            </p>

            <div class="space-y-1.5">
              <div v-if="restaurant.address" class="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPinIcon class="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span class="line-clamp-1">{{ restaurant.address }}</span>
              </div>

              <div v-if="restaurant.phone_number" class="flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneIcon class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>{{ restaurant.phone_number }}</span>
              </div>
            </div>

            <!-- View Menu CTA -->
            <div class="mt-4 pt-4 border-t border-border">
              <span class="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 text-primary rounded-xl text-sm font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                Ver menú
                <ChevronRightIcon class="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="max-w-6xl mx-auto px-4 py-16">
      <div class="text-center">
        <div class="text-6xl mb-6">🍽️</div>
        <h2 class="text-2xl font-bold text-foreground mb-4">No hay restaurantes disponibles</h2>
        <p class="text-muted-foreground">Aún no hay restaurantes registrados en Bogotá.</p>
      </div>
    </div>
  </div>
</template>
