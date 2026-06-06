<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useActiveStationsQuery } from '@/composables/queries/useActiveStations'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({ layout: 'dashboard' })

useHead({ title: 'Comandas — WARO' })

const { currentTenant } = useTenantReactive()
const { singular: tableSingular } = useTableLabel()
const { activeStations } = useActiveStationsQuery()

const selectedSourceType = ref('')
const selectedStationId = ref('')
const selectedStatus = ref('pending,preparing,ready')
const selectedDate = ref('')

const filters = computed(() => ({
  source_type: selectedSourceType.value || undefined,
  station_id: selectedStationId.value || undefined,
  status: selectedStatus.value || undefined,
  date: selectedDate.value || undefined,
}))

const hasActiveFilters = computed(
  () =>
    !!selectedSourceType.value
    || !!selectedStationId.value
    || selectedStatus.value !== 'pending,preparing,ready'
    || !!selectedDate.value,
)

const clearFilters = () => {
  selectedSourceType.value = ''
  selectedStationId.value = ''
  selectedStatus.value = 'pending,preparing,ready'
  selectedDate.value = ''
  clearSelection()
}

const SOURCE_LABELS = computed<Record<string, string>>(() => ({
  table:    tableSingular.value,
  pos:      'Mostrador',
  delivery: 'Domicilio',
  pickup:   'Recogida',
}))

const COMANDA_STATUS_LABELS: Record<string, string> = {
  pending:   'Pendiente',
  preparing: 'En preparación',
  ready:     'Lista',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

const columns: Column[] = [
  { key: '_select',            title: '',          sortable: false, align: 'center' as const, width: '44px', class: '!px-0' },
  { key: 'comanda_number',     title: '# Comanda', sortable: false, align: 'left' },
  { key: 'source_type',        title: 'Origen',    sortable: false, align: 'left' },
  { key: 'table_display_name', title: 'Destino',   sortable: false, align: 'left' },
  { key: 'status',             title: 'Estado',    sortable: false, align: 'left' },
  { key: 'items',              title: 'Items',     sortable: false, align: 'left' },
  { key: 'elapsed_seconds',    title: 'Tiempo',    sortable: false, align: 'left' },
  { key: '_actions',           title: '',          sortable: false, align: 'right', width: '48px' },
]

// ── Detail panel ────────────────────────────────────────────────────────────
const selectedComanda = ref<any>(null)
const panelOpen = ref(false)
const openPanel = (comanda: any) => {
  selectedComanda.value = comanda
  panelOpen.value = true
}

// ── Multi-select + bulk status ───────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:   ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready:     ['delivered'],
  delivered: [],
  cancelled: [],
}

const TRANSITION_LABELS: Record<string, string> = {
  preparing: 'En preparación',
  ready:     'Lista',
  delivered: 'Entregada',
  cancelled: 'Cancelar comanda',
}

const selectedIds = ref<string[]>([])
const isBulkUpdating = ref(false)

const allPageSelected = computed(() => {
  const ids = comandas.value.map((c: any) => c.id)
  return ids.length > 0 && ids.every((id: string) => selectedIds.value.includes(id))
})

// Intersection of valid next-states across all selected comandas
const availableTransitions = computed((): string[] => {
  if (!selectedIds.value.length) return []
  const selected = comandas.value.filter((c: any) => selectedIds.value.includes(c.id))
  const sets = selected.map((c: any) => new Set(ALLOWED_TRANSITIONS[c.status] ?? []))
  if (!sets.length) return []
  return [...sets[0]].filter(t => sets.every(s => s.has(t)))
})

const toggleSelect = (id: string) => {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter(i => i !== id)
    : [...selectedIds.value, id]
}

const toggleSelectAll = () => {
  selectedIds.value = allPageSelected.value
    ? []
    : comandas.value.map((c: any) => c.id)
}

const clearSelection = () => { selectedIds.value = [] }

const executeBulkUpdate = async (status: string) => {
  if (!status || !selectedIds.value.length) return
  isBulkUpdating.value = true
  try {
    const res = await $fetch('/api/api/comandas/bulk-status', {
      method: 'PATCH',
      body: { comanda_ids: selectedIds.value, status },
    }) as any
    clearSelection()
    await refetchComandas()
    useToast().success(res.message || 'Estado actualizado', { title: 'Listo' })
  } catch (err: any) {
    useToast().error(err.data?.detail || 'Error al actualizar', { title: 'Error' })
  } finally {
    isBulkUpdating.value = false
  }
}

const {
  data: comandasData,
  status: comandasStatus,
  asyncStatus: comandasAsyncStatus,
  refetch: refetchComandas,
} = useQuery({
  key: () => ['comandas-monitor', currentTenant.value?.id, filters.value],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/comandas', {
    params: filters.value,
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

watch(filters, () => { clearSelection() })

const comandas = computed(() => comandasData.value?.data ?? [])
const isLoadingComandas = computed(() => comandasStatus.value === 'loading' || (!comandasData.value && comandasStatus.value !== 'error'))
const isRefreshingComandas = computed(() => comandasAsyncStatus.value === 'loading' && comandasData.value != null)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refetchComandas) })
onUnmounted(() => { clearRefreshHandler(refetchComandas) })
registerProgressiveLoading(isRefreshingComandas)

// ── Live ticker ──────────────────────────────────────────────────────────────
const now = ref(Date.now())
const fetchedAt = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | null = null

watch(comandasData, () => { fetchedAt.value = Date.now() })

onMounted(() => { tickInterval = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { if (tickInterval) clearInterval(tickInterval) })

const liveElapsed = (base: number | null): number | null => {
  if (base === null || base === undefined) return null
  return base + Math.floor((now.value - fetchedAt.value) / 1000)
}

const formatElapsed = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined || seconds < 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const totalMin = Math.floor(seconds / 60)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const getComandaStatusVariant = (status: string): string => {
  const map: Record<string, string> = {
    pending:   'warning',
    preparing: 'info',
    ready:     'success',
    delivered: 'secondary',
    cancelled: 'destructive',
  }
  return map[status] ?? 'secondary'
}
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <!-- Loading -->
    <div v-if="isLoadingComandas" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main content -->
    <div v-else class="flex flex-col gap-3">
      <UiAdvancedFiltersBar
        :search-fields="[]"
        :show-search="false"
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="selectedSourceType"
            :class="filterSelectClass"
            aria-label="Filtrar por origen"
          >
            <option value="">Origen</option>
            <option value="table">{{ tableSingular }}</option>
            <option value="pos">Mostrador</option>
            <option value="delivery">Domicilio</option>
            <option value="pickup">Recogida</option>
          </select>
          <select
            v-model="selectedStationId"
            :class="filterSelectClass"
            aria-label="Filtrar por estación"
          >
            <option value="">Estación</option>
            <option v-for="s in activeStations" :key="s.id" :value="s.id">
              {{ s.kitchen_name || s.name }}
            </option>
          </select>
          <select
            v-model="selectedStatus"
            :class="filterSelectClass"
            aria-label="Filtrar por estado"
          >
            <option value="pending,preparing,ready">Activas</option>
            <option value="ready">Listas</option>
            <option value="pending">Pendientes</option>
            <option value="preparing">En preparación</option>
            <option value="delivered">Entregadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="pending,preparing,ready,delivered,cancelled">Todas</option>
          </select>
          <input
            v-model="selectedDate"
            type="date"
            :class="filterSelectClass"
            class="min-w-[9rem] cursor-pointer"
            aria-label="Filtrar por fecha"
          >
        </template>
      </UiAdvancedFiltersBar>

      <!-- Bulk action bar -->
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="selectedIds.length > 0"
          class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5"
        >
          <span class="text-sm font-semibold text-text-primary flex-shrink-0">
            {{ selectedIds.length }} seleccionada{{ selectedIds.length !== 1 ? 's' : '' }}
          </span>
          <button type="button" @click="clearSelection" class="text-xs text-text-secondary hover:text-text-primary underline flex-shrink-0">
            deseleccionar
          </button>
          <div class="flex-1" />
          <template v-for="status in availableTransitions" :key="status">
            <button
              type="button"
              :disabled="isBulkUpdating"
              class="h-9 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              :class="status === 'cancelled'
                ? 'border border-destructive text-destructive hover:bg-destructive/10'
                : 'bg-action-primary-bg text-action-primary-text hover:bg-action-primary-hover-bg'"
              @click="executeBulkUpdate(status)"
            >
              <UiLoadingDots v-if="isBulkUpdating" size="8px" color="currentColor" />
              {{ TRANSITION_LABELS[status] ?? status }}
            </button>
          </template>
          <button type="button" @click="clearSelection" aria-label="Deseleccionar" class="h-9 w-9 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </Transition>

      <HealthSemaphore :is-unlocked="true" title="# Comanda">
        <template #header-actions>
          <span class="text-xs font-bold text-text-secondary bg-surface-secondary px-2 py-0.5 rounded-full">
            {{ comandas.filter(c => c.status !== 'cancelled').length }} activa{{ comandas.filter(c => c.status !== 'cancelled').length !== 1 ? 's' : '' }}
          </span>
        </template>
        <div class="[&_td]:!py-1 [&_th]:!py-1.5">
        <UiResponsiveDataView
          row-size="sm"
          :columns="columns"
          :data="comandas"
          empty-message="No hay comandas activas."
          empty-sub-message="Todo al día por ahora."
          variant="default"
        >
      <!-- Select-all header -->
      <template #header-_select>
        <div class="flex items-center justify-center">
          <label class="cursor-pointer">
            <input type="checkbox" class="sr-only peer" :checked="allPageSelected" @change="toggleSelectAll" />
            <span class="w-5 h-5 rounded-[5px] border-2 border-border bg-background peer-checked:bg-control-toggle-track-on peer-checked:border-primary transition-colors flex items-center justify-center text-action-primary-text">
              <svg v-if="allPageSelected" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
                <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </label>
        </div>
      </template>

      <!-- Checkbox cell -->
      <template #cell-_select="{ row }">
        <label @click.stop class="flex items-center justify-center cursor-pointer">
          <input type="checkbox" class="sr-only peer" :checked="selectedIds.includes(row.id)" @change.stop="toggleSelect(row.id)" />
          <span class="w-5 h-5 rounded-[5px] border-2 border-border bg-background peer-checked:bg-control-toggle-track-on peer-checked:border-primary transition-colors flex items-center justify-center text-action-primary-text">
            <svg v-if="selectedIds.includes(row.id)" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
              <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </label>
      </template>

      <!-- Desktop cells -->
      <template #cell-comanda_number="{ value, row }">
        <span class="text-sm font-black" :class="row.status === 'cancelled' ? 'text-text-tertiary line-through' : 'text-text-primary'">#{{ value }}-{{ String(row.comanda_index).padStart(2, '0') }}</span>
      </template>
      <template #cell-source_type="{ value }">
        <UiStatusBadge variant="info" size="sm" format="text">
          {{ SOURCE_LABELS[value] ?? value }}
        </UiStatusBadge>
      </template>
      <template #cell-table_display_name="{ value, row }">
        <span class="text-sm font-medium" :class="row.status === 'cancelled' ? 'text-text-tertiary line-through' : 'text-text-primary'">{{ value }}</span>
      </template>
      <template #cell-status="{ value }">
        <UiStatusBadge :variant="getComandaStatusVariant(value)" size="sm" format="text">
          {{ COMANDA_STATUS_LABELS[value] ?? value }}
        </UiStatusBadge>
      </template>
      <template #cell-items="{ value }">
        <div class="flex flex-col gap-0.5 py-0.5">
          <div v-for="item in value" :key="item.id" class="flex items-center gap-1.5">
              <span
                class="text-xs font-semibold leading-tight"
                :class="item.status === 'cancelled' ? 'line-through text-text-tertiary' : 'text-text-primary'"
              >
                <span class="text-text-tertiary font-normal">{{ item.quantity }}×</span>
                {{ item.kitchen_name }}
              </span>
              <span v-if="item.status === 'cancelled'" class="text-[10px] font-semibold text-destructive bg-destructive/10 px-1 rounded">✕</span>
              <span v-if="item.notes" class="text-state-warning-icon text-[10px]" :title="item.notes">📝</span>
            </div>
        </div>
      </template>
      <template #cell-elapsed_seconds="{ value, row }">
        <UiStatusBadge v-if="row.status === 'cancelled'" variant="destructive" size="sm" format="text">
          Anulada
        </UiStatusBadge>
        <span
          v-else
          class="text-sm font-bold tabular-nums"
          :class="row.alert_level >= 2 ? 'text-destructive' : row.alert_level >= 1 ? 'text-warning' : 'text-text-secondary'"
        >{{ formatElapsed(liveElapsed(value)) }}</span>
      </template>
      <template #cell-_actions="{ row }">
        <button
          type="button"
          class="flex items-center justify-center w-8 h-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-primary transition-colors"
          aria-label="Ver detalle"
          @click.stop="openPanel(row)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </template>

      <!-- Mobile card: tap anywhere opens panel -->
      <template #card="{ item }">
        <div
          class="flex items-start gap-3 py-3 px-3 border-b border-border cursor-pointer"
          :class="[
            item.alert_level >= 2 ? 'bg-destructive/5' :
            item.alert_level >= 1 ? 'bg-warning/5' :
            item.status === 'ready' ? 'bg-success/5' : ''
          ]"
          @click="openPanel(item)"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-text-primary leading-tight">
              <span class="text-primary">#{{ item.comanda_number }}-{{ String(item.comanda_index).padStart(2, '0') }}</span>
              <span class="text-text-secondary font-normal"> · {{ item.table_display_name }}</span>
            </p>
            <p class="text-xs text-text-secondary mt-0.5">
              {{ SOURCE_LABELS[item.source_type] ?? item.source_type }}
              · {{ item.items?.filter((i: any) => i.status !== 'cancelled').length ?? 0 }} items
            </p>
            <div class="flex items-center gap-2 mt-1.5">
              <UiStatusBadge :variant="getComandaStatusVariant(item.status)" size="sm" format="text">
                {{ COMANDA_STATUS_LABELS[item.status] ?? item.status }}
              </UiStatusBadge>
              <span
                class="text-xs font-bold"
                :class="item.alert_level >= 2 ? 'text-destructive' : item.alert_level >= 1 ? 'text-warning' : 'text-text-secondary'"
              >
                {{ formatElapsed(liveElapsed(item.elapsed_seconds)) }}
              </span>
            </div>
          </div>
          <svg class="w-4 h-4 text-text-tertiary flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </template>
        </UiResponsiveDataView>
        </div>
      </HealthSemaphore>
    </div>

    <DespachoComandaDetailPanel v-model="panelOpen" :comanda="selectedComanda" @status-updated="refetchComandas" />
  </div>
</template>
