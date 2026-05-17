<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import MetricCard from '~/components/shared/MetricCard.vue'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({
  layout: 'dashboard',
})

useHead({ title: 'Historial de propinas — Ventas' })

const { currentTenant } = useTenantReactive()
const toast = useToast()

// Payment groups (same query as /ventas/ordenes — shared cache)
const { data: paymentGroupsData } = useQuery({
  key: () => ['payments', 'groups', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { id: string; slug: string; name: string; methods: { id: string; name: string }[] }[] }>('/api/pos/payment-methods'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})
const paymentGroups = computed(() => paymentGroupsData.value?.data ?? [])
const { resolveLabel } = usePaymentLabel(paymentGroups)

// Tenant context (for tip_enabled gate + members dropdown). Shared cache key
// with /operaciones/propinas (config page) and the rest of /operaciones/*.
const { data: ctxData, asyncStatus: ctxAsyncStatus } = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const tipEnabled = computed<boolean>(() => ctxData.value?.data?.tip_enabled === true)
const memberOptions = computed<{ id: string; name: string }[]>(
  () => (ctxData.value?.data?.members ?? []).map((m: any) => ({ id: String(m.id), name: m.name || 'Sin nombre' }))
)

// ── Filter state ────────────────────────────────────────────────────────────
const localSearchTerm = ref<string>('')
const appliedSearch = ref<string>('')
const memberFilter = ref<string | null>(null)
const paymentFilter = ref<string | null>(null) // group slug
const channelFilter = ref<'pos' | 'mesa' | 'online' | null>(null)
const dateRangeDates = ref<Date[] | null>(null)
const sortField = ref<'order_number' | 'order_date' | 'total_amount' | 'tip_amount' | 'payment_method'>('order_date')
const sortDirection = ref<'asc' | 'desc'>('desc')

const presetDates = ref([
  { label: 'Hoy', value: [new Date(), new Date()] },
  { label: 'Ayer', value: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d] })() },
  { label: 'Última semana', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()] },
  { label: 'Últimos 15 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 15); return d })(), new Date()] },
  { label: 'Último mes', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()] },
  { label: 'Últimos 90 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d })(), new Date()] },
])

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yy', { locale: es })
  if (!dates[1]) return from
  const to = fnsFormat(dates[1], 'dd/MM/yy', { locale: es })
  return `${from} - ${to}`
}

const dateRange = computed(() => {
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null as string | null, to: null as string | null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return { from: fnsFormat(from, 'yyyy-MM-dd'), to: fnsFormat(to, 'yyyy-MM-dd') }
})

// Pagination
const PAGE_SIZE = 25
const currentPage = ref(1)

// ── Main query ──────────────────────────────────────────────────────────────
const { data: tipsData, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['tips', currentTenant.value?.id, {
    limit: PAGE_SIZE,
    offset: (currentPage.value - 1) * PAGE_SIZE,
    search: appliedSearch.value || null,
    member_id: memberFilter.value,
    payment_method: paymentFilter.value,
    channel: channelFilter.value,
    dateFrom: dateRange.value.from,
    dateTo: dateRange.value.to,
    sortField: sortField.value,
    sortDirection: sortDirection.value,
  }],
  query: () => $fetch<any>('/api/orders/tips', {
    params: {
      limit: PAGE_SIZE,
      offset: (currentPage.value - 1) * PAGE_SIZE,
      search: appliedSearch.value || undefined,
      member_id: memberFilter.value || undefined,
      payment_method: paymentFilter.value || undefined,
      channel: channelFilter.value || undefined,
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      sort_field: sortField.value,
      sort_direction: sortDirection.value,
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(
  () =>
    (!tipsData.value && !fetchError.value)
    || (ctxAsyncStatus.value === 'loading' && !ctxData.value),
)
const isRefreshing = computed(
  () => asyncStatus.value === 'loading' && tipsData.value != null,
)
const tips = computed<any[]>(() => tipsData.value?.data ?? [])
const aggregates = computed<{ sum_tip: number; count_with_tip: number; avg_pct: number }>(
  () => tipsData.value?.aggregates ?? { sum_tip: 0, count_with_tip: 0, avg_pct: 0 }
)
const totalCount = computed<number>(() => tipsData.value?.pagination?.total ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)))

// Reset page on tenant or filter change
watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })
watch([memberFilter, paymentFilter, channelFilter, dateRangeDates, appliedSearch], () => {
  currentPage.value = 1
})

const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

// ── Sort + filter handlers ──────────────────────────────────────────────────
const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field as any
    sortDirection.value = 'desc'
  }
}

const applySearch = () => {
  appliedSearch.value = localSearchTerm.value.trim()
}

const clearAllFilters = () => {
  localSearchTerm.value = ''
  appliedSearch.value = ''
  memberFilter.value = null
  paymentFilter.value = null
  channelFilter.value = null
  dateRangeDates.value = null
}

// Mesero click on a row → filter to that mesero
const filterByMember = (memberId: string | null) => {
  if (!memberId) return
  memberFilter.value = memberId
}

// warocol.com#662 — open order detail in the same tab (like /ventas/ordenes)
const goToOrderDetail = (orderId: string) => {
  if (!orderId) return
  navigateTo(`/ventas/${orderId}`)
}

// ── Export by email ─────────────────────────────────────────────────────────
const isExporting = ref(false)
const showExportModal = ref(false)
const exportResult = ref<{ success: boolean; message: string; email?: string; count?: number } | null>(null)

const exportToEmail = async () => {
  if (isExporting.value) return
  isExporting.value = true
  exportResult.value = null
  try {
    const res = await $fetch<{ success: boolean; message: string; data: { email: string; orders_count: number } }>(
      '/api/orders/export',
      {
        method: 'POST',
        params: {
          tips_only: true,
          search: appliedSearch.value || undefined,
          member_id: memberFilter.value || undefined,
          payment_method: paymentFilter.value || undefined,
          channel: channelFilter.value || undefined,
          date_from: dateRange.value.from || undefined,
          date_to: dateRange.value.to || undefined,
          sort_field: sortField.value,
          sort_direction: sortDirection.value,
        },
      },
    )
    exportResult.value = {
      success: true,
      message: res.message,
      email: res.data?.email,
      count: res.data?.orders_count,
    }
    showExportModal.value = true
  } catch (e: any) {
    exportResult.value = {
      success: false,
      message: e?.data?.detail || e?.message || 'No se pudo exportar el reporte',
    }
    showExportModal.value = true
  } finally {
    isExporting.value = false
  }
}

// ── Formatting helpers ──────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  return fnsFormat(d, "d MMM yyyy, h:mm a", { locale: es })
}

const formatPercent = (value: number) => `${(value || 0).toFixed(2)}%`

const channelLabel = (ch: string | null | undefined) => {
  if (ch === 'online') return 'Online'
  if (ch === 'mesa') return 'Mesa'
  if (ch === 'barra') return 'Barra'
  return 'POS'
}
const channelVariant = (ch: string | null | undefined) => {
  if (ch === 'online') return 'success'
  if (ch === 'mesa') return 'info'
  if (ch === 'barra') return 'warning'
  return 'secondary'
}

// ── Columns ─────────────────────────────────────────────────────────────────
const columns: Column[] = [
  { key: 'order_date', title: 'Fecha', sortable: true, width: '180px' },
  { key: 'order_number', title: 'Orden', sortable: true, width: '90px' },
  { key: 'channel', title: 'Canal', width: '100px' },
  { key: 'total_amount', title: 'Subtotal', sortable: true, align: 'right' },
  { key: 'tip_amount', title: 'Propina', sortable: true, align: 'right' },
  { key: 'tip_percent', title: '%', align: 'right', width: '80px' },
  { key: 'member_name', title: 'Mesero' },
  { key: 'payment_method', title: 'Método de pago' },
]

// ── Layout integration ──────────────────────────────────────────────────────
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

// warocol.com#641 — pre-apply the date range when arriving via the
// "Propinas del periodo" MetricCard on /analitica/ventas. URL is the
// source of truth on first paint; subsequent user interactions update
// the local ref directly (we don't sync back to the URL — out of scope).
const route = useRoute()

onMounted(() => {
  const qFrom = route.query.date_from as string | undefined
  const qTo = route.query.date_to as string | undefined
  if (qFrom && qTo) {
    const from = new Date(`${qFrom}T00:00:00`)
    const to = new Date(`${qTo}T00:00:00`)
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      dateRangeDates.value = [from, to]
    }
  }
  // warocol.com#642 — pre-apply mesero filter when arriving from /equipo/miembros/[id]
  const qMember = route.query.member_id as string | undefined
  if (qMember) memberFilter.value = qMember
  setRefreshHandler(refetch)
})
onUnmounted(() => clearRefreshHandler(refetch))
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- ══════ EMPTY STATE: tipping disabled ══════ -->
    <div
      v-else-if="ctxData && !tipEnabled"
      class="flex flex-col items-center justify-center gap-3 py-16 px-6 bg-surface rounded-xl border-2 border-border text-center"
    >
      <span aria-hidden="true" class="text-4xl">💡</span>
      <p class="text-base font-semibold text-text-primary">Las propinas no están activadas</p>
      <p class="text-sm text-text-secondary max-w-md">
        Activa el cobro de propinas para empezar a verlas aquí. Hoy el checkout no muestra la opción de propina a tus clientes.
      </p>
      <NuxtLink
        to="/operaciones/propinas"
        class="mt-2 min-h-[44px] px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
      >
        Configurar propinas →
      </NuxtLink>
    </div>

    <!-- ══════ MAIN CONTENT: tipping enabled ══════ -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Aggregates — MetricCard pattern (matches /analitica/ventas) -->
      <div class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3">
        <MetricCard
          title="Total propinas"
          :value="aggregates.sum_tip"
          format="currency"
          variant="primary"
        />
        <MetricCard
          title="Promedio sobre venta"
          :value="aggregates.avg_pct"
          format="percentage"
          :precision="2"
          variant="primary"
        />
        <MetricCard
          title="Órdenes con propina"
          :value="aggregates.count_with_tip"
          format="number"
          variant="primary"
          class="col-span-2 md:col-span-1"
        />
      </div>

      <!-- Filter bar — matches /ventas/ordenes -->
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[200px]">
          <button
            type="button"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary transition-colors cursor-pointer"
            @click="applySearch"
            aria-label="Buscar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <input
            v-model="localSearchTerm"
            type="text"
            inputmode="numeric"
            placeholder="Buscar por Nº orden..."
            class="w-full h-10 pl-9 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            @keydown.enter.prevent="applySearch"
          />
        </div>

        <!-- Date Range Picker -->
        <VueDatePicker
          v-model="dateRangeDates"
          range
          :preset-dates="presetDates"
          :enable-time-picker="false"
          :locale="es"
          placeholder="Rango de fechas"
          auto-apply
          :teleport="true"
          :max-date="new Date()"
          :format="formatDateRange"
          input-class-name="dp-custom-input"
          menu-class-name="dp-custom-menu"
          calendar-cell-class-name="dp-custom-cell"
        />

        <!-- Mesero -->
        <select
          v-model="memberFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          aria-label="Filtrar por mesero"
        >
          <option :value="null">Mesero</option>
          <option v-for="m in memberOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>

        <!-- Channel -->
        <select
          v-model="channelFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          aria-label="Filtrar por canal"
        >
          <option :value="null">Canal</option>
          <option value="pos">POS</option>
          <option value="mesa">Mesa</option>
          <option value="online">Online</option>
        </select>

        <!-- Payment method -->
        <select
          v-model="paymentFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          aria-label="Filtrar por método de pago"
        >
          <option :value="null">Método pago</option>
          <option v-for="g in paymentGroups" :key="g.slug" :value="g.slug">{{ g.name }}</option>
        </select>

        <!-- Clear -->
        <button
          v-if="localSearchTerm || dateRangeDates || memberFilter || paymentFilter || channelFilter"
          type="button"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
          aria-label="Limpiar filtros"
          @click="clearAllFilters"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Export -->
        <button
          type="button"
          class="hidden md:flex h-10 px-3 items-center gap-2 rounded-lg border-2 border-border bg-background text-text-secondary text-sm font-medium hover:text-text-primary hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          :disabled="isExporting || tips.length === 0"
          :aria-label="isExporting ? 'Exportando propinas...' : 'Exportar propinas a correo'"
          @click="exportToEmail"
        >
          <svg v-if="!isExporting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </button>
      </div>

      <!-- Table loading (filter change, empty result) — mirrors /ventas/ordenes -->
      <div v-if="isRefreshing && tips.length === 0" class="flex items-center justify-center min-h-[200px]">
        <CommonsTheCustomLoader size="medium" />
      </div>

      <template v-else>
      <UiResponsiveDataView
        :columns="columns"
        :data="tips"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        empty-message="Sin propinas en el periodo seleccionado"
        empty-sub-message="Ajusta los filtros para ver más resultados."
        item-key="id"
        row-size="sm"
        @sort="handleSort"
      >
        <!-- Mobile card -->
        <template #card="{ item, index }">
          <div :class="['flex flex-col gap-2 p-4 border-b border-border', index % 2 === 0 ? 'bg-surface' : 'bg-background']">
            <div class="flex items-center justify-between">
              <div class="flex items-baseline gap-2">
                <span class="text-xs text-text-secondary">{{ formatDate(item.order_date) }}</span>
                <button
                  type="button"
                  class="text-sm font-semibold text-primary hover:underline"
                  @click.stop="goToOrderDetail(item.id)"
                >
                  #{{ item.order_number }}
                </button>
              </div>
              <UiStatusBadge :variant="channelVariant(item.channel)" size="sm" :value="channelLabel(item.channel)" />
            </div>
            <div class="flex items-end justify-between">
              <div>
                <p class="text-xs text-text-secondary">Subtotal: {{ formatCurrency(item.total_amount) }}</p>
                <button
                  type="button"
                  class="text-sm font-medium text-text-primary hover:text-primary hover:underline mt-0.5"
                  @click.stop="filterByMember(item.served_by_member_id)"
                >
                  {{ item.member_name || 'Sin asignar' }}
                </button>
                <p class="text-xs text-text-tertiary mt-0.5">{{ resolveLabel(item.payment_method) }}</p>
              </div>
              <div class="text-right">
                <p class="text-xl font-bold text-primary tabular-nums">{{ formatCurrency(item.tip_amount) }}</p>
                <p class="text-xs text-text-secondary tabular-nums">{{ formatPercent(item.tip_percent) }}</p>
              </div>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-order_date="{ value }">
          <span class="text-sm text-text-secondary whitespace-nowrap">{{ formatDate(value) }}</span>
        </template>
        <template #cell-order_number="{ row, value }">
          <button
            type="button"
            class="text-sm font-medium text-primary hover:underline"
            @click.stop="goToOrderDetail(row.id)"
          >
            #{{ value }}
          </button>
        </template>
        <template #cell-channel="{ row }">
          <UiStatusBadge :variant="channelVariant(row.channel)" size="sm" :value="channelLabel(row.channel)" />
        </template>
        <template #cell-total_amount="{ value }">
          <span class="text-sm tabular-nums">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-tip_amount="{ value }">
          <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-tip_percent="{ value }">
          <span class="text-sm tabular-nums text-text-secondary">{{ formatPercent(value) }}</span>
        </template>
        <template #cell-member_name="{ row }">
          <button
            type="button"
            class="text-sm text-text-primary hover:text-primary hover:underline text-left"
            @click.stop="filterByMember(row.served_by_member_id)"
          >
            {{ row.member_name || 'Sin asignar' }}
          </button>
        </template>
        <template #cell-payment_method="{ value }">
          <span class="text-sm text-text-secondary">{{ resolveLabel(value) }}</span>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div v-if="totalCount > PAGE_SIZE" class="flex items-center justify-between gap-2 px-2 mt-0">
        <p class="text-xs text-text-secondary">
          Página {{ currentPage }} de {{ totalPages }} · {{ totalCount }} resultados
        </p>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="min-h-[36px] min-w-[36px] px-2 rounded-md border border-border hover:border-primary disabled:opacity-40"
            :disabled="currentPage === 1"
            aria-label="Primera página"
            @click="goToPage(1)"
          >«</button>
          <button
            type="button"
            class="min-h-[36px] min-w-[36px] px-2 rounded-md border border-border hover:border-primary disabled:opacity-40"
            :disabled="currentPage === 1"
            aria-label="Página anterior"
            @click="goToPage(currentPage - 1)"
          >‹</button>
          <button
            type="button"
            class="min-h-[36px] min-w-[36px] px-2 rounded-md border border-border hover:border-primary disabled:opacity-40"
            :disabled="currentPage === totalPages"
            aria-label="Página siguiente"
            @click="goToPage(currentPage + 1)"
          >›</button>
          <button
            type="button"
            class="min-h-[36px] min-w-[36px] px-2 rounded-md border border-border hover:border-primary disabled:opacity-40"
            :disabled="currentPage === totalPages"
            aria-label="Última página"
            @click="goToPage(totalPages)"
          >»</button>
        </div>
      </div>
      </template>
    </div>

    <!-- Export result modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showExportModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5"
          @click.self="showExportModal = false"
        >
          <div class="bg-background rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div
              :class="[
                'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5',
                exportResult?.success ? 'bg-green-100' : 'bg-red-100',
              ]"
            >
              <svg v-if="exportResult?.success" class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-text-primary mb-2">
              {{ exportResult?.success ? 'Reporte enviado' : 'No se pudo exportar' }}
            </h2>
            <p v-if="exportResult?.success" class="text-sm text-text-secondary mb-1">
              {{ exportResult.count }} propinas enviadas a
            </p>
            <p v-if="exportResult?.success && exportResult.email" class="text-sm font-medium text-text-primary mb-5">
              {{ exportResult.email }}
            </p>
            <p v-else class="text-sm text-text-secondary mb-5">{{ exportResult?.message }}</p>
            <button
              type="button"
              class="w-full min-h-[44px] px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
              @click="showExportModal = false"
            >
              Aceptar
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>

<style>
.dp-custom-input {
  height: 40px !important;
  border: 2px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  background: hsl(var(--background)) !important;
  font-size: 0.875rem !important;
  color: hsl(var(--foreground)) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
  min-width: 150px;
}
.dp-custom-input:focus {
  outline: none !important;
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2) !important;
}
.dp-custom-input::placeholder {
  color: hsl(var(--muted-foreground)) !important;
}
.dp__theme_light {
  --dp-primary-color: hsl(var(--primary));
  --dp-primary-text-color: hsl(var(--primary-foreground));
  --dp-background-color: hsl(var(--card));
  --dp-text-color: hsl(var(--foreground));
  --dp-border-color: hsl(var(--border));
  --dp-menu-border-color: hsl(var(--border));
  --dp-hover-color: hsl(var(--accent));
  --dp-hover-text-color: hsl(var(--foreground));
  --dp-secondary-color: hsl(var(--muted));
  --dp-border-color-hover: hsl(var(--primary));
}
.dp-custom-menu {
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
}
</style>
