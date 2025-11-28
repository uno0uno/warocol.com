<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  layout: 'dashboard'
})

const { onTenantChange } = useTenantReactive()

const mockCombos = ref([
  {
    id: '1',
    name: 'Combo Hamburguesa + Bebida',
    description: 'Hamburguesa clásica + bebida a elección',
    combo_price: 18000,
    individual_total: 20000,
    discount: 2000,
    is_available: true,
    items: [
      { product_name: 'Hamburguesa Clásica', quantity: 1, price: 15000 },
      { product_name: 'Bebida', quantity: 1, price: 5000 }
    ]
  },
  {
    id: '2',
    name: 'Combo Familiar Pizza',
    description: 'Pizza familiar + 4 bebidas + papas',
    combo_price: 45000,
    individual_total: 52000,
    discount: 7000,
    is_available: true,
    items: [
      { product_name: 'Pizza Margherita Grande', quantity: 1, price: 35000 },
      { product_name: 'Bebida', quantity: 4, price: 5000 },
      { product_name: 'Papas Fritas', quantity: 1, price: 7000 }
    ]
  },
  {
    id: '3',
    name: 'Combo Ejecutivo',
    description: 'Hamburguesa + papas + bebida + postre',
    combo_price: 22000,
    individual_total: 27000,
    discount: 5000,
    is_available: true,
    items: [
      { product_name: 'Hamburguesa Clásica', quantity: 1, price: 15000 },
      { product_name: 'Papas Fritas', quantity: 1, price: 7000 },
      { product_name: 'Bebida', quantity: 1, price: 5000 },
      { product_name: 'Postre del día', quantity: 1, price: 0 }
    ]
  }
])

const searchQuery = ref('')

const filteredCombos = computed(() => {
  return mockCombos.value.filter(combo => {
    return combo.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
           combo.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
           combo.items.some(item => item.product_name.toLowerCase().includes(searchQuery.value.toLowerCase()))
  })
})

const stats = computed(() => ({
  total: mockCombos.value.length,
  available: mockCombos.value.filter(c => c.is_available).length,
  total_savings: mockCombos.value.reduce((sum, c) => sum + c.discount, 0),
  avg_discount: Math.round(mockCombos.value.reduce((sum, c) => sum + ((c.discount / c.individual_total) * 100), 0) / mockCombos.value.length)
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
  console.log('Refreshing combos...')
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
        label="Total Combos"
        :value="stats.total"
        icon="gift"
      />
      <UiStatsCard
        label="Disponibles"
        :value="stats.available"
        icon="check-circle"
      />
      <UiStatsCard
        label="Ahorro Total"
        :value="formatCurrency(stats.total_savings)"
        icon="tag"
      />
      <UiStatsCard
        label="Descuento Promedio"
        :value="`${stats.avg_discount}%`"
        icon="percent-badge"
      />
    </UiStats>

    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <UiSearchBar
          v-model="searchQuery"
          placeholder="Buscar combos..."
        />
      </div>
      <UiButton variant="default" size="default" class="gap-2">
        <Icon name="heroicons:plus" class="h-5 w-5" />
        Nuevo Combo
      </UiButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UiCard
        v-for="combo in filteredCombos"
        :key="combo.id"
        class="hover:shadow-lg transition-shadow"
      >
        <UiCardHeader>
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <Icon name="heroicons:gift" class="h-5 w-5 text-primary" />
                <h3 class="text-lg font-semibold text-text-primary">
                  {{ combo.name }}
                </h3>
              </div>
              <p class="text-sm text-text-secondary mt-1">
                {{ combo.description }}
              </p>
            </div>
            <UiStatusBadge
              v-if="combo.is_available"
              label="Disponible"
              variant="success"
            />
          </div>
        </UiCardHeader>

        <UiCardContent class="space-y-4">
          <!-- Items -->
          <div class="space-y-2">
            <p class="text-xs font-medium text-text-secondary uppercase">Incluye:</p>
            <div
              v-for="(item, idx) in combo.items"
              :key="idx"
              class="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm text-text-primary">{{ item.quantity }}x</span>
                <span class="text-sm text-text-primary">{{ item.product_name }}</span>
              </div>
              <span class="text-sm text-text-secondary">
                {{ formatCurrency(item.price * item.quantity) }}
              </span>
            </div>
          </div>

          <!-- Pricing -->
          <div class="pt-3 border-t-2 border-border space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-secondary">Precio individual:</span>
              <span class="text-text-secondary line-through">{{ formatCurrency(combo.individual_total) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-secondary">Descuento:</span>
              <UiStatusBadge
                :label="`-${formatCurrency(combo.discount)}`"
                variant="success"
              />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold text-text-primary">Precio combo:</span>
              <span class="text-2xl font-bold text-primary">{{ formatCurrency(combo.combo_price) }}</span>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <div
      v-if="filteredCombos.length === 0"
      class="text-center py-12"
    >
      <Icon name="heroicons:gift" class="h-16 w-16 mx-auto text-text-secondary mb-4" />
      <p class="text-text-secondary">No se encontraron combos</p>
    </div>
  </div>
</template>
