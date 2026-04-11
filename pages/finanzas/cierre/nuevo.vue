<template>
  <div class="page-layout">

    <!-- ── Hint card: último cierre ────────────────────────────────────────── -->
    <div v-if="ultimoCierre" class="bg-surface border border-border rounded-lg mb-3 overflow-hidden">
      <div class="px-3 py-2 bg-background border-b border-border flex items-center justify-between">
        <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Último cierre registrado</span>
        <span class="text-xs text-text-tertiary">{{ formatClosedAt(ultimoCierre.closedAt) }}</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        <div class="px-3 py-2.5">
          <p class="text-xs text-text-secondary mb-0.5">Período</p>
          <p class="text-xs font-semibold text-text-primary">{{ formatPeriod(ultimoCierre.periodStart, ultimoCierre.periodEnd) }}</p>
        </div>
        <div class="px-3 py-2.5">
          <p class="text-xs text-text-secondary mb-0.5">Total ventas</p>
          <p class="text-sm font-bold text-text-primary">{{ formatCurrency(ultimoCierre.totalSales) }}</p>
        </div>
        <div class="px-3 py-2.5">
          <p class="text-xs text-text-secondary mb-0.5">Efectivo contado</p>
          <p class="text-sm font-semibold text-text-primary">{{ formatCurrency(ultimoCierre.cashCounted) }}</p>
        </div>
        <div class="px-3 py-2.5">
          <p class="text-xs text-text-secondary mb-0.5">Diferencia caja</p>
          <p
            class="text-sm font-bold"
            :class="ultimoCierre.cashDifference >= 0 ? 'text-emerald-600' : 'text-destructive'"
          >
            {{ ultimoCierre.cashDifference >= 0 ? '+' : '' }}{{ formatCurrency(ultimoCierre.cashDifference) }}
          </p>
        </div>
      </div>
      <!-- Sugerencia de período -->
      <div v-if="suggestedRange" class="px-3 py-2 bg-primary/5 border-t border-primary/15 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <svg class="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs text-primary">
            Período sugerido: <strong>{{ formatPeriod(suggestedRange.start, suggestedRange.end) }}</strong>
            <span class="text-primary/70"> (desde el último cierre hasta hoy)</span>
          </span>
        </div>
        <button
          @click="applySuggested"
          class="flex-shrink-0 text-xs font-semibold text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>

    <!-- ── Filter bar ───────────────────────────────────────────────────── -->
    <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide mb-4">
      <button
        v-for="p in presets"
        :key="p.key"
        class="h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors flex-shrink-0"
        :class="activePreset === p.key
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-text-secondary hover:border-primary/50 hover:text-text-primary'"
        @click="applyPreset(p)"
      >
        {{ p.label }}
      </button>

      <VueDatePicker
        v-model="dateRangeDates"
        range
        :preset-dates="dpPresets"
        :enable-time-picker="false"
        :locale="es"
        placeholder="Rango personalizado…"
        auto-apply
        :max-date="new Date()"
        :format="formatDateRange"
        input-class-name="dp-custom-input"
        menu-class-name="dp-custom-menu"
        calendar-cell-class-name="dp-custom-cell"
        @update:model-value="activePreset = null"
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

      <!-- Cierre X — vista previa -->
      <button
        class="text-left bg-surface border-2 border-border hover:border-blue-400 rounded-xl p-5 transition-all group active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-400/40"
        @click="goTo('x')"
      >
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600">Sin registro</span>
        </div>
        <h4 class="text-base font-bold text-text-primary mb-1">Cierre X</h4>
        <p class="text-sm text-text-secondary leading-relaxed mb-4">
          Consulta el estado de caja del período sin registrar el cierre. Útil para revisar antes de cerrar.
        </p>
        <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 group-hover:gap-2.5 transition-all">
          Ver resumen
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </button>

      <!-- Cierre Z — registrar -->
      <button
        class="text-left bg-surface border-2 border-primary/40 hover:border-primary rounded-xl p-5 transition-all group active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-primary/30 relative overflow-hidden"
        @click="goTo('z')"
      >
        <div class="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded-t-xl" />
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">Definitivo</span>
        </div>
        <h4 class="text-base font-bold text-text-primary mb-1">Cierre Z</h4>
        <p class="text-sm text-text-secondary leading-relaxed mb-4">
          Registra y cierra el período contable de forma definitiva. Incluye conteo de efectivo y notas.
        </p>
        <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
          Registrar cierre
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Nuevo cierre - Warocol' })

const { currentTenant } = useTenantReactive()
const today = new Date().toISOString().split('T')[0]

// ── Último cierre ─────────────────────────────────────────────────────────

interface UltimoCierre {
  id: string
  periodStart: string
  periodEnd: string
  closedAt: string
  totalSales: number
  cashCounted: number
  cashDifference: number
}

const { data: ultimoData } = useQuery({
  key: () => ['cierre', 'ultimo', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: UltimoCierre | null }>('/api/cierre/ultimo'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const ultimoCierre = computed(() => ultimoData.value?.data ?? null)

// Período sugerido: día siguiente al periodEnd del último cierre → hoy
const suggestedRange = computed(() => {
  if (!ultimoCierre.value) return null
  const after = new Date(ultimoCierre.value.periodEnd + 'T12:00:00')
  after.setDate(after.getDate() + 1)
  const todayDate = new Date()
  todayDate.setHours(12, 0, 0, 0)
  if (after > todayDate) return null // ya estamos dentro del mismo día
  return {
    start: fnsFormat(after, 'yyyy-MM-dd'),
    end: today,
    startDate: after,
    endDate: todayDate,
  }
})

const applySuggested = () => {
  if (!suggestedRange.value) return
  activePreset.value = null
  dateRangeDates.value = [suggestedRange.value.startDate, suggestedRange.value.endDate]
}

// ── Presets ───────────────────────────────────────────────────────────────

interface Preset { key: string; label: string; start: Date; end: Date }

const buildPresets = (): Preset[] => {
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return [
    { key: 'today',     label: 'Hoy',           start: new Date(), end: new Date() },
    { key: 'yesterday', label: 'Ayer',           start: yesterday,  end: yesterday },
    { key: 'week',      label: 'Últimos 7 días', start: weekStart,  end: new Date() },
    { key: 'month',     label: 'Este mes',        start: monthStart, end: new Date() },
  ]
}

const presets = buildPresets()
const activePreset = ref<string | null>('today')
const dateRangeDates = ref<Date[]>([new Date(), new Date()])

const dpPresets = presets.map(p => ({ label: p.label, value: [p.start, p.end] }))

const applyPreset = (p: Preset) => {
  activePreset.value = p.key
  dateRangeDates.value = [p.start, p.end]
}

// ── Period ────────────────────────────────────────────────────────────────

const periodStart = computed(() =>
  dateRangeDates.value?.[0] ? fnsFormat(dateRangeDates.value[0], 'yyyy-MM-dd') : today
)
const periodEnd = computed(() =>
  dateRangeDates.value?.[1] ? fnsFormat(dateRangeDates.value[1], 'yyyy-MM-dd') : today
)

const formatDateRange = (dates: Date[]) => {
  if (!dates?.[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })}`
}

const formatPeriod = (start: string, end: string) => {
  const fmt = (d: string) => new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota',
  }).format(new Date(d + 'T12:00:00'))
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}

const formatClosedAt = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota',
  }).format(new Date(iso))

const formatCurrency = (v?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v ?? 0)

// ── Navigate ──────────────────────────────────────────────────────────────

const goTo = (type: 'x' | 'z') => {
  navigateTo({
    path: `/finanzas/cierre/${type}`,
    query: { start: periodStart.value, end: periodEnd.value },
  })
}
</script>
