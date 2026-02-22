<script setup lang="ts">
import { MapPinIcon, PhoneIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

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
useHead({
  title: 'Restaurantes en Bogotá - Waro Colombia',
  meta: [
    { name: 'description', content: 'Descubre los mejores restaurantes en Bogotá. Explora menús, precios y haz tus pedidos en línea.' },
    { property: 'og:title', content: 'Restaurantes en Bogotá - Waro Colombia' },
    { property: 'og:description', content: 'Descubre los mejores restaurantes en Bogotá. Explora menús, precios y haz tus pedidos en línea.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${siteUrl}/bogota` },
  ],
  link: [
    { rel: 'canonical', href: `${siteUrl}/bogota` }
  ]
})
</script>

<template>
  <div class="min-h-screen bg-background animate-fade-in">
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-crocus-600 to-crocus-800 text-white min-h-[280px] flex items-center px-4">
      <div class="max-w-6xl mx-auto text-center w-full py-12">
        <h1 class="text-4xl md:text-5xl font-bold mb-4 tracking-tight drop-shadow-sm">Restaurantes en Bogotá</h1>
        <p class="text-xl text-crocus-100 mb-6">Descubre los mejores restaurantes de la ciudad</p>
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
          class="px-6 py-3 bg-crocus-600 text-white rounded-lg hover:bg-crocus-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Restaurants Grid -->
    <div v-else-if="restaurants.length > 0" class="max-w-6xl mx-auto px-4 py-10">
      <!-- Section Header -->
      <div class="flex items-center gap-4 mb-8">
        <h2 class="text-lg font-semibold text-foreground whitespace-nowrap">Todos los restaurantes · Bogotá</h2>
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
          class="card-item group bg-card rounded-xl border border-border/60 overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all duration-300"
        >
          <!-- Restaurant Banner/Image -->
          <div class="relative h-48 bg-gradient-to-br from-crocus-500 to-crocus-700 overflow-hidden">
            <!-- Logo emoji (zoom on hover) -->
            <span class="absolute inset-0 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
              {{ restaurant.logo_url || '🍽️' }}
            </span>

            <!-- Dark gradient overlay for depth -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>

            <!-- Banner emoji bottom-right -->
            <span v-if="restaurant.banner_url" class="absolute bottom-2 right-3 text-2xl opacity-70">
              {{ restaurant.banner_url }}
            </span>

            <!-- Neighborhood badge top-left -->
            <span
              v-if="restaurant.neighborhood"
              class="absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold bg-background/80 backdrop-blur-sm text-foreground rounded-lg"
            >
              {{ restaurant.neighborhood }}
            </span>
          </div>

          <!-- Restaurant Info -->
          <div class="p-6">
            <h3 class="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
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
              <span class="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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

<style scoped>
.card-item {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease;
}

.card-item:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
}
</style>
