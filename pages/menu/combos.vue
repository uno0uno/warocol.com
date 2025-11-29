<template>
  <div class="page-layout">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      <SharedMetricCard
        title="Total Combos"
        :value="stats.total_combos"
        subtitle="Ofertas especiales"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Ahorro Total"
        :value="formatCurrency(stats.total_savings)"
        subtitle="Descuento ofrecido"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Margen Promedio"
        :value="`${stats.avg_margin}%`"
        subtitle="Rentabilidad"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Disponibles"
        :value="stats.available_combos"
        subtitle="Activos"
        variant="primary"
        :show-icon="false"
      />
    </div>

    <!-- Tabla de Combos -->
    <UiResponsiveDataView
      :columns="combosTableColumns"
      :data="filteredCombos"
      title="Gestión de Combos"
      empty-message="No hay combos registrados"
      empty-sub-message="Crea un nuevo combo para comenzar"
      variant="default"
    >
      <!-- Mobile Actions -->
      <template #mobileActions>
        <div class="flex flex-col gap-2">
          <div class="relative">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Buscar combo..."
              class="w-full pl-9 pr-3 py-2 border border-titan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:border-transparent text-sm"
            />
            <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
          </div>
          <button
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center"
          >
            + Nuevo Combo
          </button>
        </div>
      </template>

      <!-- Desktop Header -->
      <template #header>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h3 class="text-base sm:text-lg font-bold text-text-primary">
            Gestión de Combos
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
              <span class="hidden sm:inline">+ Nuevo Combo</span>
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

      <template #cell-precio_venta="{ value }">
        <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
      </template>

      <template #cell-ahorro="{ value }">
        <span class="text-sm font-semibold text-red-600">{{ formatCurrency(value) }}</span>
      </template>

      <template #cell-productos="{ row }">
        <div class="flex justify-center">
          <span class="text-sm font-semibold text-text-primary">
            {{ getComboItems(row.id).length }}
          </span>
        </div>
      </template>

      <template #cell-costo_calculado="{ value }">
        <span class="text-sm text-text-primary">{{ formatCurrency(value) }}</span>
      </template>

      <template #cell-margen="{ row }">
        <UiStatusBadge
          :value="`${row.margen_porcentaje}%`"
          format="text"
          :variant="row.margen_porcentaje > 100 ? 'success' : 'warning'"
          size="sm"
        />
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
            class="text-crocus-600 hover:text-crocus-900 transition-colors"
            title="Editar combo"
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
              <p class="font-semibold text-text-primary">{{ item.name }}</p>
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
                <p class="text-xs text-text-secondary">Precio Combo</p>
                <p class="text-sm font-semibold text-text-primary">
                  {{ formatCurrency(item.precio_venta) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-text-secondary">Precio Individual</p>
                <p class="text-sm text-text-secondary line-through">
                  {{ formatCurrency(item.precio_individual) }}
                </p>
              </div>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-xs text-text-secondary">Ahorro</span>
              <span class="text-sm font-semibold text-red-600">
                {{ formatCurrency(item.ahorro) }}
              </span>
            </div>

            <div class="flex justify-between items-center">
              <span class="text-xs text-text-secondary">Margen</span>
              <UiStatusBadge
                :value="`${item.margen_porcentaje}%`"
                format="text"
                :variant="item.margen_porcentaje > 100 ? 'success' : 'warning'"
                size="sm"
              />
            </div>

            <!-- Productos expandibles -->
            <div v-if="expandedRows.has(item.id)" class="pt-2 border-t border-border">
              <p class="text-xs font-semibold text-text-primary mb-2">Productos incluidos:</p>
              <div class="space-y-1.5">
                <div
                  v-for="prod in getComboItems(item.id)"
                  :key="prod.producto_id"
                  class="flex justify-between items-center text-xs"
                >
                  <div class="flex items-center gap-2 flex-1">
                    <span class="text-text-primary">
                      {{ prod.cantidad }}x {{ prod.producto_name }}
                    </span>
                  </div>
                  <div class="text-right">
                    <div class="text-text-secondary line-through text-xs">
                      {{ formatCurrency(prod.precio_individual) }}
                    </div>
                    <div class="text-text-primary font-medium">
                      {{ formatCurrency(prod.precio_en_combo) }}
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
              {{ expandedRows.has(item.id) ? 'Contraer' : 'Ver productos' }}
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
      v-for="combo in filteredCombos.filter(c => expandedRows.has(c.id))"
      :key="`expanded-${combo.id}`"
      class="hidden md:block bg-surface border border-border rounded-lg p-4 -mt-3"
    >
      <h4 class="text-sm font-semibold text-text-primary mb-3">
        Productos incluidos en "{{ combo.name }}"
      </h4>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-2 px-2 text-xs font-medium text-text-secondary">
                Producto
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Cantidad
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Precio Individual
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Precio en Combo
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Descuento
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Personalizable
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="prod in getComboItems(combo.id)"
              :key="prod.producto_id"
              class="border-b border-border last:border-0"
            >
              <td class="py-3 px-2 text-sm text-text-primary">
                {{ prod.producto_name }}
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-center">
                {{ prod.cantidad }}
              </td>
              <td class="py-3 px-2 text-sm text-text-secondary text-center line-through">
                {{ formatCurrency(prod.precio_individual) }}
              </td>
              <td class="py-3 px-2 text-sm font-semibold text-text-primary text-center">
                {{ formatCurrency(prod.precio_en_combo) }}
              </td>
              <td class="py-3 px-2 text-sm text-red-600 text-center">
                {{ formatCurrency(prod.descuento) }}
              </td>
              <td class="py-3 px-2 text-center">
                <UiStatusBadge
                  v-if="prod.es_personalizable"
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
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-border font-semibold">
              <td colspan="2" class="py-3 px-2 text-sm text-text-primary text-right">
                Total combo:
              </td>
              <td class="py-3 px-2 text-sm text-text-secondary text-center line-through">
                {{ formatCurrency(combo.precio_individual) }}
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-center">
                {{ formatCurrency(combo.precio_venta) }}
              </td>
              <td class="py-3 px-2 text-sm text-red-600 text-center">
                {{ formatCurrency(combo.ahorro) }}
              </td>
              <td></td>
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
const { combos, getComboItems } = useMenuMockData()

const searchQuery = ref('')
const expandedRows = ref(new Set())

const filteredCombos = computed(() => {
  return combos.value.filter(combo => {
    const matchesSearch = combo.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         combo.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesSearch
  })
})

const stats = computed(() => {
  const totalSavings = combos.value.reduce((sum, c) => sum + c.ahorro, 0)
  const avgMargin = combos.value.length > 0
    ? Math.round(combos.value.reduce((sum, c) => sum + c.margen_porcentaje, 0) / combos.value.length)
    : 0

  return {
    total_combos: combos.value.length,
    total_savings: totalSavings,
    avg_margin: avgMargin,
    available_combos: combos.value.filter(c => c.is_available).length
  }
})

// Table columns configuration
const combosTableColumns = [
  {
    key: 'name',
    title: 'Combo',
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
    key: 'ahorro',
    title: 'Ahorro',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'productos',
    title: 'Productos',
    sortable: false,
    format: 'number',
    align: 'center'
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const toggleExpanded = (comboId: number) => {
  if (expandedRows.value.has(comboId)) {
    expandedRows.value.delete(comboId)
  } else {
    expandedRows.value.add(comboId)
  }
  // Force reactivity
  expandedRows.value = new Set(expandedRows.value)
}

const setRefreshHandler = inject('setRefreshHandler', () => {})
const refresh = () => {
  console.log('Refreshing combos...')
}

onMounted(() => {
  setRefreshHandler(refresh)
})

onTenantChange(() => {
  refresh()
})
</script>
