<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  layout: 'dashboard'
})

const { onTenantChange } = useTenantReactive()

// Mock inventory data
const mockInventory = ref([
  { id: '1', name: 'Carne de res molida', current_stock: 15.5, minimum_stock: 20, maximum_stock: 50, unit: 'kg', cost: 40000, controla_inventario: true, status: 'low' },
  { id: '2', name: 'Pan para hamburguesa', current_stock: 150, minimum_stock: 50, maximum_stock: 300, unit: 'und', cost: 800, controla_inventario: true, status: 'ok' },
  { id: '3', name: 'Queso mozzarella', current_stock: 8, minimum_stock: 10, maximum_stock: 30, unit: 'kg', cost: 35000, controla_inventario: true, status: 'low' },
  { id: '4', name: 'Tomate', current_stock: 25, minimum_stock: 15, maximum_stock: 40, unit: 'kg', cost: 3500, controla_inventario: true, status: 'ok' },
  { id: '5', name: 'Lechuga', current_stock: 12, minimum_stock: 10, maximum_stock: 30, unit: 'kg', cost: 2800, controla_inventario: true, status: 'ok' },
  { id: '6', name: 'Aceite de oliva', current_stock: 3.2, minimum_stock: 5, maximum_stock: 15, unit: 'l', cost: 85000, controla_inventario: true, status: 'low' },
  { id: '7', name: 'Salsa especial', current_stock: 0, minimum_stock: 10, maximum_stock: 25, unit: 'l', cost: 45000, controla_inventario: true, status: 'critical' },
  { id: '8', name: 'Queso cheddar', current_stock: 18, minimum_stock: 8, maximum_stock: 25, unit: 'kg', cost: 38000, controla_inventario: true, status: 'ok' },
  { id: '9', name: 'Papas', current_stock: 45, minimum_stock: 30, maximum_stock: 80, unit: 'kg', cost: 2500, controla_inventario: true, status: 'ok' },
  { id: '10', name: 'Sal', current_stock: 5, minimum_stock: 2, maximum_stock: 10, unit: 'kg', cost: 1500, controla_inventario: false, status: 'ok' }
])

const searchQuery = ref('')
const statusFilter = ref('all')

const filteredInventory = computed(() => {
  return mockInventory.value.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = statusFilter.value === 'all' || item.status === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

const stats = computed(() => ({
  total: mockInventory.value.length,
  low_stock: mockInventory.value.filter(i => i.status === 'low').length,
  critical: mockInventory.value.filter(i => i.status === 'critical').length,
  total_value: mockInventory.value.reduce((sum, i) => sum + (i.current_stock * i.cost), 0)
}))

const getStockPercentage = (current: number, min: number, max: number) => {
  return Math.round((current / max) * 100)
}

const getStockVariant = (status: string) => {
  const variants = {
    critical: 'destructive',
    low: 'warning',
    ok: 'success'
  }
  return variants[status] || 'default'
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const setRefreshHandler = inject('setRefreshHandler', () => {})
const refresh = () => {
  console.log('Refreshing inventory...')
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
    <UiStats>
      <UiStatsCard
        label="Total Ingredientes"
        :value="stats.total"
        icon="beaker"
      />
      <UiStatsCard
        label="Stock Bajo"
        :value="stats.low_stock"
        icon="exclamation"
      />
      <UiStatsCard
        label="Stock Crítico"
        :value="stats.critical"
        icon="exclamation-circle"
      />
      <UiStatsCard
        label="Valor Total"
        :value="formatCurrency(stats.total_value)"
        icon="currency-dollar"
      />
    </UiStats>

    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <UiSearchBar
          v-model="searchQuery"
          placeholder="Buscar ingredientes..."
        />
      </div>
      <div class="w-full sm:w-48">
        <select
          v-model="statusFilter"
          class="w-full px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos los estados</option>
          <option value="critical">Crítico</option>
          <option value="low">Bajo</option>
          <option value="ok">Normal</option>
        </select>
      </div>
    </div>

    <!-- Desktop Table -->
    <div class="hidden md:block overflow-x-auto">
      <UiCard>
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-3 px-4 text-xs font-medium text-text-secondary">Ingrediente</th>
              <th class="text-right py-3 px-4 text-xs font-medium text-text-secondary">Stock Actual</th>
              <th class="text-right py-3 px-4 text-xs font-medium text-text-secondary">Stock Mín</th>
              <th class="text-right py-3 px-4 text-xs font-medium text-text-secondary">Stock Máx</th>
              <th class="text-center py-3 px-4 text-xs font-medium text-text-secondary">% Stock</th>
              <th class="text-right py-3 px-4 text-xs font-medium text-text-secondary">Costo Unit.</th>
              <th class="text-right py-3 px-4 text-xs font-medium text-text-secondary">Valor Total</th>
              <th class="text-center py-3 px-4 text-xs font-medium text-text-secondary">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredInventory"
              :key="item.id"
              class="border-b border-border last:border-0 hover:bg-surface-secondary transition-colors"
            >
              <td class="py-3 px-4">
                <p class="text-sm font-medium text-text-primary">{{ item.name }}</p>
                <p class="text-xs text-text-secondary">{{ item.unit }}</p>
              </td>
              <td class="py-3 px-4 text-right text-sm font-semibold text-text-primary">
                {{ item.current_stock }}
              </td>
              <td class="py-3 px-4 text-right text-sm text-text-primary">
                {{ item.minimum_stock }}
              </td>
              <td class="py-3 px-4 text-right text-sm text-text-primary">
                {{ item.maximum_stock }}
              </td>
              <td class="py-3 px-4 text-center">
                <div class="w-full bg-surface-secondary rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all"
                    :class="{
                      'bg-destructive': item.status === 'critical',
                      'bg-warning': item.status === 'low',
                      'bg-success': item.status === 'ok'
                    }"
                    :style="{ width: `${Math.min(getStockPercentage(item.current_stock, item.minimum_stock, item.maximum_stock), 100)}%` }"
                  />
                </div>
              </td>
              <td class="py-3 px-4 text-right text-sm text-text-primary">
                {{ formatCurrency(item.cost) }}
              </td>
              <td class="py-3 px-4 text-right text-sm font-medium text-text-primary">
                {{ formatCurrency(item.current_stock * item.cost) }}
              </td>
              <td class="py-3 px-4 text-center">
                <UiStatusBadge
                  :label="item.status === 'critical' ? 'Crítico' : item.status === 'low' ? 'Bajo' : 'Normal'"
                  :variant="getStockVariant(item.status)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </UiCard>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden space-y-3">
      <UiCard
        v-for="item in filteredInventory"
        :key="item.id"
        class="hover:shadow-lg transition-shadow"
      >
        <UiCardHeader>
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-base font-semibold text-text-primary">{{ item.name }}</h3>
              <p class="text-sm text-text-secondary">{{ item.unit }}</p>
            </div>
            <UiStatusBadge
              :label="item.status === 'critical' ? 'Crítico' : item.status === 'low' ? 'Bajo' : 'Normal'"
              :variant="getStockVariant(item.status)"
            />
          </div>
        </UiCardHeader>
        <UiCardContent class="space-y-3">
          <div class="grid grid-cols-3 gap-2">
            <div>
              <p class="text-xs text-text-secondary">Actual</p>
              <p class="text-lg font-bold text-text-primary">{{ item.current_stock }}</p>
            </div>
            <div>
              <p class="text-xs text-text-secondary">Mín</p>
              <p class="text-sm text-text-primary">{{ item.minimum_stock }}</p>
            </div>
            <div>
              <p class="text-xs text-text-secondary">Máx</p>
              <p class="text-sm text-text-primary">{{ item.maximum_stock }}</p>
            </div>
          </div>
          <div class="w-full bg-surface-secondary rounded-full h-2">
            <div
              class="h-2 rounded-full"
              :class="{
                'bg-destructive': item.status === 'critical',
                'bg-warning': item.status === 'low',
                'bg-success': item.status === 'ok'
              }"
              :style="{ width: `${getStockPercentage(item.current_stock, item.minimum_stock, item.maximum_stock)}%` }"
            />
          </div>
          <div class="flex justify-between pt-2 border-t border-border">
            <span class="text-sm text-text-secondary">Valor total:</span>
            <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(item.current_stock * item.cost) }}</span>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <div
      v-if="filteredInventory.length === 0"
      class="text-center py-12"
    >
      <Icon name="heroicons:beaker" class="h-16 w-16 mx-auto text-text-secondary mb-4" />
      <p class="text-text-secondary">No se encontraron ingredientes</p>
    </div>
  </div>
</template>
