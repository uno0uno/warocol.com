<template>
  <div class="w-full">
    <!-- Banner / Hero -->
    <div class="relative h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
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
      <div class="bg-white rounded-xl shadow-lg p-6 md:p-8">
        <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <!-- Logo -->
          <div class="flex-shrink-0">
            <div
              class="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-white shadow-md flex items-center justify-center border-4 border-white overflow-hidden"
            >
              <img
                v-if="restaurant.logo_url && restaurant.logo_url.startsWith('http')"
                :src="restaurant.logo_url"
                :alt="restaurant.display_name"
                class="w-full h-full object-contain"
              />
              <div v-else class="text-5xl md:text-6xl">
                {{ restaurant.logo_url || '🍽️' }}
              </div>
            </div>
          </div>

          <!-- Name and Description -->
          <div class="flex-1">
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-3xl md:text-4xl font-bold text-gray-900">
                {{ restaurant.display_name }}
              </h1>

              <!-- Open/Closed Badge -->
              <span
                v-if="restaurant.is_currently_open"
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
              >
                <span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Abierto
              </span>
              <span
                v-else
                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
              >
                <span class="w-2 h-2 bg-red-500 rounded-full mr-2" />
                Cerrado
              </span>
            </div>

            <p v-if="restaurant.description" class="mt-3 text-gray-600 text-lg">
              {{ restaurant.description }}
            </p>

            <!-- Contact Info -->
            <div class="mt-4 flex flex-wrap gap-4 text-base text-gray-500">
              <div v-if="restaurant.phone_number" class="flex items-center gap-2">
                <span>📞</span>
                <a :href="`tel:${restaurant.phone_number}`" class="hover:text-blue-600">
                  {{ restaurant.phone_number }}
                </a>
              </div>

              <div v-if="restaurant.address" class="flex items-center gap-2">
                <span>📍</span>
                <span>{{ restaurant.address }}</span>
              </div>

              <div v-if="restaurant.city" class="flex items-center gap-2">
                <span>🏙️</span>
                <span>{{ restaurant.city }}{{ restaurant.neighborhood ? `, ${restaurant.neighborhood}` : '' }}</span>
              </div>
            </div>

            <!-- Social Media -->
            <div v-if="hasSocialMedia" class="mt-4 flex gap-3">
              <a
                v-if="restaurant.social_media?.whatsapp"
                :href="`https://wa.me/${restaurant.social_media.whatsapp.replace(/[^0-9]/g, '')}`"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors text-xl"
                title="WhatsApp"
              >
                💬
              </a>

              <a
                v-if="restaurant.social_media?.facebook"
                :href="restaurant.social_media.facebook"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xl"
                title="Facebook"
              >
                f
              </a>

              <a
                v-if="restaurant.social_media?.instagram"
                :href="getInstagramUrl(restaurant.social_media.instagram)"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-colors text-xl"
                title="Instagram"
              >
                📷
              </a>
            </div>
          </div>
        </div>

        <!-- Business Hours -->
        <div v-if="restaurant.business_hours && Object.keys(restaurant.business_hours).length > 0" class="mt-6 pt-6 border-t border-gray-200">
          <button
            @click="showHours = !showHours"
            class="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <span>🕐</span>
            <span>Horarios de atención</span>
            <span>{{ showHours ? '▲' : '▼' }}</span>
          </button>

          <div v-if="showHours" class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-base">
            <div
              v-for="(hours, day) in restaurant.business_hours"
              :key="day"
              class="flex flex-col"
            >
              <span class="font-medium text-gray-700 capitalize">{{ translateDay(day) }}</span>
              <span v-if="hours.closed" class="text-gray-500">Cerrado</span>
              <span v-else class="text-gray-600">{{ hours.open }} - {{ hours.close }}</span>
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
