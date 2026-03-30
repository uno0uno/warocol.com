<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <SharedFiltersBar
        :search="searchQuery"
        @update:search="searchQuery = $event"
        search-placeholder="Buscar grupo o producto..."
        @search="() => {}"
        @clear-filters="searchQuery = ''"
      />
      <HealthSemaphore :is-unlocked="true" title="Reglas y grupos de modificadores">
        <template #header-actions>
          <button
            @click="goToCreateGroup"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
          >
            <span class="hidden sm:inline">+ Nuevo Grupo</span>
            <span class="sm:hidden">+ Nuevo</span>
          </button>
        </template>
      <!-- Tabla de Grupos de Modificadores -->
      <UiResponsiveDataView
      :columns="gruposTableColumns"
      :data="filteredGroups"
      empty-message="No hay grupos de modificadores registrados"
      empty-sub-message="Crea un nuevo grupo para comenzar"
      variant="default"
      row-size="sm"
    >
      <!-- Desktop Table Cells -->
      <template #cell-name="{ value }">
        <div class="flex items-center">
          <div class="ml-2">
            <div class="text-sm font-bold text-ebony-800">{{ value }}</div>
          </div>
        </div>
      </template>

      <template #cell-products="{ row }">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="product in (row.products || []).slice(0, 3)"
            :key="product.id"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
          >
            {{ product.name }}
          </span>
          <span
            v-if="(row.products || []).length > 3"
            class="text-xs text-text-secondary"
          >
            +{{ row.products.length - 3 }} más
          </span>
          <span v-if="!row.products?.length" class="text-xs text-text-secondary">
            Sin productos
          </span>
        </div>
      </template>

      <template #cell-opciones="{ row }">
        <div class="flex justify-center">
          <span class="text-sm font-semibold text-text-primary">
            {{ getModificadoresByGrupo(row.id).length }}
          </span>
        </div>
      </template>

      <template #cell-min_qty="{ value }">
        <div class="flex justify-center">
          <span class="text-sm text-text-primary">{{ value }}</span>
        </div>
      </template>

      <template #cell-max_qty="{ value }">
        <div class="flex justify-center">
          <span class="text-sm text-text-primary">{{ value }}</span>
        </div>
      </template>

      <template #cell-tipo="{ row }">
        <div class="flex justify-center">
          <UiStatusBadge
            v-if="row.is_required"
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
            @click="goToEditGroup(row.id)"
            class="text-crocus-600 hover:text-crocus-900 transition-colors"
            title="Editar grupo"
          >
            <Icon name="heroicons:pencil-square" class="h-4 w-4" />
          </button>
        </div>
      </template>

      <!-- Mobile Card -->
      <template #card="{ item, index }">
        <div
          class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary cursor-pointer"
          :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          @click="goToEditGroup(item.id)"
        >
          <div class="flex-1 min-w-0">
            <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
            <p class="text-xs text-text-secondary mt-0.5">{{ getModificadoresByGrupo(item.id).length }} opciones · sel. {{ item.min_qty }}–{{ item.max_qty }}</p>
          </div>
          <UiStatusBadge
            :value="item.is_required ? 'Obligatorio' : 'Opcional'"
            format="text"
            :variant="item.is_required ? 'warning' : 'secondary'"
            size="sm"
          />
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
                    v-if="mod.is_default"
                    value="Por defecto"
                    format="text"
                    variant="default"
                    size="sm"
                  />
                </div>
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-center">
                <span :class="mod.price < 0 ? 'text-red-600' : 'text-green-600'">
                  {{ formatCurrency(mod.price) }}
                </span>
              </td>
              <td class="py-3 px-2 text-sm text-text-primary text-center">
                {{ mod.max_limit }}
              </td>
              <td class="py-3 px-2 text-center">
                <UiStatusBadge
                  :value="mod.is_available ? 'Activo' : 'Inactivo'"
                  format="text"
                  :variant="mod.is_available ? 'success' : 'destructive'"
                  size="sm"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    </HealthSemaphore>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Modificadores' })

const router = useRouter()
const { currentTenant } = useTenantReactive()

const searchQuery = ref('')
const expandedRows = ref(new Set())

// Fetch modifier groups from API
const { data: groupsData, status: groupsStatus, asyncStatus: groupsAsyncStatus, refetch: refetchGroups } = useQuery({
  key: () => ['menu', 'modifier-groups', currentTenant.value?.id],
  query: () => $fetch('/api/menu/modifier-groups', {
    params: { limit: 250 }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// Fetch stats from API
const { data: statsData, refetch: refetchStats } = useQuery({
  key: () => ['menu', 'modifier-stats', currentTenant.value?.id],
  query: () => $fetch('/api/menu/modifier-groups/stats/summary'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const filteredGroups = computed(() => {
  const groups = groupsData.value?.data || []
  if (!searchQuery.value) return groups

  const search = searchQuery.value.toLowerCase()
  return groups.filter((grupo: any) => {
    const matchesName = grupo.name.toLowerCase().includes(search)
    const matchesProducts = (grupo.products || []).some((p: any) =>
      p.name.toLowerCase().includes(search)
    )
    return matchesName || matchesProducts
  })
})

const stats = computed(() => {
  return {
    total_groups: statsData.value?.total_groups || 0,
    total_modifiers: statsData.value?.total_modifiers || 0,
    with_recipe: 0, // TODO: Add this to API if needed
    products_with_modifiers: statsData.value?.products_with_modifiers || 0
  }
})

const isLoading = computed(() => !groupsData.value)
const isRefreshing = computed(() => groupsAsyncStatus.value === 'loading' && groupsData.value != null)

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
    key: 'products',
    title: 'Productos',
    sortable: false,
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
    key: 'min_qty',
    title: 'Mín',
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'max_qty',
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

const toggleExpanded = (grupoId: string) => {
  if (expandedRows.value.has(grupoId)) {
    expandedRows.value.delete(grupoId)
  } else {
    expandedRows.value.add(grupoId)
  }
  // Force reactivity
  expandedRows.value = new Set(expandedRows.value)
}

const getModificadoresByGrupo = (grupoId: string) => {
  const grupo = filteredGroups.value.find((g: any) => g.id === grupoId)
  return grupo?.modifiers || []
}

const goToCreateGroup = () => {
  router.push('/menu/modificadores/crear')
}

const goToEditGroup = (groupId: string) => {
  router.push(`/menu/modificadores/${groupId}`)
}

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const handleRefresh = async () => {
  await Promise.all([refetchGroups(), refetchStats()])
}

onMounted(() => {
  setRefreshHandler(handleRefresh)
})
useMenuReturnRefresh('/menu/modificadores', handleRefresh)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(handleRefresh)
})

</script>
