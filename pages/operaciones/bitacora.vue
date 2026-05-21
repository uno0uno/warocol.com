<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ClipboardDocumentListIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import {
  type OperationEventRow,
  ACTION_LABELS,
  CHANNEL_LABELS,
  OPERATION_EVENT_ACTIONS,
  formatOperationEventActor,
  formatOperationEventSummary,
  formatOperationEventTableName,
} from '~/composables/useOperationEvents'
import { filterSelectClass } from '~/composables/useFilterSelectClass'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({ layout: 'dashboard', module: 'operaciones' })
useHead({ title: 'Bitácora de operaciones — WaRo' })

const PAGE_SIZE = 50
const { currentTenant } = useTenantReactive()
const { formatDateTime, formatCurrency } = useFormatters()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

const channelFilter = ref<string | null>(null)
const actionFilter = ref<string | null>(null)
const currentPage = ref(1)
const detailOpen = ref(false)
const selectedEvent = ref<OperationEventRow | null>(null)

const hasActiveFilters = computed(
  () =>
    !!appliedSearch.value
    || !!dateRangeDates.value
    || !!channelFilter.value
    || !!actionFilter.value,
)

watch([dateRange, channelFilter, actionFilter, appliedSearch], () => {
  currentPage.value = 1
})

const queryParams = computed(() => ({
  domain: 'pos',
  limit: PAGE_SIZE,
  offset: (currentPage.value - 1) * PAGE_SIZE,
  date_from: dateRange.value.from ?? undefined,
  date_to: dateRange.value.to ?? undefined,
  channel: channelFilter.value ?? undefined,
  action: actionFilter.value ?? undefined,
  q: appliedSearch.value || undefined,
}))

const {
  data: eventsData,
  status: eventsStatus,
  asyncStatus: eventsAsyncStatus,
  error: fetchError,
  refetch,
} = useQuery({
  key: () => ['operaciones', 'operation-events', currentTenant.value?.id, queryParams.value],
  query: () => $fetch<import('~/composables/useOperationEvents').OperationEventsListResponse>(
    '/api/operaciones/operation-events',
    { params: queryParams.value },
  ),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const events = computed(() => eventsData.value?.data ?? [])
const totalCount = computed(() => eventsData.value?.pagination?.total ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))
const isLoading = computed(() => eventsStatus.value === 'pending' && !eventsData.value)
const isRefreshing = computed(() => eventsAsyncStatus.value === 'loading' && !!eventsData.value)

registerProgressiveLoading(isRefreshing)
onMounted(() => setRefreshHandler(refetch))
onUnmounted(() => clearRefreshHandler())

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

const clearFilters = () => {
  clearSearch()
  clearDateRange()
  channelFilter.value = null
  actionFilter.value = null
  currentPage.value = 1
}

const openDetail = (row: OperationEventRow) => {
  selectedEvent.value = row
  detailOpen.value = true
}

const closeDetail = () => {
  detailOpen.value = false
  selectedEvent.value = null
}

const detailPayloadJson = computed(() => {
  if (!selectedEvent.value?.payload) return '{}'
  return JSON.stringify(selectedEvent.value.payload, null, 2)
})

const columns = computed<Column[]>(() => [
  { key: 'created_at', title: 'Cuándo', sortable: false },
  { key: 'actor', title: 'Usuario', sortable: false },
  { key: 'channel', title: 'Canal', sortable: false },
  { key: 'action', title: 'Acción', sortable: false },
  { key: 'summary', title: 'Resumen', sortable: false },
  { key: 'table_name', title: 'Mesa', sortable: false },
  { key: 'reason', title: 'Motivo', sortable: false },
  { key: 'links', title: '', sortable: false, align: 'right' },
])

const actionLabel = (action: string) => ACTION_LABELS[action] ?? action
const channelLabel = (channel: string) => CHANNEL_LABELS[channel] ?? channel

const summaryFor = (row: OperationEventRow) =>
  formatOperationEventSummary(row.action, row.payload ?? {}, formatCurrency)

const tableNameFor = (row: OperationEventRow) =>
  formatOperationEventTableName(row.payload ?? {})
</script>

<template>
  <div class="space-y-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else>
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:date-range="dateRangeDates"
        search-placeholder="Buscar producto…"
        :preset-dates="presetDates"
        :format-date-range="formatDateRange"
        :show-clear="hasActiveFilters"
        @search="applySearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="channelFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por canal"
          >
            <option :value="null">Todos los canales</option>
            <option value="mesa">{{ CHANNEL_LABELS.mesa }}</option>
            <option value="barra">{{ CHANNEL_LABELS.barra }}</option>
            <option value="mostrador">{{ CHANNEL_LABELS.mostrador }}</option>
          </select>

          <select
            v-model="actionFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por acción"
          >
            <option :value="null">Todas las acciones</option>
            <option v-for="a in OPERATION_EVENT_ACTIONS" :key="a" :value="a">
              {{ ACTION_LABELS[a] }}
            </option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Empty -->
      <div
        v-if="events.length === 0"
        class="text-center py-16 space-y-3 bg-surface border-2 border-border rounded-xl"
      >
        <ClipboardDocumentListIcon class="w-12 h-12 mx-auto text-text-tertiary" aria-hidden="true" />
        <p class="text-text-primary font-medium">Sin eventos en este período</p>
        <p class="text-sm text-text-tertiary max-w-md mx-auto px-4">
          La bitácora registra eliminaciones de tab, anulaciones de pago y cambios en carrito.
          Si acabas de activar la función, los eventos aparecerán cuando el equipo use POS.
        </p>
      </div>

      <!-- List -->
      <UiResponsiveDataView
        v-else
        :columns="columns"
        :data="events"
        row-key="id"
        row-size="sm"
        @row-click="openDetail"
      >
        <template #cell-created_at="{ value }">
          <span class="text-sm text-text-secondary whitespace-nowrap">{{ formatDateTime(value) }}</span>
        </template>

        <template #cell-actor="{ row }">
          <span class="text-sm text-text-primary">{{ formatOperationEventActor(row) }}</span>
        </template>

        <template #cell-channel="{ value }">
          <span class="text-xs font-medium text-text-secondary">{{ channelLabel(value) }}</span>
        </template>

        <template #cell-action="{ value }">
          <span class="text-sm text-text-primary">{{ actionLabel(value) }}</span>
        </template>

        <template #cell-summary="{ row }">
          <span class="text-sm text-text-primary">{{ summaryFor(row) }}</span>
        </template>

        <template #cell-table_name="{ row }">
          <span class="text-sm text-text-secondary">{{ tableNameFor(row) ?? '—' }}</span>
        </template>

        <template #cell-reason="{ value }">
          <span class="text-sm text-text-secondary line-clamp-2">{{ value || '—' }}</span>
        </template>

        <template #cell-links="{ row }">
          <NuxtLink
            v-if="row.order_id"
            :to="`/ventas/${row.order_id}`"
            class="text-xs text-primary hover:underline"
            @click.stop
          >
            Orden
          </NuxtLink>
          <span v-else class="text-xs text-text-tertiary">—</span>
        </template>

        <template #card="{ item: row }">
          <button
            type="button"
            class="w-full text-left py-3 px-3 border-b border-border hover:bg-surface-secondary transition-colors"
            @click="openDetail(row)"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="text-sm font-semibold text-text-primary">{{ actionLabel(row.action) }}</span>
              <span class="text-xs text-text-tertiary flex-shrink-0">{{ formatDateTime(row.created_at) }}</span>
            </div>
            <p class="text-sm text-text-primary mt-0.5">{{ summaryFor(row) }}</p>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-text-secondary">
              <span>{{ formatOperationEventActor(row) }}</span>
              <span>·</span>
              <span>{{ channelLabel(row.channel) }}</span>
              <template v-if="tableNameFor(row)">
                <span>·</span>
                <span>{{ tableNameFor(row) }}</span>
              </template>
            </div>
            <p v-if="row.reason" class="text-xs text-text-tertiary mt-1 line-clamp-2">
              {{ row.reason }}
            </p>
          </button>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div v-if="events.length > 0 && totalPages > 1" class="flex items-center justify-between pt-2">
        <button
          type="button"
          :disabled="currentPage === 1"
          class="min-h-[36px] px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="goToPage(currentPage - 1)"
        >
          Anterior
        </button>
        <span class="text-sm text-text-secondary tabular-nums">
          Página {{ currentPage }} de {{ totalPages }}
        </span>
        <button
          type="button"
          :disabled="currentPage === totalPages"
          class="min-h-[36px] px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="goToPage(currentPage + 1)"
        >
          Siguiente
        </button>
      </div>
    </template>
  </div>

  <!-- Detail modal -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="detailOpen && selectedEvent"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
        @click.self="closeDetail"
      >
        <div
          class="w-full sm:max-w-lg max-h-[90vh] overflow-hidden bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border flex flex-col"
          role="dialog"
          aria-labelledby="event-detail-title"
        >
          <div class="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-border">
            <div class="min-w-0">
              <h3 id="event-detail-title" class="text-base font-bold text-text-primary">
                {{ actionLabel(selectedEvent.action) }}
              </h3>
              <p class="text-xs text-text-secondary mt-0.5">
                {{ formatDateTime(selectedEvent.created_at) }} · {{ channelLabel(selectedEvent.channel) }}
              </p>
            </div>
            <button
              type="button"
              class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-surface-secondary"
              aria-label="Cerrar"
              @click="closeDetail"
            >
              <XMarkIcon class="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          <div class="px-5 py-4 overflow-y-auto space-y-3 text-sm">
            <div>
              <p class="text-xs font-medium text-text-tertiary uppercase tracking-wide">Usuario</p>
              <p class="text-text-primary">{{ formatOperationEventActor(selectedEvent) }}</p>
            </div>
            <div v-if="selectedEvent.reason">
              <p class="text-xs font-medium text-text-tertiary uppercase tracking-wide">Motivo</p>
              <p class="text-text-primary">{{ selectedEvent.reason }}</p>
            </div>
            <div v-if="selectedEvent.order_id">
              <p class="text-xs font-medium text-text-tertiary uppercase tracking-wide">Orden</p>
              <NuxtLink :to="`/ventas/${selectedEvent.order_id}`" class="text-primary hover:underline">
                {{ selectedEvent.order_id }}
              </NuxtLink>
            </div>
            <div>
              <p class="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">Payload</p>
              <pre class="text-xs bg-surface-secondary border border-border rounded-lg p-3 overflow-x-auto text-text-primary">{{ detailPayloadJson }}</pre>
            </div>
          </div>

          <div class="px-5 pb-5 pt-2 border-t border-border">
            <button
              type="button"
              class="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              @click="closeDetail"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
