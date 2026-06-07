<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import MetricCard from '~/components/shared/MetricCard.vue'

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

const statusFilter = ref<string>('')
const sourceModuleFilter = ref<string>('')
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()

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

const allAccountsForPanel = computed(() =>
  (accountsData.value?.data ?? []).map(a => ({ id: a.id, code: a.code, name: a.name })),
)

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

// ── Period summary (page-level aggregates) ────────────────────────────────────
const pageDebits = computed(() => entries.value.reduce((sum, e) => sum + e.totalDebit, 0))
const pageCredits = computed(() => entries.value.reduce((sum, e) => sum + e.totalCredit, 0))
const pageIsBalanced = computed(() => Math.abs(pageDebits.value - pageCredits.value) < 0.01)

const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

// ── Filter helpers ───────────────────────────────────────────────────────────
const hasActiveFilters = computed(
  () => !!statusFilter.value || !!sourceModuleFilter.value || !!dateRangeDates.value,
)

const clearFilters = () => {
  statusFilter.value = ''
  sourceModuleFilter.value = ''
  clearDateRange()
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

const SOURCE_MODULE_LABELS: Record<string, string> = {
  gastos: 'Gastos',
  ventas: 'Ventas',
  nomina: 'Nómina',
  inventario: 'Inventario',
  arqueo: 'Arqueo',
  manual: 'Manual',
  system: 'Sistema',
  customer_wallet_recharge: 'Recarga billetera',
  customer_wallet_refund: 'Devolución billetera',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  posted: 'Publicado',
  voided: 'Anulado',
}

const statusFilterOptions = [
  { label: 'Borrador', value: 'draft' },
  { label: 'Publicado', value: 'posted' },
  { label: 'Anulado', value: 'voided' },
]

const sourceModuleFilterOptions = [
  { label: 'Manual', value: 'manual' },
  { label: 'Gastos', value: 'gastos' },
  { label: 'Ventas', value: 'ventas' },
  { label: 'Nómina', value: 'nomina' },
  { label: 'Inventario', value: 'inventario' },
  { label: 'Arqueo', value: 'arqueo' },
  { label: 'Sistema', value: 'system' },
]

// ── Table columns ────────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'entryDate',     title: 'Fecha',       sortable: false },
  { key: 'description',   title: 'Descripción', sortable: false },
  { key: 'sourceModule',  title: 'Módulo',      sortable: false },
  { key: 'status',        title: 'Estado',      sortable: false },
  { key: 'totalDebit',    title: 'Débito',      sortable: false },
  { key: 'totalCredit',   title: 'Crédito',     sortable: false },
  { key: 'actions',       title: 'Acciones',    sortable: false },
]

// ── Entry navigation link ─────────────────────────────────────────────────────
const entryLink = (entry: JournalEntry): string | null => {
  if (!entry.sourceId) return null
  if (entry.sourceModule === 'orden' || entry.sourceModule === 'orden_cogs') {
    return `/ventas/${entry.sourceId}`
  }
  if (entry.sourceModule === 'inventario') {
    return `/abastecimiento/compras-directas/${entry.sourceId}`
  }
  return null
}

// ── Detail slide-over (#916 — reuse AsientoDetailPanel from #531) ─────────────
const showDetailPanel = ref(false)
const selectedEntryId = ref<string | null>(null)

const openDetail = (entry: JournalEntry) => {
  selectedEntryId.value = entry.id
  showDetailPanel.value = true
}

const closeDetail = () => {
  showDetailPanel.value = false
  selectedEntryId.value = null
}

const onDetailUpdated = async () => {
  await refetch()
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

      <!-- Period summary strip -->
      <div class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <MetricCard title="Total asientos" :value="totalEntries" format="number" variant="primary" />
        <MetricCard title="Débitos" :value="pageDebits" format="currency" variant="primary" />
        <MetricCard title="Créditos" :value="pageCredits" format="currency" variant="primary" />
        <MetricCard
          title="Estado"
          :value="pageIsBalanced ? 'Cuadrado' : 'Descuadrado'"
          format="text"
          :variant="pageIsBalanced ? 'success' : 'warning'"
        />
      </div>

      <UiAdvancedFiltersBar
        v-model:date-range="dateRangeDates"
        :search-fields="[]"
        :show-search="false"
        :preset-dates="presetDates"
        :format-date-range="formatDateRange"
        :show-clear="hasActiveFilters"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="statusFilter"
            :class="filterSelectClass"
            class="md:hidden"
            aria-label="Filtrar por estado"
          >
            <option value="">Estado</option>
            <option v-for="option in statusFilterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select
            v-model="sourceModuleFilter"
            :class="filterSelectClass"
            class="md:hidden"
            aria-label="Filtrar por módulo"
          >
            <option value="">Módulo</option>
            <option v-for="option in sourceModuleFilterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </template>
        <template #trailing>
          <NuxtLink
            to="/finanzas/contabilidad/asientos/crear"
            class="h-10 px-3 flex items-center gap-1.5 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors whitespace-nowrap shrink-0"
            aria-label="Crear nuevo asiento contable"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="hidden sm:inline">Nuevo asiento</span>
          </NuxtLink>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Table loading (filter change) -->
      <div v-if="isRefreshing && entries.length === 0" class="flex items-center justify-center min-h-[200px]">
        <CommonsTheCustomLoader size="medium" />
      </div>

      <!-- Entries table -->
      <div v-else class="[&_td]:!py-1 [&_th]:!py-1.5">
        <UiResponsiveDataView
          row-size="sm"
          :columns="tableColumns"
          :data="entries"
          empty-message="No hay asientos contables registrados"
          empty-sub-message="Crea el primer asiento manual con el botón 'Nuevo asiento'"
          variant="default"
          @row-click="openDetail"
        >
        <template #header-sourceModule>
          <UiTableHeaderFilter
            v-model="sourceModuleFilter"
            title="Módulo"
            filter-type="select"
            :options="sourceModuleFilterOptions"
            all-label="Todos"
          />
        </template>

        <template #header-status>
          <UiTableHeaderFilter
            v-model="statusFilter"
            title="Estado"
            filter-type="select"
            :options="statusFilterOptions"
            all-label="Todos"
          />
        </template>

        <!-- Mobile card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-2 px-3 border-b border-border cursor-pointer hover:bg-surface-secondary transition-colors"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            @click="openDetail(item)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-text-secondary flex-shrink-0">{{ formatDate(item.entryDate) }}</span>
                <UiStatusBadge v-if="item.sourceModule" :value="SOURCE_MODULE_LABELS[item.sourceModule] || item.sourceModule" format="text" variant="secondary" size="sm" />
              </div>
              <NuxtLink v-if="entryLink(item)" :to="entryLink(item) || ''" class="text-sm font-medium text-primary hover:underline underline-offset-2 truncate mt-0.5 block">{{ item.description }}</NuxtLink>
              <p v-else class="text-sm font-medium text-text-primary truncate mt-0.5">{{ item.description }}</p>
            </div>
            <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
              <span v-if="item.totalDebit" class="text-xs font-mono text-primary tabular-nums">+{{ formatCurrency(item.totalDebit) }}</span>
              <span v-if="item.totalCredit" class="text-xs font-mono text-text-secondary tabular-nums">-{{ formatCurrency(item.totalCredit) }}</span>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-entryDate="{ value }">
          <span class="text-xs text-text-secondary tabular-nums">{{ formatDate(value) }}</span>
        </template>

        <template #cell-description="{ value, row }">
          <NuxtLink
            v-if="entryLink(row)"
            :to="entryLink(row) || ''"
            class="text-sm text-primary hover:underline underline-offset-2 font-medium"
          >{{ value }}</NuxtLink>
          <span v-else class="text-sm text-text-primary">{{ value }}</span>
        </template>

        <template #cell-sourceModule="{ value }">
          <UiStatusBadge v-if="value" :value="SOURCE_MODULE_LABELS[value] || value" format="text" variant="secondary" size="sm" />
          <span v-else class="text-xs text-text-secondary">—</span>
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
          <span v-if="value" class="text-sm font-mono font-medium text-primary tabular-nums">{{ formatCurrency(value) }}</span>
          <span v-else class="text-xs text-text-secondary">—</span>
        </template>

        <template #cell-totalCredit="{ value }">
          <span v-if="value" class="text-sm font-mono text-text-secondary tabular-nums">{{ formatCurrency(value) }}</span>
          <span v-else class="text-xs text-text-secondary">—</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-center">
            <button
              type="button"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors"
              :aria-label="`Ver asiento del ${formatDate(row.entryDate)}`"
              title="Ver detalle"
              @click.stop="openDetail(row)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </template>

        </UiResponsiveDataView>
      </div>

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

    <FinanzasContabilidadAsientoDetailPanel
      v-model="showDetailPanel"
      :entry-id="selectedEntryId"
      :all-accounts="allAccountsForPanel"
      allow-actions
      @updated="onDetailUpdated"
      @void-request="openVoidModal"
    />

    <!-- ── Void reason modal ───────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showVoidModal" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-overlay-backdrop/50" @click="closeVoidModal" />
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
              class="flex-1 min-h-[44px] px-4 py-2 bg-action-destructive-bg text-action-destructive-text rounded-lg text-sm font-semibold hover:bg-action-destructive-hover-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
