<template>
  <div class="flex flex-col gap-2 md:gap-3">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-2 md:gap-3">
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        :search-fields="[]"
        :search-placeholder="t('menu.modificadores.searchPlaceholder')"
        :show-date-range="false"
        :show-clear="hasActiveModificadoresFilters"
        @search="performSearch"
        @clear="onClearModificadoresFilters"
      >
        <template #trailing>
          <button
            type="button"
            :title="t('menu.modificadores.newGroup')"
            class="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-shell-cta-bg px-4 py-2 text-center text-sm font-medium text-shell-cta-text whitespace-nowrap transition-all hover:bg-shell-cta-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-cta-focus-ring"
            @click="goToCreateGroup"
          >
            <Icon name="heroicons:plus" class="h-4 w-4 flex-shrink-0" />
            <span class="hidden sm:inline">{{ t('menu.modificadores.newGroup') }}</span>
            <span class="sm:hidden">{{ t('menu.modificadores.newShort') }}</span>
          </button>
        </template>
      </UiAdvancedFiltersBar>
      <!-- Tabla de Grupos de Modificadores -->
      <UiResponsiveDataView
        :columns="gruposTableColumns"
        :data="modifierGroups"
        :empty-message="t('menu.modificadores.empty')"
        :empty-sub-message="t('menu.modificadores.emptySub')"
        variant="default"
        row-size="xs"
      >
      <template #header-tipo>
        <UiTableHeaderFilter
          v-model="requiredFilter"
          :title="t('menu.modificadores.type')"
          filter-type="select"
          :options="requiredHeaderOptions"
          :all-label="t('menu.modificadores.all')"
          align="center"
        />
      </template>

      <!-- Desktop Table Cells -->
      <template #cell-name="{ value }">
        <div class="flex items-center">
          <div class="ms-2">
            <div class="text-sm font-semibold text-text-primary">{{ value }}</div>
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
            {{ t('menu.modificadores.moreProducts', { count: row.products.length - 3 }) }}
          </span>
          <span v-if="!row.products?.length" class="text-xs text-text-secondary">
            {{ t('menu.modificadores.noProducts') }}
          </span>
        </div>
      </template>

      <template #cell-opciones="{ row }">
        <div
          v-for="chipState in [getGroupOptionChipState(row.id)]"
          :key="row.id"
          class="flex flex-wrap gap-1.5 max-w-[260px]"
        >
          <span
            v-for="option in chipState.visible"
            :key="option"
            class="inline-flex max-w-full items-center rounded-full border border-badge-primary-border bg-badge-primary-bg px-2 py-0.5 text-[11px] font-medium leading-4 text-badge-primary-text"
            :title="option"
          >
            <span class="whitespace-normal break-words">{{ option }}</span>
          </span>
          <span
            v-if="chipState.moreCount > 0"
            class="text-xs text-text-secondary"
          >
            {{ t('menu.modificadores.moreOptions', { count: chipState.moreCount }) }}
          </span>
          <span v-if="chipState.empty" class="text-xs text-text-secondary">
            {{ t('menu.modificadores.noOptions') }}
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
            :value="t('menu.modificadores.required')"
            format="text"
            variant="warning"
            size="sm"
          />
          <UiStatusBadge
            v-else
            :value="t('menu.modificadores.optional')"
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
            class="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-text-secondary transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring"
            :title="t('menu.modificadores.editGroup')"
          >
            <Icon name="heroicons:pencil-square" class="h-4 w-4" />
          </button>
        </div>
      </template>

      <!-- Mobile Card -->
      <template #card="{ item, index }">
        <div
          class="flex items-center gap-3 py-2 px-3 border-b border-border transition-colors hover:bg-surface-secondary cursor-pointer"
          :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          @click="goToEditGroup(item.id)"
        >
          <div class="flex-1 min-w-0">
            <span class="text-sm font-semibold text-text-primary">{{ item.name }}</span>
            <p class="text-xs text-text-secondary mt-0.5 truncate">
              {{ getModificadoresByGrupo(item.id).length }} {{ t('menu.modificadores.optionsCount') }} · {{ t('menu.modificadores.selectionShort') }} {{ item.min_qty }}–{{ item.max_qty }}
              <span v-if="formatGroupOptionsSummary(item.id)"> · {{ formatGroupOptionsSummary(item.id) }}</span>
            </p>
          </div>
          <UiStatusBadge
            :value="item.is_required ? t('menu.modificadores.required') : t('menu.modificadores.optional')"
            format="text"
            :variant="item.is_required ? 'warning' : 'secondary'"
            size="sm"
          />
        </div>
      </template>
    </UiResponsiveDataView>

    <div
      v-if="(groupsData?.total ?? 0) > 0"
      class="flex flex-col gap-2 px-1 py-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="relative flex items-center gap-2">
        <label for="menu-modificadores-page-size" class="text-sm text-text-secondary whitespace-nowrap">
          {{ t('menu.common.rowsPerPage') }}
        </label>
        <div class="relative">
          <select
            id="menu-modificadores-page-size"
            :value="itemsPerPage"
            class="min-h-[36px] min-w-[4.75rem] appearance-none bg-none rounded-lg border border-border bg-surface ps-2.5 pe-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring cursor-pointer [&::-ms-expand]:hidden"
            style="-webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: none;"
            @change="onItemsPerPageChange"
          >
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
          <svg
            class="pointer-events-none absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      <template v-if="(groupsData?.total ?? 0) > itemsPerPage">
      <div class="flex flex-1 justify-between sm:hidden">
        <button
          @click="previousPage"
          :disabled="!canGoPrevious"
          :class="[
            'relative inline-flex min-h-[36px] items-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
            canGoPrevious ? 'text-text-secondary hover:bg-surface-secondary' : 'text-text-secondary cursor-not-allowed opacity-40'
          ]">
          {{ t('menu.modificadores.previous') }}
        </button>
        <button
          @click="nextPage"
          :disabled="!canGoNext"
          :class="[
            'ms-2 relative inline-flex min-h-[36px] items-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
            canGoNext ? 'text-text-secondary hover:bg-surface-secondary' : 'text-text-secondary cursor-not-allowed opacity-40'
          ]">
          {{ t('menu.modificadores.next') }}
        </button>
      </div>
      <div class="hidden sm:flex sm:items-center sm:justify-end">
          <nav class="relative z-0 inline-flex items-center gap-1" :aria-label="t('menu.modificadores.pagination')">
            <button
              @click="previousPage"
              :disabled="!canGoPrevious"
              :class="[
                'relative inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                canGoPrevious ? 'text-text-secondary hover:bg-surface-secondary' : 'text-text-secondary cursor-not-allowed opacity-40'
              ]">
              <span class="sr-only">{{ t('menu.modificadores.previous') }}</span>
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ currentPage }}</span>
            <button
              @click="nextPage"
              :disabled="!canGoNext"
              :class="[
                'relative inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
                canGoNext ? 'text-text-secondary hover:bg-surface-secondary' : 'text-text-secondary cursor-not-allowed opacity-40'
              ]">
              <span class="sr-only">{{ t('menu.modificadores.next') }}</span>
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
      </div>
      </template>
    </div>

    <!-- Detalles expandidos (solo desktop) -->
    <div
      v-for="grupo in modifierGroups.filter(g => expandedRows.has(g.id))"
      :key="`expanded-${grupo.id}`"
      class="hidden md:block bg-surface border border-border rounded-lg p-4 -mt-3"
    >
      <h4 class="text-sm font-semibold text-text-primary mb-3">
        {{ t('menu.modificadores.expandedTitle', { name: grupo.name }) }}
      </h4>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-start py-2 px-2 text-xs font-medium text-text-secondary">
                {{ t('menu.modificadores.modifier') }}
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                {{ t('menu.modificadores.additionalPrice') }}
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                {{ t('menu.modificadores.maxQuantity') }}
              </th>
              <th class="text-center py-2 px-2 text-xs font-medium text-text-secondary">
                {{ t('menu.modificadores.status') }}
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
                    :value="t('menu.modificadores.default')"
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
                  :value="mod.is_available ? t('menu.modificadores.active') : t('menu.modificadores.inactive')"
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
    </div>

    <UiConfirmActionModal
      v-model="quotaLimitModalOpen"
      :title="t('billing.upgrade.quotaBlocked')"
      :message="quotaLimitModalMessage"
      :confirm-label="t('nav.miPlan')"
      :cancel-label="t('billing.close')"
      @confirm="goToBillingFromQuotaLimitModal"
      @cancel="closeQuotaLimitModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useTenantReactive } from '@/composables/useTenantReactive'
const { t } = useI18n({ useScope: 'global' })
const { formatCurrency } = useFormatters()

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
  module: 'menu',
})

useHead({ title: () => t('menu.head.modificadores') })

const router = useRouter()
const { currentTenant } = useTenantReactive()
const {
  handleModifiersCreateClick,
  quotaLimitModalOpen,
  quotaLimitModalMessage,
  closeQuotaLimitModal,
  goToBillingFromQuotaLimitModal,
  ensureBillingOverview,
} = useMenuCatalogQuotaGate()

const {
  localSearchTerm,
  appliedSearch,
  clearFilters: clearModificadoresFilters,
  hasActiveFilters,
} = useMenuModificadoresFilters()

const currentPage = ref(1)
const itemsPerPage = ref(20)
const pageSizeOptions = [10, 20, 30] as const

const onItemsPerPageChange = (event: Event) => {
  const next = Number((event.target as HTMLSelectElement).value)
  if (!(pageSizeOptions as readonly number[]).includes(next)) return
  itemsPerPage.value = next
  currentPage.value = 1
}
const expandedRows = ref(new Set())
const requiredFilter = ref<'required' | 'optional' | ''>('')
const requiredHeaderOptions = computed(() => [
  { label: t('menu.modificadores.required'), value: 'required' },
  { label: t('menu.modificadores.optional'), value: 'optional' },
])
const isRequiredFilter = computed(() => {
  if (requiredFilter.value === 'required') return true
  if (requiredFilter.value === 'optional') return false
  return null
})
const hasActiveModificadoresFilters = computed(() => hasActiveFilters.value || !!requiredFilter.value)

watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })
watch(requiredFilter, () => { currentPage.value = 1 })

const performSearch = () => {
  appliedSearch.value = localSearchTerm.value.trim()
  currentPage.value = 1
}

const onClearModificadoresFilters = () => {
  clearModificadoresFilters()
  requiredFilter.value = ''
  currentPage.value = 1
}

// Fetch modifier groups from API
const { data: groupsData, asyncStatus: groupsAsyncStatus, refetch: refetchGroups } = useQuery({
  key: () => ['menu', 'modifier-groups', currentTenant.value?.id, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: appliedSearch.value || null,
    is_required: isRequiredFilter.value,
  }],
  query: () => {
    const params: Record<string, string | number | boolean> = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    }
    if (appliedSearch.value) params.search = appliedSearch.value
    if (isRequiredFilter.value !== null) params.is_required = isRequiredFilter.value
    return $fetch('/api/menu/modifier-groups', { params })
  },
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

const modifierGroups = computed(() => {
  return groupsData.value?.data ?? []
})

const totalPages = computed(() =>
  Math.ceil((groupsData.value?.total ?? 0) / itemsPerPage.value),
)

const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)

const previousPage = () => {
  if (canGoPrevious.value) currentPage.value--
}

const nextPage = () => {
  if (canGoNext.value) currentPage.value++
}

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
    title: t('menu.modificadores.group'),
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'products',
    title: t('menu.modificadores.productos'),
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'opciones',
    title: t('menu.modificadores.opciones'),
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'min_qty',
    title: t('menu.modificadores.min'),
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'max_qty',
    title: t('menu.modificadores.max'),
    sortable: true,
    format: 'number',
    align: 'center'
  },
  {
    key: 'tipo',
    title: t('menu.common.tipo'),
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'actions',
    title: t('menu.common.acciones'),
    sortable: false,
    format: 'text',
    align: 'center'
  }
]

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
  const grupo = modifierGroups.value.find((g: any) => g.id === grupoId)
  return grupo?.modifiers || []
}


function formatGroupOptionsSummary(grupoId: string) {
  const labels = getGroupOptionLabels(grupoId)
  return labels.join(', ')
}

function getGroupOptionLabels(grupoId: string) {
  const mods = getModificadoresByGrupo(grupoId)
  if (!mods.length) return []
  return mods.map((m: any) => {
    const type = (m.option_type || 'INGREDIENT').toUpperCase()
    if (type === 'INGREDIENT') return m.ingredient?.name || m.name
    if (type === 'RECIPE') return m.recipe_base?.name || m.name
    if (type === 'PRODUCT') return m.linked_product?.name || m.name
    return m.name
  }).filter(Boolean)
}

function getGroupOptionChipState(grupoId: string) {
  const labels = getGroupOptionLabels(grupoId)
  return {
    visible: labels.slice(0, 3),
    moreCount: Math.max(labels.length - 3, 0),
    empty: labels.length === 0,
  }
}

const goToCreateGroup = () => {
  void handleModifiersCreateClick(() => {
    router.push('/menu/modificadores/crear')
  })
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
  ensureBillingOverview()
})
useMenuReturnRefresh('/menu/modificadores', handleRefresh)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(handleRefresh)
})

</script>
