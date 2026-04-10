<template>
  <div class="page-layout">

    <!-- Header info card -->
    <div class="bg-surface border-2 border-border rounded-lg mb-3 sm:mb-4">
      <div class="p-3 sm:p-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          <!-- Period -->
          <div class="flex items-center gap-3">
            <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Período</p>
              <p class="text-base font-semibold text-text-primary">{{ formatPeriod(periodStart, periodEnd) }}</p>
            </div>
          </div>

          <!-- Period picker (editable) -->
          <div class="sm:col-span-2 flex flex-wrap items-center gap-2">
            <VueDatePicker
              v-model="dateRangeDates"
              range
              :preset-dates="presetDates"
              :enable-time-picker="false"
              :locale="es"
              placeholder="Rango de fechas"
              auto-apply
              :max-date="new Date()"
              :format="formatDateRange"
              input-class-name="dp-custom-input"
              menu-class-name="dp-custom-menu"
              calendar-cell-class-name="dp-custom-cell"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="previewLoading" class="flex justify-center py-16">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="previewError" class="text-center py-16 text-text-secondary text-sm">
      No se pudo cargar el resumen. Verifica el período e intenta de nuevo.
    </div>

    <!-- Preview cards -->
    <div v-else-if="previewData" class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <!-- Ventas -->
      <div class="bg-surface border-2 border-border rounded-lg">
        <div class="p-3 sm:p-4 border-b border-border">
          <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Ventas del período</h3>
        </div>
        <div class="divide-y divide-border">
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Total ventas</span>
            <span class="font-bold text-text-primary">{{ formatCurrency(previewData.totalSales) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Órdenes</span>
            <span class="font-medium">{{ previewData.itemsSold }}</span>
          </div>
        </div>
      </div>

      <!-- Caja -->
      <div class="bg-surface border-2 border-border rounded-lg">
        <div class="p-3 sm:p-4 border-b border-border">
          <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Estado de caja</h3>
        </div>
        <div class="divide-y divide-border">
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Efectivo recibido</span>
            <span class="font-medium">{{ formatCurrency(previewData.totalCash) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Gastos en efectivo</span>
            <span class="font-medium text-destructive">− {{ formatCurrency(previewData.gastosEfectivo) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm font-semibold">
            <span class="text-text-primary">Esperado en caja</span>
            <span class="text-text-primary">{{ formatCurrency(previewData.cashExpected) }}</span>
          </div>
          <div class="flex justify-between px-4 py-2.5 text-sm">
            <span class="text-text-secondary">Mesas abiertas</span>
            <span
              class="font-medium"
              :class="previewData.openTablesCount > 0 ? 'text-amber-600 font-semibold' : 'text-text-primary'"
            >
              {{ previewData.openTablesCount }}
            </span>
          </div>
        </div>
      </div>

      <!-- Métodos de pago -->
      <div class="sm:col-span-2 bg-surface border-2 border-border rounded-lg">
        <div class="p-3 sm:p-4 border-b border-border">
          <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wide">Métodos de pago</h3>
        </div>
        <div v-if="groupedMethods?.length" class="divide-y divide-border">
          <div
            v-for="grp in groupedMethods"
            :key="grp.slug"
          >
            <!-- Group header -->
            <div class="flex items-center justify-between px-4 py-2.5 bg-background">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="GROUP_COLORS[grp.slug]?.dot ?? 'bg-primary'" />
                <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">{{ grp.label }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="text-xs font-semibold px-1.5 py-0.5 rounded"
                  :class="GROUP_COLORS[grp.slug]?.badge ?? 'bg-primary/10 text-primary'"
                >
                  {{ groupTotalPct(grp).toFixed(0) }}%
                </span>
                <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(grp.groupTotal) }}</span>
              </div>
            </div>
            <!-- Methods -->
            <div class="divide-y divide-border">
              <div
                v-for="(m, mi) in grp.methods"
                :key="m.key"
                class="flex items-center justify-between pl-8 pr-4 py-2.5"
                :class="mi % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
              >
                <span class="text-sm text-text-primary">{{ m.label }}</span>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-text-secondary">{{ methodPct(m).toFixed(0) }}%</span>
                  <span class="text-sm font-medium text-text-primary w-28 text-right">{{ formatCurrency(m.total) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="px-4 py-4 text-sm text-text-secondary">Sin datos de métodos de pago.</div>
      </div>

      <!-- CTA -->
      <div class="sm:col-span-2 flex flex-wrap gap-3">
        <button
          @click="navigateTo({ path: '/finanzas/cierre/z', query: { start: periodStart, end: periodEnd } })"
          class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Hacer cierre Z con este período →
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Cierre X - Warocol' })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const route = useRoute()

const today = new Date().toISOString().split('T')[0]

// Initialise from query params if present
const initStart = (route.query.start as string) || today
const initEnd   = (route.query.end   as string) || today
const dateRangeDates = ref<Date[] | null>([
  new Date(initStart + 'T12:00:00'),
  new Date(initEnd   + 'T12:00:00'),
])

const presetDates = ref([
  { label: 'Hoy',           value: [new Date(), new Date()] },
  { label: 'Ayer',          value: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d] })() },
  { label: 'Última semana', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()] },
  { label: 'Último mes',    value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()] },
])

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })}`
}

const periodStart = computed(() =>
  dateRangeDates.value?.[0] ? fnsFormat(dateRangeDates.value[0], 'yyyy-MM-dd') : today
)
const periodEnd = computed(() =>
  dateRangeDates.value?.[1] ? fnsFormat(dateRangeDates.value[1], 'yyyy-MM-dd') : today
)

const { data: rawPreview, status: previewStatus, asyncStatus: previewAsyncStatus, error: previewErr, refetch } = useQuery({
  key: () => ['cierre', 'preview', currentTenant.value?.id, periodStart.value, periodEnd.value],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/preview', {
    params: { period_start: periodStart.value, period_end: periodEnd.value },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const previewData    = computed(() => rawPreview.value?.data ?? null)
const previewLoading = computed(() => previewStatus.value === 'pending' && !previewData.value)
const previewError   = computed(() => previewErr.value)
const isRefreshing   = computed(() => previewAsyncStatus.value === 'loading' && previewData.value != null)

const GROUP_LABELS: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', digital: 'Digital', credit: 'Crédito',
}

const GROUP_COLORS: Record<string, { dot: string; badge: string }> = {
  cash:    { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  card:    { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700'       },
  digital: { dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700'   },
  credit:  { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700'     },
}

interface BreakdownRowRaw { group_slug: string; method_name: string; total: number }
interface BreakdownGroup  { slug: string; label: string; total: number }
interface DisplayMethod   { key: string; groupSlug: string; label: string; groupLabel: string; total: number }

// Individual methods sorted by total desc; fallback to group-level totals
const displayMethods = computed<DisplayMethod[]>(() => {
  const rows: BreakdownRowRaw[] = previewData.value?.breakdown ?? []
  if (rows.length > 0) {
    return [...rows]
      .sort((a, b) => b.total - a.total)
      .map(r => ({
        key:        `${r.group_slug}__${r.method_name}`,
        groupSlug:  r.group_slug,
        label:      r.method_name,
        groupLabel: GROUP_LABELS[r.group_slug] ?? r.group_slug,
        total:      r.total,
      }))
  }
  // fallback: group-level non-zero totals
  const p = previewData.value
  if (!p) return []
  return ([
    { slug: 'cash',    label: 'Efectivo', total: p.totalCash    ?? 0 },
    { slug: 'card',    label: 'Tarjeta',  total: p.totalCard    ?? 0 },
    { slug: 'digital', label: 'Digital',  total: p.totalDigital ?? 0 },
    { slug: 'credit',  label: 'Crédito',  total: p.totalCredit  ?? 0 },
  ] as BreakdownGroup[])
    .filter(g => g.total > 0)
    .map(g => ({ key: g.slug, groupSlug: g.slug, label: g.label, groupLabel: g.label, total: g.total }))
})

const methodPct = (m: DisplayMethod) => {
  const total = previewData.value?.totalSales ?? 0
  if (total === 0) return 0
  return Math.min(100, (m.total / total) * 100)
}

interface GroupedSection {
  slug: string
  label: string
  groupTotal: number
  methods: DisplayMethod[]
}

const groupedMethods = computed<GroupedSection[]>(() => {
  const map = new Map<string, GroupedSection>()
  for (const m of displayMethods.value) {
    if (!map.has(m.groupSlug)) {
      map.set(m.groupSlug, {
        slug: m.groupSlug,
        label: m.groupLabel,
        groupTotal: 0,
        methods: [],
      })
    }
    const grp = map.get(m.groupSlug)!
    grp.groupTotal += m.total
    grp.methods.push(m)
  }
  return Array.from(map.values()).sort((a, b) => b.groupTotal - a.groupTotal)
})

const groupTotalPct = (grp: GroupedSection) => {
  const total = previewData.value?.totalSales ?? 0
  if (total === 0) return 0
  return Math.min(100, (grp.groupTotal / total) * 100)
}

registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const formatPeriod = (start: string, end: string) => {
  if (!start) return ''
  const fmt = (d: string) => new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota',
  }).format(new Date(d + 'T12:00:00'))
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}
</script>
