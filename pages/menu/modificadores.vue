<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  layout: 'dashboard'
})

const { onTenantChange } = useTenantReactive()

// Mock modifier groups (Rappi-style)
const mockModifierGroups = ref([
  {
    id: '1',
    product_name: 'Hamburguesa Clásica',
    name: 'Tamaño',
    min_qty: 1,
    max_qty: 1,
    is_required: true,
    modifiers: [
      { id: '1', name: 'Pequeña', price: 0, is_available: true },
      { id: '2', name: 'Mediana', price: 3000, is_available: true },
      { id: '3', name: 'Grande', price: 5000, is_available: true }
    ]
  },
  {
    id: '2',
    product_name: 'Hamburguesa Clásica',
    name: 'Extras',
    min_qty: 0,
    max_qty: 5,
    is_required: false,
    modifiers: [
      { id: '4', name: 'Queso extra', price: 2000, is_available: true },
      { id: '5', name: 'Tocineta', price: 3000, is_available: true },
      { id: '6', name: 'Huevo', price: 2500, is_available: true },
      { id: '7', name: 'Aguacate', price: 3500, is_available: true },
      { id: '8', name: 'Pepinillos', price: 1000, is_available: true }
    ]
  },
  {
    id: '3',
    product_name: 'Hamburguesa Clásica',
    name: 'Punto de la carne',
    min_qty: 1,
    max_qty: 1,
    is_required: true,
    modifiers: [
      { id: '9', name: 'Término medio', price: 0, is_available: true },
      { id: '10', name: 'Tres cuartos', price: 0, is_available: true },
      { id: '11', name: 'Bien cocida', price: 0, is_available: true }
    ]
  },
  {
    id: '4',
    product_name: 'Pizza Margherita',
    name: 'Tamaño',
    min_qty: 1,
    max_qty: 1,
    is_required: true,
    modifiers: [
      { id: '12', name: 'Personal (8")', price: 0, is_available: true },
      { id: '13', name: 'Mediana (12")', price: 8000, is_available: true },
      { id: '14', name: 'Familiar (16")', price: 15000, is_available: true }
    ]
  },
  {
    id: '5',
    product_name: 'Pizza Margherita',
    name: 'Ingredientes adicionales',
    min_qty: 0,
    max_qty: 10,
    is_required: false,
    modifiers: [
      { id: '15', name: 'Champiñones', price: 3000, is_available: true },
      { id: '16', name: 'Pimentón', price: 2500, is_available: true },
      { id: '17', name: 'Aceitunas', price: 2000, is_available: true },
      { id: '18', name: 'Pepperoni', price: 4000, is_available: true }
    ]
  }
])

const searchQuery = ref('')
const selectedProduct = ref('all')

const products = computed(() => {
  const prods = new Set(mockModifierGroups.value.map(g => g.product_name))
  return ['all', ...Array.from(prods)]
})

const filteredGroups = computed(() => {
  return mockModifierGroups.value.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         group.product_name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         group.modifiers.some(m => m.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    const matchesProduct = selectedProduct.value === 'all' || group.product_name === selectedProduct.value
    return matchesSearch && matchesProduct
  })
})

const stats = computed(() => ({
  total_groups: mockModifierGroups.value.length,
  total_modifiers: mockModifierGroups.value.reduce((sum, g) => sum + g.modifiers.length, 0),
  required_groups: mockModifierGroups.value.filter(g => g.is_required).length,
  products_with_modifiers: new Set(mockModifierGroups.value.map(g => g.product_name)).size
}))

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const setRefreshHandler = inject('setRefreshHandler', () => {})
const refresh = () => {
  console.log('Refreshing modifiers...')
}

onMounted(() => {
  setRefreshHandler(refresh)
})

onTenantChange(() => {
  refresh()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Stats -->
    <UiStats>
      <UiStatsCard
        label="Grupos de Modificadores"
        :value="stats.total_groups"
        icon="folder"
      />
      <UiStatsCard
        label="Total Modificadores"
        :value="stats.total_modifiers"
        icon="adjustments"
      />
      <UiStatsCard
        label="Grupos Obligatorios"
        :value="stats.required_groups"
        icon="exclamation-circle"
      />
      <UiStatsCard
        label="Productos Configurados"
        :value="stats.products_with_modifiers"
        icon="cube"
      />
    </UiStats>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <UiSearchBar
          v-model="searchQuery"
          placeholder="Buscar grupos o modificadores..."
        />
      </div>
      <div class="w-full sm:w-64">
        <select
          v-model="selectedProduct"
          class="w-full px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los productos</option>
          <option
            v-for="prod in products.filter(p => p !== 'all')"
            :key="prod"
            :value="prod"
          >
            {{ prod }}
          </option>
        </select>
      </div>
      <UiButton variant="default" size="default" class="gap-2">
        <Icon name="heroicons:plus" class="h-5 w-5" />
        Nuevo Grupo
      </UiButton>
    </div>

    <!-- Modifier Groups List -->
    <div class="space-y-4">
      <UiCard
        v-for="group in filteredGroups"
        :key="group.id"
        class="hover:shadow-lg transition-shadow"
      >
        <UiCardHeader>
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold text-text-primary">
                  {{ group.name }}
                </h3>
                <UiStatusBadge
                  v-if="group.is_required"
                  label="Obligatorio"
                  variant="destructive"
                />
              </div>
              <p class="text-sm text-text-secondary mt-1">
                {{ group.product_name }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs text-text-secondary">Selección</p>
              <p class="text-sm font-medium text-text-primary">
                {{ group.min_qty }} - {{ group.max_qty }}
              </p>
            </div>
          </div>
        </UiCardHeader>

        <UiCardContent>
          <!-- Modifiers Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="modifier in group.modifiers"
              :key="modifier.id"
              class="flex items-center justify-between p-3 border border-border rounded-lg bg-surface-secondary"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-2 h-2 rounded-full"
                  :class="modifier.is_available ? 'bg-success' : 'bg-destructive'"
                />
                <div>
                  <p class="text-sm font-medium text-text-primary">
                    {{ modifier.name }}
                  </p>
                  <p
                    v-if="modifier.price > 0"
                    class="text-xs text-text-secondary"
                  >
                    +{{ formatCurrency(modifier.price) }}
                  </p>
                  <p
                    v-else
                    class="text-xs text-text-secondary"
                  >
                    Sin cargo
                  </p>
                </div>
              </div>
              <UiStatusBadge
                v-if="!modifier.is_available"
                label="No disponible"
                variant="destructive"
              />
            </div>
          </div>

          <!-- Summary -->
          <div class="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
            <span class="text-text-secondary">
              {{ group.modifiers.length }} opciones
            </span>
            <span class="text-text-secondary">
              Rango de precio: {{ formatCurrency(0) }} - {{ formatCurrency(Math.max(...group.modifiers.map(m => m.price))) }}
            </span>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredGroups.length === 0"
      class="text-center py-12"
    >
      <Icon name="heroicons:adjustments" class="h-16 w-16 mx-auto text-text-secondary mb-4" />
      <p class="text-text-secondary">No se encontraron grupos de modificadores</p>
    </div>
  </div>
</template>
