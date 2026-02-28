<template>
  <div class="w-full">
    <!-- Categories Filter -->
    <div v-if="categories.length > 0" class="sticky top-0 z-20 bg-background border-b border-border">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="category in allCategories"
            :key="category.id"
            @click="selectedCategory = category.id"
            class="px-4 py-2 min-h-[44px] rounded-xl font-medium whitespace-nowrap transition-all duration-200"
            :class="selectedCategory === category.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground hover:bg-secondary'"
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
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>

    <!-- Closed Banner -->
    <div v-if="!restaurantOpen" class="max-w-7xl mx-auto px-4 pt-6">
      <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
        <span>🔒</span>
        <span>El restaurante está cerrado temporalmente. Puedes explorar el menú pero no se pueden realizar pedidos.</span>
      </div>
    </div>

    <!-- Products Grid -->
    <div v-if="!isLoading && filteredProducts.length > 0" class="max-w-7xl mx-auto px-4 py-8">
      <!-- Products by category -->
      <div v-for="category in categoriesWithProducts" :key="category.id" class="mb-12">
        <h2 class="font-bold text-foreground mb-6">
          {{ category.name }}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <PublicProductCard
            v-for="product in category.products"
            :key="product.id"
            :product="product"
            :restaurant-closed="!restaurantOpen"
            @click="handleProductClick"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && filteredProducts.length === 0" class="max-w-7xl mx-auto px-4 py-12">
      <div class="text-center">
        <div class="text-6xl mb-4">🍽️</div>
        <h3 class="text-xl font-semibold text-foreground mb-2">No hay productos disponibles</h3>
        <p class="text-muted-foreground">Por favor, vuelve más tarde o contacta al restaurante.</p>
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
  },
  restaurantOpen: {
    type: Boolean,
    default: true
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
