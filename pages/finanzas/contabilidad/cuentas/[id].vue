<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat, startOfMonth } from 'date-fns'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const accountId = computed(() => route.params.id as string)
const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v ?? 0)

// ── Labels & variants ──────────────────────────────────────────────────────
const CLASS_SHORT: Record<string, string> = {
  '1': 'Activos', '2': 'Pasivos', '3': 'Patrimonio',
  '4': 'Ingresos', '5': 'Gastos', '6': 'Costos',
}
const CLASS_VARIANTS: Record<string, string> = {
  '1': 'primary', '2': 'warning', '3': 'secondary',
  '4': 'success', '5': 'destructive', '6': 'warning',
}
const CLASS_BG: Record<string, string> = {
  '1': 'bg-primary/10', '2': 'bg-amber-100', '3': 'bg-violet-100',
  '4': 'bg-green-100',  '5': 'bg-red-100',   '6': 'bg-amber-100',
}
const CLASS_TEXT: Record<string, string> = {
  '1': 'text-primary',   '2': 'text-amber-600',  '3': 'text-violet-600',
  '4': 'text-green-600', '5': 'text-red-600',     '6': 'text-amber-600',
}
const pucLevel = (code: string) => {
  const len = code.length
  if (len === 1) return { label: 'Clase',    variant: 'primary' }
  if (len === 2) return { label: 'Grupo',    variant: 'secondary' }
  if (len === 4) return { label: 'Cuenta',   variant: 'warning' }
  return              { label: 'Subcuenta', variant: 'success' }
}
const SOURCE_LABELS: Record<string, string> = {
  ventas: 'Ventas', gastos: 'Gastos', nomina: 'Nómina',
  inventario: 'Inventario', arqueo: 'Arqueo',
  manual: 'Manual', system: 'Sistema',
}
const SOURCE_VARIANTS: Record<string, string> = {
  ventas: 'success', gastos: 'destructive', nomina: 'warning',
  inventario: 'primary', arqueo: 'secondary',
  manual: 'secondary', system: 'secondary',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', posted: 'Publicado', void: 'Anulado',
}
const STATUS_VARIANTS: Record<string, string> = {
  draft: 'warning', posted: 'success', void: 'secondary',
}

// ── Account data (from cached list) ───────────────────────────────────────
interface TenantAccount {
  id: string; code: string; name: string; accountClass: string
  accountType: string; normalBalance: string; level: number
  parentId: string | null; isDetail: boolean; isActive: boolean
  isSystem: boolean; tenantId: string; templateId: string | null; createdAt: string
}

const { data: accountsData, refetch: refetchAccounts } = useQuery({
  key: () => ['accounting', 'accounts', currentTenant.value?.id, null, null],
  query: () => $fetch<{ success: boolean; data: TenantAccount[] }>('/api/accounting/accounts'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const account = computed<TenantAccount | null>(() =>
  accountsData.value?.data?.find(a => a.id === accountId.value) ?? null
)

useHead(() => ({
  title: account.value ? `${account.value.code} · ${account.value.name}` : 'Cuenta contable',
}))

// ── Toggle active ──────────────────────────────────────────────────────────
const togglingActive = ref(false)
const toggleActive = async () => {
  if (!account.value || togglingActive.value) return
  togglingActive.value = true
  try {
    await $fetch(`/api/accounting/accounts/${account.value.id}`, {
      method: 'PUT',
      body: { isActive: !account.value.isActive },
    })
    await refetchAccounts()
  } catch (err: any) {
    alert(err?.data?.detail || 'Error al actualizar la cuenta')
  } finally {
    togglingActive.value = false
  }
}

// ── Date range filter (default: current month) ─────────────────────────────
const now = new Date()
const dateRangeDates = ref<Date[] | null>([startOfMonth(now), now])

const presetDates = [
  { label: 'Hoy',           value: [new Date(), new Date()] },
  { label: 'Ayer',          value: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d] })() },
  { label: 'Esta semana',   value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()] },
  { label: 'Este mes',      value: [startOfMonth(new Date()), new Date()] },
  { label: 'Último mes',    value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()] },
  { label: 'Últimos 90 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d })(), new Date()] },
]

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yy', { locale: es })}`
}

const dateRange = computed(() => {
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null, to: null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return { from: fnsFormat(from, 'yyyy-MM-dd'), to: fnsFormat(to, 'yyyy-MM-dd') }
})

// ── Journal entries filters ────────────────────────────────────────────────
const statusFilter = ref<string | null>(null)
const sourceFilter = ref<string | null>(null)
const page = ref(1)
const PAGE_SIZE = 50

// ── Journal entries ────────────────────────────────────────────────────────
interface JournalEntry {
  id: string; entryDate: string; description: string; reference: string | null
  sourceModule: string | null; status: string
  totalDebit: number; totalCredit: number
  postedAt: string | null; createdAt: string
}

const { data: entriesData, asyncStatus: entriesAsyncStatus, error: entriesError, refetch: refetchEntries } = useQuery({
  key: () => ['accounting', 'journal-entries', currentTenant.value?.id, accountId.value, page.value, statusFilter.value, sourceFilter.value, dateRange.value.from, dateRange.value.to],
  query: () => $fetch<{ success: boolean; data: JournalEntry[]; total: number }>('/api/accounting/journal-entries', {
    params: {
      accountId: accountId.value,
      page: page.value,
      limit: PAGE_SIZE,
      status: statusFilter.value || undefined,
      sourceModule: sourceFilter.value || undefined,
      dateFrom: dateRange.value.from || undefined,
      dateTo: dateRange.value.to || undefined,
    },
  }),
  enabled: () => !!currentTenant.value && !!accountId.value,
  staleTime: 30_000,
})

const isLoading   = computed(() => entriesData.value == null && !entriesError.value)
const isRefreshing = computed(() => entriesAsyncStatus.value === 'loading' && entriesData.value != null)
const entries     = computed<JournalEntry[]>(() => entriesData.value?.data ?? [])
const totalEntries = computed(() => entriesData.value?.total ?? 0)
const totalPages  = computed(() => Math.max(1, Math.ceil(totalEntries.value / PAGE_SIZE)))

// ── Table columns ──────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'entryDate',    title: 'Fecha',      sortable: false },
  { key: 'description', title: 'Descripción', sortable: false },
  { key: 'sourceModule', title: 'Módulo',     sortable: false },
  { key: 'reference',   title: 'Referencia',  sortable: false },
  { key: 'totalDebit',  title: 'Débito',      sortable: false },
  { key: 'totalCredit', title: 'Crédito',     sortable: false },
  { key: 'status',      title: 'Estado',      sortable: false },
]

const formatDate = (iso: string) => {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const hasActiveFilters = computed(() =>
  statusFilter.value !== null || sourceFilter.value !== null || dateRangeDates.value !== null
)
const clearFilters = () => {
  statusFilter.value = null
  sourceFilter.value = null
  dateRangeDates.value = null
  page.value = 1
}

// ── Layout integration ─────────────────────────────────────────────────────
const refetch = () => { refetchEntries(); refetchAccounts() }
registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })
</script>

<template>
  <div class="page-layout">

    <!-- ── Account header card (matches clientes/[id] visual style) ──── -->
    <div v-if="account" class="bg-white border border-border rounded-xl overflow-hidden">

      <!-- Top: avatar + name (left) / code + toggle (right) -->
      <div class="p-5 sm:p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <!-- Left: class-colored circle + name + subtitle -->
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              :class="CLASS_BG[account.accountClass] || 'bg-primary/10'"
            >
              <span class="text-lg font-bold font-mono" :class="CLASS_TEXT[account.accountClass] || 'text-primary'">
                {{ account.code[0] }}
              </span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <h2 class="text-xl font-bold text-text-primary truncate">{{ account.name }}</h2>
                <svg v-if="account.isSystem" class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Cuenta del sistema">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mt-0.5">Cuenta PUC</p>
            </div>
          </div>

          <!-- Right: account code (big) + toggle button -->
          <div class="flex items-center gap-3 flex-shrink-0">
            <div class="text-right">
              <p class="text-2xl sm:text-3xl font-bold font-mono text-text-primary">{{ account.code }}</p>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mt-0.5">Código PUC</p>
            </div>
            <button
              type="button"
              class="min-h-[44px] px-3 rounded-lg border-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              :class="account.isActive
                ? 'border-border text-text-secondary hover:border-destructive hover:text-destructive'
                : 'border-primary text-primary hover:bg-primary/10'"
              :disabled="togglingActive"
              :aria-label="account.isActive ? 'Desactivar cuenta' : 'Activar cuenta'"
              @click="toggleActive"
            >
              <svg v-if="togglingActive" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>{{ account.isActive ? 'Desactivar' : 'Activar' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Info grid: Clase / Nivel / Saldo normal / Estado -->
      <div class="grid grid-cols-2 sm:grid-cols-4 border-t border-border">

        <!-- Clase -->
        <div class="p-4 border-b sm:border-b-0 border-r border-border">
          <div class="flex items-center gap-1.5 mb-1.5">
            <svg class="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">Clase</p>
          </div>
          <UiStatusBadge
            :value="CLASS_SHORT[account.accountClass] || account.accountClass"
            format="text"
            :variant="CLASS_VARIANTS[account.accountClass] || 'secondary'"
            size="sm"
          />
        </div>

        <!-- Nivel -->
        <div class="p-4 border-b sm:border-b-0 sm:border-r border-border">
          <div class="flex items-center gap-1.5 mb-1.5">
            <svg class="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h4" />
            </svg>
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">Nivel</p>
          </div>
          <UiStatusBadge
            :value="pucLevel(account.code).label"
            format="text"
            :variant="pucLevel(account.code).variant"
            size="sm"
          />
        </div>

        <!-- Saldo normal -->
        <div class="p-4 border-r border-border">
          <div class="flex items-center gap-1.5 mb-1.5">
            <svg class="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">Saldo normal</p>
          </div>
          <p class="text-sm font-semibold text-text-primary">
            {{ account.normalBalance === 'debit' ? 'Débito' : 'Crédito' }}
          </p>
        </div>

        <!-- Estado -->
        <div class="p-4">
          <div class="flex items-center gap-1.5 mb-1.5">
            <svg class="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs text-text-secondary uppercase tracking-wider font-medium">Estado</p>
          </div>
          <UiStatusBadge
            :value="account.isActive ? 'Activa' : 'Inactiva'"
            format="text"
            :variant="account.isActive ? 'success' : 'secondary'"
            size="sm"
          />
        </div>
      </div>
    </div>

    <!-- Loading entries -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="entriesError" />

    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- ── Filter bar ──────────────────────────────────────────────────── -->
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">

        <!-- Date range picker (same pattern as ordenes) -->
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
          @update:model-value="page = 1"
        />

        <select
          v-model="statusFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          @change="page = 1"
        >
          <option :value="null">Estado</option>
          <option value="draft">Borrador</option>
          <option value="posted">Publicado</option>
          <option value="void">Anulado</option>
        </select>

        <select
          v-model="sourceFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          @change="page = 1"
        >
          <option :value="null">Módulo</option>
          <option value="ventas">Ventas</option>
          <option value="gastos">Gastos</option>
          <option value="nomina">Nómina</option>
          <option value="inventario">Inventario</option>
          <option value="arqueo">Arqueo</option>
          <option value="manual">Manual</option>
        </select>

        <button
          v-if="hasActiveFilters"
          type="button"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
          aria-label="Limpiar filtros"
          @click="clearFilters"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex-1" />

        <NuxtLink
          to="/finanzas/contabilidad/asientos/crear"
          class="flex items-center gap-1.5 h-10 px-3 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors whitespace-nowrap flex-shrink-0"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo asiento
        </NuxtLink>
      </div>

      <!-- ── Ledger table ────────────────────────────────────────────────── -->
      <HealthSemaphore :is-unlocked="true" title="Libro mayor de la cuenta">
        <div class="[&_td]:!py-1 [&_th]:!py-1.5">
          <UiResponsiveDataView
            row-size="sm"
            :columns="tableColumns"
            :data="entries"
            empty-message="Sin asientos para esta cuenta"
            empty-sub-message="Los asientos que afecten esta cuenta aparecerán aquí"
            variant="default"
          >
            <!-- Mobile card -->
            <template #card="{ item, index }">
              <div
                class="flex items-center gap-3 py-2 px-3 border-b border-border"
                :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs text-text-secondary flex-shrink-0">{{ formatDate(item.entryDate) }}</span>
                    <UiStatusBadge v-if="item.sourceModule" :value="SOURCE_LABELS[item.sourceModule] || item.sourceModule" format="text" :variant="SOURCE_VARIANTS[item.sourceModule] || 'secondary'" size="sm" />
                  </div>
                  <p class="text-sm font-medium text-text-primary truncate mt-0.5">{{ item.description }}</p>
                </div>
                <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span v-if="item.totalDebit" class="text-xs font-mono text-primary tabular-nums">+{{ formatCOP(item.totalDebit) }}</span>
                  <span v-if="item.totalCredit" class="text-xs font-mono text-text-secondary tabular-nums">-{{ formatCOP(item.totalCredit) }}</span>
                  <UiStatusBadge :value="STATUS_LABELS[item.status] || item.status" format="text" :variant="STATUS_VARIANTS[item.status] || 'secondary'" size="sm" />
                </div>
              </div>
            </template>

            <template #cell-entryDate="{ value }">
              <span class="text-xs text-text-secondary tabular-nums">{{ formatDate(value) }}</span>
            </template>

            <template #cell-description="{ value }">
              <span class="text-sm text-text-primary">{{ value }}</span>
            </template>

            <template #cell-sourceModule="{ value }">
              <UiStatusBadge v-if="value" :value="SOURCE_LABELS[value] || value" format="text" :variant="SOURCE_VARIANTS[value] || 'secondary'" size="sm" />
              <span v-else class="text-xs text-text-secondary">—</span>
            </template>

            <template #cell-reference="{ value }">
              <span class="text-xs font-mono text-text-secondary">{{ value || '—' }}</span>
            </template>

            <template #cell-totalDebit="{ value }">
              <span v-if="value" class="text-sm font-mono font-medium text-primary tabular-nums">{{ formatCOP(value) }}</span>
              <span v-else class="text-xs text-text-secondary">—</span>
            </template>

            <template #cell-totalCredit="{ value }">
              <span v-if="value" class="text-sm font-mono text-text-secondary tabular-nums">{{ formatCOP(value) }}</span>
              <span v-else class="text-xs text-text-secondary">—</span>
            </template>

            <template #cell-status="{ value }">
              <UiStatusBadge :value="STATUS_LABELS[value] || value" format="text" :variant="STATUS_VARIANTS[value] || 'secondary'" size="sm" />
            </template>
          </UiResponsiveDataView>
        </div>
      </HealthSemaphore>

      <!-- Pagination -->
      <div v-if="totalEntries > PAGE_SIZE" class="flex items-center justify-end px-1 py-2">
        <div class="flex items-center gap-1">
          <button :disabled="page <= 1" @click="page = 1" class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Primera página">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button :disabled="page <= 1" @click="page--" class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Anterior">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ page }} / {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="page++" class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Siguiente">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button :disabled="page >= totalPages" @click="page = totalPages" class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Última página">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
