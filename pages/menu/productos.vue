<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useProductsStore } from '@/stores/useProductsStore'

// Layout config
definePageMeta({
  layout: 'dashboard'
})

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Use products store
const productsStore = useProductsStore()

// Filters
const searchQuery = ref('')
const selectedCategory = ref('all')

// Computed
const categories = computed(() => {
  return ['all', ...productsStore.categories]
})

const filteredProducts = computed(() => {
  return productsStore.allProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = selectedCategory.value === 'all' || product.category === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

const stats = computed(() => ({
  total: productsStore.allProducts.length,
  available: productsStore.availableProducts.length,
  withStock: productsStore.allProducts.filter(p => p.controla_stock).length,
  combos: productsStore.allProducts.filter(p => p.is_combo).length
}))

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

// Calculate margin
const calculateMargin = (price: number, cost: number) => {
  if (!cost) return 0
  return Math.round(((price - cost) / cost) * 100)
}

// Navigation
const router = useRouter()

const editProduct = (product: any) => {
  router.push(`/menu/producto/${product.id}`)
}

const createProduct = () => {
  router.push('/menu/producto/crear')
}

// Refresh handler
const setRefreshHandler = inject('setRefreshHandler', () => {})
const refresh = () => {
  // Reload from storage or API
  console.log('Refreshing products...')
}

onMounted(() => {
  setRefreshHandler(refresh)
})

// Tenant change handler
onTenantChange(() => {
  refresh()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Stats -->
    <UiStats>
      <UiStatsCard
        label="Total Productos"
        :value="stats.total"
        icon="cube"
      />
      <UiStatsCard
        label="Disponibles"
        :value="stats.available"
        icon="check-circle"
      />
      <UiStatsCard
        label="Con Control Stock"
        :value="stats.withStock"
        icon="chart-bar"
      />
      <UiStatsCard
        label="Combos"
        :value="stats.combos"
        icon="gift"
      />
    </UiStats>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <UiSearchBar
          v-model="searchQuery"
          placeholder="Buscar productos..."
        />
      </div>
      <div class="w-full sm:w-48">
        <select
          v-model="selectedCategory"
          class="w-full px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todas las categorías</option>
          <option
            v-for="cat in categories.filter(c => c !== 'all')"
            :key="cat"
            :value="cat"
          >
            {{ cat }}
          </option>
        </select>
      </div>
    </div>

    <!-- Action Button -->
    <div class="flex justify-end">
      <UiButton variant="default" size="default" class="gap-2" @click="createProduct">
        <Icon name="heroicons:plus" class="h-5 w-5" />
        Nuevo Producto
      </UiButton>
    </div>

    <!-- Products List -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UiCard
        v-for="product in filteredProducts"
        :key="product.id"
        class="hover:shadow-lg transition-shadow cursor-pointer"
        @click="editProduct(product)"
      >
        <UiCardHeader>
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-text-primary">
                {{ product.name }}
              </h3>
              <p class="text-sm text-text-secondary mt-1">
                {{ product.description }}
              </p>
            </div>
            <UiStatusBadge
              v-if="product.is_combo"
              label="Combo"
              variant="secondary"
            />
          </div>
        </UiCardHeader>

        <UiCardContent class="space-y-3">
          <!-- Category -->
          <div class="flex items-center gap-2 text-sm text-text-secondary">
            <Icon name="heroicons:tag" class="h-4 w-4" />
            <span>{{ product.category }}</span>
          </div>

          <!-- Price and Cost -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-text-secondary">Precio</p>
              <p class="text-lg font-semibold text-text-primary">
                {{ formatCurrency(product.price) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-text-secondary">Costo</p>
              <p class="text-lg font-medium text-text-primary">
                {{ formatCurrency(product.costo_calculado) }}
              </p>
            </div>
          </div>

          <!-- Margin -->
          <div>
            <p class="text-xs text-text-secondary mb-1">Margen</p>
            <UiStatusBadge
              :label="`${calculateMargin(product.price, product.costo_calculado)}%`"
              :variant="calculateMargin(product.price, product.costo_calculado) > 50 ? 'success' : 'warning'"
            />
          </div>

          <!-- Badges -->
          <div class="flex flex-wrap gap-2 pt-2 border-t border-border">
            <UiStatusBadge
              v-if="product.controla_stock"
              label="Control Stock"
              variant="default"
            />
            <UiStatusBadge
              v-if="product.is_available"
              label="Disponible"
              variant="success"
            />
            <UiStatusBadge
              v-else
              label="No disponible"
              variant="destructive"
            />
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredProducts.length === 0"
      class="text-center py-12"
    >
      <Icon name="heroicons:cube" class="h-16 w-16 mx-auto text-text-secondary mb-4" />
      <p class="text-text-secondary">No se encontraron productos</p>
    </div>
  </div>
</template>
