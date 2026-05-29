<template>
  <div class="page-layout">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="flex flex-col gap-3 md:gap-4">
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
          <select
            v-model="statusFilter"
            :class="filterSelectClassFor(statusFilter)"
            aria-label="Filtrar por estado"
          >
            <option value="">Estado</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>

          <select
            v-model="promoTypeFilter"
            :class="filterSelectClassFor(promoTypeFilter)"
            aria-label="Filtrar por tipo"
          >
            <option value="">Tipo</option>
            <option value="percent_off">% descuento</option>
            <option value="fixed_off">Descuento fijo</option>
            <option value="bogo">2×1 / BOGO</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <HealthSemaphore :is-unlocked="true" title="Promociones">
        <template #header-actions>
          <button
            type="button"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap min-h-[44px]"
            @click="openPanel(null)"
          >
            + Nueva promoción
          </button>
        </template>

        <UiResponsiveDataView
          :columns="columns"
          :data="filteredPromotions"
          :row-class="getRowClass"
          empty-message="No hay promociones"
          empty-sub-message="Crea la primera para aplicarla en el POS."
          variant="default"
          row-size="sm"
          @row-click="openPanel"
        >
          <template #card="{ item, index }">
            <div
              v-if="item"
              class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
              :class="promoRowClass(item, index)"
              @click="openPanel(item)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2 flex-wrap">
                  <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                  <UiStatusBadge
                    :value="formatPromoTypeLabel(item.promo_type)"
                    format="text"
                    variant="secondary"
                    size="sm"
                  />
                </div>
                <p class="text-xs text-text-secondary mt-0.5 truncate">{{ rowPreview(item) }}</p>
              </div>
              <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                <UiStatusBadge
                  :value="statusBadgeLabel(item)"
                  format="text"
                  :variant="statusBadgeVariant(item)"
                  size="sm"
                />
              </div>
            </div>
          </template>

          <template #cell-name="{ value }">
            <span class="text-sm font-bold text-text-primary">{{ value }}</span>
          </template>

          <template #cell-promo_type="{ item }">
            <UiStatusBadge
              v-if="item"
              :value="formatPromoTypeLabel(item.promo_type)"
              format="text"
              variant="secondary"
              size="sm"
            />
          </template>

          <template #cell-preview="{ item }">
            <span class="text-sm text-text-secondary">{{ item ? rowPreview(item) : '' }}</span>
          </template>

          <template #cell-status="{ item }">
            <UiStatusBadge
              v-if="item"
              :value="statusBadgeLabel(item)"
              format="text"
              :variant="statusBadgeVariant(item)"
              size="sm"
            />
          </template>
        </UiResponsiveDataView>
      </HealthSemaphore>
    </div>

    <PromocionesPromocionPanel
      v-model="showPanel"
      :promotion-id="panelPromotionId"
      @saved="onPanelSaved"
      @deleted="onPanelSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import { useQueryCache } from '@pinia/colada'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
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

const route = useRoute()
const router = useRouter()
const { currentTenant } = useTenantReactive()
const cache = useQueryCache()

const showPanel = ref(false)
const panelPromotionId = ref<string | null>(null)

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
  { key: 'name', title: 'Nombre', sortable: false },
  { key: 'promo_type', title: 'Tipo', sortable: false },
  { key: 'preview', title: 'Vista previa', sortable: false },
  { key: 'status', title: 'Estado', sortable: false },
]

const {
  data: listData,
  error: fetchError,
  asyncStatus: queryAsyncStatus,
  refetch: refetchPromotions,
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
// Full-page loader only on first fetch; refetches show matrix in header (optimistic).
const isLoading = computed(() => !listData.value && !fetchError.value)
const isRefreshing = computed(
  () => queryAsyncStatus.value === 'loading' && !!listData.value,
)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const refreshHandler = async () => {
  const tenantId = currentTenant.value?.id
  if (tenantId) {
    await cache.invalidateQueries({ key: ['tenant', 'promotions', tenantId] })
  } else {
    await cache.invalidateQueries({ key: ['tenant', 'promotions'] })
  }
  await refetchPromotions()
}

onMounted(() => {
  openFromQuery()
  setRefreshHandler(refreshHandler)
  registerProgressiveLoading(isRefreshing)
})

onUnmounted(() => {
  clearRefreshHandler(refreshHandler)
})

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

const promoRowClass = (_row: PromotionRow, index: number) =>
  index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'

const getRowClass = (row: PromotionRow) => {
  const index = filteredPromotions.value.findIndex((p) => p.id === row.id)
  return promoRowClass(row, index >= 0 ? index : 0)
}

function clearPanelQuery() {
  if (route.query.nuevo || route.query.id) {
    router.replace({ path: '/operaciones/promociones' })
  }
}

function openPanel(item: PromotionRow | null) {
  panelPromotionId.value = item?.id ?? null
  showPanel.value = true
}

async function onPanelSaved() {
  showPanel.value = false
  panelPromotionId.value = null
  clearPanelQuery()
  await refreshHandler()
}

function openFromQuery() {
  if (route.query.nuevo === '1') {
    openPanel(null)
    return
  }
  const id = route.query.id
  if (typeof id === 'string' && id) {
    openPanel({ id } as PromotionRow)
  }
}

watch(showPanel, (open) => {
  if (!open) {
    panelPromotionId.value = null
    clearPanelQuery()
  }
})

watch(() => route.query, openFromQuery)

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

type StatusVariant = 'success' | 'warning' | 'secondary' | 'destructive'

const statusBadgeVariant = (item: PromotionRow): StatusVariant => {
  if (!item.is_active) return 'secondary'
  if (item.is_currently_active === true) return 'success'
  if (item.is_currently_active === false) return 'warning'
  return 'success'
}
</script>
