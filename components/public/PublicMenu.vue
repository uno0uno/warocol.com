<template>
  <div class="w-full">
    <!-- Search + categories -->
    <div v-if="categories.length > 0 || products.length > 0" class="sticky top-0 z-20 bg-background border-b border-border">
      <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
        <UiSearchBar
          v-model="searchQuery"
          placeholder="Buscar en el menú..."
          class="w-full"
        />
        <div class="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            v-for="category in allCategories"
            :key="category.id"
            @click="selectedCategory = category.id"
            class="px-4 py-2 min-h-[44px] rounded-xl font-medium whitespace-nowrap transition-all duration-200"
            :class="selectedCategory === category.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-action-secondary-bg text-action-secondary-text hover:bg-action-secondary-hover-bg'"
          >
            {{ category.name }}
            <span class="ms-2 text-xs opacity-75">
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

    <!-- Online ordering disabled banner — takes priority over closed banner -->
    <div v-if="!acceptsOnlineOrders" class="max-w-7xl mx-auto px-4 pt-6">
      <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
        <span>📋</span>
        <span>Este restaurante no recibe pedidos en línea actualmente. Puedes ver el menú o contactar al restaurante.</span>
      </div>
    </div>

    <!-- Online ordering unavailable by quota or another public-safe backend reason -->
    <div v-else-if="!onlineOrdersAvailable" class="max-w-7xl mx-auto px-4 pt-6">
      <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
        <span>📋</span>
        <span>{{ onlineOrdersUnavailableMessage || 'Este restaurante no puede recibir pedidos en línea actualmente.' }}</span>
      </div>
    </div>

    <!-- Closed Banner — only shown when accepting orders but currently closed -->
    <div v-else-if="!restaurantOpen" class="max-w-7xl mx-auto px-4 pt-6">
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
            :restaurant-closed="!ordersAvailable"
            @click="handleProductClick"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && filteredProducts.length === 0" class="max-w-7xl mx-auto px-4 py-12">
      <div class="text-center">
        <div class="text-6xl mb-4">{{ hasSearch ? '🔍' : '🍽️' }}</div>
        <h3 class="text-xl font-semibold text-foreground mb-2">
          {{ hasSearch ? 'Sin resultados' : 'No hay productos disponibles' }}
        </h3>
        <p class="text-muted-foreground">
          <template v-if="hasSearch">
            No encontramos productos para «{{ searchQuery.trim() }}». Prueba otro nombre o
            <button
              type="button"
              class="text-primary font-medium underline underline-offset-2"
              @click="searchQuery = ''"
            >
              borra la búsqueda
            </button>.
          </template>
          <template v-else>
            Por favor, vuelve más tarde o contacta al restaurante.
          </template>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import PublicProductCard from './PublicProductCard.vue'
import { useLocalProductSearch } from '~/composables/useLocalProductSearch'

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
  },
  acceptsOnlineOrders: {
    type: Boolean,
    default: true
  },
  onlineOrdersAvailable: {
    type: Boolean,
    default: true
  },
  onlineOrdersUnavailableMessage: {
    type: String,
    default: ''
  },
  /** When set, overrides acceptsOnlineOrders for add-to-cart gating (Table QR #713). */
  orderingEnabled: {
    type: Boolean,
    default: undefined
  }
})

const emit = defineEmits(['product-click'])

const selectedCategory = ref('all')

const { searchQuery, hasSearch, searchFilteredProducts } = useLocalProductSearch(
  toRef(() => props.products as Array<{ name?: string; description?: string; category_id?: string }>),
)

// Combined gate for add-to-cart. Table QR passes orderingEnabled explicitly.
const ordersAvailable = computed(() => {
  if (props.orderingEnabled !== undefined) {
    return props.restaurantOpen && props.orderingEnabled
  }
  return props.restaurantOpen && props.acceptsOnlineOrders && props.onlineOrdersAvailable
})

// All categories including "Todos"
const allCategories = computed(() => {
  return [
    { id: 'all', name: 'Todos' },
    ...props.categories
  ]
})

// Filter by search (local) then category
const filteredProducts = computed(() => {
  const base = searchFilteredProducts.value
  if (selectedCategory.value === 'all') {
    return base
  }

  return base.filter(p => p.category_id === selectedCategory.value)
})

// Group products by category for display
const categoriesWithProducts = computed(() => {
  const base = searchFilteredProducts.value

  if (selectedCategory.value !== 'all') {
    const category = props.categories.find(c => c.id === selectedCategory.value)
    if (!category) return []

    return [{
      ...category,
      products: filteredProducts.value,
    }]
  }

  return props.categories
    .map(category => ({
      ...category,
      products: base.filter(p => p.category_id === category.id),
    }))
    .filter(category => category.products.length > 0)
})

function getProductCountByCategory(categoryId: string) {
  const base = searchFilteredProducts.value
  if (categoryId === 'all') {
    return base.length
  }

  return base.filter(p => p.category_id === categoryId).length
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
