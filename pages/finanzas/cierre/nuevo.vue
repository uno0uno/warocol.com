<template>
  <div class="page-layout flex flex-col gap-3">

    <!-- ── Hint card: skeleton ──────────────────────────────────────────────── -->
    <div v-if="ultimoLoading" class="bg-surface border border-border rounded-lg overflow-hidden animate-pulse">
      <div class="px-3 py-2 bg-background border-b border-border flex items-center justify-between">
        <div class="h-3 w-36 rounded bg-border" />
        <div class="h-3 w-24 rounded bg-border" />
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        <div v-for="i in 4" :key="i" class="px-3 py-2.5 flex flex-col gap-1.5">
          <div class="h-2.5 w-16 rounded bg-border" />
          <div class="h-4 w-24 rounded bg-border" />
        </div>
      </div>
    </div>

    <!-- ── Hint card: último cierre ────────────────────────────────────────── -->
    <div v-else-if="ultimoCierre" class="bg-surface border border-border rounded-lg overflow-hidden">
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

    <!-- ── Filter bar (una sola línea) ──────────────────────────────────── -->
    <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
      <!-- Presets -->
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

      <!-- Date picker -->
      <VueDatePicker
        v-model="dateRangeDates"
        range
        :teleport="true"
        :preset-dates="dpPresets"
        :enable-time-picker="false"
        :locale="es"
        auto-apply
        :max-date="new Date()"
        menu-class-name="dp-custom-menu"
        calendar-cell-class-name="dp-custom-cell"
        @update:model-value="activePreset = null"
      >
        <template #trigger>
          <button
            type="button"
            class="dp-custom-input flex items-center gap-2 h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary hover:border-primary/50 transition-colors flex-shrink-0"
          >
            <svg class="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{{ dpDisplayText }}</span>
          </button>
        </template>
      </VueDatePicker>

      <!-- Separador -->
      <div class="h-6 w-px bg-border flex-shrink-0" />

      <!-- Toggle horario (solo día único) -->
      <button
        v-if="!isMultiDay"
        @click="toggleTimePicker"
        class="h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-1.5"
        :class="enableTimePicker
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-text-secondary hover:border-primary/50 hover:text-text-primary'"
        :title="enableTimePicker ? 'Quitar horario exacto' : 'Especificar horario exacto'"
      >
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Horario
      </button>

      <!-- Inputs de hora -->
      <template v-if="isMultiDay || enableTimePicker">
        <div class="flex flex-col gap-0.5 flex-shrink-0">
          <label class="text-xs text-text-secondary whitespace-nowrap">Desde</label>
          <div class="relative">
            <input
              type="text"
              v-model="startTimeInput"
              placeholder="HH:MM"
              maxlength="5"
              inputmode="numeric"
              @input="onTimeInput($event, 'start')"
              @focus="showDrop.start = true"
              @blur="hideDrop('start')"
              class="h-10 w-20 px-2 text-sm font-mono rounded-lg border-2 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 text-center"
              :class="isMultiDay && !startTimeInput ? 'border-amber-400' : 'border-border'"
            />
            <ul v-if="showDrop.start && filteredTimes(startTimeInput).length"
                class="absolute z-50 top-full left-0 mt-1 w-24 max-h-44 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg py-1">
              <li v-for="t in filteredTimes(startTimeInput)" :key="t"
                  @mousedown.prevent="pickTime('start', t)"
                  class="px-3 py-1 text-sm font-mono text-text-primary hover:bg-background cursor-pointer">
                {{ t }}
              </li>
            </ul>
          </div>
        </div>
        <div class="flex flex-col gap-0.5 flex-shrink-0">
          <label class="text-xs text-text-secondary whitespace-nowrap">Hasta</label>
          <div class="relative">
            <input
              type="text"
              v-model="endTimeInput"
              placeholder="HH:MM"
              maxlength="5"
              inputmode="numeric"
              @input="onTimeInput($event, 'end')"
              @focus="showDrop.end = true"
              @blur="hideDrop('end')"
              class="h-10 w-20 px-2 text-sm font-mono rounded-lg border-2 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 text-center"
              :class="isMultiDay && !endTimeInput ? 'border-amber-400' : 'border-border'"
            />
            <ul v-if="showDrop.end && filteredTimes(endTimeInput).length"
                class="absolute z-50 top-full left-0 mt-1 w-24 max-h-44 overflow-y-auto bg-surface border border-border rounded-lg shadow-lg py-1">
              <li v-for="t in filteredTimes(endTimeInput)" :key="t"
                  @mousedown.prevent="pickTime('end', t)"
                  class="px-3 py-1 text-sm font-mono text-text-primary hover:bg-background cursor-pointer">
                {{ t }}
              </li>
            </ul>
          </div>
        </div>
        <span v-if="shiftLabel" class="text-xs text-text-secondary whitespace-nowrap flex-shrink-0">{{ shiftLabel }}</span>
      </template>
    </div>

    <!-- Error de validación -->
    <p v-if="timeError" class="text-xs text-destructive">{{ timeError }}</p>

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
import { ref, computed, watch, reactive, onMounted, onUnmounted } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat, formatDistanceStrict } from 'date-fns'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Nuevo cierre - Warocol' })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
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

const { data: ultimoData, status: ultimoStatus, asyncStatus: ultimoAsyncStatus, refetch: refetchUltimo } = useQuery({
  key: () => ['cierre', 'ultimo', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: UltimoCierre | null }>('/api/cierre/ultimo'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const ultimoCierre  = computed(() => ultimoData.value?.data ?? null)
const ultimoLoading = computed(() => ultimoStatus.value === 'pending' && !ultimoData.value)
const isRefreshing  = computed(() => ultimoAsyncStatus.value === 'loading' && !!ultimoData.value)

registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetchUltimo) })
onUnmounted(() => { clearRefreshHandler(refetchUltimo) })

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
  const noon = (d: Date) => { d.setHours(12, 0, 0, 0); return d }
  const now = noon(new Date())
  const yesterday = noon(new Date(now)); yesterday.setDate(now.getDate() - 1)
  const weekStart = noon(new Date(now)); weekStart.setDate(now.getDate() - 6)
  const monthStart = noon(new Date(now.getFullYear(), now.getMonth(), 1))
  return [
    { key: 'today',     label: 'Hoy',           start: new Date(now), end: new Date(now) },
    { key: 'yesterday', label: 'Ayer',           start: yesterday,     end: yesterday },
    { key: 'week',      label: 'Últimos 7 días', start: weekStart,     end: new Date(now) },
    { key: 'month',     label: 'Este mes',        start: monthStart,    end: new Date(now) },
  ]
}

const presets = buildPresets()
const activePreset = ref<string | null>('today')
const todayNoon = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d }
const dateRangeDates = ref<Date[]>([todayNoon(), todayNoon()])
const enableTimePicker = ref(false)
const startTimeInput   = ref('')
const endTimeInput     = ref('')
const timeError        = ref<string | null>(null)

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

const showDrop = reactive({ start: false, end: false })

const filteredTimes = (val: string) => {
  if (!val) return timeOptions
  return timeOptions.filter(t => t.startsWith(val))
}

const hideDrop = (field: 'start' | 'end') => {
  setTimeout(() => { showDrop[field] = false }, 150)
}

const pickTime = (field: 'start' | 'end', t: string) => {
  if (field === 'start') startTimeInput.value = t
  else endTimeInput.value = t
  showDrop[field] = false
}

const dpPresets = presets.map(p => ({ label: p.label, value: [p.start, p.end] }))

const applyPreset = (p: Preset) => {
  activePreset.value = p.key
  dateRangeDates.value = [new Date(p.start), new Date(p.end)]
}

const toggleTimePicker = () => {
  enableTimePicker.value = !enableTimePicker.value
  if (!enableTimePicker.value) {
    startTimeInput.value = ''
    endTimeInput.value   = ''
  }
}

// Auto-format text time input as HH:MM (24h)
const onTimeInput = (e: Event, field: 'start' | 'end') => {
  const el = e.target as HTMLInputElement
  let v = el.value.replace(/\D/g, '').slice(0, 4)
  if (v.length >= 3) v = v.slice(0, 2) + ':' + v.slice(2)
  // clamp hours 0-23 and minutes 0-59
  if (v.length >= 2) {
    const h = Math.min(23, parseInt(v.slice(0, 2), 10))
    v = String(h).padStart(2, '0') + v.slice(2)
  }
  if (v.length === 5) {
    const m = Math.min(59, parseInt(v.slice(3, 5), 10))
    v = v.slice(0, 3) + String(m).padStart(2, '0')
  }
  if (field === 'start') startTimeInput.value = v
  else endTimeInput.value = v
  el.value = v
}

// Combine date + time input into a full Date for ISO output
const buildDateTime = (datePart: Date | null, timeStr: string): Date | null => {
  if (!datePart || !timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(datePart)
  d.setHours(h, m, 0, 0)
  return d
}

const shiftLabel = computed(() => {
  if (!enableTimePicker.value) return null
  const s = buildDateTime(dateRangeDates.value?.[0] ?? null, startTimeInput.value)
  const e = buildDateTime(dateRangeDates.value?.[1] ?? null, endTimeInput.value)
  if (!s || !e || s >= e) return null
  try { return formatDistanceStrict(s, e, { locale: es }) } catch { return null }
})

// ── Period ────────────────────────────────────────────────────────────────

const periodStart = computed(() =>
  dateRangeDates.value?.[0] ? fnsFormat(dateRangeDates.value[0], 'yyyy-MM-dd') : today
)
const periodEnd = computed(() =>
  dateRangeDates.value?.[1] ? fnsFormat(dateRangeDates.value[1], 'yyyy-MM-dd') : today
)

const isMultiDay = computed(() => periodStart.value !== periodEnd.value)

watch(isMultiDay, (multi) => {
  if (multi) enableTimePicker.value = true
})

// ISO datetime strings — only set when time picker is active AND both inputs filled
const periodStartTime = computed(() => {
  if (!enableTimePicker.value) return null
  return buildDateTime(dateRangeDates.value?.[0] ?? null, startTimeInput.value)?.toISOString() ?? null
})
const periodEndTime = computed(() => {
  if (!enableTimePicker.value) return null
  return buildDateTime(dateRangeDates.value?.[1] ?? null, endTimeInput.value)?.toISOString() ?? null
})

const formatDateRange = (dates: Date[]) => {
  if (!dates?.[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })}`
}

const fmtDT = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: false,
  timeZone: 'America/Bogota',
})

const dpDisplayText = computed(() => {
  const dates = dateRangeDates.value
  if (!dates?.[0]) return 'Rango personalizado…'
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  return `${from} – ${fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })}`
})

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
  timeError.value = null
  if (isMultiDay.value && (!startTimeInput.value || !endTimeInput.value)) {
    timeError.value = 'Para períodos de varios días debes especificar hora de inicio y fin'
    return
  }
  const query: Record<string, string> = {
    start: periodStart.value,
    end:   periodEnd.value,
  }
  if (periodStartTime.value) query.startTime = periodStartTime.value
  if (periodEndTime.value)   query.endTime   = periodEndTime.value
  navigateTo({ path: `/finanzas/cierre/${type}`, query })
}
</script>
