<template>
  <div class="page-layout">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="flex flex-col gap-3 md:gap-4">
      <div
        v-if="opsProfile"
        class="flex items-center justify-between gap-4 rounded-xl border-2 border-border bg-surface px-4 py-3"
        :class="opsContextAsyncStatus === 'loading' && !opsContextData ? 'opacity-60' : ''"
      >
        <div class="min-w-0">
          <p class="text-sm font-semibold leading-snug text-text-primary">
            {{ opsProfile.allow_promo_line_opt_out ? t('operaciones.promociones.itemOptOutOn') : t('operaciones.promociones.itemOptOutOff') }}
          </p>
          <p class="text-xs mt-0.5 leading-snug text-text-secondary">
            Permitir excluir promoción por ítem en checkout — el cajero puede desactivar la promoción en una línea sin quitar el producto.
          </p>
        </div>
        <label
          class="inline-flex items-center cursor-pointer flex-shrink-0 min-h-[44px] min-w-[2.5rem]"
          :class="isTogglingPromoLineOptOut ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="opsProfile.allow_promo_line_opt_out ? t('operaciones.promociones.disableItemOptOut') : t('operaciones.promociones.enableItemOptOut')"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="opsProfile.allow_promo_line_opt_out === true"
            :disabled="isTogglingPromoLineOptOut"
            @change="togglePromoLineOptOutSetting"
          />
          <div
            class="relative h-6 w-10 shrink-0 overflow-hidden rounded-full bg-control-toggle-track-off peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-control-toggle-thumb after:transition-transform after:content-[''] peer-checked:after:translate-x-4"
          />
        </label>
      </div>

      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        :search-fields="[]"
        :show-date-range="false"
        search-:placeholder="t('operaciones.promociones.searchPlaceholder')"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="statusFilter"
            :class="filterSelectClassFor(statusFilter)"
            class="md:hidden"
            aria-label="Filtrar por estado"
          >
            <option value="">Estado</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>

          <select
            v-model="promoTypeFilter"
            :class="filterSelectClassFor(promoTypeFilter)"
            class="md:hidden"
            aria-label="Filtrar por tipo"
          >
            <option value="">Tipo</option>
            <option value="percent_off">% descuento</option>
            <option value="fixed_off">Descuento fijo</option>
            <option value="bogo">2×1 / BOGO</option>
          </select>
        </template>
        <template #trailing>
          <button
            type="button"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap min-h-[44px]"
            @click="openPanel(null)"
          >
            + Nueva promoción
          </button>
        </template>
      </UiAdvancedFiltersBar>

      <UiResponsiveDataView
        :columns="columns"
        :data="filteredPromotions"
        :row-class="getRowClass"
        :empty-message="t('operaciones.promociones.emptyTitle')"
        :empty-sub-message="t('operaciones.promociones.emptyBody')"
        variant="default"
        row-size="sm"
      >
          <template #header-promo_type>
            <UiTableHeaderFilter
              v-model="promoTypeFilter"
              title="Tipo"
              filter-type="select"
              :options="promoTypeHeaderOptions"
              all-label="Todos"
              align="center"
            />
          </template>

          <template #header-status>
            <UiTableHeaderFilter
              v-model="statusFilter"
              title="Estado"
              filter-type="select"
              :options="statusHeaderOptions"
              all-label="Todos"
              align="center"
            />
          </template>

          <template #card="{ item, index }">
            <div
              v-if="item"
              class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors"
              :class="promoRowClass(item, index)"
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
                  <UiStatusBadge
                    v-if="(item.priority ?? 0) > 0"
                    :value="`Prioridad ${item.priority}`"
                    format="text"
                    variant="warning"
                    size="sm"
                  />
                </div>
                <p class="text-xs text-text-secondary mt-0.5">
                  <span class="font-medium text-text-primary">{{ rowValue(item) }}</span>
                  · {{ rowSchedule(item) }}
                </p>
                <button
                  v-if="isScopeClickable(item)"
                  type="button"
                  class="text-xs text-left text-primary hover:underline truncate max-w-full min-h-[44px]"
                  :aria-label="`Ver alcance de ${item.name}`"
                  @click.stop="openScopePopover(item)"
                >
                  {{ rowScope(item) }}
                </button>
                <p v-else class="text-xs text-text-tertiary mt-0.5 truncate">{{ rowScope(item) }}</p>
              </div>
              <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                <UiStatusBadge
                  :value="statusBadgeLabel(item)"
                  format="text"
                  :variant="statusBadgeVariant(item)"
                  size="sm"
                />
              </div>
              <button
                type="button"
                :aria-label="`Editar ${item.name}`"
                title="Editar"
                class="group flex-shrink-0 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary focus:outline-none transition-colors"
                @click.stop="openEdit(item)"
              >
                <PencilOutlineIcon class="w-4 h-4 group-hover:hidden" />
                <PencilSolidIcon class="hidden w-4 h-4 group-hover:block" />
              </button>
              <button
                type="button"
                :aria-label="`Eliminar ${item.name}`"
                title="Eliminar"
                class="group flex-shrink-0 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-destructive focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="deletingPromotionId === item.id"
                @click.stop="openDeletePromotion(item)"
              >
                <UiLoadingDots v-if="deletingPromotionId === item.id" size="12px" />
                <template v-else>
                  <TrashOutlineIcon class="w-4 h-4 group-hover:hidden" />
                  <TrashSolidIcon class="hidden w-4 h-4 group-hover:block" />
                </template>
              </button>
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

          <template #cell-value="{ item }">
            <span class="text-sm font-medium text-text-primary">{{ item ? rowValue(item) : '' }}</span>
          </template>

          <template #cell-schedule="{ item }">
            <span class="text-sm text-text-secondary">{{ item ? rowSchedule(item) : '' }}</span>
          </template>

          <template #cell-scope="{ item }">
            <button
              v-if="item && isScopeClickable(item)"
              type="button"
              class="text-sm text-left text-primary hover:underline min-h-[44px]"
              :aria-label="`Ver alcance de ${item.name}`"
              @click.stop="openScopePopover(item)"
            >
              {{ rowScope(item) }}
            </button>
            <span v-else-if="item" class="text-sm text-text-secondary">{{ rowScope(item) }}</span>
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

          <template #cell-priority="{ item }">
            <UiStatusBadge
              v-if="item && (item.priority ?? 0) > 0"
              :value="String(item.priority)"
              format="text"
              variant="warning"
              size="sm"
            />
            <span v-else-if="item" class="text-sm text-text-tertiary">—</span>
          </template>

          <template #cell-actions="{ item }">
            <div v-if="item" class="flex items-center justify-end gap-0.5">
              <button
                type="button"
                :aria-label="`Editar ${item.name}`"
                title="Editar"
                class="group min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary focus:outline-none transition-colors"
                @click.stop="openEdit(item)"
              >
                <PencilOutlineIcon class="w-4 h-4 group-hover:hidden" />
                <PencilSolidIcon class="hidden w-4 h-4 group-hover:block" />
              </button>
              <button
                type="button"
                :aria-label="`Eliminar ${item.name}`"
                title="Eliminar"
                class="group min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-destructive focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="deletingPromotionId === item.id"
                @click.stop="openDeletePromotion(item)"
              >
                <UiLoadingDots v-if="deletingPromotionId === item.id" size="12px" />
                <template v-else>
                  <TrashOutlineIcon class="w-4 h-4 group-hover:hidden" />
                  <TrashSolidIcon class="hidden w-4 h-4 group-hover:block" />
                </template>
              </button>
            </div>
          </template>
      </UiResponsiveDataView>
    </div>

    <PromocionesPromocionPanel
      v-model="showPanel"
      :promotion-id="panelPromotionId"
      @saved="onPanelSaved"
      @deleted="onPanelSaved"
    />

    <PromocionesPromotionScopePopover
      v-model="scopePopoverOpen"
      :promotion-id="scopePopoverPromo?.id ?? null"
      :promotion-name="scopePopoverPromo?.name ?? ''"
      :scope-type="scopePopoverPromo?.scope_type ?? ''"
    />

    <PosDestructiveReasonModal
      v-model="deleteModalOpen"
      :title="deleteModalTitle"
      :message="deleteModalMessage"
      :confirm-label="t('operaciones.promociones.yesDelete')"
      reason-placeholder="Ej: promoción vencida, regla duplicada, campaña finalizada"
      :loading="!!deletingPromotionId"
      :error="deleteError"
      @confirm="confirmDeletePromotion"
      @cancel="cancelDeletePromotion"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import { useQuery, useQueryCache } from '@pinia/colada'
import { PencilIcon as PencilOutlineIcon, TrashIcon as TrashOutlineIcon } from '@heroicons/vue/24/outline'
import { PencilIcon as PencilSolidIcon, TrashIcon as TrashSolidIcon } from '@heroicons/vue/24/solid'
import {
  formatPromoTypeLabel,
  formatPromoValue,
  formatScheduleWindows,
  formatScopeLabel,
  type PromotionScheduleRow,
} from '~/utils/promotionPreview'

definePageMeta({ layout: 'dashboard', module: 'mi_negocio' })
useHead({ title: 'Promociones' })

interface PromotionRow {
  id: string
  name: string
  promo_type: string
  scope_type: string
  priority?: number
  value_json?: Record<string, unknown>
  is_active: boolean
  is_currently_active?: boolean | null
  schedules: PromotionScheduleRow[]
  category_ids: string[]
  product_ids: string[]
  category_count?: number
  product_count?: number
  category_names_preview?: string[]
  product_names_preview?: string[]
}

const route = useRoute()
const router = useRouter()
const { currentTenant } = useTenantReactive()
const cache = useQueryCache()
const toast = useToast()

const {
  data: opsContextData,
  asyncStatus: opsContextAsyncStatus,
} = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const opsProfile = computed(() => opsContextData.value?.data ?? null)
const isTogglingPromoLineOptOut = ref(false)

const togglePromoLineOptOutSetting = async () => {
  if (!opsProfile.value || isTogglingPromoLineOptOut.value) return
  const enabled = !opsProfile.value.allow_promo_line_opt_out
  isTogglingPromoLineOptOut.value = true
  try {
    await $fetch('/api/operaciones/toggles/promo-line-opt-out', {
      method: 'PATCH',
      body: { enabled },
    })
    await cache.invalidateQueries({ key: ['operaciones', 'restaurant-context'] })
    await cache.invalidateQueries({ key: ['pos', 'restaurant-context'] })
    toast.success(
      enabled
        ? t('operaciones.promociones.cashiersCanOptOut')
        : t('operaciones.promociones.itemOptOutDisabledMsg'),
      { title: enabled ? t('operaciones.promociones.optionOn') : t('operaciones.promociones.optionOff') },
    )
  } catch (error: any) {
    toast.error(error?.data?.detail || t('operaciones.promociones.saveError'), { title: 'Error' })
  } finally {
    isTogglingPromoLineOptOut.value = false
  }
}

const showPanel = ref(false)
const panelPromotionId = ref<string | null>(null)
const deletingPromotionId = ref<string | null>(null)
const deletePromotionTarget = ref<PromotionRow | null>(null)
const deleteError = ref('')
const skipOpenFromQuery = ref(false)
const scopePopoverOpen = ref(false)
const scopePopoverPromo = ref<PromotionRow | null>(null)
const deleteModalOpen = computed({
  get: () => deletePromotionTarget.value !== null,
  set: (open: boolean) => {
    if (!open && !deletingPromotionId.value) {
      deletePromotionTarget.value = null
      deleteError.value = ''
    }
  },
})
const deleteModalTitle = computed(() =>
  deletePromotionTarget.value
    ? `¿Eliminar ${deletePromotionTarget.value.name}?`
    : t('operaciones.promociones.deleteConfirmTitle'),
)
const deleteModalMessage = computed(() =>
  deletePromotionTarget.value
    ? t('operaciones.promociones.deleteConfirmBody')
    : '',
)

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const statusFilter = ref<'' | 'active' | 'inactive'>('')
const promoTypeFilter = ref<'' | 'percent_off' | 'fixed_off' | 'bogo'>('')
const statusHeaderOptions = [
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
]
const promoTypeHeaderOptions = [
  { value: 'percent_off', label: t('operaciones.promociones.percentDiscount') },
  { value: 'fixed_off', label: t('operaciones.promociones.fixedDiscount') },
  { value: 'bogo', label: '2x1 / BOGO' },
]

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
  { key: 'value', title: 'Valor', sortable: false },
  { key: 'schedule', title: 'Horario', sortable: false },
  { key: 'scope', title: 'Alcance', sortable: false },
  { key: 'status', title: 'Estado', sortable: false },
  { key: 'priority', title: 'Prioridad', sortable: false },
  { key: 'actions', title: '', align: 'right' as const },
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

function hasScopeSummary(item: PromotionRow): boolean {
  return (
    typeof item.product_count === 'number'
    || typeof item.category_count === 'number'
    || Array.isArray(item.product_names_preview)
    || Array.isArray(item.category_names_preview)
  )
}

function scopeLabelsFor(item: PromotionRow) {
  if (hasScopeSummary(item)) {
    return {
      categoryNames: item.category_names_preview ?? [],
      productNames: item.product_names_preview ?? [],
      categoryCount: item.category_count ?? item.category_ids?.length ?? 0,
      productCount: item.product_count ?? item.product_ids?.length ?? 0,
    }
  }
  return {
    categoryNames: [] as string[],
    productNames: [] as string[],
    categoryCount: item.category_ids?.length ?? 0,
    productCount: item.product_ids?.length ?? 0,
  }
}

const rowValue = (item: PromotionRow) => formatPromoValue(item.promo_type, item.value_json)

const rowSchedule = (item: PromotionRow) => formatScheduleWindows(item.schedules ?? [])

const rowScope = (item: PromotionRow) => {
  const { categoryNames, productNames, categoryCount, productCount } = scopeLabelsFor(item)
  return formatScopeLabel(item.scope_type, categoryNames, productNames, {
    categoryCount,
    productCount,
    countOnlyThreshold: 5,
  })
}

function isScopeClickable(item: PromotionRow): boolean {
  if (item.scope_type === 'all_products') return false
  const { categoryCount, productCount } = scopeLabelsFor(item)
  return categoryCount > 0 || productCount > 0
}

function openScopePopover(item: PromotionRow) {
  scopePopoverPromo.value = item
  scopePopoverOpen.value = true
}

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

const promoRowClass = (_row: PromotionRow, _index: number) => ''

const getRowClass = (row: PromotionRow) => {
  const index = filteredPromotions.value.findIndex((p) => p.id === row.id)
  return promoRowClass(row, index >= 0 ? index : 0)
}

async function clearPanelQuery() {
  if (route.query.nuevo || route.query.id) {
    await router.replace({ path: '/operaciones/promociones', query: {} })
  }
}

function openPanel(item: PromotionRow | null) {
  panelPromotionId.value = item?.id ?? null
  showPanel.value = true
}

function openEdit(item: PromotionRow) {
  openPanel(item)
}

function openDeletePromotion(item: PromotionRow) {
  if (deletingPromotionId.value) return
  deletePromotionTarget.value = item
  deleteError.value = ''
}

function cancelDeletePromotion() {
  if (deletingPromotionId.value) return
  deletePromotionTarget.value = null
  deleteError.value = ''
}

async function confirmDeletePromotion(reason: string) {
  const item = deletePromotionTarget.value
  if (!item) return
  await deletePromotion(item, reason)
}

async function deletePromotion(item: PromotionRow, reason: string) {
  if (deletingPromotionId.value) return
  deletingPromotionId.value = item.id
  deleteError.value = ''
  try {
    await $fetch(`/api/api/promotions/${item.id}`, {
      method: 'DELETE',
      body: { reason: reason.trim() },
    })
    toast.success(t('operaciones.promociones.deleted'))
    deletePromotionTarget.value = null
    await refreshHandler()
  } catch (error: any) {
    deleteError.value = error?.data?.detail ?? t('operaciones.promociones.deleteError')
    toast.error(deleteError.value, { title: 'Error' })
  } finally {
    deletingPromotionId.value = null
  }
}

async function onPanelSaved() {
  skipOpenFromQuery.value = true
  showPanel.value = false
  panelPromotionId.value = null
  await clearPanelQuery()
  await refreshHandler()
  skipOpenFromQuery.value = false
}

function openFromQuery() {
  if (skipOpenFromQuery.value) return
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
    void clearPanelQuery()
  }
})

watch(() => route.query, openFromQuery)

const statusBadgeLabel = (item: PromotionRow) => {
  if (!item.is_active) return 'Desactivada'
  if (item.is_currently_active === true) return 'Activa ahora'
  if (item.is_currently_active === false) return t('operaciones.promociones.outsideHours')
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
