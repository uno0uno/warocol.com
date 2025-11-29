<template>
  <div class="page-layout">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      <SharedMetricCard
        title="Total Recetas"
        :value="stats.total_recipes"
        subtitle="Recetas creadas"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Ingredientes Únicos"
        :value="stats.total_ingredients"
        subtitle="En todas las recetas"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Costo Promedio"
        :value="formatCurrency(stats.avg_cost)"
        subtitle="Por receta"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Con Inventario"
        :value="stats.ingredients_with_inventory"
        subtitle="Ingredientes controlados"
        variant="primary"
        :show-icon="false"
      />
    </div>

    <!-- Tabla de Recetas -->
    <UiResponsiveDataView
      :columns="recetasTableColumns"
      :data="filteredRecipes"
      title="Gestión de Recetas"
      empty-message="No hay recetas registradas"
      empty-sub-message="Crea una nueva receta para comenzar"
      variant="default"
    >
      <!-- Mobile Actions -->
      <template #mobileActions>
        <div class="flex flex-col gap-2">
          <div class="relative">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Buscar por producto o ingrediente..."
              class="w-full pl-9 pr-3 py-2 border border-titan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:border-transparent text-sm"
            />
            <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
          </div>
          <button
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center"
          >
            + Nueva Receta
          </button>
        </div>
      </template>

      <!-- Desktop Header -->
      <template #header>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h3 class="text-base sm:text-lg font-bold text-text-primary">
            Gestión de Recetas
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
            <button
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
            >
              <span class="hidden sm:inline">+ Nueva Receta</span>
              <span class="sm:hidden">+ Nueva</span>
            </button>
          </div>
        </div>
      </template>

      <!-- Desktop Table Cells -->
      <template #cell-producto_name="{ value }">
        <div class="flex items-center">
          <div class="ml-2">
            <div class="text-sm font-bold text-ebony-800">{{ value }}</div>
          </div>
        </div>
      </template>

      <template #cell-ingredientes_count="{ row }">
        <div class="flex justify-center">
          <span class="text-sm font-semibold text-text-primary">{{ row.ingredientes.length }}</span>
        </div>
      </template>

      <template #cell-con_inventario="{ row }">
        <div class="flex justify-center">
          <span class="text-sm text-text-primary">
            {{ row.ingredientes.filter(i => i.controla_inventario).length }}
          </span>
        </div>
      </template>

      <template #cell-costo_total="{ value }">
        <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
      </template>

      <template #cell-rendimiento="{ value }">
        <div class="flex justify-center">
          <span class="text-sm text-text-primary">{{ value }}</span>
        </div>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex justify-center">
          <button
            class="text-crocus-600 hover:text-crocus-900 transition-colors"
            title="Editar receta"
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
              <p class="font-semibold text-text-primary">{{ item.producto_name }}</p>
              <div class="flex items-center gap-2 mt-1">
                <p class="text-xs text-text-secondary">
                  {{ item.ingredientes.length }} ingredientes
                </p>
                <span class="text-text-tertiary">•</span>
                <p class="text-xs text-text-secondary">
                  {{ item.rendimiento }} porción(es)
                </p>
              </div>
            </div>
            <UiStatusBadge
              value="Receta"
              format="text"
              variant="default"
              size="sm"
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-text-secondary">Costo Total</span>
              <span class="text-sm font-semibold text-text-primary">
                {{ formatCurrency(item.costo_total) }}
              </span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-xs text-text-secondary">Con Inventario</span>
              <span class="text-sm text-text-primary">
                {{ item.ingredientes.filter(i => i.controla_inventario).length }} de {{ item.ingredientes.length }}
              </span>
            </div>

            <!-- Ingredientes expandibles -->
            <div v-if="expandedRows.has(item.id)" class="pt-2 border-t border-border">
              <p class="text-xs font-semibold text-text-primary mb-2">Ingredientes:</p>
              <div class="space-y-1.5">
                <div
                  v-for="ing in item.ingredientes"
                  :key="ing.ingrediente_id"
                  class="flex justify-between items-center text-xs"
                >
                  <div class="flex items-center gap-2 flex-1">
                    <span class="text-text-primary">{{ ing.ingrediente_name }}</span>
                    <UiStatusBadge
                      v-if="ing.controla_inventario"
                      value="Stock"
                      format="text"
                      variant="success"
                      size="sm"
                    />
                  </div>
                  <div class="text-right">
                    <div class="text-text-secondary">
                      {{ ing.cantidad }} {{ ing.unidad }}
                    </div>
                    <div class="text-text-primary font-medium">
                      {{ formatCurrency(ing.costo_total) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-3">
            <button
              @click="toggleExpanded(item.id)"
              class="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              {{ expandedRows.has(item.id) ? 'Contraer' : 'Ver ingredientes' }}
            </button>
            <button
              class="px-3 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Editar
            </button>
          </div>
        </div>
      </template>
    </UiResponsiveDataView>

    <!-- Detalles expandidos (solo desktop) -->
    <div
      v-for="recipe in filteredRecipes.filter(r => expandedRows.has(r.id))"
      :key="`expanded-${recipe.id}`"
      class="hidden md:block bg-surface border border-border rounded-lg p-4 -mt-3"
    >
      <h4 class="text-sm font-semibold text-text-primary mb-3">
        Ingredientes de {{ recipe.producto_name }}
      </h4>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-2 px-2 text-xs font-medium text-text-secondary">
                Ingrediente
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Control Stock
              </th>
              <th class="text-right py-2 px-2 text-xs font-medium text-text-secondary">
                Cantidad
              </th>
              <th class="text-right py-2 px-2 text-xs font-medium text-text-secondary">
                Costo Unitario
              </th>
              <th class="text-right py-2 px-2 text-xs font-medium text-text-secondary">
                Costo Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ing in recipe.ingredientes"
              :key="ing.ingrediente_id"
              class="border-b border-border last:border-0"
            >
              <td class="py-3 px-2 text-sm text-text-primary">
                {{ ing.ingrediente_name }}
              </td>
              <td class="py-3 px-2 text-center">
                <UiStatusBadge
                  v-if="ing.controla_inventario"
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
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-right">
                {{ ing.cantidad }} {{ ing.unidad }}
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-right">
                {{ formatCurrency(ing.costo_unitario) }}
              </td>
              <td class="py-3 px-2 text-sm font-medium text-text-primary text-right">
                {{ formatCurrency(ing.costo_total) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-border font-semibold">
              <td colspan="4" class="py-3 px-2 text-sm text-text-primary text-right">
                Total:
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-right">
                {{ formatCurrency(recipe.costo_total) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useMenuMockData } from '@/composables/useMenuMockData'

definePageMeta({
  layout: 'dashboard'
})

const { onTenantChange, currentTenant } = useTenantReactive()

// Get mock data from composable
const { recetas } = useMenuMockData()

const searchQuery = ref('')
const expandedRows = ref(new Set())

const filteredRecipes = computed(() => {
  return recetas.value.filter(recipe => {
    const matchesSearch = recipe.producto_name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         recipe.ingredientes.some(ing => ing.ingrediente_name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    return matchesSearch
  })
})

const stats = computed(() => {
  const totalIngredientes = new Set(recetas.value.flatMap(r => r.ingredientes.map(i => i.ingrediente_id))).size
  const avgCost = recetas.value.length > 0
    ? Math.round(recetas.value.reduce((sum, r) => sum + r.costo_total, 0) / recetas.value.length)
    : 0

  const conInventario = recetas.value.reduce((sum, r) =>
    sum + r.ingredientes.filter(ing => ing.controla_inventario).length, 0
  )

  return {
    total_recipes: recetas.value.length,
    total_ingredients: totalIngredientes,
    avg_cost: avgCost,
    ingredients_with_inventory: conInventario
  }
})

// Table columns configuration
const recetasTableColumns = [
  {
    key: 'producto_name',
    title: 'Producto',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'ingredientes_count',
    title: 'Ingredientes',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'con_inventario',
    title: 'Con Stock',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'costo_total',
    title: 'Costo Total',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'rendimiento',
    title: 'Rendimiento',
    sortable: true,
    format: 'number',
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const toggleExpanded = (recipeId: number) => {
  if (expandedRows.value.has(recipeId)) {
    expandedRows.value.delete(recipeId)
  } else {
    expandedRows.value.add(recipeId)
  }
  // Force reactivity
  expandedRows.value = new Set(expandedRows.value)
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
