<template>
  <div class="page-layout">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      <SharedMetricCard
        title="Total Productos"
        :value="stats.total"
        subtitle="En el catálogo"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Disponibles"
        :value="stats.available"
        subtitle="Listos para vender"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Con Control Stock"
        :value="stats.withStock"
        subtitle="Control de inventario"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Combos"
        :value="stats.combos"
        subtitle="Ofertas especiales"
        variant="primary"
        :show-icon="false"
      />
    </div>

    <!-- Tabla de Productos -->
    <UiResponsiveDataView
      :columns="productosTableColumns"
      :data="filteredProducts"
      title="Catálogo de Productos"
      empty-message="No hay productos registrados"
      empty-sub-message="Crea un nuevo producto para comenzar"
      variant="default"
    >
      <!-- Mobile Actions -->
      <template #mobileActions>
        <div class="flex flex-col gap-2">
          <div class="relative">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Buscar..."
              class="w-full pl-9 pr-3 py-2 border border-titan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:border-transparent text-sm"
            />
            <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
          </div>
          <select
            v-model="selectedCategory"
            class="w-full px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring text-sm"
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
          <button
            @click="createProduct"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center"
          >
            + Nuevo Producto
          </button>
        </div>
      </template>

      <!-- Desktop Header -->
      <template #header>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h3 class="text-base sm:text-lg font-bold text-text-primary">
            Catálogo de Productos
          </h3>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div class="relative flex-1 sm:flex-initial">
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Buscar..."
                class="w-full pl-9 pr-3 py-2 border border-titan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:border-transparent text-sm"
              />
              <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
            </div>
            <select
              v-model="selectedCategory"
              class="w-full sm:w-48 px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring text-sm"
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
            <button
              @click="createProduct"
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
            >
              <span class="hidden sm:inline">+ Nuevo Producto</span>
              <span class="sm:hidden">+ Nuevo</span>
            </button>
          </div>
        </div>
      </template>

      <!-- Desktop Table Cells -->
      <template #cell-name="{ value }">
        <div class="flex items-center">
          <div class="ml-2">
            <div class="text-sm font-bold text-ebony-800">{{ value }}</div>
          </div>
        </div>
      </template>

      <template #cell-category="{ value }">
        <span class="text-sm text-text-primary">{{ value }}</span>
      </template>

      <template #cell-precio_venta="{ value }">
        <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
      </template>

      <template #cell-costo_calculado="{ value }">
        <span class="text-sm text-text-primary">{{ formatCurrency(value) }}</span>
      </template>

      <template #cell-margen="{ row }">
        <UiStatusBadge
          :value="`${calculateMargin(row.precio_venta, row.costo_calculado)}%`"
          format="text"
          :variant="calculateMargin(row.precio_venta, row.costo_calculado) > 100 ? 'success' : 'warning'"
          size="sm"
        />
      </template>

      <template #cell-controla_stock="{ value }">
        <div class="flex justify-center">
          <UiStatusBadge
            v-if="value"
            value="Sí"
            format="text"
            variant="success"
            size="sm"
          />
          <UiStatusBadge
            v-else
            value="No"
            format="text"
            variant="secondary"
            size="sm"
          />
        </div>
      </template>

      <template #cell-is_available="{ value }">
        <div class="flex justify-center">
          <UiStatusBadge
            :value="value ? 'Disponible' : 'No disponible'"
            format="text"
            :variant="value ? 'success' : 'destructive'"
            size="sm"
          />
        </div>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex justify-center">
          <button
            @click="editProduct(row)"
            class="text-crocus-600 hover:text-crocus-900 transition-colors"
            title="Editar producto"
          >
            <Icon name="heroicons:pencil-square" class="h-4 w-4" />
          </button>
        </div>
      </template>

      <!-- Mobile Card -->
      <template #card="{ item }">
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <p class="font-semibold text-text-primary">{{ item.name }}</p>
                <UiStatusBadge
                  v-if="item.is_combo"
                  value="Combo"
                  format="text"
                  variant="default"
                  size="sm"
                />
              </div>
              <p class="text-xs text-text-secondary mt-1">{{ item.category }}</p>
            </div>
            <UiStatusBadge
              :value="item.is_available ? 'Disponible' : 'No disponible'"
              format="text"
              :variant="item.is_available ? 'success' : 'destructive'"
              size="sm"
            />
          </div>

          <div class="space-y-2">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-text-secondary">Precio</p>
                <p class="text-sm font-semibold text-text-primary">
                  {{ formatCurrency(item.precio_venta) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-text-secondary">Costo</p>
                <p class="text-sm text-text-primary">
                  {{ formatCurrency(item.costo_calculado) }}
                </p>
              </div>
            </div>

            <div>
              <p class="text-xs text-text-secondary mb-1">Margen</p>
              <UiStatusBadge
                :value="`${calculateMargin(item.precio_venta, item.costo_calculado)}%`"
                format="text"
                :variant="calculateMargin(item.precio_venta, item.costo_calculado) > 100 ? 'success' : 'warning'"
                size="sm"
              />
            </div>

            <div class="flex flex-wrap gap-2 pt-2 border-t border-border">
              <UiStatusBadge
                v-if="item.controla_stock"
                value="Control Stock"
                format="text"
                variant="default"
                size="sm"
              />
              <UiStatusBadge
                v-if="item.allow_modifiers"
                value="Modificadores"
                format="text"
                variant="default"
                size="sm"
              />
            </div>
          </div>

          <div class="flex gap-2 mt-3">
            <button
              @click="editProduct(item)"
              class="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Editar
            </button>
          </div>
        </div>
      </template>
    </UiResponsiveDataView>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useMenuMockData } from '@/composables/useMenuMockData'

definePageMeta({
  layout: 'dashboard'
})

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Get mock data from composable
const { productos } = useMenuMockData()

// Filters
const searchQuery = ref('')
const selectedCategory = ref('all')

// Computed
const categories = computed(() => {
  const cats = new Set(productos.value.map(p => p.category))
  return ['all', ...Array.from(cats)]
})

const filteredProducts = computed(() => {
  return productos.value.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = selectedCategory.value === 'all' || product.category === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

const stats = computed(() => ({
  total: productos.value.length,
  available: productos.value.filter(p => p.is_available).length,
  withStock: productos.value.filter(p => p.controla_stock).length,
  combos: productos.value.filter(p => p.is_combo).length
}))

// Table columns configuration
const productosTableColumns = [
  {
    key: 'name',
    title: 'Producto',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'category',
    title: 'Categoría',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'precio_venta',
    title: 'Precio',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'costo_calculado',
    title: 'Costo',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'margen',
    title: 'Margen',
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'controla_stock',
    title: 'Control Stock',
    sortable: true,
    format: 'boolean',
    align: 'center'
  },
  {
    key: 'is_available',
    title: 'Estado',
    sortable: true,
    format: 'boolean',
    align: 'center'
  },
  {
    key: 'actions',
    title: 'Acciones',
    sortable: false,
    format: 'text',
    align: 'center'
  }
]

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
