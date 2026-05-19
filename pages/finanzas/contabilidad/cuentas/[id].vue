<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat, startOfMonth } from 'date-fns'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import MetricCard from '~/components/shared/MetricCard.vue'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const accountId = computed(() => route.params.id as string)
const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v ?? 0)

// Truncate a long description to keep table rows compact.
// Click on the row opens the slide-over with the full text.
const truncateDescription = (text: string | null | undefined, maxWords = 4): string => {
  if (!text) return ''
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + '…'
}

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

// Sub-accounts: direct children of this account
const subAccounts = computed<TenantAccount[]>(() =>
  (accountsData.value?.data ?? [])
    .filter(a => a.parentId === accountId.value)
    .sort((a, b) => a.code.localeCompare(b.code))
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

// ── Payment methods (for GL association) ───────────────────────────────────
interface PaymentMethod {
  id: string
  name: string
  groupId: string
  isActive: boolean
  glAccountCode: string | null
}

interface PaymentGroup {
  id: string
  slug: string
  glAccountCode: string | null
}

const { data: methodsData } = useQuery({
  key: () => ['payments', 'methods', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: PaymentMethod[] }>('/api/finanzas/metodos-pago'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const { data: groupsData } = useQuery({
  key: () => ['payments', 'groups', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: PaymentGroup[] }>('/api/finanzas/metodos-pago/grupos'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// Only show methods whose group maps to the current account code
const availableMethods = computed<PaymentMethod[]>(() => {
  const groups = groupsData.value?.data ?? []
  const methods = (methodsData.value?.data ?? []).filter(m => m.isActive)
  if (!account.value) return methods
  // Groups that point to this exact account code
  const matchingGroupIds = new Set(
    groups.filter(g => g.glAccountCode === account.value!.code).map(g => g.id)
  )
  if (!matchingGroupIds.size) return methods  // fallback: show all if no group matches
  return methods.filter(m => matchingGroupIds.has(m.groupId))
})

// ── Create sub-account slide-over ──────────────────────────────────────────
const showCreatePanel  = ref(false)
const createSuffix     = ref('')   // only the part the user types (e.g. "05")
const createName       = ref('')
const createIsDetail   = ref(true)
const createMethodId   = ref('')   // optional: associate to payment method
const creating         = ref(false)
const createError      = ref('')
const codeInput        = ref<HTMLInputElement | null>(null)

// Full code = parent prefix + user-typed suffix
const createFullCode = computed(() => (account.value?.code ?? '') + createSuffix.value.trim())

// Issue #533 — shared with /finanzas/metodos-pago for the auto-create flow.
const suggestSuffix = (parentCode: string): string =>
  suggestSubAccountSuffix(parentCode, accountsData.value?.data ?? [])

const openCreatePanel = async () => {
  createSuffix.value   = account.value ? suggestSuffix(account.value.code) : ''
  createName.value     = ''
  createIsDetail.value = true
  createMethodId.value = ''
  createError.value    = ''
  showCreatePanel.value = true
  await nextTick()
  codeInput.value?.focus()
}

const closeCreatePanel = () => {
  showCreatePanel.value = false
  createError.value = ''
}

const saveSubAccount = async () => {
  if (!createFullCode.value || !createSuffix.value.trim() || !createName.value.trim() || creating.value) return
  creating.value = true
  createError.value = ''
  try {
    // 1. Create the sub-account — inherit class/type/balance/level from parent
    const parent = account.value!
    await $fetch('/api/accounting/accounts', {
      method: 'POST',
      body: {
        code: createFullCode.value,
        name: createName.value.trim(),
        parentId: parent.id,
        isDetail: createIsDetail.value,
        isActive: true,
        accountClass: parent.accountClass,
        accountType: parent.accountType,
        normalBalance: parent.normalBalance,
        level: parent.level + 1,
      },
    })
    // 2. If a payment method was selected, assign this account code to it
    if (createMethodId.value) {
      await $fetch(`/api/finanzas/metodos-pago/${createMethodId.value}`, {
        method: 'PATCH',
        body: { glAccountCode: createFullCode.value },
      })
    }
    closeCreatePanel()
    await refetchAccounts()
  } catch (err: any) {
    createError.value = err?.data?.detail || 'Error al crear la subcuenta'
  } finally {
    creating.value = false
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
const PAGE_SIZE = 20

// ── Journal entries ────────────────────────────────────────────────────────
interface JournalEntry {
  id: string; entryDate: string; description: string; reference: string | null
  sourceModule: string | null; sourceId: string | null; status: string
  totalDebit: number; totalCredit: number
  postedAt: string | null; createdAt: string
}

// Maps a journal entry's source to a navigation URL (returns null if no link)
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

interface JournalEntriesResponse {
  success: boolean; data: JournalEntry[]; total: number; openingBalance: number | null
}

const { data: entriesData, asyncStatus: entriesAsyncStatus, error: entriesError, refetch: refetchEntries } = useQuery({
  key: () => ['accounting', 'journal-entries', currentTenant.value?.id, accountId.value, page.value, statusFilter.value, sourceFilter.value, dateRange.value.from, dateRange.value.to],
  query: () => $fetch<JournalEntriesResponse>('/api/accounting/journal-entries', {
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

const isLoading    = computed(() => entriesData.value == null && !entriesError.value)
const isRefreshing = computed(() => entriesAsyncStatus.value === 'loading' && entriesData.value != null)
const entries      = computed<JournalEntry[]>(() => entriesData.value?.data ?? [])
const totalEntries = computed(() => entriesData.value?.total ?? 0)
const totalPages   = computed(() => Math.max(1, Math.ceil(totalEntries.value / PAGE_SIZE)))
const openingBalance = computed(() => entriesData.value?.openingBalance ?? 0)

// ── Running balance per row ────────────────────────────────────────────────
// Entries arrive sorted ASC from backend when accountId is set.
// Sign depends on account normal_balance:
//   debit-normal  (class 1 Activos, 5 Gastos, 6 Costos): running += debit - credit
//   credit-normal (class 2 Pasivos, 3 Patrimonio, 4 Ingresos): running += credit - debit
interface EntryWithBalance extends JournalEntry { runningBalance: number }

const entriesWithBalance = computed<EntryWithBalance[]>(() => {
  let running = openingBalance.value
  const isDebitNormal = (account.value?.normalBalance ?? 'debit') === 'debit'
  return entries.value.map(e => {
    if (isDebitNormal) {
      running = running + (e.totalDebit ?? 0) - (e.totalCredit ?? 0)
    } else {
      running = running + (e.totalCredit ?? 0) - (e.totalDebit ?? 0)
    }
    return { ...e, runningBalance: running }
  })
})

// Period totals (all entries in range, not just current page — approximated from page)
const periodDebits  = computed(() => entries.value.reduce((s, e) => s + (e.totalDebit ?? 0), 0))
const periodCredits = computed(() => entries.value.reduce((s, e) => s + (e.totalCredit ?? 0), 0))
const closingBalance = computed(() => {
  const last = entriesWithBalance.value[entriesWithBalance.value.length - 1]
  return last ? last.runningBalance : openingBalance.value
})

// ── Table columns ──────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'entryDate',      title: 'Fecha',      sortable: false },
  { key: 'description',    title: 'Descripción', sortable: false },
  { key: 'sourceModule',   title: 'Módulo',      sortable: false },
  { key: 'reference',      title: 'Referencia',  sortable: false },
  { key: 'totalDebit',     title: 'Débito',      sortable: false },
  { key: 'totalCredit',    title: 'Crédito',     sortable: false },
  { key: 'runningBalance', title: 'Saldo',       sortable: false },
  { key: 'status',         title: 'Estado',      sortable: false },
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

// ── Issue #531 — Actualizar saldo real ────────────────────────────────────
const showAdjustPanel = ref(false)
const toast = useToast()
const allAccountsForPanel = computed(() => {
  return (accountsData.value?.data ?? []).map(a => ({ id: a.id, code: a.code, name: a.name }))
})
const onAdjustSuccess = async () => {
  await refetch()
  toast.success('Saldo actualizado correctamente', { title: 'Asiento contable creado' })
}

// ── Issue #531 — Detalle del asiento (slide-over) ─────────────────────────
const showEntryDetailPanel = ref(false)
const selectedEntryId = ref<string | null>(null)
const openEntryDetail = (entry: { id: string }) => {
  selectedEntryId.value = entry.id
  showEntryDetailPanel.value = true
}
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

          <!-- Right: account code (big) + actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="text-right mr-1">
              <p class="text-2xl sm:text-3xl font-bold font-mono text-text-primary">{{ account.code }}</p>
              <p class="text-xs text-text-secondary uppercase tracking-wider font-medium mt-0.5">Código PUC</p>
            </div>

            <!-- + Subcuenta (only for Clase/Grupo/Cuenta — not for Subcuenta 6+ digits) -->
            <button
              v-if="account.code.length < 6"
              type="button"
              class="min-h-[44px] px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center gap-1.5"
              aria-label="Crear subcuenta"
              @click="openCreatePanel"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span class="hidden sm:inline">Subcuenta</span>
            </button>

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

            <!-- Issue #531 — Actualizar saldo real (solo Activo debit-normal hoja activa) -->
            <button
              v-if="account.isDetail && account.accountClass === '1' && account.normalBalance === 'debit' && account.isActive"
              type="button"
              class="min-h-[44px] px-3 rounded-lg border-2 border-primary text-primary text-sm font-medium transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-[0.98] flex items-center gap-1.5"
              :aria-label="`Actualizar saldo real de ${account.name}`"
              @click="showAdjustPanel = true"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Actualizar saldo</span>
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

    <!-- Sub-accounts strip -->
    <div v-if="subAccounts.length" class="flex flex-col gap-1.5">
      <p class="text-xs font-medium text-text-secondary uppercase tracking-wider">Subcuentas</p>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-for="sub in subAccounts"
          :key="sub.id"
          :to="`/finanzas/contabilidad/cuentas/${sub.id}`"
          class="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface hover:bg-surface-secondary hover:border-primary/40 transition-colors group"
        >
          <span class="text-xs font-mono font-medium text-text-primary">{{ sub.code }}</span>
          <span class="text-xs text-text-secondary truncate max-w-[160px]">{{ sub.name }}</span>
          <UiStatusBadge
            :value="sub.isActive ? 'Activa' : 'Inactiva'"
            format="text"
            :variant="sub.isActive ? 'success' : 'secondary'"
            size="sm"
          />
          <svg class="w-3.5 h-3.5 text-text-secondary group-hover:text-primary transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
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

      <!-- ── Period summary strip ───────────────────────────────────────── -->
      <div class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <MetricCard
          title="Saldo inicial"
          :value="openingBalance"
          format="currency"
          :variant="openingBalance >= 0 ? 'primary' : 'destructive'"
        />
        <MetricCard title="Débitos período" :value="periodDebits" format="currency" variant="primary" />
        <MetricCard title="Créditos período" :value="periodCredits" format="currency" variant="primary" />
        <MetricCard
          title="Saldo cierre"
          :value="closingBalance"
          format="currency"
          :variant="closingBalance >= 0 ? 'primary' : 'destructive'"
        />
      </div>

      <!-- ── Ledger table ────────────────────────────────────────────────── -->
      <HealthSemaphore :is-unlocked="true" title="Libro mayor de la cuenta">
        <div class="[&_td]:!py-1 [&_th]:!py-1.5">
          <UiResponsiveDataView
            row-size="sm"
            :columns="tableColumns"
            :data="entriesWithBalance"
            empty-message="Sin asientos para esta cuenta en el período"
            empty-sub-message="Selecciona otro rango de fechas o crea un nuevo asiento"
            variant="default"
            @row-click="openEntryDetail"
          >
            <!-- Mobile card -->
            <template #card="{ item, index }">
              <button
                type="button"
                class="w-full flex items-center gap-3 py-2 px-3 border-b border-border text-left hover:bg-primary/5 transition-colors focus:outline-none focus:bg-primary/5"
                :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
                :aria-label="`Ver detalle del asiento ${item.reference || item.description}`"
                @click="openEntryDetail(item)"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs text-text-secondary flex-shrink-0">{{ formatDate(item.entryDate) }}</span>
                    <UiStatusBadge v-if="item.sourceModule" :value="SOURCE_LABELS[item.sourceModule] || item.sourceModule" format="text" :variant="SOURCE_VARIANTS[item.sourceModule] || 'secondary'" size="sm" />
                  </div>
                  <p class="text-sm font-medium text-text-primary mt-0.5" :title="item.description">{{ truncateDescription(item.description) }}</p>
                </div>
                <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span v-if="item.totalDebit" class="text-xs font-mono text-primary tabular-nums">+{{ formatCOP(item.totalDebit) }}</span>
                  <span v-if="item.totalCredit" class="text-xs font-mono text-text-secondary tabular-nums">-{{ formatCOP(item.totalCredit) }}</span>
                  <span class="text-xs font-mono font-semibold tabular-nums" :class="item.runningBalance >= 0 ? 'text-text-primary' : 'text-destructive'">
                    {{ formatCOP(item.runningBalance) }}
                  </span>
                </div>
              </button>
            </template>

            <template #cell-entryDate="{ value }">
              <span class="text-xs text-text-secondary tabular-nums">{{ formatDate(value) }}</span>
            </template>

            <template #cell-description="{ value }">
              <span
                class="text-sm text-text-primary"
                :title="value"
              >{{ truncateDescription(value) }}</span>
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

            <template #cell-runningBalance="{ value }">
              <span class="text-sm font-mono font-semibold tabular-nums" :class="value >= 0 ? 'text-text-primary' : 'text-destructive'">
                {{ formatCOP(value) }}
              </span>
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

  <!-- ── Slide-over: crear subcuenta ───────────────────────────────────────── -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showCreatePanel"
        class="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        @click="closeCreatePanel"
      />
    </Transition>

    <Transition name="cuenta-panel">
      <div
        v-if="showCreatePanel"
        role="dialog"
        aria-modal="true"
        aria-label="Crear subcuenta"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-border" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                :class="CLASS_BG[account?.accountClass ?? '1'] || 'bg-primary/10'"
                aria-hidden="true"
              >
                <svg class="w-5 h-5" :class="CLASS_TEXT[account?.accountClass ?? '1'] || 'text-primary'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">Crear subcuenta</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5 font-mono">
                  {{ account?.code }} · {{ account?.name }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar panel"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="closeCreatePanel"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

          <!-- Código -->
          <div class="flex flex-col gap-1.5">
            <label for="create-code" class="text-sm font-medium text-text-primary">
              Código PUC <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <div class="flex items-center rounded-lg bg-background overflow-hidden">
              <span class="pl-3 pr-1 text-sm font-mono text-text-secondary select-none flex-shrink-0">{{ account?.code }}</span>
              <span class="text-text-secondary select-none flex-shrink-0 pr-1">·</span>
              <input
                id="create-code"
                ref="codeInput"
                v-model="createSuffix"
                type="text"
                placeholder="05"
                maxlength="6"
                class="flex-1 min-w-0 py-2.5 pr-3 bg-transparent text-sm font-mono text-text-primary border-0 outline-none focus:outline-none focus:ring-0 placeholder:text-text-secondary"
                @keydown.escape="closeCreatePanel"
              />
            </div>
            <p class="text-xs text-text-secondary">
              Código completo:
              <span class="font-mono font-medium text-text-primary">{{ createFullCode || (account?.code + '…') }}</span>
            </p>
          </div>

          <!-- Nombre -->
          <div class="flex flex-col gap-1.5">
            <label for="create-name" class="text-sm font-medium text-text-primary">
              Nombre <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id="create-name"
              v-model="createName"
              type="text"
              placeholder="ej: Nequi, Daviplata…"
              class="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-secondary"
              @keydown.enter="saveSubAccount"
              @keydown.escape="closeCreatePanel"
            />
          </div>

          <!-- Asociar a método de pago (opcional) -->
          <div v-if="availableMethods.length" class="flex flex-col gap-1.5">
            <label for="create-method" class="text-sm font-medium text-text-primary">
              Asociar a método de pago
              <span class="text-text-secondary font-normal">(opcional)</span>
            </label>
            <select
              id="create-method"
              v-model="createMethodId"
              class="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">— Sin asociar —</option>
              <option v-for="m in availableMethods" :key="m.id" :value="m.id">
                {{ m.name }}
                <template v-if="m.glAccountCode"> · {{ m.glAccountCode }}</template>
              </option>
            </select>
            <p class="text-xs text-text-secondary">Las ventas con ese método debitarán esta subcuenta</p>
          </div>

          <!-- Tipo de cuenta -->
          <div class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-text-primary">Tipo</span>
            <div class="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de cuenta">
              <button
                type="button"
                :class="[
                  'flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all focus:outline-none',
                  createIsDetail
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
                @click="createIsDetail = true"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span class="text-xs font-bold tracking-wide">Detalle</span>
                <span :class="['text-[10px] font-mono px-2 py-0.5 rounded-full', createIsDetail ? 'bg-primary/15 text-primary' : 'bg-surface-secondary text-text-tertiary']">
                  registra movimientos
                </span>
              </button>
              <button
                type="button"
                :class="[
                  'flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all focus:outline-none',
                  !createIsDetail
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
                @click="createIsDetail = false"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h8m-8 6h4" />
                </svg>
                <span class="text-xs font-bold tracking-wide">Agrupadora</span>
                <span :class="['text-[10px] font-mono px-2 py-0.5 rounded-full', !createIsDetail ? 'bg-primary/15 text-primary' : 'bg-surface-secondary text-text-tertiary']">
                  solo agrupa saldos
                </span>
              </button>
            </div>
          </div>

          <!-- Error inline -->
          <div v-if="createError" class="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive" role="alert">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ createError }}
          </div>
        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 border-t border-border px-6 py-4 flex gap-3">
          <button
            :disabled="creating || !createSuffix.trim() || !createName.trim()"
            class="flex-1 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            @click="saveSubAccount"
          >
            <svg v-if="creating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ creating ? 'Creando…' : 'Crear subcuenta' }}
          </button>
          <button
            class="min-h-[44px] px-5 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
            @click="closeCreatePanel"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Issue #531 — Actualizar saldo real -->
  <FinanzasContabilidadAjustarSaldoPanel
    v-model="showAdjustPanel"
    :account="account"
    :book-balance="closingBalance"
    :all-accounts="allAccountsForPanel"
    @success="onAdjustSuccess"
  />

  <!-- Issue #531 — Detalle del asiento (slide-over) -->
  <FinanzasContabilidadAsientoDetailPanel
    v-model="showEntryDetailPanel"
    :entry-id="selectedEntryId"
    :all-accounts="allAccountsForPanel"
  />
</template>

<style scoped>
.cuenta-panel-enter-active,
.cuenta-panel-leave-active {
  transition: transform 0.3s ease;
}
.cuenta-panel-enter-from,
.cuenta-panel-leave-to {
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .cuenta-panel-enter-from,
  .cuenta-panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
