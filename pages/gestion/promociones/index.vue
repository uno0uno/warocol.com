<template>
  <div>
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="page-layout">
      <div class="flex flex-col gap-3 md:gap-4">
        <p class="text-sm text-text-secondary">
          Configura descuentos y promociones con horario y alcance en el menú.
        </p>

        <UiAdvancedFiltersBar
          v-model:search="localSearchTerm"
          :search-fields="[]"
          :show-date-range="false"
          search-placeholder="Buscar promociones..."
          :show-clear="hasActiveFilters"
          @search="performSearch"
          @clear="clearFilters"
        >
          <template #additional-filters>
            <div
              class="flex rounded-lg border border-border overflow-hidden text-sm shrink-0"
              role="group"
              aria-label="Filtrar por estado"
            >
              <button
                type="button"
                class="px-3 py-2 min-h-[44px] transition-colors"
                :class="statusFilter === '' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface-secondary'"
                @click="statusFilter = ''"
              >
                Todas
              </button>
              <button
                type="button"
                class="px-3 py-2 min-h-[44px] border-l border-border transition-colors"
                :class="statusFilter === 'active' ? 'bg-status-success-bg text-status-success-text' : 'bg-surface text-text-secondary hover:bg-surface-secondary'"
                @click="statusFilter = 'active'"
              >
                Activas
              </button>
              <button
                type="button"
                class="px-3 py-2 min-h-[44px] border-l border-border transition-colors"
                :class="statusFilter === 'inactive' ? 'bg-text-secondary/20 text-text-secondary' : 'bg-surface text-text-secondary hover:bg-surface-secondary'"
                @click="statusFilter = 'inactive'"
              >
                Inactivas
              </button>
            </div>

            <div
              class="flex rounded-lg border border-border overflow-hidden text-sm shrink-0"
              role="group"
              aria-label="Filtrar por tipo de promoción"
            >
              <button
                type="button"
                class="px-3 py-2 min-h-[44px] transition-colors"
                :class="promoTypeFilter === '' ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:bg-surface-secondary'"
                @click="promoTypeFilter = ''"
              >
                Todos
              </button>
              <button
                type="button"
                class="px-3 py-2 min-h-[44px] border-l border-border transition-colors whitespace-nowrap"
                :class="promoTypeFilter === 'percent_off' ? 'bg-primary/90 text-white' : 'bg-surface text-text-secondary hover:bg-surface-secondary'"
                @click="promoTypeFilter = 'percent_off'"
              >
                % desc.
              </button>
              <button
                type="button"
                class="px-3 py-2 min-h-[44px] border-l border-border transition-colors whitespace-nowrap"
                :class="promoTypeFilter === 'fixed_off' ? 'bg-primary/90 text-white' : 'bg-surface text-text-secondary hover:bg-surface-secondary'"
                @click="promoTypeFilter = 'fixed_off'"
              >
                Fijo
              </button>
              <button
                type="button"
                class="px-3 py-2 min-h-[44px] border-l border-border transition-colors whitespace-nowrap"
                :class="promoTypeFilter === 'bogo' ? 'bg-primary/90 text-white' : 'bg-surface text-text-secondary hover:bg-surface-secondary'"
                @click="promoTypeFilter = 'bogo'"
              >
                2×1
              </button>
            </div>
          </template>
        </UiAdvancedFiltersBar>

        <UiResponsiveDataView
          :columns="columns"
          :data="filteredPromotions"
          empty-message="No hay promociones"
          empty-sub-message="Crea la primera para aplicarla en el POS (batch siguiente)."
          variant="default"
          row-size="sm"
        >
          <template #header-actions>
            <NuxtLink
              to="/gestion/promociones/nuevo"
              class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium min-h-[44px] whitespace-nowrap"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Nueva promoción
            </NuxtLink>
          </template>

          <template #card="{ item }">
            <NuxtLink
              :to="`/gestion/promociones/${item.id}`"
              class="flex flex-col gap-1 py-3 px-3 border-b border-border hover:bg-surface-secondary transition-colors"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  :class="statusBadgeClass(item)"
                >
                  {{ statusBadgeLabel(item) }}
                </span>
              </div>
              <p class="text-xs text-text-secondary">{{ rowPreview(item) }}</p>
              <p class="text-xs text-text-tertiary">{{ formatPromoTypeLabel(item.promo_type) }}</p>
            </NuxtLink>
          </template>

          <template #cell-name="{ value }">
            <span class="text-sm font-medium text-text-primary">{{ value }}</span>
          </template>

          <template #cell-preview="{ item }">
            <span class="text-sm text-text-secondary">{{ rowPreview(item) }}</span>
          </template>

          <template #cell-status="{ item }">
            <span
              class="text-xs font-medium px-2 py-0.5 rounded-full"
              :class="statusBadgeClass(item)"
            >
              {{ statusBadgeLabel(item) }}
            </span>
          </template>

          <template #cell-actions="{ item }">
            <NuxtLink
              :to="`/gestion/promociones/${item.id}`"
              class="text-sm font-medium text-primary hover:underline min-h-[44px] inline-flex items-center"
            >
              Editar
            </NuxtLink>
          </template>
        </UiResponsiveDataView>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import {
  buildPromotionPreview,
  formatPromoTypeLabel,
  type PromotionScheduleRow,
} from '~/utils/promotionPreview'

definePageMeta({ layout: 'dashboard', module: 'mi_negocio' })
useHead({ title: 'Promociones' })

interface PromotionRow {
  id: string
  name: string
  promo_type: string
  scope_type: string
  is_active: boolean
  is_currently_active?: boolean | null
  schedules: PromotionScheduleRow[]
  category_ids: string[]
  product_ids: string[]
}

const { currentTenant } = useTenantReactive()

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const statusFilter = ref<'' | 'active' | 'inactive'>('')
const promoTypeFilter = ref<'' | 'percent_off' | 'fixed_off' | 'bogo'>('')

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!statusFilter.value
    || !!promoTypeFilter.value,
)

const performSearch = () => applySearch()

function clearFilters() {
  clearSearch()
  statusFilter.value = ''
  promoTypeFilter.value = ''
}

const columns: Column[] = [
  { key: 'name', title: 'Nombre' },
  { key: 'preview', title: 'Vista previa' },
  { key: 'status', title: 'Estado' },
  { key: 'actions', title: '', align: 'right' as const },
]

const {
  data: listData,
  error: fetchError,
  asyncStatus: queryAsyncStatus,
} = useQuery({
  key: () => ['tenant', 'promotions', currentTenant.value?.id, { inactive: true }],
  query: () =>
    $fetch<{ success: boolean; total: number; data: PromotionRow[] }>('/api/api/promotions', {
      query: {
        include_inactive: true,
        at: new Date().toISOString(),
      },
    }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const promotions = computed(() => listData.value?.data ?? [])
const isLoading = computed(
  () => queryAsyncStatus.value === 'loading' && !listData.value,
)

const filteredPromotions = computed(() => {
  let rows = promotions.value
  const term = appliedSearch.value.trim().toLowerCase()
  if (term) {
    rows = rows.filter((row) => row.name.toLowerCase().includes(term))
  }
  if (statusFilter.value === 'active') {
    rows = rows.filter((row) => row.is_active)
  } else if (statusFilter.value === 'inactive') {
    rows = rows.filter((row) => !row.is_active)
  }
  if (promoTypeFilter.value) {
    rows = rows.filter((row) => row.promo_type === promoTypeFilter.value)
  }
  return rows
})

const rowPreview = (item: PromotionRow) =>
  buildPromotionPreview({
    isActive: item.is_active,
    isCurrentlyActive: item.is_currently_active,
    schedules: item.schedules ?? [],
    scopeType: item.scope_type,
  })

const statusBadgeLabel = (item: PromotionRow) => {
  if (!item.is_active) return 'Desactivada'
  if (item.is_currently_active === true) return 'Activa ahora'
  if (item.is_currently_active === false) return 'Fuera de horario'
  return 'Activa'
}

const statusBadgeClass = (item: PromotionRow) => {
  if (!item.is_active) return 'bg-text-secondary/10 text-text-secondary'
  if (item.is_currently_active === true) return 'bg-status-success-bg text-status-success-text'
  if (item.is_currently_active === false) return 'bg-status-warning-bg text-status-warning-text'
  return 'bg-primary/10 text-primary'
}
</script>
