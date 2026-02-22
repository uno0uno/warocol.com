<script setup lang="ts">
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
    <div class="bg-gradient-to-r from-crocus-600 to-crocus-800 text-white py-16 px-4">
      <div class="max-w-6xl mx-auto text-center">
        <h1 class="text-4xl md:text-5xl font-bold mb-4">Restaurantes en Bogotá</h1>
        <p class="text-xl text-crocus-100">Descubre los mejores restaurantes de la ciudad</p>
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
    <div v-else-if="restaurants.length > 0" class="max-w-6xl mx-auto px-4 py-16">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <NuxtLink
          v-for="restaurant in restaurants"
          :key="restaurant.id"
          :to="`/${restaurant.slug}`"
          class="bg-card rounded-xl border border-border overflow-hidden hover:border-primary transition-colors duration-200"
        >
          <!-- Restaurant Banner/Image -->
          <div class="h-48 bg-gradient-to-br from-crocus-500 to-crocus-700 flex items-center justify-center">
            <span class="text-6xl">{{ restaurant.logo_url || '🍽️' }}</span>
          </div>

          <!-- Restaurant Info -->
          <div class="p-6">
            <h3 class="text-xl font-bold text-foreground mb-2">{{ restaurant.display_name }}</h3>

            <p v-if="restaurant.description" class="text-muted-foreground text-base mb-4 line-clamp-2">
              {{ restaurant.description }}
            </p>

            <div v-if="restaurant.address" class="flex items-start gap-2 text-sm text-muted-foreground mb-2">
              <span>📍</span>
              <span class="line-clamp-1">{{ restaurant.address }}</span>
            </div>

            <div v-if="restaurant.phone_number" class="flex items-center gap-2 text-sm text-muted-foreground">
              <span>📞</span>
              <span>{{ restaurant.phone_number }}</span>
            </div>

            <!-- View Menu Button -->
            <div class="mt-4 pt-4 border-t border-border">
              <span class="text-primary font-medium text-sm flex items-center gap-2">
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
