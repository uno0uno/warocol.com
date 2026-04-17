<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MetricCard from '~/components/shared/MetricCard.vue'
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
  key: () => ['accounting', 'journal-entries', currentTenant.value?.id, accountId.value, page.value, statusFilter.value, sourceFilter.value],
  query: () => $fetch<{ success: boolean; data: JournalEntry[]; total: number }>('/api/accounting/journal-entries', {
    params: {
      accountId: accountId.value,
      page: page.value,
      limit: PAGE_SIZE,
      status: statusFilter.value || undefined,
      sourceModule: sourceFilter.value || undefined,
    },
  }),
  enabled: () => !!currentTenant.value && !!accountId.value,
  staleTime: 30_000,
})

const isLoading = computed(() => entriesData.value == null && !entriesError.value)
const isRefreshing = computed(() => entriesAsyncStatus.value === 'loading' && entriesData.value != null)
const entries = computed<JournalEntry[]>(() => entriesData.value?.data ?? [])
const totalEntries = computed(() => entriesData.value?.total ?? 0)
const totalPages = computed(() => Math.max(1, Math.ceil(totalEntries.value / PAGE_SIZE)))

// ── Summary stats ──────────────────────────────────────────────────────────
const stats = computed(() => {
  const list = entries.value
  const debits  = list.reduce((s, e) => s + (e.totalDebit ?? 0), 0)
  const credits = list.reduce((s, e) => s + (e.totalCredit ?? 0), 0)
  return { count: totalEntries.value, debits, credits, net: debits - credits }
})

// ── Table columns ──────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'entryDate',    title: 'Fecha',       sortable: false },
  { key: 'description', title: 'Descripción',  sortable: false },
  { key: 'sourceModule', title: 'Módulo',      sortable: false },
  { key: 'reference',   title: 'Referencia',   sortable: false },
  { key: 'totalDebit',  title: 'Débito',       sortable: false },
  { key: 'totalCredit', title: 'Crédito',      sortable: false },
  { key: 'status',      title: 'Estado',       sortable: false },
]

const formatDate = (iso: string) => {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const hasActiveFilters = computed(() => statusFilter.value !== null || sourceFilter.value !== null)
const clearFilters = () => { statusFilter.value = null; sourceFilter.value = null; page.value = 1 }

// ── Layout integration ─────────────────────────────────────────────────────
const refetch = () => { refetchEntries(); refetchAccounts() }
registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })
</script>

<template>
  <div class="page-layout">

    <!-- Back + Account Header -->
    <div class="flex flex-col gap-3">
      <NuxtLink
        to="/finanzas/contabilidad/cuentas"
        class="text-xs text-text-secondary hover:text-primary transition-colors"
      >
        ← Plan de cuentas PUC
      </NuxtLink>

      <!-- Account info card -->
      <div v-if="account" class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-lg font-bold font-mono text-text-primary">{{ account.code }}</span>
            <svg v-if="account.isSystem" class="w-3.5 h-3.5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Cuenta del sistema">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <UiStatusBadge :value="CLASS_SHORT[account.accountClass] || account.accountClass" format="text" :variant="CLASS_VARIANTS[account.accountClass] || 'secondary'" size="sm" />
            <UiStatusBadge :value="pucLevel(account.code).label" format="text" :variant="pucLevel(account.code).variant" size="sm" />
            <UiStatusBadge :value="account.isActive ? 'Activa' : 'Inactiva'" format="text" :variant="account.isActive ? 'success' : 'secondary'" size="sm" />
          </div>
          <p class="text-sm font-medium text-text-primary mt-1">{{ account.name }}</p>
          <p class="text-xs text-text-secondary mt-0.5">Saldo normal: <span class="font-medium">{{ account.normalBalance === 'debit' ? 'Débito' : 'Crédito' }}</span></p>
        </div>
        <button
          type="button"
          class="flex items-center gap-1.5 h-9 px-3 rounded-lg border-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="account.isActive
            ? 'border-border text-text-secondary hover:border-destructive hover:text-destructive'
            : 'border-primary text-primary hover:bg-primary/10'"
          :disabled="togglingActive"
          @click="toggleActive"
        >
          <svg v-if="togglingActive" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>{{ account.isActive ? 'Desactivar cuenta' : 'Activar cuenta' }}</span>
        </button>
      </div>
    </div>

    <!-- Loading entries -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="entriesError" />

    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- ── Summary cards ─────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard title="Asientos"      :value="stats.count"   format="number"   variant="primary" />
        <MetricCard title="Total débitos"  :value="stats.debits"  format="currency" variant="primary" />
        <MetricCard title="Total créditos" :value="stats.credits" format="currency" variant="primary" />
        <MetricCard title="Neto"           :value="stats.net"     format="currency" variant="primary" />
      </div>

      <!-- ── Filter bar ──────────────────────────────────────────────────── -->
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
        <select
          v-model="statusFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          @change="page = 1"
        >
          <option :value="null">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="posted">Publicado</option>
          <option value="void">Anulado</option>
        </select>

        <select
          v-model="sourceFilter"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          @change="page = 1"
        >
          <option :value="null">Todos los módulos</option>
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
