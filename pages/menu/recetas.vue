<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  layout: 'dashboard'
})

const { onTenantChange, currentTenant } = useTenantReactive()

// Mock data - recipes with ingredients
const mockRecipes = ref([
  {
    id: '1',
    product_name: 'Hamburguesa Clásica',
    product_id: '1',
    total_cost: 8500,
    ingredients: [
      { id: '1', name: 'Carne de res molida', quantity: 150, unit: 'g', cost_per_unit: 40, total_cost: 6000 },
      { id: '2', name: 'Pan para hamburguesa', quantity: 1, unit: 'und', cost_per_unit: 800, total_cost: 800 },
      { id: '3', name: 'Lechuga', quantity: 20, unit: 'g', cost_per_unit: 10, total_cost: 200 },
      { id: '4', name: 'Tomate', quantity: 30, unit: 'g', cost_per_unit: 15, total_cost: 450 },
      { id: '5', name: 'Cebolla', quantity: 20, unit: 'g', cost_per_unit: 8, total_cost: 160 },
      { id: '6', name: 'Queso cheddar', quantity: 30, unit: 'g', cost_per_unit: 30, total_cost: 900 }
    ]
  },
  {
    id: '2',
    product_name: 'Pizza Margherita',
    product_id: '2',
    total_cost: 12000,
    ingredients: [
      { id: '7', name: 'Masa de pizza', quantity: 250, unit: 'g', cost_per_unit: 12, total_cost: 3000 },
      { id: '8', name: 'Salsa de tomate', quantity: 100, unit: 'ml', cost_per_unit: 20, total_cost: 2000 },
      { id: '9', name: 'Queso mozzarella', quantity: 150, unit: 'g', cost_per_unit: 35, total_cost: 5250 },
      { id: '10', name: 'Albahaca fresca', quantity: 10, unit: 'g', cost_per_unit: 50, total_cost: 500 },
      { id: '11', name: 'Aceite de oliva', quantity: 15, unit: 'ml', cost_per_unit: 80, total_cost: 1200 }
    ]
  },
  {
    id: '3',
    product_name: 'Limonada Natural',
    product_id: '3',
    total_cost: 1500,
    ingredients: [
      { id: '12', name: 'Limón', quantity: 3, unit: 'und', cost_per_unit: 300, total_cost: 900 },
      { id: '13', name: 'Azúcar', quantity: 50, unit: 'g', cost_per_unit: 5, total_cost: 250 },
      { id: '14', name: 'Agua', quantity: 500, unit: 'ml', cost_per_unit: 0.5, total_cost: 250 },
      { id: '15', name: 'Hielo', quantity: 100, unit: 'g', cost_per_unit: 1, total_cost: 100 }
    ]
  }
])

const searchQuery = ref('')
const selectedProduct = ref<string | null>(null)

const filteredRecipes = computed(() => {
  return mockRecipes.value.filter(recipe => {
    const matchesSearch = recipe.product_name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    const matchesProduct = !selectedProduct.value || recipe.product_id === selectedProduct.value
    return matchesSearch && matchesProduct
  })
})

const stats = computed(() => ({
  total_recipes: mockRecipes.value.length,
  total_ingredients: new Set(mockRecipes.value.flatMap(r => r.ingredients.map(i => i.id))).size,
  avg_cost: Math.round(mockRecipes.value.reduce((sum, r) => sum + r.total_cost, 0) / mockRecipes.value.length),
  avg_ingredients: Math.round(mockRecipes.value.reduce((sum, r) => sum + r.ingredients.length, 0) / mockRecipes.value.length)
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
  console.log('Refreshing recipes...')
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
        label="Total Recetas"
        :value="stats.total_recipes"
        icon="document-text"
      />
      <UiStatsCard
        label="Ingredientes Únicos"
        :value="stats.total_ingredients"
        icon="beaker"
      />
      <UiStatsCard
        label="Costo Promedio"
        :value="formatCurrency(stats.avg_cost)"
        icon="currency-dollar"
      />
      <UiStatsCard
        label="Ingredientes/Receta"
        :value="stats.avg_ingredients"
        icon="chart-bar"
      />
    </UiStats>

    <!-- Search -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <UiSearchBar
          v-model="searchQuery"
          placeholder="Buscar por producto o ingrediente..."
        />
      </div>
      <UiButton variant="default" size="default" class="gap-2">
        <Icon name="heroicons:plus" class="h-5 w-5" />
        Nueva Receta
      </UiButton>
    </div>

    <!-- Recipes List -->
    <div class="space-y-4">
      <UiCard
        v-for="recipe in filteredRecipes"
        :key="recipe.id"
        class="hover:shadow-lg transition-shadow"
      >
        <UiCardHeader>
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-lg font-semibold text-text-primary">
                {{ recipe.product_name }}
              </h3>
              <p class="text-sm text-text-secondary mt-1">
                {{ recipe.ingredients.length }} ingredientes
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs text-text-secondary">Costo Total</p>
              <p class="text-xl font-bold text-text-primary">
                {{ formatCurrency(recipe.total_cost) }}
              </p>
            </div>
          </div>
        </UiCardHeader>

        <UiCardContent>
          <!-- Ingredients Table -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-2 px-2 text-xs font-medium text-text-secondary">
                    Ingrediente
                  </th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-text-secondary">
                    Cantidad
                  </th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-text-secondary">
                    Costo Unit.
                  </th>
                  <th class="text-right py-2 px-2 text-xs font-medium text-text-secondary">
                    Costo Total
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="ingredient in recipe.ingredients"
                  :key="ingredient.id"
                  class="border-b border-border last:border-0"
                >
                  <td class="py-3 px-2 text-sm text-text-primary">
                    {{ ingredient.name }}
                  </td>
                  <td class="py-3 px-2 text-sm text-text-primary text-right">
                    {{ ingredient.quantity }} {{ ingredient.unit }}
                  </td>
                  <td class="py-3 px-2 text-sm text-text-primary text-right">
                    {{ formatCurrency(ingredient.cost_per_unit) }}
                  </td>
                  <td class="py-3 px-2 text-sm font-medium text-text-primary text-right">
                    {{ formatCurrency(ingredient.total_cost) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredRecipes.length === 0"
      class="text-center py-12"
    >
      <Icon name="heroicons:document-text" class="h-16 w-16 mx-auto text-text-secondary mb-4" />
      <p class="text-text-secondary">No se encontraron recetas</p>
    </div>
  </div>
</template>
