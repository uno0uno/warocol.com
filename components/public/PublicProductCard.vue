<template>
  <div
    class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer group"
    :class="{ 'opacity-50': !product.is_available }"
    @click="handleClick"
  >
    <!-- Product Image/Emoji -->
    <div class="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
      <div
        v-if="product.image_url && product.image_url.startsWith('http')"
        class="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-200"
        :style="{ backgroundImage: `url(${product.image_url})` }"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-7xl">
        {{ product.image_url || '🍽️' }}
      </div>

      <!-- Availability badge -->
      <div v-if="!product.is_available" class="absolute top-3 right-3">
        <span class="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-full">
          No disponible
        </span>
      </div>

      <!-- Modifier indicator -->
      <div v-if="product.has_modifiers" class="absolute top-3 left-3">
        <span class="px-2 py-1 text-xs font-medium bg-blue-500 text-white rounded-full">
          Personalizable
        </span>
      </div>
    </div>

    <!-- Product Info -->
    <div class="p-4">
      <!-- Name -->
      <h3 class="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {{ product.name }}
      </h3>

      <!-- Description -->
      <p v-if="product.description" class="text-sm text-gray-500 mb-3 line-clamp-2">
        {{ product.description }}
      </p>

      <!-- Footer: Price and Category -->
      <div class="flex items-center justify-between mt-auto">
        <!-- Price -->
        <div class="text-2xl font-bold text-gray-900">
          {{ formatPrice(product.price) }}
        </div>

        <!-- Category badge -->
        <div class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {{ product.category_name }}
        </div>
      </div>

      <!-- Preparation time -->
      <div v-if="product.preparation_time" class="flex items-center gap-1 mt-3 text-xs text-gray-500">
        <span>⏱️</span>
        <span>{{ product.preparation_time }} min</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click'])

function handleClick() {
  if (props.product.is_available) {
    emit('click', props.product)
  }
}

function formatPrice(price) {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numPrice)
}
</script>
