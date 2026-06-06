<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      label="Abriendo turno..."
      hint="Registrando el fondo de caja para este turno."
      variant="glass"
      indicator="matrix"
    />

    <div v-if="openSuccess" class="flex flex-col items-center justify-center py-16 gap-6 text-center">
      <div class="w-16 h-16 rounded-full bg-state-success-bg flex items-center justify-center">
        <svg class="w-9 h-9 text-state-success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <p class="text-xl font-semibold text-text-primary">Turno abierto</p>
        <p class="text-sm text-text-secondary mt-1">Fondo registrado: {{ formatCurrency(successOpeningCash) }}</p>
      </div>
      <div class="flex flex-wrap gap-3 justify-center">
        <NuxtLink
          v-if="closeLink"
          :to="closeLink"
          class="min-h-[44px] px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center"
        >
          {{ closeLinkLabel }}
        </NuxtLink>
        <NuxtLink
          to="/finanzas/arqueo"
          class="min-h-[44px] px-5 py-2 rounded-lg border-2 border-border text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center"
        >
          Volver al arqueo
        </NuxtLink>
      </div>
    </div>

    <template v-else>
      <div class="bg-surface border-2 border-border rounded-lg mb-3 sm:mb-4 p-3 sm:p-4">
        <h1 class="text-lg font-semibold text-text-primary">Abrir turno</h1>
        <p class="text-sm text-text-secondary mt-1">
          Declara el efectivo en caja (fondo para cambio) antes de operar o cerrar el turno.
        </p>
      </div>

      <div v-if="currentStep === 1" class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4 flex flex-col gap-4">
        <div v-if="aperturaMode === 'template'">
          <label class="text-xs font-medium text-text-secondary uppercase tracking-wide">Turno</label>
          <select
            v-model="selectedTemplateId"
            class="mt-1.5 w-full h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Selecciona un turno…</option>
            <option v-for="t in shiftTemplates" :key="t.id" :value="t.id">
              {{ t.name }} ({{ t.startTime }}–{{ t.endTime }})
            </option>
          </select>
        </div>

        <div v-if="aperturaMode === 'day'">
          <label class="text-xs font-medium text-text-secondary uppercase tracking-wide">Día</label>
          <VueDatePicker
            v-model="anchorDate"
            :teleport="true"
            :enable-time-picker="false"
            :formats="dateOnlyFormats"
            :locale="es"
            auto-apply
            :max-date="new Date()"
            :clearable="false"
            menu-class-name="dp-custom-menu"
            calendar-cell-class-name="dp-custom-cell"
            class="mt-1.5"
          />
        </div>

        <div v-else-if="aperturaMode === 'custom'" class="rounded-lg border border-border bg-background px-3 py-2.5">
          <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">Ventana personalizada</p>
          <p class="text-sm font-mono text-text-primary mt-1">{{ customWindowLabel }}</p>
        </div>

        <template v-if="aperturaMode === 'template'">
          <div>
            <label class="text-xs font-medium text-text-secondary uppercase tracking-wide">Día</label>
            <VueDatePicker
              v-model="anchorDate"
              :teleport="true"
              :enable-time-picker="false"
              :formats="dateOnlyFormats"
              :locale="es"
              auto-apply
              :max-date="new Date()"
              :clearable="false"
              menu-class-name="dp-custom-menu"
              calendar-cell-class-name="dp-custom-cell"
              class="mt-1.5"
            />
          </div>

          <p v-if="templateHoursLabel" class="text-sm font-mono text-text-secondary">
            Ventana: {{ formatTemplateDateOnly() }} · {{ templateHoursLabel }}
          </p>
        </template>

        <div
          v-if="isShiftOpen(existingShift)"
          class="rounded-lg border border-state-success-border bg-state-success-bg px-3 py-2.5 text-sm text-state-success-text"
        >
          Este turno ya está abierto con fondo {{ formatCurrency(existingShift.openingCash) }}.
          <NuxtLink v-if="closeLink" :to="closeLink" class="font-semibold underline ml-1">Ir al cierre</NuxtLink>
        </div>

        <p v-if="stepError" class="text-sm text-destructive">{{ stepError }}</p>

        <div class="flex gap-3">
          <NuxtLink
            to="/finanzas/arqueo"
            class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center"
          >
            Cancelar
          </NuxtLink>
          <button
            type="button"
            class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            :disabled="!canProceedToCount"
            @click="goToCount"
          >
            Contar efectivo →
          </button>
        </div>
      </div>

      <div v-else class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4">
        <h2 class="text-sm font-semibold text-text-primary mb-1">Fondo de caja</h2>
        <p class="text-xs text-text-secondary mb-3">Cuenta billetes y monedas que hay en el cajón al iniciar:</p>

        <div
          v-if="suggestedOpeningCash > 0"
          class="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-text-primary mb-3 flex flex-wrap items-center gap-2"
        >
          Sugerido del cierre anterior: {{ formatCurrency(suggestedOpeningCash) }}
          <button
            type="button"
            class="text-xs font-semibold text-primary hover:underline"
            @click="applySuggestedOpening"
          >
            Usar sugerido
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div class="bg-background rounded-lg border border-border overflow-hidden">
            <div class="px-3 py-2 bg-surface border-b border-border">
              <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">Billetes y monedas</span>
            </div>
            <div class="divide-y divide-border">
              <div
                v-for="(denom, idx) in denominations"
                :key="denom"
                class="flex items-center gap-2 px-3 py-2"
              >
                <span class="text-sm w-24 text-right flex-shrink-0">{{ formatCurrency(denom) }}</span>
                <span class="text-text-tertiary text-xs">×</span>
                <input
                  :ref="el => setDenomRef(el, idx)"
                  v-model="counts[denom]"
                  type="text"
                  inputmode="numeric"
                  class="w-14 px-2 py-1 rounded-md border border-border bg-surface text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                  @input="counts[denom] = sanitizeInt($event)"
                  @keydown.enter.prevent="focusNext(idx)"
                />
                <span class="text-sm flex-1 text-right">{{ formatCurrency(denom * (parseInt(counts[denom]) || 0)) }}</span>
              </div>
              <div class="flex items-center gap-2 px-3 py-2">
                <span class="text-sm w-24 text-right">Monedas</span>
                <span class="text-transparent text-xs">×</span>
                <input
                  v-model="monedasAmount"
                  type="text"
                  inputmode="numeric"
                  class="w-14 px-2 py-1 rounded-md border border-border bg-surface text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                  @input="monedasAmount = sanitizeIntStr($event)"
                />
                <span class="text-sm flex-1 text-right">{{ formatCurrency(parseInt(monedasAmount) || 0) }}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <div class="bg-background rounded-lg border border-border p-4">
              <p class="text-xs text-text-secondary uppercase tracking-wide">Total fondo</p>
              <p class="text-2xl font-bold text-primary mt-1">{{ formatCurrency(totalCounted) }}</p>
            </div>
            <p v-if="submitError" class="text-sm text-destructive">{{ submitError }}</p>
            <div class="flex gap-3 mt-auto">
              <button type="button" class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm" @click="currentStep = 1">
                ← Atrás
              </button>
              <button
                type="button"
                class="min-h-[44px] flex-1 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                :disabled="isSubmitting || totalCounted <= 0"
                @click="submitOpening"
              >
                Abrir turno
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import { useFormatters } from '~/composables/useFormatters'
import { useCashDenominationCount } from '~/composables/useCashDenominationCount'
import { useQueryCache } from '@pinia/colada'
import { buildCierreWindowParams, isShiftOpen } from '~/composables/useCierreShiftWindow'
import { bogotaDateAtNoon, bogotaISOFromDate, combineBogotaDateAndTimeISO, todayBogotaISO } from '~/utils/bogotaDate'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
useHead({ title: 'Abrir turno — Arqueo - Warocol' })

type AperturaMode = 'template' | 'day' | 'custom'

interface ShiftTemplateOption {
  id: string
  name: string
  startTime: string
  endTime: string
}

const route = useRoute()
const { currentTenant } = useTenantReactive()
const cache = useQueryCache()
const { formatCurrency } = useFormatters()

const today = todayBogotaISO()
const initStart = (route.query.start as string) || today
const initEnd = (route.query.end as string) || initStart
const initTemplate = (route.query.template as string) || ''
const initStartTime = (route.query.startTime as string) || ''
const initEndTime = (route.query.endTime as string) || ''

const aperturaMode = computed<AperturaMode>(() => {
  const mode = route.query.mode as string | undefined
  if (mode === 'day') return 'day'
  if (mode === 'custom') return 'custom'
  return 'template'
})

const currentStep = ref(1)
const selectedTemplateId = ref(initTemplate)
const anchorDate = ref<Date>(bogotaDateAtNoon(initStart))
const stepError = ref<string | null>(null)
const submitError = ref<string | null>(null)
const isSubmitting = ref(false)
const openSuccess = ref(false)
const successOpeningCash = ref(0)

const dateOnlyFormats = { input: 'dd/MM/yyyy', preview: 'dd/MM/yyyy' }

const {
  denominations, counts, monedasAmount, setDenomRef,
  sanitizeInt, sanitizeIntStr, totalCounted, toBreakdown, focusNext, setFromAmount,
} = useCashDenominationCount()

const periodStart = computed(() => {
  if (aperturaMode.value === 'custom') return initStart
  return bogotaISOFromDate(anchorDate.value)
})
const periodEnd = computed(() => {
  if (aperturaMode.value === 'custom') return initEnd
  return periodStart.value
})

const periodStartTime = computed(() => {
  if (aperturaMode.value !== 'custom' || !initStartTime) return null
  return combineBogotaDateAndTimeISO(periodStart.value, initStartTime)
})
const periodEndTime = computed(() => {
  if (aperturaMode.value !== 'custom' || !initEndTime) return null
  return combineBogotaDateAndTimeISO(periodEnd.value, initEndTime)
})

const { data: rawShiftTemplates } = useQuery({
  key: () => ['cierre', 'shift-templates', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: ShiftTemplateOption[] }>('/api/cierre/shift-templates'),
  enabled: () => !!currentTenant.value && aperturaMode.value === 'template',
  staleTime: 120_000,
})
const shiftTemplates = computed(() => rawShiftTemplates.value?.data ?? [])

const { data: rawTemplateWindow } = useQuery({
  key: () => ['cierre', 'shift-window', currentTenant.value?.id, selectedTemplateId.value, periodStart.value],
  query: () => $fetch<{ success: boolean; data: { periodStartTime: string; periodEndTime: string } }>(
    '/api/cierre/shift-window',
    { params: { shift_template_id: selectedTemplateId.value, date: periodStart.value } },
  ),
  enabled: () => !!currentTenant.value && aperturaMode.value === 'template' && !!selectedTemplateId.value,
  staleTime: 30_000,
})

const windowParams = computed(() =>
  buildCierreWindowParams({
    periodStart: periodStart.value,
    periodEnd: periodEnd.value,
    shiftTemplateId: aperturaMode.value === 'template' ? (selectedTemplateId.value || null) : null,
    periodStartTime: periodStartTime.value,
    periodEndTime: periodEndTime.value,
  }),
)

const { data: rawShiftStatus, refetch: refetchShiftStatus } = useQuery({
  key: () => ['cierre', 'shift-status', currentTenant.value?.id, aperturaMode.value, JSON.stringify(windowParams.value)],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/shift-status', {
    params: windowParams.value,
  }),
  enabled: () => {
    if (!currentTenant.value) return false
    if (aperturaMode.value === 'template') return !!selectedTemplateId.value
    return true
  },
  staleTime: 0,
})

const existingShift = computed(() => rawShiftStatus.value?.data ?? null)

const suggestedOpeningCash = computed(() => {
  const data = existingShift.value
  if (!data || isShiftOpen(data)) return 0
  return Number(data.suggestedOpeningCash ?? 0)
})

const applySuggestedOpening = () => {
  if (suggestedOpeningCash.value > 0) setFromAmount(suggestedOpeningCash.value)
}

const formatTemplateDateOnly = () => fnsFormat(anchorDate.value, 'dd/MM/yyyy', { locale: es })

const templateHoursLabel = computed(() => {
  const w = rawTemplateWindow.value?.data
  if (!w?.periodStartTime || !w?.periodEndTime) return null
  return `${fnsFormat(new Date(w.periodStartTime), 'HH:mm')} – ${fnsFormat(new Date(w.periodEndTime), 'HH:mm')}`
})

const customWindowLabel = computed(() => {
  const fmt = (iso: string) => fnsFormat(bogotaDateAtNoon(iso), 'dd/MM/yyyy', { locale: es })
  const datePart = periodStart.value === periodEnd.value
    ? fmt(periodStart.value)
    : `${fmt(periodStart.value)} – ${fmt(periodEnd.value)}`
  if (initStartTime && initEndTime) return `${datePart} · ${initStartTime} – ${initEndTime}`
  return datePart
})

const closeLink = computed(() => {
  if (aperturaMode.value === 'day') {
    return `/finanzas/arqueo/nuevo?start=${periodStart.value}&end=${periodEnd.value}`
  }
  if (aperturaMode.value === 'custom') {
    const q = new URLSearchParams({ mode: 'custom', start: periodStart.value, end: periodEnd.value })
    if (initStartTime) q.set('startTime', initStartTime)
    if (initEndTime) q.set('endTime', initEndTime)
    return `/finanzas/arqueo/z?${q.toString()}`
  }
  if (!selectedTemplateId.value) return null
  return `/finanzas/arqueo/z?mode=template&start=${periodStart.value}&end=${periodEnd.value}&template=${selectedTemplateId.value}`
})

const closeLinkLabel = computed(() =>
  aperturaMode.value === 'day' ? 'Ir al cierre del día' : 'Ir al cierre Z',
)

const canProceedToCount = computed(() => {
  if (isShiftOpen(existingShift.value)) return false
  if (aperturaMode.value === 'template') return !!selectedTemplateId.value
  return true
})

watch(selectedTemplateId, () => { stepError.value = null })

const goToCount = () => {
  stepError.value = null
  if (aperturaMode.value === 'template' && !selectedTemplateId.value) {
    stepError.value = 'Selecciona un turno'
    return
  }
  if (isShiftOpen(existingShift.value)) {
    stepError.value = 'Este turno ya está abierto'
    return
  }
  currentStep.value = 2
  if (suggestedOpeningCash.value > 0 && totalCounted.value === 0) {
    applySuggestedOpening()
  }
}

const submitOpening = async () => {
  submitError.value = null
  if (totalCounted.value <= 0) {
    submitError.value = 'El fondo debe ser mayor a cero'
    return
  }
  isSubmitting.value = true
  try {
    const breakdown = toBreakdown()
    const body: Record<string, unknown> = {
      periodStart: periodStart.value,
      periodEnd: periodEnd.value,
      openingCash: totalCounted.value,
      openingBreakdown: Object.keys(breakdown).length ? breakdown : undefined,
    }
    if (aperturaMode.value === 'template' && selectedTemplateId.value) {
      body.shiftTemplateId = selectedTemplateId.value
    }
    if (aperturaMode.value === 'custom') {
      if (periodStartTime.value) body.periodStartTime = periodStartTime.value
      if (periodEndTime.value) body.periodEndTime = periodEndTime.value
    }
    await $fetch('/api/cierre/open-shift', { method: 'POST', body })
    successOpeningCash.value = totalCounted.value
    openSuccess.value = true
    await refetchShiftStatus()
    cache.invalidateQueries({ key: ['cierre', 'preview-x0'] })
    cache.invalidateQueries({ key: ['cierre', 'preview'] })
  } catch (err: any) {
    submitError.value = err?.data?.detail ?? err?.data?.message ?? 'No se pudo abrir el turno'
  } finally {
    isSubmitting.value = false
  }
}
</script>
