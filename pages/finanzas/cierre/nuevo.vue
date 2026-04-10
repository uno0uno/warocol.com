<template>
  <div class="page-layout">

    <!-- Period picker card -->
    <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6 mb-4">
      <h3 class="text-base font-semibold text-text-primary mb-4">Selecciona el período</h3>

      <!-- Quick presets -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          v-for="p in presets"
          :key="p.key"
          class="h-8 px-3 rounded-lg border text-xs font-medium transition-colors"
          :class="activePreset === p.key
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background text-text-secondary hover:border-primary hover:text-text-primary'"
          @click="applyPreset(p)"
        >
          {{ p.label }}
        </button>
      </div>

      <!-- Date picker -->
      <VueDatePicker
        v-model="dateRangeDates"
        range
        :preset-dates="dpPresets"
        :enable-time-picker="false"
        :locale="es"
        placeholder="O elige un rango personalizado…"
        auto-apply
        :teleport="true"
        :max-date="new Date()"
        :format="formatDateRange"
        input-class-name="dp-custom-input"
        menu-class-name="dp-custom-menu"
        calendar-cell-class-name="dp-custom-cell"
        @update:model-value="activePreset = null"
      />

      <p v-if="periodStart" class="text-sm text-text-secondary mt-3">
        Período:
        <span class="font-medium text-text-primary">{{ formatPeriod(periodStart, periodEnd) }}</span>
      </p>
    </div>

    <!-- Action cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

      <!-- Cierre X -->
      <button
        class="text-left bg-surface border-2 border-border hover:border-primary rounded-xl p-5 transition-all group active:scale-[0.99]"
        @click="goTo('x')"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <h4 class="text-base font-semibold text-text-primary">Cierre X</h4>
            <span class="text-xs text-blue-600 font-medium">Vista previa</span>
          </div>
        </div>
        <p class="text-sm text-text-secondary leading-relaxed">
          Consulta el estado de caja del período sin registrar el cierre. Útil para revisar antes de cerrar.
        </p>
        <span class="inline-block mt-4 text-xs font-medium text-blue-600 group-hover:underline">Ver preview →</span>
      </button>

      <!-- Cierre Z -->
      <button
        class="text-left bg-surface border-2 border-primary rounded-xl p-5 transition-all group active:scale-[0.99]"
        @click="goTo('z')"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4 class="text-base font-semibold text-text-primary">Cierre Z</h4>
            <span class="text-xs text-primary font-medium">Registrar cierre</span>
          </div>
        </div>
        <p class="text-sm text-text-secondary leading-relaxed">
          Registra y cierra el período contable de forma definitiva. Incluye conteo de efectivo y notas.
        </p>
        <span class="inline-block mt-4 text-xs font-medium text-primary group-hover:underline">Registrar cierre →</span>
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

const today = new Date().toISOString().split('T')[0]

// ── Presets ───────────────────────────────────────────────────────────────

interface Preset { key: string; label: string; start: Date; end: Date }

const buildPresets = (): Preset[] => {
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return [
    { key: 'today',     label: 'Hoy',          start: new Date(), end: new Date() },
    { key: 'yesterday', label: 'Ayer',          start: yesterday,  end: yesterday },
    { key: 'week',      label: 'Últimos 7 días', start: weekStart,  end: new Date() },
    { key: 'month',     label: 'Este mes',       start: monthStart, end: new Date() },
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

// ── Navigate ──────────────────────────────────────────────────────────────

const goTo = (type: 'x' | 'z') => {
  navigateTo({
    path: `/finanzas/cierre/${type}`,
    query: { start: periodStart.value, end: periodEnd.value },
  })
}
</script>
