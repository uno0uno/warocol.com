<template>
  <div class="w-full">
    <!-- Banner / Hero -->
    <div class="relative h-48 md:h-64 gradient-crocus overflow-hidden">
      <img
        v-if="restaurant.banner_url && restaurant.banner_url.startsWith('http')"
        :src="restaurant.banner_url"
        :alt="restaurant.display_name"
        class="absolute inset-0 w-full h-full object-cover"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-9xl">
        {{ restaurant.banner_url || '🏪' }}
      </div>

      <!-- Overlay gradient -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
    </div>

    <!-- Restaurant Info -->
    <div class="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
      <div class="bg-card rounded-xl border border-border p-4">
        <div class="flex flex-row gap-3 items-start justify-between">
          <!-- Logo -->
          <div class="flex-shrink-0">
            <div
              class="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border-2 border-border overflow-hidden"
            >
              <img
                v-if="restaurant.logo_url && restaurant.logo_url.startsWith('http')"
                :src="restaurant.logo_url"
                :alt="restaurant.display_name"
                class="w-full h-full object-contain"
              />
              <div v-else class="text-3xl">
                {{ restaurant.logo_url || '🍽️' }}
              </div>
            </div>
          </div>

          <!-- Name and Description -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="font-bold text-foreground">
                {{ restaurant.display_name }}
              </h1>

              <!-- Open/Closed Badge -->
              <span
                v-if="restaurant.is_currently_open"
                class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800"
              >
                <span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Abierto
              </span>
              <span
                v-else
                class="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-800"
              >
                <span class="w-2 h-2 bg-red-500 rounded-full mr-2" />
                Cerrado
              </span>
            </div>

            <p v-if="restaurant.description" class="mt-1 text-muted-foreground text-sm line-clamp-2">
              {{ restaurant.description }}
            </p>

            <!-- Contact Info -->
            <div class="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div v-if="restaurant.phone_number" class="flex items-center gap-2">
                <svg class="w-4 h-4 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.04 12.04 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5z"/></svg>
                <a :href="`tel:${restaurant.phone_number}`" class="hover:text-primary transition-colors">
                  {{ restaurant.phone_number }}
                </a>
              </div>

              <div v-if="restaurant.address" class="flex items-center gap-2">
                <svg class="w-4 h-4 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0a3 3 0 0 1 6 0"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0"/></svg>
                <span>{{ restaurant.address }}</span>
              </div>

              <div v-if="restaurant.city" class="flex items-center gap-2">
                <svg class="w-4 h-4 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008zm0 3h.008v.008h-.008zm0 3h.008v.008h-.008z"/></svg>
                <span>{{ restaurant.city }}{{ restaurant.neighborhood ? `, ${restaurant.neighborhood}` : '' }}</span>
              </div>
            </div>

          </div>

          <!-- Social Media (top right) -->
          <div v-if="hasSocialMedia" class="flex-shrink-0 flex gap-2">
            <a
              v-if="restaurant.social_media?.whatsapp"
              :href="`https://wa.me/${restaurant.social_media.whatsapp.replace(/[^0-9]/g, '')}`"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-muted text-foreground hover:bg-secondary transition-colors"
              aria-label="WhatsApp"
              title="WhatsApp"
            >
              <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23c-1.48 0-2.93-.39-4.19-1.15l-.3-.17l-3.12.82l.83-3.04l-.2-.32a8.2 8.2 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31c-.22.25-.87.86-.87 2.07c0 1.22.89 2.39 1 2.56c.14.17 1.76 2.67 4.25 3.73c.59.27 1.05.42 1.41.53c.59.19 1.13.16 1.56.1c.48-.07 1.46-.6 1.67-1.18s.21-1.07.15-1.18c-.07-.1-.23-.16-.48-.27c-.25-.14-1.47-.74-1.69-.82c-.23-.08-.37-.12-.56.12c-.16.25-.64.81-.78.97c-.15.17-.29.19-.53.07c-.26-.13-1.06-.39-2-1.23c-.74-.66-1.23-1.47-1.38-1.72c-.12-.24-.01-.39.11-.5c.11-.11.27-.29.37-.44c.13-.14.17-.25.25-.41c.08-.17.04-.31-.02-.43c-.06-.11-.56-1.35-.77-1.84c-.2-.48-.4-.42-.56-.43c-.14 0-.3-.01-.47-.01"/></svg>
            </a>

            <a
              v-if="restaurant.social_media?.facebook"
              :href="restaurant.social_media.facebook"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-muted text-foreground hover:bg-secondary transition-colors"
              aria-label="Facebook"
              title="Facebook"
            >
              <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02c0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89c1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02"/></svg>
            </a>

            <a
              v-if="restaurant.social_media?.instagram"
              :href="getInstagramUrl(restaurant.social_media.instagram)"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-muted text-foreground hover:bg-secondary transition-colors"
              aria-label="Instagram"
              title="Instagram"
            >
              <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"/></svg>
            </a>
          </div>
        </div>

        <!-- Business Hours -->
        <div v-if="restaurant.business_hours && Object.keys(restaurant.business_hours).length > 0" class="mt-3 pt-3 border-t border-border">
          <button
            @click="showHours = !showHours"
            :aria-expanded="showHours"
            class="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0a9 9 0 0 1 18 0"/></svg>
            <span>Horarios de atención</span>
            <svg
              class="w-4 h-4 transition-transform duration-200"
              :class="{ 'rotate-180': showHours }"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
            ><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25l-7.5 7.5l-7.5-7.5"/></svg>
          </button>

          <div v-if="showHours" class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-base">
            <div
              v-for="(hours, day) in restaurant.business_hours"
              :key="day"
              class="flex flex-col"
            >
              <span class="font-medium text-foreground capitalize">{{ translateDay(day) }}</span>
              <span v-if="hours.closed" class="text-muted-foreground">Cerrado</span>
              <span v-else class="text-muted-foreground">{{ hours.open }} - {{ hours.close }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps({
  restaurant: {
    type: Object,
    required: true
  }
})

const showHours = ref(false)

const hasSocialMedia = computed(() => {
  const social = props.restaurant.social_media
  if (!social) return false
  return !!(social.whatsapp || social.facebook || social.instagram || social.twitter)
})

function getInstagramUrl(handle) {
  if (handle.startsWith('http')) return handle
  const cleanHandle = handle.replace('@', '')
  return `https://instagram.com/${cleanHandle}`
}

function translateDay(day) {
  const days = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  }
  return days[day.toLowerCase()] || day
}
</script>
