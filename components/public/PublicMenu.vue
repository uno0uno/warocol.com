<template>
  <div class="w-full">
    <!-- Categories Filter -->
    <div v-if="categories.length > 0" class="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="category in allCategories"
            :key="category.id"
            @click="selectedCategory = category.id"
            class="px-4 py-2 min-h-[44px] rounded-full font-medium whitespace-nowrap transition-all duration-200"
            :class="selectedCategory === category.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          >
            {{ category.name }}
            <span class="ml-2 text-xs opacity-75">
              ({{ getProductCountByCategory(category.id) }})
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="max-w-7xl mx-auto px-4 py-12">
      <div class="flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </div>

    <!-- Products Grid -->
    <div v-else-if="filteredProducts.length > 0" class="max-w-7xl mx-auto px-4 py-8">
      <!-- Products by category -->
      <div v-for="category in categoriesWithProducts" :key="category.id" class="mb-12">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">
          {{ category.name }}
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <PublicProductCard
            v-for="product in category.products"
            :key="product.id"
            :product="product"
            @click="handleProductClick"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="max-w-7xl mx-auto px-4 py-12">
      <div class="text-center">
        <div class="text-6xl mb-4">🍽️</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No hay productos disponibles</h3>
        <p class="text-gray-500">Por favor, vuelve más tarde o contacta al restaurante.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PublicProductCard from './PublicProductCard.vue'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  products: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['product-click'])

const selectedCategory = ref('all')

// All categories including "Todos"
const allCategories = computed(() => {
  return [
    { id: 'all', name: 'Todos' },
    ...props.categories
  ]
})

// Filter products by selected category
const filteredProducts = computed(() => {
  if (selectedCategory.value === 'all') {
    return props.products
  }

  return props.products.filter(p => p.category_id === selectedCategory.value)
})

// Group products by category for display
const categoriesWithProducts = computed(() => {
  if (selectedCategory.value !== 'all') {
    // Single category view
    const category = props.categories.find(c => c.id === selectedCategory.value)
    if (!category) return []

    return [{
      ...category,
      products: filteredProducts.value
    }]
  }

  // All categories view
  return props.categories
    .map(category => ({
      ...category,
      products: props.products.filter(p => p.category_id === category.id)
    }))
    .filter(category => category.products.length > 0)
})

function getProductCountByCategory(categoryId) {
  if (categoryId === 'all') {
    return props.products.length
  }

  return props.products.filter(p => p.category_id === categoryId).length
}

function handleProductClick(product) {
  emit('product-click', product)
}
</script>

<style scoped>
/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
