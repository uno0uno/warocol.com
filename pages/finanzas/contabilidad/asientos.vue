<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Asientos contables - Warocol' })

const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// ── Types ───────────────────────────────────────────────────────────────────
interface TenantAccount {
  id: string
  code: string
  name: string
  accountClass: string
  accountType: string
  isDetail: boolean
  isActive: boolean
}

interface JournalEntry {
  id: string
  entryDate: string
  description: string
  reference: string | null
  sourceModule: string
  sourceId: string | null
  status: 'draft' | 'posted' | 'voided'
  totalDebit: number
  totalCredit: number
  postedAt: string | null
  voidedAt: string | null
  createdAt: string
}

interface JournalLine {
  id: string
  journalEntryId: string
  accountId: string
  debit: number
  credit: number
  description: string | null
  lineOrder: number
}

interface JournalEntryWithLines extends JournalEntry {
  lines: JournalLine[]
}

// ── Filters ─────────────────────────────────────────────────────────────────
const statusFilter = ref<string>('')
const sourceModuleFilter = ref<string>('')
const dateRangeDates = ref<Date[] | null>(null)

const presetDates = ref([
  { label: 'Hoy', value: [new Date(), new Date()] },
  {
    label: 'Ayer',
    value: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d] })()
  },
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
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null, to: null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return {
    from: fnsFormat(from, 'yyyy-MM-dd'),
    to: fnsFormat(to, 'yyyy-MM-dd'),
  }
})

// ── Pagination ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 25
const currentPage = ref(1)

const resetPage = () => { currentPage.value = 1 }

watch(statusFilter, resetPage)
watch(sourceModuleFilter, resetPage)
watch(dateRangeDates, (val) => {
  if (!val || (val.length === 2 && val[0] && val[1])) resetPage()
})
watch(() => currentTenant.value?.id, resetPage)

// ── Data: accounts (for name resolution) ────────────────────────────────────
const { data: accountsData } = useQuery({
  key: () => ['accounting', 'accounts', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: TenantAccount[] }>('/api/accounting/accounts'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})

const accountsMap = computed<Map<string, { code: string; name: string }>>(() => {
  const m = new Map<string, { code: string; name: string }>()
  for (const a of accountsData.value?.data ?? []) {
    m.set(a.id, { code: a.code, name: a.name })
  }
  return m
})

// ── Data: journal entries (paginated) ───────────────────────────────────────
const { data: entriesData, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['accounting', 'journal-entries', currentTenant.value?.id, {
    page: currentPage.value,
    limit: PAGE_SIZE,
    status: statusFilter.value || null,
    sourceModule: sourceModuleFilter.value || null,
    dateFrom: dateRange.value.from,
    dateTo: dateRange.value.to,
  }],
  query: () => $fetch<{ success: boolean; data: JournalEntry[]; total: number }>('/api/accounting/journal-entries', {
    params: {
      page: currentPage.value,
      limit: PAGE_SIZE,
      status: statusFilter.value || undefined,
      sourceModule: sourceModuleFilter.value || undefined,
      dateFrom: dateRange.value.from || undefined,
      dateTo: dateRange.value.to || undefined,
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => entriesData.value == null && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && entriesData.value != null)

const entries = computed<JournalEntry[]>(() => entriesData.value?.data ?? [])
const totalEntries = computed(() => entriesData.value?.total ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalEntries.value / PAGE_SIZE)))

const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

// ── Filter helpers ───────────────────────────────────────────────────────────
const hasActiveFilters = computed(() =>
  !!statusFilter.value || !!sourceModuleFilter.value || !!dateRangeDates.value
)

const clearFilters = () => {
  statusFilter.value = ''
  sourceModuleFilter.value = ''
  dateRangeDates.value = null
  currentPage.value = 1
}

// ── Formatters ───────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

const formatDate = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatDateTime = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const SOURCE_MODULE_LABELS: Record<string, string> = {
  gastos: 'Gastos',
  ventas: 'Ventas',
  nomina: 'Nómina',
  inventario: 'Inventario',
  arqueo: 'Arqueo',
  manual: 'Manual',
  system: 'Sistema',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  posted: 'Publicado',
  voided: 'Anulado',
}

// ── Table columns ────────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'entryDate',     title: 'Fecha',       sortable: false },
  { key: 'description',   title: 'Descripción', sortable: false },
  { key: 'reference',     title: 'Referencia',  sortable: false },
  { key: 'sourceModule',  title: 'Módulo',      sortable: false },
  { key: 'status',        title: 'Estado',      sortable: false },
  { key: 'totalDebit',    title: 'Débito',      sortable: false },
  { key: 'totalCredit',   title: 'Crédito',     sortable: false },
  { key: 'actions',       title: '',            sortable: false },
]

// ── Detail modal ─────────────────────────────────────────────────────────────
const showDetailModal = ref(false)
const selectedEntryId = ref<string | null>(null)
const selectedEntryDetail = ref<JournalEntryWithLines | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)

const openDetail = async (entry: JournalEntry) => {
  selectedEntryId.value = entry.id
  selectedEntryDetail.value = null
  detailError.value = null
  detailLoading.value = true
  showDetailModal.value = true
  try {
    const res = await $fetch<{ success: boolean; data: JournalEntryWithLines }>(
      `/api/accounting/journal-entries/${entry.id}`
    )
    selectedEntryDetail.value = res.data
  } catch (err: any) {
    detailError.value = err?.data?.detail || err?.data?.message || 'Error al cargar el asiento'
  } finally {
    detailLoading.value = false
  }
}

const closeDetail = () => {
  showDetailModal.value = false
  selectedEntryId.value = null
  selectedEntryDetail.value = null
  detailError.value = null
  postError.value = null
}

// ── Post action ──────────────────────────────────────────────────────────────
const posting = ref(false)
const postError = ref<string | null>(null)

const handlePost = async () => {
  if (!selectedEntryId.value) return
  posting.value = true
  postError.value = null
  try {
    await $fetch(`/api/accounting/journal-entries/${selectedEntryId.value}/post`, { method: 'POST' })
    closeDetail()
    await refetch()
  } catch (err: any) {
    postError.value = err?.data?.detail || err?.data?.message || 'Error al publicar el asiento'
  } finally {
    posting.value = false
  }
}

// ── Void action ──────────────────────────────────────────────────────────────
const showVoidModal = ref(false)
const voidReason = ref('')
const voiding = ref(false)
const voidError = ref<string | null>(null)

const openVoidModal = () => {
  voidReason.value = ''
  voidError.value = null
  showVoidModal.value = true
}

const closeVoidModal = () => {
  showVoidModal.value = false
  voidReason.value = ''
  voidError.value = null
}

const handleVoid = async () => {
  if (!selectedEntryId.value || !voidReason.value.trim()) return
  voiding.value = true
  voidError.value = null
  try {
    await $fetch(`/api/accounting/journal-entries/${selectedEntryId.value}/void`, {
      method: 'POST',
      body: { reason: voidReason.value.trim() },
    })
    closeVoidModal()
    closeDetail()
    await refetch()
  } catch (err: any) {
    voidError.value = err?.data?.detail || err?.data?.message || 'Error al anular el asiento'
  } finally {
    voiding.value = false
  }
}

// ── Lines columns ────────────────────────────────────────────────────────────
const linesColumns = [
  { key: 'lineOrder',   title: '#',          sortable: false },
  { key: 'account',     title: 'Cuenta',     sortable: false },
  { key: 'debit',       title: 'Débito',     sortable: false },
  { key: 'credit',      title: 'Crédito',    sortable: false },
  { key: 'description', title: 'Descripción', sortable: false },
]

const resolvedLines = computed(() => {
  if (!selectedEntryDetail.value?.lines) return []
  return selectedEntryDetail.value.lines.map(line => ({
    ...line,
    accountResolved: accountsMap.value.get(line.accountId),
  }))
})

// ── Layout integration ───────────────────────────────────────────────────────
registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })
</script>

<template>
  <div class="page-layout">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- Filter Bar -->
      <div class="flex flex-wrap items-center gap-2 w-full">
        <!-- Status filter -->
        <select
          v-model="statusFilter"
          class="h-9 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="posted">Publicado</option>
          <option value="voided">Anulado</option>
        </select>

        <!-- Source module filter -->
        <select
          v-model="sourceModuleFilter"
          class="h-9 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          aria-label="Filtrar por módulo"
        >
          <option value="">Todos los módulos</option>
          <option value="manual">Manual</option>
          <option value="gastos">Gastos</option>
          <option value="ventas">Ventas</option>
          <option value="nomina">Nómina</option>
          <option value="inventario">Inventario</option>
          <option value="arqueo">Arqueo</option>
          <option value="system">Sistema</option>
        </select>

        <!-- Date range picker -->
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
        />

        <!-- Clear filters -->
        <button
          v-if="hasActiveFilters"
          type="button"
          class="h-9 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          aria-label="Limpiar filtros"
          @click="clearFilters"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex-1" />

        <!-- New entry button -->
        <NuxtLink
          to="/finanzas/contabilidad/asientos/crear"
          class="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors whitespace-nowrap shrink-0"
          aria-label="Crear nuevo asiento contable"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nuevo asiento</span>
        </NuxtLink>
      </div>

      <!-- Summary -->
      <p class="text-xs text-text-secondary">
        {{ totalEntries }} asiento{{ totalEntries !== 1 ? 's' : '' }}
        <template v-if="statusFilter"> · {{ STATUS_LABELS[statusFilter] || statusFilter }}</template>
        <template v-if="sourceModuleFilter"> · {{ SOURCE_MODULE_LABELS[sourceModuleFilter] || sourceModuleFilter }}</template>
      </p>

      <!-- Table loading (filter change) -->
      <div v-if="isRefreshing && entries.length === 0" class="flex items-center justify-center min-h-[200px]">
        <CommonsTheCustomLoader size="medium" />
      </div>

      <!-- Entries table -->
      <UiResponsiveDataView
        v-else
        row-size="sm"
        :columns="tableColumns"
        :data="entries"
        empty-message="No hay asientos contables registrados"
        empty-sub-message="Crea el primer asiento manual con el botón 'Nuevo asiento'"
        variant="default"
      >
        <!-- Mobile card -->
        <template #card="{ item, index }">
          <div
            class="flex items-start gap-3 py-3 px-3 border-b border-border cursor-pointer hover:bg-surface-secondary transition-colors"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            @click="openDetail(item)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs text-text-secondary tabular-nums">{{ formatDate(item.entryDate) }}</span>
                <span class="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  :class="{
                    'bg-gray-100 text-gray-600': item.status === 'draft',
                    'bg-green-100 text-green-700': item.status === 'posted',
                    'bg-red-100 text-red-700': item.status === 'voided',
                  }"
                >{{ STATUS_LABELS[item.status] || item.status }}</span>
              </div>
              <p class="text-sm font-medium text-text-primary mt-0.5 truncate">{{ item.description }}</p>
              <p class="text-xs text-text-secondary mt-0.5">
                {{ SOURCE_MODULE_LABELS[item.sourceModule] || item.sourceModule }}
                <template v-if="item.reference"> · {{ item.reference }}</template>
              </p>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <span class="text-xs text-text-secondary tabular-nums">D: {{ formatCurrency(item.totalDebit) }}</span>
              <span class="text-xs text-text-secondary tabular-nums">C: {{ formatCurrency(item.totalCredit) }}</span>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-entryDate="{ value }">
          <span class="text-sm text-text-secondary tabular-nums">{{ formatDate(value) }}</span>
        </template>

        <template #cell-description="{ value }">
          <span class="text-sm text-text-primary truncate max-w-[200px] block" :title="value">{{ value }}</span>
        </template>

        <template #cell-reference="{ value }">
          <span class="text-sm text-text-secondary">{{ value || '—' }}</span>
        </template>

        <template #cell-sourceModule="{ value }">
          <span
            class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface-secondary text-text-secondary"
          >
            {{ SOURCE_MODULE_LABELS[value] || value }}
          </span>
        </template>

        <template #cell-status="{ value }">
          <UiStatusBadge
            :value="STATUS_LABELS[value] || value"
            format="text"
            :variant="value === 'posted' ? 'success' : value === 'voided' ? 'destructive' : 'secondary'"
            size="sm"
          />
        </template>

        <template #cell-totalDebit="{ value }">
          <span class="text-sm tabular-nums text-text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-totalCredit="{ value }">
          <span class="text-sm tabular-nums text-text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center">
            <button
              type="button"
              class="flex items-center justify-center w-9 h-9 rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
              :aria-label="`Ver asiento del ${formatDate(row.entryDate)}`"
              title="Ver detalle"
              @click.stop="openDetail(row)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div v-if="totalEntries > 0" class="flex items-center justify-end px-1 py-2">
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage <= 1"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Primera página"
            @click="goToPage(1)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button
            :disabled="currentPage <= 1"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior"
            @click="goToPage(currentPage - 1)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="px-3 py-1 text-sm font-medium text-text-primary">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            :disabled="currentPage >= totalPages"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Página siguiente"
            @click="goToPage(currentPage + 1)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            :disabled="currentPage >= totalPages"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Última página"
            @click="goToPage(totalPages)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

    </div>

    <!-- ── Entry detail modal (desktop) ───────────────────────────────────── -->
    <UiModal v-model="showDetailModal" title="Detalle del asiento" max-height="xl">
      <div class="overflow-y-auto max-h-[70vh]">
        <!-- Loading detail -->
        <div v-if="detailLoading" class="flex items-center justify-center py-12">
          <CommonsTheCustomLoader size="medium" />
        </div>

        <!-- Error detail -->
        <div v-else-if="detailError" class="p-6">
          <div class="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {{ detailError }}
          </div>
        </div>

        <!-- Entry detail content -->
        <div v-else-if="selectedEntryDetail" class="p-6 flex flex-col gap-4">
          <!-- Header fields -->
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">Fecha</span>
              <p class="mt-0.5 text-text-primary">{{ formatDate(selectedEntryDetail.entryDate) }}</p>
            </div>
            <div>
              <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">Estado</span>
              <div class="mt-0.5">
                <UiStatusBadge
                  :value="STATUS_LABELS[selectedEntryDetail.status] || selectedEntryDetail.status"
                  format="text"
                  :variant="selectedEntryDetail.status === 'posted' ? 'success' : selectedEntryDetail.status === 'voided' ? 'destructive' : 'secondary'"
                  size="sm"
                />
              </div>
            </div>
            <div class="col-span-2">
              <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">Descripción</span>
              <p class="mt-0.5 text-text-primary">{{ selectedEntryDetail.description }}</p>
            </div>
            <div v-if="selectedEntryDetail.reference">
              <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">Referencia</span>
              <p class="mt-0.5 text-text-primary">{{ selectedEntryDetail.reference }}</p>
            </div>
            <div>
              <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">Módulo</span>
              <p class="mt-0.5 text-text-primary">{{ SOURCE_MODULE_LABELS[selectedEntryDetail.sourceModule] || selectedEntryDetail.sourceModule }}</p>
            </div>
            <div v-if="selectedEntryDetail.postedAt">
              <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">Publicado</span>
              <p class="mt-0.5 text-text-primary">{{ formatDateTime(selectedEntryDetail.postedAt) }}</p>
            </div>
            <div v-if="selectedEntryDetail.voidedAt">
              <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">Anulado</span>
              <p class="mt-0.5 text-text-primary">{{ formatDateTime(selectedEntryDetail.voidedAt) }}</p>
            </div>
          </div>

          <!-- Totals -->
          <div class="flex items-center gap-4 p-3 rounded-lg bg-surface-secondary text-sm">
            <div>
              <span class="text-xs text-text-secondary">Total débito</span>
              <p class="font-semibold text-text-primary tabular-nums">{{ formatCurrency(selectedEntryDetail.totalDebit) }}</p>
            </div>
            <div>
              <span class="text-xs text-text-secondary">Total crédito</span>
              <p class="font-semibold text-text-primary tabular-nums">{{ formatCurrency(selectedEntryDetail.totalCredit) }}</p>
            </div>
          </div>

          <!-- Lines table -->
          <div>
            <h4 class="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">Líneas del asiento</h4>
            <UiResponsiveDataView
              row-size="sm"
              :columns="linesColumns"
              :data="resolvedLines"
              empty-message="Sin líneas"
              variant="default"
            >
              <template #card="{ item, index }">
                <div
                  class="flex items-start gap-2 py-2 px-3 border-b border-border"
                  :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-mono text-text-secondary">
                      {{ item.accountResolved ? `${item.accountResolved.code} · ${item.accountResolved.name}` : item.accountId }}
                    </p>
                    <p v-if="item.description" class="text-xs text-text-secondary mt-0.5">{{ item.description }}</p>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p v-if="item.debit > 0" class="text-xs tabular-nums text-text-primary">D: {{ formatCurrency(item.debit) }}</p>
                    <p v-if="item.credit > 0" class="text-xs tabular-nums text-text-primary">C: {{ formatCurrency(item.credit) }}</p>
                  </div>
                </div>
              </template>

              <template #cell-lineOrder="{ value }">
                <span class="text-xs text-text-secondary tabular-nums">{{ value + 1 }}</span>
              </template>

              <template #cell-account="{ row }">
                <div>
                  <span v-if="row.accountResolved" class="text-sm text-text-primary">
                    <span class="font-mono text-xs text-text-secondary">{{ row.accountResolved.code }}</span>
                    {{ ' ' }}{{ row.accountResolved.name }}
                  </span>
                  <span v-else class="text-xs font-mono text-text-secondary">{{ row.accountId }}</span>
                </div>
              </template>

              <template #cell-debit="{ row }">
                <span v-if="row.debit > 0" class="text-sm tabular-nums text-text-primary">{{ formatCurrency(row.debit) }}</span>
                <span v-else class="text-sm text-text-secondary">—</span>
              </template>

              <template #cell-credit="{ row }">
                <span v-if="row.credit > 0" class="text-sm tabular-nums text-text-primary">{{ formatCurrency(row.credit) }}</span>
                <span v-else class="text-sm text-text-secondary">—</span>
              </template>

              <template #cell-description="{ value }">
                <span class="text-sm text-text-secondary">{{ value || '—' }}</span>
              </template>
            </UiResponsiveDataView>
          </div>

          <!-- Post error -->
          <div v-if="postError" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {{ postError }}
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <template #footer>
        <div v-if="selectedEntryDetail" class="flex items-center gap-3 p-4">
          <button
            type="button"
            class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
            @click="closeDetail"
          >
            Cerrar
          </button>
          <div class="flex-1" />
          <!-- Publish draft -->
          <button
            v-if="selectedEntryDetail.status === 'draft'"
            type="button"
            :disabled="posting"
            class="min-h-[44px] px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            @click="handlePost"
          >
            <svg v-if="posting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>{{ posting ? 'Publicando...' : 'Publicar' }}</span>
          </button>
          <!-- Void posted -->
          <button
            v-if="selectedEntryDetail.status === 'posted'"
            type="button"
            class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-destructive/50 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors"
            @click="openVoidModal"
          >
            Anular
          </button>
        </div>
      </template>
    </UiModal>

    <!-- ── Entry detail modal (mobile bottom sheet) ───────────────────────── -->
    <UiBottomSheetModal v-model="showDetailModal" title="Detalle del asiento">
      <div class="overflow-y-auto max-h-[65vh]">
        <!-- Loading -->
        <div v-if="detailLoading" class="flex items-center justify-center py-12">
          <CommonsTheCustomLoader size="medium" />
        </div>

        <!-- Error -->
        <div v-else-if="detailError" class="p-4">
          <div class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {{ detailError }}
          </div>
        </div>

        <!-- Content -->
        <div v-else-if="selectedEntryDetail" class="p-4 flex flex-col gap-3">
          <!-- Header fields -->
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span class="text-xs font-medium text-text-secondary">Fecha</span>
              <p class="text-text-primary">{{ formatDate(selectedEntryDetail.entryDate) }}</p>
            </div>
            <div>
              <span class="text-xs font-medium text-text-secondary">Estado</span>
              <div class="mt-0.5">
                <UiStatusBadge
                  :value="STATUS_LABELS[selectedEntryDetail.status] || selectedEntryDetail.status"
                  format="text"
                  :variant="selectedEntryDetail.status === 'posted' ? 'success' : selectedEntryDetail.status === 'voided' ? 'destructive' : 'secondary'"
                  size="sm"
                />
              </div>
            </div>
            <div class="col-span-2">
              <span class="text-xs font-medium text-text-secondary">Descripción</span>
              <p class="text-text-primary">{{ selectedEntryDetail.description }}</p>
            </div>
            <div v-if="selectedEntryDetail.reference" class="col-span-2">
              <span class="text-xs font-medium text-text-secondary">Referencia</span>
              <p class="text-text-primary">{{ selectedEntryDetail.reference }}</p>
            </div>
            <div>
              <span class="text-xs font-medium text-text-secondary">Módulo</span>
              <p class="text-text-primary">{{ SOURCE_MODULE_LABELS[selectedEntryDetail.sourceModule] || selectedEntryDetail.sourceModule }}</p>
            </div>
          </div>

          <!-- Totals -->
          <div class="flex items-center gap-4 p-3 rounded-lg bg-surface-secondary text-sm">
            <div>
              <span class="text-xs text-text-secondary">Débito</span>
              <p class="font-semibold tabular-nums">{{ formatCurrency(selectedEntryDetail.totalDebit) }}</p>
            </div>
            <div>
              <span class="text-xs text-text-secondary">Crédito</span>
              <p class="font-semibold tabular-nums">{{ formatCurrency(selectedEntryDetail.totalCredit) }}</p>
            </div>
          </div>

          <!-- Lines list -->
          <div>
            <h4 class="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">Líneas</h4>
            <div
              v-for="(line, idx) in resolvedLines"
              :key="line.id"
              class="flex items-start gap-2 py-2 border-b border-border last:border-0"
              :class="idx % 2 === 0 ? '' : 'bg-surface-secondary/30 px-1 rounded'"
            >
              <div class="flex-1 min-w-0">
                <p class="text-xs font-mono text-text-secondary">
                  {{ line.accountResolved ? `${line.accountResolved.code} · ${line.accountResolved.name}` : line.accountId }}
                </p>
                <p v-if="line.description" class="text-xs text-text-secondary mt-0.5">{{ line.description }}</p>
              </div>
              <div class="text-right flex-shrink-0 text-xs tabular-nums">
                <p v-if="line.debit > 0">D: {{ formatCurrency(line.debit) }}</p>
                <p v-if="line.credit > 0">C: {{ formatCurrency(line.credit) }}</p>
              </div>
            </div>
          </div>

          <!-- Post error -->
          <div v-if="postError" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {{ postError }}
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <template #footer>
        <div v-if="selectedEntryDetail" class="flex items-center gap-3 p-4">
          <button
            type="button"
            class="min-h-[44px] flex-1 px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
            @click="closeDetail"
          >
            Cerrar
          </button>
          <button
            v-if="selectedEntryDetail.status === 'draft'"
            type="button"
            :disabled="posting"
            class="min-h-[44px] flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handlePost"
          >
            {{ posting ? 'Publicando...' : 'Publicar' }}
          </button>
          <button
            v-if="selectedEntryDetail.status === 'posted'"
            type="button"
            class="min-h-[44px] flex-1 px-4 py-2 rounded-lg border-2 border-destructive/50 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors"
            @click="openVoidModal"
          >
            Anular
          </button>
        </div>
      </template>
    </UiBottomSheetModal>

    <!-- ── Void reason modal ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showVoidModal" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="closeVoidModal" />
        <div class="relative bg-surface rounded-xl shadow-xl w-full max-w-sm p-6">
          <div class="text-center mb-4">
            <div class="mx-auto mb-3 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-text-primary">Anular asiento</h3>
            <p class="text-sm text-text-secondary mt-1">
              Se creará un asiento de reversión automáticamente. Esta acción no se puede deshacer.
            </p>
          </div>

          <textarea
            v-model="voidReason"
            placeholder="Motivo de la anulación (requerido)..."
            rows="3"
            class="w-full mb-4 px-3 py-2 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            :class="voidReason.trim() === '' && voiding ? 'border-destructive' : ''"
          />

          <div v-if="voidError" class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {{ voidError }}
          </div>

          <div class="flex gap-3">
            <button
              type="button"
              :disabled="voiding"
              class="flex-1 min-h-[44px] px-4 py-2 border-2 border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              @click="closeVoidModal"
            >
              Cancelar
            </button>
            <button
              type="button"
              :disabled="voiding || !voidReason.trim()"
              class="flex-1 min-h-[44px] px-4 py-2 bg-destructive text-white rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              @click="handleVoid"
            >
              <svg v-if="voiding" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>{{ voiding ? 'Anulando...' : 'Confirmar anulación' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.dp-custom-input {
  height: 36px !important;
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
