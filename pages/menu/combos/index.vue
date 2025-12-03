<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else>
      <!-- Tabla de Combos -->
      <UiResponsiveDataView
        :columns="combosTableColumns"
        :data="filteredCombos"
        title="Combos"
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
              @click="goToCreateCombo"
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
              Combos
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
                @click="goToCreateCombo"
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

        <template #cell-price="{ value }">
          <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-items_count="{ row }">
          <div class="flex justify-center">
            <span class="text-sm font-semibold text-text-primary">
              {{ row.items?.length || 0 }}
            </span>
          </div>
        </template>

        <template #cell-savings="{ row }">
          <div class="flex justify-center">
            <span class="text-sm font-semibold text-green-600">
              {{ formatCurrency(row.total_savings || 0) }}
            </span>
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
          <div class="flex justify-center gap-2">
            <button
              @click="goToEditCombo(row.id)"
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
                <p class="text-xs text-text-secondary mt-1">{{ item.description }}</p>
              </div>
              <UiStatusBadge
                :value="item.is_available ? 'Disponible' : 'No disponible'"
                format="text"
                :variant="item.is_available ? 'success' : 'destructive'"
                size="sm"
              />
            </div>

            <div class="space-y-2">
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <p class="text-xs text-text-secondary">Precio</p>
                  <p class="text-sm font-semibold text-text-primary">
                    {{ formatCurrency(item.price) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-text-secondary">Items</p>
                  <p class="text-sm font-semibold text-text-primary">
                    {{ item.items?.length || 0 }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-text-secondary">Ahorro</p>
                  <p class="text-sm font-semibold text-green-600">
                    {{ formatCurrency(item.total_savings || 0) }}
                  </p>
                </div>
              </div>

              <!-- Items expandibles -->
              <div v-if="expandedRows.has(item.id)" class="pt-2 border-t border-border">
                <p class="text-xs font-semibold text-text-primary mb-2">Productos incluidos:</p>
                <div class="space-y-1.5">
                  <div
                    v-for="comboItem in item.items"
                    :key="comboItem.id"
                    class="flex justify-between items-center text-xs"
                  >
                    <div class="flex items-center gap-2 flex-1">
                      <span class="text-text-primary">{{ comboItem.product_name }}</span>
                      <span class="text-text-secondary">x{{ comboItem.quantity }}</span>
                    </div>
                    <div class="text-right">
                      <div class="text-text-primary font-medium">
                        {{ formatCurrency(comboItem.combo_price) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex gap-2 mt-3">
              <button
                v-if="item.items && item.items.length > 0"
                @click="toggleExpanded(item.id)"
                class="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
              >
                {{ expandedRows.has(item.id) ? 'Contraer' : 'Ver items' }}
              </button>
              <button
                @click="goToEditCombo(item.id)"
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
          Items del combo "{{ combo.name }}"
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
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in combo.items"
                :key="item.id"
                class="border-b border-border last:border-0"
              >
                <td class="py-3 px-2 text-sm text-text-primary">
                  {{ item.product_name }}
                </td>
                <td class="py-3 px-2 text-sm text-text-primary text-center">
                  {{ item.quantity }}
                </td>
                <td class="py-3 px-2 text-sm text-text-primary text-center">
                  {{ formatCurrency(item.individual_price) }}
                </td>
                <td class="py-3 px-2 text-sm text-green-600 text-center font-semibold">
                  {{ formatCurrency(item.combo_price) }}
                </td>
                <td class="py-3 px-2 text-sm text-text-primary text-center">
                  {{ formatCurrency(item.discount_amount || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  layout: 'dashboard'
})

const router = useRouter()
const { onTenantChange, currentTenant } = useTenantReactive()

const searchQuery = ref('')
const expandedRows = ref(new Set())

// Fetch combos from API
const { data: combosData, refresh: refreshCombos, pending: combosPending } = useAsyncData(
  `combos-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/combos', {
    query: {
      limit: 250,
      search: searchQuery.value || undefined
    }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [], total: 0 })
  }
)

const filteredCombos = computed(() => {
  const combos = combosData.value?.data || []
  if (!searchQuery.value) return combos

  return combos.filter((combo: any) => {
    const matchesSearch = combo.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         (combo.description && combo.description.toLowerCase().includes(searchQuery.value.toLowerCase()))
    return matchesSearch
  })
})

const isLoading = computed(() => {
  return combosPending.value
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
    key: 'price',
    title: 'Precio',
    sortable: true,
    format: 'currency',
    align: 'left'
  },
  {
    key: 'items_count',
    title: 'Items',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'savings',
    title: 'Ahorro',
    sortable: true,
    format: 'currency',
    align: 'center'
  },
  {
    key: 'is_available',
    title: 'Estado',
    sortable: true,
    format: 'text',
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

const toggleExpanded = (comboId: string) => {
  if (expandedRows.value.has(comboId)) {
    expandedRows.value.delete(comboId)
  } else {
    expandedRows.value.add(comboId)
  }
  // Force reactivity
  expandedRows.value = new Set(expandedRows.value)
}

const goToCreateCombo = () => {
  router.push('/menu/combos/crear')
}

const goToEditCombo = (comboId: string) => {
  router.push(`/menu/combos/${comboId}`)
}

const setRefreshHandler = inject('setRefreshHandler', () => {})
const refresh = async () => {
  await refreshCombos()
}

onMounted(async () => {
  setRefreshHandler(refresh)
  await refresh()
})

onTenantChange(() => {
  refresh()
})
</script>
