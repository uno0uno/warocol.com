<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Draggable from 'vuedraggable'
import { displayTableCode } from '~/composables/useTableDisplayCode'
import {
  areTableOrdersEqual,
  getTableOrderIds,
} from '~/composables/useTableOrderDraft'

definePageMeta({ layout: 'dashboard', module: 'operaciones' })

const { singular, plural } = useTableLabel()
const singularLower = computed(() => singular.value.toLowerCase())
const pluralLower = computed(() => plural.value.toLowerCase())

useHead({ title: computed(() => `${plural.value} | Operaciones`) })

const { currentTenant } = useTenantReactive()
const {
  getOperationalQuota,
  fetchBillingOverview,
} = useBilling()

// ── Data ───────────────────────────────────────────────────────────────────
const { data: tablesData, status: tablesStatus, asyncStatus: tablesAsyncStatus, error: tablesError, refetch } = useQuery({
  key: () => ['tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/tables?include_inactive=true'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// Operaciones audience aggregator — gated under OPERACIONES.
// Migrated from /api/api/tenant/public-profile (now owner-only MI_NEGOCIO).
const cache = useQueryCache()
const { data: profileData, asyncStatus: profileAsyncStatus, refetch: refreshProfile } = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// Cross-audience cache invalidation — POS reads tables_enabled from its own
// /pos/restaurant-context aggregator; flipping the toggle here must invalidate
// that key too so /pos/index reflects the change immediately.
const invalidateContextCaches = async () => {
  await cache.invalidateQueries({ key: ['operaciones', 'restaurant-context'] })
  await cache.invalidateQueries({ key: ['pos', 'restaurant-context'] })
}
const businessProfile = computed(() => profileData.value?.data ?? null)

const loadingTables = computed(() => !tablesData.value)
const isRefreshing = computed(() => (
  (tablesAsyncStatus.value === 'loading' && tablesData.value != null) ||
  (profileAsyncStatus.value === 'loading' && profileData.value != null)
))

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

const tables = computed(() => tablesData.value?.data ?? [])

// ── Search / filter ────────────────────────────────────────────────────────
const searchTerm = ref('')
const statusFilter = ref('')

const statusOptions = computed(() => [
  { value: 'free', label: t('pos.floor.free') },
  { value: 'open', label: t('pos.floor.occupied') },
  { value: 'bill_requested', label: t('operaciones.mesas.billRequested') },
])

const hasActiveTableFilters = computed(() =>
  !!(searchTerm.value || statusFilter.value)
)

const clearTableFilters = () => {
  searchTerm.value = ''
  statusFilter.value = ''
}

const activeRegularTables = computed(() => tables.value.filter((t: any) => !t.is_bar && t.is_active))
const tableOrderDraft = ref<any[]>([])
const lastConfirmedTableOrder = ref<any[]>([])
const orderedActiveTables = computed(() =>
  tableOrderDraft.value.length > 0 ? tableOrderDraft.value : activeRegularTables.value
)

// Active tables: is_active true, not bar
const activeTables = computed(() => {
  let result = orderedActiveTables.value
  const q = searchTerm.value.trim().toLowerCase()
  if (q) result = result.filter((t: any) => t.name.toLowerCase().includes(q))
  if (statusFilter.value) result = result.filter((t: any) => t.status === statusFilter.value)
  return result
})

// Inactive tables: is_active false, not bar (deactivated but not deleted)
const inactiveTables = computed(() => {
  let result = tables.value.filter((t: any) => !t.is_bar && !t.is_active)
  const q = searchTerm.value.trim().toLowerCase()
  if (q) result = result.filter((t: any) => t.name.toLowerCase().includes(q))
  return result
})

// ── Table columns ──────────────────────────────────────────────────────────
// "Mesero" column only shows when waiter-attribution is on; the cell is
// read-only — clicking "Editar" is the only way to change the assignment.
const tableColumns = computed(() => {
  const cols: Array<{ key: string; title: string; sortable?: boolean }> = [
    { key: 'name', title: singular.value, sortable: false },
    { key: 'code', title: t('operaciones.mesas.posCode'), sortable: false },
    { key: 'capacity', title: t('operaciones.mesas.capacity') },
  ]
  if (businessProfile.value?.waiter_attribution_enabled) {
    cols.push({ key: 'mesero', title: t('operaciones.mesas.waiter') })
  }
  if (businessProfile.value?.tables_enabled && businessProfile.value?.table_qr_module_enabled) {
    cols.push({ key: 'qr', title: 'QR' })
  }
  cols.push({ key: 'status', title: t('menu.common.estado') })
  cols.push({ key: 'actions', title: '' })
  return cols
})

// ── Panel state ────────────────────────────────────────────────────────────
const showPanel = ref(false)
const panelTable = ref<any>(null)

const openPanel = (table: any = null) => {
  if (!table && isActiveTableQuotaBlocked.value) {
    showActiveTableQuotaBlocked()
    return
  }

  panelTable.value = table
  showPanel.value = true
}

const refreshTablesAndBilling = async () => {
  await Promise.all([refetch(), fetchBillingOverview()])
}

const onSaved = () => { refreshTablesAndBilling() }

const onTableQrUpdated = async (data: Record<string, unknown>) => {
  if (panelTable.value?.id === data.id) {
    panelTable.value = { ...panelTable.value, ...data }
  }
  await refreshTablesAndBilling()
}

// ── Manual order ────────────────────────────────────────────────────────────
const isDraggingTableOrder = ref(false)
const isSavingTableOrder = ref(false)
const tableOrderError = ref('')

const syncConfirmedTableOrder = () => {
  lastConfirmedTableOrder.value = [...activeRegularTables.value]
  tableOrderDraft.value = [...activeRegularTables.value]
  tableOrderError.value = ''
}

const isTableOrderDirty = computed(() =>
  !areTableOrdersEqual(tableOrderDraft.value, lastConfirmedTableOrder.value)
)

const isTableDragDisabled = computed(() =>
  hasActiveTableFilters.value ||
  activeRegularTables.value.length < 2 ||
  isSavingTableOrder.value
)

const tableDragDisabledReason = computed(() => {
  if (hasActiveTableFilters.value) return t('operaciones.mesas.reorderHint')
  if (activeRegularTables.value.length < 2) return t('operaciones.mesas.needTwoTables', { tables: pluralLower.value })
  if (isSavingTableOrder.value) return t('operaciones.mesas.savingOrder')
  return t('operaciones.mesas.dragToOrder', { tables: pluralLower.value })
})

const activeTableRowClass = (index: number) =>
  index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'

const saveTableOrder = async () => {
  if (isSavingTableOrder.value || hasActiveTableFilters.value || !isTableOrderDirty.value) return
  const nextOrder = [...tableOrderDraft.value]
  isSavingTableOrder.value = true
  tableOrderError.value = ''
  try {
    const response = await $fetch<{ message?: string; data?: { message?: string } }>('/api/tables/reorder', {
      method: 'PATCH',
      body: { table_ids: getTableOrderIds(nextOrder) },
    })
    lastConfirmedTableOrder.value = [...nextOrder]
    toast.success(
      response?.message || response?.data?.message || `Orden de ${pluralLower.value} guardado para el POS`,
      { title: t('operaciones.mesas.orderUpdated') },
    )
  } catch (err: any) {
    tableOrderDraft.value = [...lastConfirmedTableOrder.value]
    tableOrderError.value = tableErrorMessage(err, `Error al guardar el orden de ${pluralLower.value}`)
    toast.error(tableOrderError.value, { title: t('operaciones.mesas.saveError') })
  } finally {
    isSavingTableOrder.value = false
  }
}

const onTableOrderDragStart = () => {
  isDraggingTableOrder.value = true
  tableOrderError.value = ''
}

const onTableOrderDragEnd = async () => {
  isDraggingTableOrder.value = false
  await saveTableOrder()
}

watch(activeRegularTables, () => {
  if (!isDraggingTableOrder.value && !isSavingTableOrder.value) {
    syncConfirmedTableOrder()
  }
}, { immediate: true })

// ── Deactivate modal ────────────────────────────────────────────────────────
const deactivateModalOpen = ref(false)
const deactivateModalTable = ref<any>(null)
const isDeactivating = ref(false)
const deactivateError = ref('')

const openDeactivateModal = (table: any) => {
  deactivateModalTable.value = table
  deactivateError.value = ''
  deactivateModalOpen.value = true
}

const confirmDeactivate = async () => {
  if (!deactivateModalTable.value || isDeactivating.value) return
  isDeactivating.value = true
  deactivateError.value = ''
  try {
    await $fetch(`/api/tables/${deactivateModalTable.value.id}/deactivate`, { method: 'PATCH' })
    deactivateModalOpen.value = false
    await refreshTablesAndBilling()
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status
    deactivateError.value = status === 409
      ? (err?.data?.detail ?? `${singular.value} con sesión abierta, ciérrala primero`)
      : (err?.data?.detail ?? t('operaciones.mesas.deactivateError'))
  } finally {
    isDeactivating.value = false
  }
}

// ── Activate ────────────────────────────────────────────────────────────────
const activatingId = ref<string | null>(null)

const activateTable = async (id: string) => {
  if (activatingId.value) return
  if (isActiveTableQuotaBlocked.value) {
    showActiveTableQuotaBlocked()
    return
  }

  activatingId.value = id
  try {
    await $fetch(`/api/tables/${id}/activate`, { method: 'PATCH' })
    await refreshTablesAndBilling()
    toast.success(`${singular.value} activada`, { title: 'Activado' })
  } catch (err: any) {
    toast.error(tableErrorMessage(err, `Error al activar la ${singularLower.value}`), { title: 'Error' })
  } finally {
    activatingId.value = null
  }
}

// ── Delete modal ─────────────────────────────────────────────────────────
const deleteModalOpen = ref(false)
const deleteModalTable = ref<any>(null)
const isDeleting = ref(false)
const deleteError = ref('')

const openDeleteModal = (table: any) => {
  deleteModalTable.value = table
  deleteError.value = ''
  deleteModalOpen.value = true
}

const hasOpenSession = computed(() => !!deleteModalTable.value?.session)
const hasHistory = computed(() => !!deleteModalTable.value?.last_closed_session_id)

const confirmDelete = async () => {
  if (!deleteModalTable.value || isDeleting.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/tables/${deleteModalTable.value.id}`, { method: 'DELETE' })
    deleteModalOpen.value = false
    await refetch()
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status
    deleteError.value = status === 409
      ? (err?.data?.detail ?? `No se puede eliminar esta ${singularLower.value} ahora`)
      : (err?.data?.detail ?? t('operaciones.mesas.deleteError'))
  } finally {
    isDeleting.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const statusLabel = (status: string) => {
  if (status === 'open') return t('pos.floor.occupied')
  if (status === 'bill_requested') return t('operaciones.mesas.billRequested')
  return t('pos.floor.free')
}

const badgeVariant = (status: string) => {
  if (status === 'open') return 'success'
  if (status === 'bill_requested') return 'warning'
  return 'secondary'
}

const activeTableQuota = computed(() => getOperationalQuota('active_tables_including_bar'))
const isActiveTableQuotaBlocked = computed(() => activeTableQuota.value.blocked)
const activeTableQuotaMessage = computed(() => {
  const quota = activeTableQuota.value
  const metric = quota.metric

  if (!metric || metric.limit === null) return t('operaciones.mesas.quotaFull')

  const numberLocale = toNumberLocaleTag(locale.value)
  return t('operaciones.mesas.activeQuotaMessage', {
    tables: pluralLower.value,
    used: metric.used.toLocaleString(numberLocale),
    limit: metric.limit.toLocaleString(numberLocale),
  })
})

const showActiveTableQuotaBlocked = () => {
  toast.warning(activeTableQuotaMessage.value, { title: t('operaciones.mesas.quotaFull') })
}

const activeQrQuota = computed(() => getOperationalQuota('active_qr_tables'))
const isActiveQrQuotaBlocked = computed(() => activeQrQuota.value.blocked)
const activeQrQuotaMessage = computed(() => {
  const quota = activeQrQuota.value
  const metric = quota.metric

  if (!metric || metric.limit === null) return t('operaciones.mesas.qrQuotaMessage')

  const numberLocale = toNumberLocaleTag(locale.value)
  return t('operaciones.mesas.activeQuotaMessage', {
    tables: pluralLower.value,
    used: metric.used.toLocaleString(numberLocale),
    limit: metric.limit.toLocaleString(numberLocale),
  })
})

const isQuotaExceededError = (err: any) => {
  const detail = err?.data?.detail
  return err?.status === 429 ||
    err?.statusCode === 429 ||
    err?.data?.code === 'quota_exceeded' ||
    err?.data?.error === 'quota_exceeded' ||
    detail?.code === 'quota_exceeded' ||
    detail?.error === 'quota_exceeded'
}

const quotaExceededMessageFromError = (err: any) => {
  const detail = err?.data?.detail ?? err?.data ?? {}
  const used = typeof detail.used === 'number' ? detail.used : null
  const limit = typeof detail.limit === 'number' ? detail.limit : null

  if (used !== null && limit !== null) {
    const numberLocale = toNumberLocaleTag(locale.value)
    return t('operaciones.mesas.activeQuotaMessage', {
      tables: pluralLower.value,
      used: used.toLocaleString(numberLocale),
      limit: limit.toLocaleString(numberLocale),
    })
  }

  return typeof detail === 'string' ? detail : activeTableQuotaMessage.value
}

const tableErrorMessage = (err: any, fallback: string) => {
  if (isQuotaExceededError(err)) return quotaExceededMessageFromError(err)
  return err?.data?.detail || err?.data?.message || err?.message || fallback
}

// Refresh handler — fan out to both queries so the layout's manual refresh
// button updates the table list AND the tables-enabled toggle in one go.
const refreshAll = async () => {
  await Promise.all([refetch(), refreshProfile(), fetchBillingOverview()])
}
onMounted(() => setRefreshHandler(refreshAll))
onUnmounted(() => clearRefreshHandler(refreshAll))

// ── Toggle tables module ───────────────────────────────────────────────────
const posStore = usePOSStore()
const toast = useToast()
const isTogglingTables = ref(false)
const toggleTablesEnabled = async () => {
  if (!businessProfile.value || isTogglingTables.value) return
  isTogglingTables.value = true
  const newState = !businessProfile.value.tables_enabled
  try {
    await $fetch('/api/operaciones/toggles/tables', {
      method: 'PATCH',
      body: { enabled: newState },
    })
    await invalidateContextCaches()
    posStore.tablesEnabled = newState
    toast.success(
      newState ? t('operaciones.mesas.moduleAvailable', { tables: pluralLower.value }) : t('operaciones.mesas.moduleInactive', { tables: pluralLower.value }),
      { title: newState ? t('operaciones.mesas.moduleOn') : t('operaciones.mesas.moduleOff') }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || t('operaciones.mesas.moduleToggleError'), { title: 'Error' })
  } finally {
    isTogglingTables.value = false
  }
}

// ── Toggle waiter attribution (issue #573) ─────────────────────────────────
// Lives here (not on /operaciones/comandas) because the panel that depends on
// it — per-mesa default mesero — also lives on this page now.
const isTogglingWaiterAttribution = ref(false)
const toggleWaiterAttribution = async () => {
  if (!businessProfile.value || isTogglingWaiterAttribution.value) return
  isTogglingWaiterAttribution.value = true
  const newState = !businessProfile.value.waiter_attribution_enabled
  try {
    await $fetch('/api/operaciones/toggles/waiter-attribution', {
      method: 'PATCH',
      body: { enabled: newState },
    })
    await invalidateContextCaches()
    await cache.invalidateQueries({ key: ['tables'] })
    toast.success(
      newState
        ? t('operaciones.mesas.waiterAssignOn')
        : t('operaciones.mesas.waiterAssignOff'),
      { title: newState ? 'Activado' : 'Desactivado' }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || t('operaciones.mesas.toggleError'), { title: 'Error' })
  } finally {
    isTogglingWaiterAttribution.value = false
  }
}

// ── Toggle Table QR module (warocol.com#711) ───────────────────────────────
const isTogglingTableQrModule = ref(false)
const toggleTableQrModule = async () => {
  if (!businessProfile.value || isTogglingTableQrModule.value) return
  isTogglingTableQrModule.value = true
  const newState = !businessProfile.value.table_qr_module_enabled
  try {
    await $fetch('/api/operaciones/toggles/table-qr', {
      method: 'PATCH',
      body: { enabled: newState },
    })
    await invalidateContextCaches()
    await cache.invalidateQueries({ key: ['tables'] })
    toast.success(
      newState
        ? t('operaciones.mesas.qrOn')
        : t('operaciones.mesas.qrOff'),
      { title: newState ? t('operaciones.mesas.moduleActivated') : t('operaciones.mesas.moduleOff') },
    )
  } catch (error: any) {
    toast.error(error.data?.detail || t('operaciones.mesas.qrModuleError'), { title: 'Error' })
  } finally {
    isTogglingTableQrModule.value = false
  }
}

// Members embedded in the operaciones aggregator (no Module.EQUIPO required).
// Used by MesaPanel to render the "Mesero por defecto" picker.
const tenantMembers = computed<Array<{ id: string; name: string; role: string }>>(() =>
  (businessProfile.value as any)?.members ?? [],
)
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loadingTables" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <CommonsTheErrorState v-else-if="tablesError" />

    <!-- Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- ══════ MÓDULOS ══════ -->
      <div
        v-if="businessProfile"
        class="rounded-xl border-2 transition-colors divide-y divide-border"
        :class="businessProfile.tables_enabled
          ? 'border-border bg-surface'
          : 'border-state-warning-border bg-state-warning-bg'"
      >
        <!-- Tables module -->
        <div class="flex items-center justify-between gap-4 px-4 py-3">
          <div class="min-w-0">
            <p
              class="text-sm font-semibold leading-snug"
              :class="businessProfile.tables_enabled ? 'text-text-primary' : 'text-state-warning-text'"
            >
              {{ businessProfile.tables_enabled ? t('operaciones.mesas.moduleActive', { tables: pluralLower }) : t('operaciones.mesas.moduleInactive', { tables: pluralLower }) }}
            </p>
            <p
              class="text-xs mt-0.5 leading-snug"
              :class="businessProfile.tables_enabled ? 'text-text-secondary' : 'text-state-warning-text/80'"
            >
              {{ businessProfile.tables_enabled ? t('operaciones.mesas.moduleAvailable', { tables: pluralLower }) : t('operaciones.mesas.moduleEnableHelp', { tables: pluralLower }) }}
            </p>
          </div>
          <label
            class="relative inline-flex items-center cursor-pointer flex-shrink-0"
            :class="isTogglingTables ? 'opacity-50 pointer-events-none' : ''"
            :aria-label="businessProfile.tables_enabled ? t('operaciones.mesas.moduleInactive', { tables: pluralLower }) : t('operaciones.mesas.moduleActive', { tables: pluralLower })"
          >
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="businessProfile.tables_enabled"
              @change="toggleTablesEnabled"
              :disabled="isTogglingTables"
            />
            <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <!-- Waiter attribution (issue #573) — only meaningful when tables are enabled -->
        <div v-if="businessProfile.tables_enabled" class="flex items-center justify-between gap-4 px-4 py-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-snug text-text-primary">
              {{ t('operaciones.mesas.assignWaiterTitle', { table: singularLower }) }}
            </p>
            <p class="text-xs mt-0.5 leading-snug text-text-secondary">
              {{ t('operaciones.mesas.assignWaiterHelp', { table: singularLower }) }}
            </p>
          </div>
          <label
            class="relative inline-flex items-center cursor-pointer flex-shrink-0"
            :class="isTogglingWaiterAttribution ? 'opacity-50 pointer-events-none' : ''"
            :aria-label="businessProfile.waiter_attribution_enabled ? t('operaciones.mesas.waiterAssignOff') : t('operaciones.mesas.waiterAssignOn')"
          >
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="businessProfile.waiter_attribution_enabled"
              @change="toggleWaiterAttribution"
              :disabled="isTogglingWaiterAttribution"
            />
            <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <!-- Table QR module (warocol.com#711) -->
        <div v-if="businessProfile.tables_enabled" class="flex items-center justify-between gap-4 px-4 py-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold leading-snug text-text-primary">
              {{ t('operaciones.mesas.qrTitle') }}
            </p>
            <p class="text-xs mt-0.5 leading-snug text-text-secondary">
              {{ t('operaciones.mesas.qrHelp', { table: singularLower }) }}
            </p>
          </div>
          <label
            class="relative inline-flex items-center cursor-pointer flex-shrink-0"
            :class="isTogglingTableQrModule ? 'opacity-50 pointer-events-none' : ''"
            :aria-label="businessProfile.table_qr_module_enabled ? t('operaciones.mesas.disableQr') : t('operaciones.mesas.enableQr')"
          >
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="!!businessProfile.table_qr_module_enabled"
              @change="toggleTableQrModule"
              :disabled="isTogglingTableQrModule"
            >
            <div class="w-10 h-6 bg-control-toggle-track-off rounded-full peer peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-control-toggle-thumb after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
      </div>

      <!-- Filters -->
      <UiAdvancedFiltersBar
        v-model:search="searchTerm"
        :search-placeholder="t('operaciones.mesas.searchPlaceholder', { table: singularLower })"
        :show-date-range="false"
        :show-clear="hasActiveTableFilters"
        @clear="clearTableFilters"
      >
        <template #additional-filters>
          <UiFilterSelect
            v-model="statusFilter"
            :placeholder="t('operaciones.mesas.allStatuses')"
            :options="statusOptions"
            :aria-label="t('menu.common.estado')"
          />
        </template>
        <template #trailing>
          <button
            type="button"
            :disabled="isActiveTableQuotaBlocked"
            :title="isActiveTableQuotaBlocked ? activeTableQuotaMessage : t('operaciones.mesas.newTable', { table: singularLower })"
            class="h-9 px-4 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] transition-all shadow-sm shadow-primary/30 whitespace-nowrap"
            :class="isActiveTableQuotaBlocked ? 'opacity-50 cursor-not-allowed hover:bg-primary' : ''"
            @click="openPanel(null)"
          >
            <span class="hidden sm:inline">{{ t('operaciones.mesas.newTable', { table: singularLower }) }}</span>
            <span class="sm:hidden">{{ t('operaciones.mesas.newShort') }}</span>
          </button>
        </template>
      </UiAdvancedFiltersBar>

      <div
        v-if="isActiveTableQuotaBlocked"
        class="flex min-w-0 items-center gap-3 rounded-lg border border-state-warning-border bg-state-warning-bg px-3 py-2 text-xs text-state-warning-text"
      >
        <p class="min-w-0 flex-1 truncate" :title="activeTableQuotaMessage">{{ activeTableQuotaMessage }}</p>
        <NuxtLink to="/gestion/billing/uso" class="inline-flex flex-shrink-0 font-semibold underline underline-offset-2">
          {{ t('operaciones.mesas.viewPlan') }}
        </NuxtLink>
      </div>

      <section
        class="rounded-xl border border-data-table-border bg-data-table-container-bg shadow-sm overflow-hidden"
        aria-labelledby="active-tables-title"
      >
        <div class="flex flex-col gap-2 border-b border-data-table-border bg-data-table-header-bg px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div class="min-w-0">
            <h2 id="active-tables-title" class="text-sm font-bold text-text-primary">
              {{ plural }}
            </h2>
            <p class="mt-0.5 text-xs text-text-secondary leading-snug">
              {{ t('operaciones.mesas.dragHint') }}
            </p>
          </div>
          <p class="text-xs font-semibold text-text-tertiary">
            <span
              v-if="isSavingTableOrder"
              class="inline-flex min-h-7 items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-primary"
            >
              <span>{{ t('operaciones.mesas.savingOrderBusy') }}</span>
              <UiLoadingDots size="7px" color="currentColor" aria-hidden="true" />
            </span>
            <span
              v-else-if="hasActiveTableFilters"
              class="inline-flex min-h-7 items-center rounded-full border border-state-warning-border bg-state-warning-bg px-2.5 py-1 text-state-warning-text"
            >
              {{ t('operaciones.mesas.clearFiltersHint') }}
            </span>
            <span
              v-else
              class="inline-flex min-h-7 items-center rounded-full border border-status-chip-border bg-status-chip-bg px-2.5 py-1 text-status-chip-text"
            >
              {{ t('operaciones.mesas.savedAutomatically') }}
            </span>
          </p>
        </div>

        <div v-if="tableOrderError" class="border-b border-destructive/20 bg-destructive/8 px-4 py-3">
          <p class="text-sm font-medium text-destructive">{{ tableOrderError }}</p>
        </div>

        <div v-if="activeTables.length === 0" class="px-4 py-8 text-center">
          <p class="text-sm font-semibold text-text-primary">{{ t('operaciones.mesas.noTables', { tables: pluralLower }) }}</p>
          <p class="mt-1 text-xs text-text-secondary">{{ t('operaciones.mesas.createFirstTable', { table: singularLower }) }}</p>
        </div>

        <Draggable
          v-else-if="!hasActiveTableFilters"
          v-model="tableOrderDraft"
          item-key="id"
          tag="ol"
          handle=".table-order-handle"
          :disabled="isTableDragDisabled"
          ghost-class="opacity-50"
          chosen-class="bg-data-table-row-hover-bg"
          drag-class="shadow-lg"
          class="divide-y divide-data-table-border"
          :aria-label="t('operaciones.mesas.activeTables')"
          @start="onTableOrderDragStart"
          @end="onTableOrderDragEnd"
        >
          <template #item="{ element: table, index }">
            <li
              class="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-data-table-row-hover-bg md:grid-cols-[auto_2fr_.8fr_1fr_1fr_auto]"
              :class="activeTableRowClass(index)"
            >
              <button
                type="button"
                class="table-order-handle flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-tertiary transition-colors"
                :class="isTableDragDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab hover:bg-surface-secondary hover:text-text-primary active:cursor-grabbing'"
                :title="tableDragDisabledReason"
                :aria-label="`Arrastrar ${table.name}`"
                :disabled="isTableDragDisabled"
              >
                <span class="text-lg font-black leading-none tracking-tight" aria-hidden="true">⋮⋮</span>
              </button>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-xs font-black text-text-tertiary tabular-nums">{{ index + 1 }}</span>
                  <span class="truncate text-sm font-bold text-text-primary">{{ table.name }}</span>
                  <span class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary tabular-nums">
                    {{ displayTableCode(table) }}
                  </span>
                </div>
                <p class="mt-0.5 text-xs text-text-secondary md:hidden">
                  {{ table.capacity ? `${table.capacity} persona${table.capacity !== 1 ? 's' : ''}` : t('operaciones.mesas.noCapacity') }}
                </p>
                <p
                  v-if="businessProfile?.waiter_attribution_enabled"
                  class="text-[11px] mt-0.5 font-medium truncate md:hidden"
                  :class="table.assigned_member_name ? 'text-primary' : 'text-text-tertiary italic'"
                >
                  Mesero: {{ table.assigned_member_name || t('operaciones.mesas.unassigned') }}
                </p>
                <div
                  v-if="businessProfile?.tables_enabled && businessProfile?.table_qr_module_enabled"
                  class="mt-2 md:hidden"
                >
                  <MesasTableQrControls
                    :table="table"
                    variant="compact"
                    :qr-quota-blocked="isActiveQrQuotaBlocked"
                    :qr-quota-message="activeQrQuotaMessage"
                    @updated="onTableQrUpdated"
                  />
                </div>
              </div>

              <span class="hidden text-sm text-text-secondary md:block">
                {{ table.capacity ? t('operaciones.mesas.peopleCount', { count: table.capacity }) : '—' }}
              </span>
              <span
                v-if="businessProfile?.waiter_attribution_enabled"
                class="hidden min-w-0 md:block"
              >
                <span
                  v-if="table.assigned_member_name"
                  class="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-status-chip-border bg-status-chip-bg px-2 py-0.5 text-[11px] font-semibold text-status-chip-text"
                >
                  {{ table.assigned_member_name }}
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-md border border-border bg-surface-secondary px-2 py-0.5 text-[11px] font-semibold text-text-tertiary"
                >
                  {{ t('operaciones.mesas.unassigned') }}
                </span>
              </span>
              <div
                v-if="businessProfile?.tables_enabled && businessProfile?.table_qr_module_enabled"
                class="hidden md:block"
              >
                <MesasTableQrControls
                  :table="table"
                  variant="compact"
                  :qr-quota-blocked="isActiveQrQuotaBlocked"
                  :qr-quota-message="activeQrQuotaMessage"
                  @updated="onTableQrUpdated"
                />
              </div>

              <div class="flex items-center justify-end gap-1">
                <UiStatusBadge :variant="badgeVariant(table.status)" size="sm">
                  {{ statusLabel(table.status) }}
                </UiStatusBadge>
                <button :aria-label="`Editar ${table.name}`" title="Editar" class="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30" @click="openPanel(table)">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button :aria-label="`Desactivar ${table.name}`" title="Desactivar" class="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-state-warning-bg hover:text-state-warning-text focus:outline-none focus:ring-2 focus:ring-state-warning-border" @click="openDeactivateModal(table)">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </button>
                <button :aria-label="`Eliminar ${table.name}`" title="Eliminar" class="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/30" @click="openDeleteModal(table)">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </li>
          </template>
        </Draggable>

        <ol
          v-else
          class="divide-y divide-data-table-border"
          :aria-label="t('operaciones.mesas.filteredActive')"
        >
          <li
            v-for="(table, index) in activeTables"
            :key="table.id"
            class="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-data-table-row-hover-bg md:grid-cols-[auto_2fr_.8fr_1fr_1fr_auto]"
            :class="activeTableRowClass(index)"
          >
            <button
              type="button"
              class="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-lg border border-border text-text-tertiary opacity-50"
              :title="tableDragDisabledReason"
              :aria-label="`Arrastrar ${table.name}`"
              disabled
            >
              <span class="text-lg font-black leading-none tracking-tight" aria-hidden="true">⋮⋮</span>
            </button>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-black text-text-tertiary tabular-nums">{{ index + 1 }}</span>
                <span class="truncate text-sm font-bold text-text-primary">{{ table.name }}</span>
                <span class="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary tabular-nums">
                  {{ displayTableCode(table) }}
                </span>
              </div>
              <p class="mt-0.5 text-xs text-text-secondary md:hidden">
                {{ table.capacity ? `${table.capacity} persona${table.capacity !== 1 ? 's' : ''}` : t('operaciones.mesas.noCapacity') }}
              </p>
              <p
                v-if="businessProfile?.waiter_attribution_enabled"
                class="text-[11px] mt-0.5 font-medium truncate md:hidden"
                :class="table.assigned_member_name ? 'text-primary' : 'text-text-tertiary italic'"
              >
                Mesero: {{ table.assigned_member_name || t('operaciones.mesas.unassigned') }}
              </p>
            </div>
            <span class="hidden text-sm text-text-secondary md:block">
              {{ table.capacity ? t('operaciones.mesas.peopleCount', { count: table.capacity }) : '—' }}
            </span>
            <span v-if="businessProfile?.waiter_attribution_enabled" class="hidden min-w-0 md:block">
              <span v-if="table.assigned_member_name" class="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-status-chip-border bg-status-chip-bg px-2 py-0.5 text-[11px] font-semibold text-status-chip-text">{{ table.assigned_member_name }}</span>
              <span v-else class="inline-flex items-center rounded-md border border-border bg-surface-secondary px-2 py-0.5 text-[11px] font-semibold text-text-tertiary">{{ t('operaciones.mesas.unassigned') }}</span>
            </span>
            <div v-if="businessProfile?.tables_enabled && businessProfile?.table_qr_module_enabled" class="hidden md:block">
              <MesasTableQrControls
                :table="table"
                variant="compact"
                :qr-quota-blocked="isActiveQrQuotaBlocked"
                :qr-quota-message="activeQrQuotaMessage"
                @updated="onTableQrUpdated"
              />
            </div>
            <div class="flex items-center justify-end gap-1">
              <UiStatusBadge :variant="badgeVariant(table.status)" size="sm">{{ statusLabel(table.status) }}</UiStatusBadge>
              <button :aria-label="`Editar ${table.name}`" title="Editar" class="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30" @click="openPanel(table)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button :aria-label="`Desactivar ${table.name}`" title="Desactivar" class="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-state-warning-bg hover:text-state-warning-text focus:outline-none focus:ring-2 focus:ring-state-warning-border" @click="openDeactivateModal(table)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </button>
              <button :aria-label="`Eliminar ${table.name}`" title="Eliminar" class="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/30" @click="openDeleteModal(table)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </li>
        </ol>
      </section>

      <!-- ══════ INACTIVE TABLES ══════ -->
      <template v-if="inactiveTables.length > 0">
        <UiResponsiveDataView
          :columns="tableColumns"
          :data="inactiveTables"
          empty-message=""
          variant="default"
          row-size="sm"
        >
          <!-- Mobile card -->
          <template #card="{ item }">
            <div class="flex items-center gap-3 py-2 px-3 border-b border-border transition-colors hover:bg-surface-secondary opacity-60">
              <div class="flex-1 min-w-0">
                <span class="text-sm font-bold text-text-secondary line-through">{{ item.name }}</span>
                <p class="text-xs text-text-tertiary mt-0.5">
                  {{ item.capacity ? `${item.capacity} persona${item.capacity !== 1 ? 's' : ''}` : t('operaciones.mesas.noCapacity') }}
                </p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-full bg-status-chip-bg text-status-chip-text border border-status-chip-border">Inactiva</span>
                <button
                  :aria-label="`Activar ${item.name}`"
                  :disabled="activatingId === item.id || isActiveTableQuotaBlocked"
                  :title="isActiveTableQuotaBlocked ? activeTableQuotaMessage : `Activar ${item.name}`"
                  class="flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg text-xs font-semibold text-state-success-text border border-state-success-border hover:bg-state-success-bg transition-colors disabled:opacity-50"
                  @click="activateTable(item.id)"
                >
                  <svg v-if="activatingId !== item.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                  <UiLoadingMatrix v-else size="4px" />
                  Activar
                </button>
                <button :aria-label="`Eliminar ${item.name}`" class="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-tertiary hover:bg-destructive/10 hover:text-destructive transition-colors" @click="openDeleteModal(item)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </template>

          <!-- Desktop: name -->
          <template #cell-name="{ value }">
            <span class="text-sm font-medium text-text-tertiary line-through">{{ value }}</span>
          </template>

          <!-- Desktop: capacity -->
          <template #cell-capacity="{ value }">
            <span class="text-sm text-text-tertiary">
              {{ value ? `${value} persona${value !== 1 ? 's' : ''}` : '—' }}
            </span>
          </template>

          <!-- Desktop: status (always Inactiva) -->
          <template #cell-status>
            <span class="text-xs font-semibold text-text-tertiary uppercase tracking-tight">Inactiva</span>
          </template>

          <!-- Desktop: actions -->
          <template #cell-actions="{ row }">
            <div class="flex items-center justify-end gap-2">
              <button
                :aria-label="`Activar ${row.name}`"
                :disabled="activatingId === row.id || isActiveTableQuotaBlocked"
                :title="isActiveTableQuotaBlocked ? activeTableQuotaMessage : `Activar ${row.name}`"
                class="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-state-success-text border border-state-success-border hover:bg-state-success-bg transition-colors focus:outline-none focus:ring-2 focus:ring-state-success-border disabled:opacity-50"
                @click="activateTable(row.id)"
              >
                <svg v-if="activatingId !== row.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                <UiLoadingMatrix v-else size="4px" />
                Activar
              </button>
              <button :aria-label="`Eliminar ${row.name}`" title="Eliminar" class="flex items-center justify-center h-9 w-9 rounded-lg text-text-tertiary hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/30" @click="openDeleteModal(row)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </template>
        </UiResponsiveDataView>
      </template>
    </div>

    <!-- Create / Edit Panel -->
    <MesasMesaPanel
      v-model="showPanel"
      :table="panelTable"
      :members="tenantMembers"
      :waiter-attribution-enabled="!!businessProfile?.waiter_attribution_enabled"
      :table-qr-module-enabled="!!businessProfile?.tables_enabled && !!businessProfile?.table_qr_module_enabled"
      :create-quota-blocked="isActiveTableQuotaBlocked"
      :create-quota-message="activeTableQuotaMessage"
      :qr-quota-blocked="isActiveQrQuotaBlocked"
      :qr-quota-message="activeQrQuotaMessage"
      @saved="onSaved"
      @qr-updated="onTableQrUpdated"
    />

    <!-- ══════ DEACTIVATE MODAL ══════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="deactivateModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay-backdrop/60 backdrop-blur-sm"
          @click.self="deactivateModalOpen = false"
        >
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
            appear
          >
            <div v-if="deactivateModalOpen" class="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div class="relative px-5 pt-5 pb-4 border-b border-border/60">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-state-warning-bg border border-state-warning-border">
                    <svg class="w-5 h-5 text-state-warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  </div>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <h3 class="text-base font-bold text-text-primary leading-tight">{{ `Desactivar ${singularLower}` }}</h3>
                    <p class="text-sm text-text-secondary mt-0.5 truncate font-medium">{{ deactivateModalTable?.name }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  class="absolute top-4 end-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors"
                  @click="deactivateModalOpen = false"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div class="px-5 py-4 flex flex-col gap-3">
                <p class="text-sm text-text-secondary leading-relaxed">
                  {{ `La ${singularLower} quedará inactiva y no aparecerá en el punto de venta. Podrás reactivarla en cualquier momento desde esta pantalla.` }}
                </p>
                <div v-if="deactivateError" class="rounded-xl bg-destructive/8 border border-destructive/20 px-4 py-3">
                  <p class="text-sm text-destructive font-medium">{{ deactivateError }}</p>
                </div>
              </div>

              <div class="px-5 pb-5 flex gap-2.5">
                <button
                  type="button"
                  class="flex-1 min-h-[44px] rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
                  @click="deactivateModalOpen = false"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  :disabled="isDeactivating"
                  class="flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-state-warning-action-bg text-state-warning-action-text hover:bg-state-warning-action-bg/90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                  @click="confirmDeactivate"
                >
                  <UiLoadingDots v-if="isDeactivating" size="8px" color="currentColor" />
                  <template v-else>Desactivar</template>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════ DELETE MODAL ══════ -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="deleteModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay-backdrop/60 backdrop-blur-sm"
          @click.self="deleteModalOpen = false"
        >
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
            appear
          >
            <div v-if="deleteModalOpen" class="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div class="relative px-5 pt-5 pb-4 border-b border-border/60">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-destructive/10 border border-destructive/20">
                    <svg class="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </div>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <h3 class="text-base font-bold text-text-primary leading-tight">{{ `Eliminar ${singularLower}` }}</h3>
                    <p class="text-sm text-text-secondary mt-0.5 truncate font-medium">{{ deleteModalTable?.name }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  class="absolute top-4 end-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors"
                  @click="deleteModalOpen = false"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div class="px-5 py-4 flex flex-col gap-3">
                <!-- Blocked: open session -->
                <div v-if="hasOpenSession" class="rounded-xl bg-state-danger-bg border border-state-danger-border p-4">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-state-danger-bg flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-state-danger-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-state-danger-text leading-snug">No se puede eliminar ahora</p>
                      <p class="text-xs text-state-danger-text/80 mt-1 leading-relaxed">{{ `Esta ${singularLower} tiene una sesión activa. Ciérrala antes de eliminarla.` }}</p>
                    </div>
                  </div>
                </div>

                <!-- Archive warning: has closed history -->
                <div v-else-if="hasHistory" class="rounded-xl bg-state-warning-bg border border-state-warning-border p-4">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-state-warning-bg flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-state-warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-state-warning-text leading-snug">{{ `Esta ${singularLower} se archivará` }}</p>
                      <p class="text-xs text-state-warning-text/80 mt-1 leading-relaxed">Tiene historial de sesiones. Se archivará para preservar los reportes y dejará de aparecer en el sistema.</p>
                    </div>
                  </div>
                </div>

                <!-- Safe: no history, hard delete -->
                <div v-else class="rounded-xl bg-state-success-bg border border-state-success-border p-4">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-state-success-bg flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-state-success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-state-success-text leading-snug">Sin historial — eliminación permanente</p>
                      <p class="text-xs text-state-success-text/80 mt-1 leading-relaxed">{{ `Esta ${singularLower} no tiene sesiones registradas. Se eliminará de forma definitiva.` }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="deleteError" class="rounded-xl bg-destructive/8 border border-destructive/20 px-4 py-3">
                  <p class="text-sm text-destructive font-medium">{{ deleteError }}</p>
                </div>
              </div>

              <div class="px-5 pb-5 flex gap-2.5">
                <button
                  type="button"
                  class="flex-1 min-h-[44px] rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
                  @click="deleteModalOpen = false"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  :disabled="hasOpenSession || isDeleting"
                  class="flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-state-danger-action-bg text-state-danger-action-text hover:bg-state-danger-action-bg/90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                  @click="confirmDelete"
                >
                  <UiLoadingDots v-if="isDeleting" size="8px" color="currentColor" />
                  <template v-else>{{ hasHistory ? 'Archivar' : 'Eliminar' }}</template>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
