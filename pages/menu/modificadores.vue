<template>
  <div class="page-layout">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      <SharedMetricCard
        title="Grupos Totales"
        :value="stats.total_groups"
        subtitle="Grupos de modificadores"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Total Modificadores"
        :value="stats.total_modifiers"
        subtitle="Opciones disponibles"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Con Receta"
        :value="stats.with_recipe"
        subtitle="Tienen ingredientes"
        variant="primary"
        :show-icon="false"
      />
      <SharedMetricCard
        title="Productos Asociados"
        :value="stats.products_with_modifiers"
        subtitle="Con modificadores"
        variant="primary"
        :show-icon="false"
      />
    </div>

    <!-- Tabla de Grupos de Modificadores -->
    <UiResponsiveDataView
      :columns="gruposTableColumns"
      :data="filteredGroups"
      title="Grupos de Modificadores"
      empty-message="No hay grupos de modificadores registrados"
      empty-sub-message="Crea un nuevo grupo para comenzar"
      variant="default"
    >
      <!-- Mobile Actions -->
      <template #mobileActions>
        <div class="flex flex-col gap-2">
          <div class="relative">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Buscar grupo o producto..."
              class="w-full pl-9 pr-3 py-2 border border-titan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:border-transparent text-sm"
            />
            <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
          </div>
          <button
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center"
          >
            + Nuevo Grupo
          </button>
        </div>
      </template>

      <!-- Desktop Header -->
      <template #header>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h3 class="text-base sm:text-lg font-bold text-text-primary">
            Grupos de Modificadores
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
              <span class="hidden sm:inline">+ Nuevo Grupo</span>
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

      <template #cell-producto_name="{ value }">
        <span class="text-sm text-text-primary">{{ value }}</span>
      </template>

      <template #cell-opciones="{ row }">
        <div class="flex justify-center">
          <span class="text-sm font-semibold text-text-primary">
            {{ getModificadoresByGrupo(row.id).length }}
          </span>
        </div>
      </template>

      <template #cell-min_seleccion="{ value }">
        <div class="flex justify-center">
          <span class="text-sm text-text-primary">{{ value }}</span>
        </div>
      </template>

      <template #cell-max_seleccion="{ value }">
        <div class="flex justify-center">
          <span class="text-sm text-text-primary">{{ value }}</span>
        </div>
      </template>

      <template #cell-tipo="{ row }">
        <div class="flex justify-center">
          <UiStatusBadge
            v-if="row.es_obligatorio"
            value="Obligatorio"
            format="text"
            variant="warning"
            size="sm"
          />
          <UiStatusBadge
            v-else
            value="Opcional"
            format="text"
            variant="secondary"
            size="sm"
          />
        </div>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex justify-center">
          <button
            class="text-crocus-600 hover:text-crocus-900 transition-colors"
            title="Editar grupo"
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
              <p class="text-xs text-text-secondary mt-1">{{ item.producto_name }}</p>
            </div>
            <UiStatusBadge
              :value="item.es_obligatorio ? 'Obligatorio' : 'Opcional'"
              format="text"
              :variant="item.es_obligatorio ? 'warning' : 'secondary'"
              size="sm"
            />
          </div>

          <div class="space-y-2">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-text-secondary">Opciones</p>
                <p class="text-sm font-semibold text-text-primary">
                  {{ getModificadoresByGrupo(item.id).length }}
                </p>
              </div>
              <div>
                <p class="text-xs text-text-secondary">Selección</p>
                <p class="text-sm text-text-primary">
                  {{ item.min_seleccion }} - {{ item.max_seleccion }}
                </p>
              </div>
            </div>

            <!-- Modificadores expandibles -->
            <div v-if="expandedRows.has(item.id)" class="pt-2 border-t border-border">
              <p class="text-xs font-semibold text-text-primary mb-2">Modificadores:</p>
              <div class="space-y-1.5">
                <div
                  v-for="mod in getModificadoresByGrupo(item.id)"
                  :key="mod.id"
                  class="flex justify-between items-center text-xs"
                >
                  <div class="flex items-center gap-2 flex-1">
                    <span class="text-text-primary">{{ mod.name }}</span>
                    <UiStatusBadge
                      v-if="mod.tiene_receta"
                      value="Receta"
                      format="text"
                      variant="success"
                      size="sm"
                    />
                  </div>
                  <div class="text-right">
                    <div class="text-text-primary font-medium">
                      {{ formatCurrency(mod.precio_adicional) }}
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
              {{ expandedRows.has(item.id) ? 'Contraer' : 'Ver modificadores' }}
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
      v-for="grupo in filteredGroups.filter(g => expandedRows.has(g.id))"
      :key="`expanded-${grupo.id}`"
      class="hidden md:block bg-surface border border-border rounded-lg p-4 -mt-3"
    >
      <h4 class="text-sm font-semibold text-text-primary mb-3">
        Modificadores del grupo "{{ grupo.name }}"
      </h4>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-2 px-2 text-xs font-medium text-text-secondary">
                Modificador
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Precio Adicional
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Tiene Receta
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Costo Ingredientes
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Max Cantidad
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="mod in getModificadoresByGrupo(grupo.id)"
              :key="mod.id"
              class="border-b border-border last:border-0"
            >
              <td class="py-3 px-2 text-sm text-text-primary">
                <div class="flex items-center gap-2">
                  {{ mod.name }}
                  <UiStatusBadge
                    v-if="mod.es_predeterminado"
                    value="Por defecto"
                    format="text"
                    variant="default"
                    size="sm"
                  />
                </div>
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-center">
                <span :class="mod.precio_adicional < 0 ? 'text-red-600' : 'text-green-600'">
                  {{ formatCurrency(mod.precio_adicional) }}
                </span>
              </td>
              <td class="py-3 px-2 text-center">
                <UiStatusBadge
                  v-if="mod.tiene_receta"
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
              <td class="py-3 px-2 text-sm text-text-primary text-center">
                <template v-if="mod.tiene_receta">
                  {{ formatCurrency(getRecetaModificador(mod.id)?.costo_total || 0) }}
                </template>
                <template v-else>
                  <span class="text-text-tertiary">-</span>
                </template>
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-center">
                {{ mod.max_cantidad }}
              </td>
              <td class="py-3 px-2 text-center">
                <UiStatusBadge
                  :value="mod.esta_disponible ? 'Activo' : 'Inactivo'"
                  format="text"
                  :variant="mod.esta_disponible ? 'success' : 'destructive'"
                  size="sm"
                />
              </td>
            </tr>
          </tbody>
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
const {
  gruposModificadores,
  modificadores,
  getModificadoresByGrupo,
  getRecetaModificador
} = useMenuMockData()

const searchQuery = ref('')
const expandedRows = ref(new Set())

const filteredGroups = computed(() => {
  return gruposModificadores.value.filter(grupo => {
    const matchesSearch = grupo.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         grupo.producto_name.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchesSearch
  })
})

const stats = computed(() => {
  const totalModifiers = modificadores.value.length
  const withRecipe = modificadores.value.filter(m => m.tiene_receta).length
  const uniqueProducts = new Set(gruposModificadores.value.map(g => g.producto_id)).size

  return {
    total_groups: gruposModificadores.value.length,
    total_modifiers: totalModifiers,
    with_recipe: withRecipe,
    products_with_modifiers: uniqueProducts
  }
})

// Table columns configuration
const gruposTableColumns = [
  {
    key: 'name',
    title: 'Grupo',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'producto_name',
    title: 'Producto',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'opciones',
    title: 'Opciones',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'min_seleccion',
    title: 'Mín',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'max_seleccion',
    title: 'Máx',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'tipo',
    title: 'Tipo',
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

const toggleExpanded = (grupoId: number) => {
  if (expandedRows.value.has(grupoId)) {
    expandedRows.value.delete(grupoId)
  } else {
    expandedRows.value.add(grupoId)
  }
  // Force reactivity
  expandedRows.value = new Set(expandedRows.value)
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
