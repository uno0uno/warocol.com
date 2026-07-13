<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      :label="t('finanzas.arqueo.opening')"
      :hint="t('finanzas.arqueo.registeringOpening')"
      variant="glass"
      indicator="matrix"
    />

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="openSuccess"
          class="fixed inset-0 z-[80] flex items-center justify-center bg-overlay-backdrop/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="open-shift-success-title"
        >
          <Transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 translate-y-2 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-all duration-150"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-2 scale-95"
          >
            <div
              v-if="openSuccess"
              class="w-full max-w-md rounded-2xl border border-border bg-surface px-6 py-7 text-center shadow-2xl"
            >
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-state-success-bg">
                <svg class="h-9 w-9 text-state-success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.25" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div class="mt-5">
                <p id="open-shift-success-title" class="text-xl font-semibold text-text-primary">{{ t('finanzas.arqueo.shiftOpened') }}</p>
                <p class="mt-1 text-sm text-text-secondary">{{ t('finanzas.arqueo.openingRegistered', { amount: formatCurrency(successOpeningCash) }) }}</p>
              </div>

              <div class="mt-6 flex flex-col gap-2 sm:flex-row">
                <NuxtLink
                  to="/finanzas/arqueo"
                  class="min-h-[44px] flex-1 rounded-lg border-2 border-border px-5 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  {{ t('finanzas.arqueo.backToArqueo') }}
                </NuxtLink>
                <NuxtLink
                  v-if="closeLink"
                  :to="closeLink"
                  class="min-h-[44px] flex-1 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {{ closeLinkLabel }}
                </NuxtLink>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

      <div class="bg-surface border-2 border-border rounded-lg mb-3 sm:mb-4 p-3 sm:p-4">
        <h1 class="text-lg font-semibold text-text-primary">{{ t('finanzas.arqueo.openShift') }}</h1>
        <p class="text-sm text-text-secondary mt-1">
          {{ t('finanzas.arqueo.openingHint') }}
        </p>
      </div>

      <div v-if="currentStep === 1" class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4 flex flex-col gap-4">
        <div v-if="aperturaMode === 'template'">
          <label class="text-xs font-medium text-text-secondary uppercase tracking-wide">{{ t('finanzas.arqueo.shift') }}</label>
          <select
            v-model="selectedTemplateId"
            class="mt-1.5 w-full h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option :value="DAY_SHIFT_KEY">{{ t('finanzas.common.fullDay') }}</option>
            <option v-for="t in shiftTemplates" :key="t.id" :value="t.id">
              {{ t.name }} ({{ t.startTime }}–{{ t.endTime }})
            </option>
          </select>
        </div>

        <div v-if="aperturaMode === 'day'">
          <label class="text-xs font-medium text-text-secondary uppercase tracking-wide">{{ t('finanzas.arqueo.day') }}</label>
          <VueDatePicker
            v-model="anchorDate"
            :teleport="true"
            :enable-time-picker="false"
            :formats="dateOnlyFormats"
            :locale="locale"
            auto-apply
            :timezone="timezone"
            :max-date="maxDate"
            :clearable="false"
            menu-class-name="dp-custom-menu"
            calendar-cell-class-name="dp-custom-cell"
            class="mt-1.5"
          />
          <p class="mt-2 text-sm font-mono text-text-secondary">
            {{ dayWindowDisplayLabel }}
          </p>
        </div>

        <div v-else-if="aperturaMode === 'custom'" class="rounded-lg border border-border bg-background px-3 py-2.5">
          <label class="text-xs font-medium text-text-secondary uppercase tracking-wide">{{ t('finanzas.arqueo.customWindow') }}</label>
          <VueDatePicker
            v-model="customDateRangeDates"
            range
            :teleport="true"
            :enable-time-picker="false"
            :formats="dateOnlyFormats"
            :locale="locale"
            auto-apply
            :timezone="timezone"
            :max-date="maxDate"
            :clearable="false"
            menu-class-name="dp-custom-menu"
            calendar-cell-class-name="dp-custom-cell"
            class="mt-1.5"
          />
          <p class="text-sm font-mono text-text-primary mt-2">{{ customWindowLabel }}</p>
        </div>

        <template v-if="aperturaMode === 'template'">
          <div>
            <label class="text-xs font-medium text-text-secondary uppercase tracking-wide">{{ t('finanzas.arqueo.day') }}</label>
            <VueDatePicker
              v-model="anchorDate"
              :teleport="true"
              :enable-time-picker="false"
              :formats="dateOnlyFormats"
              :locale="locale"
              auto-apply
              :timezone="timezone"
              :max-date="maxDate"
              :clearable="false"
              menu-class-name="dp-custom-menu"
              calendar-cell-class-name="dp-custom-cell"
              class="mt-1.5"
            />
          </div>

          <p v-if="isDayShiftSelected" class="text-sm font-mono text-text-secondary">
            {{ t('finanzas.arqueo.windowLabel', { date: formatTemplateDateOnly(), time: dayWindowDisplayLabel }) }}
          </p>
          <p v-else-if="templateHoursLabel" class="text-sm font-mono text-text-secondary">
            {{ t('finanzas.arqueo.windowLabel', { date: formatTemplateDateOnly(), time: templateHoursLabel }) }}
          </p>
        </template>

        <div
          v-if="isShiftOpen(existingShift)"
          class="rounded-lg border border-state-success-border bg-state-success-bg px-3 py-2.5 text-sm text-state-success-text"
        >
          {{ t('finanzas.arqueo.shiftAlreadyOpen') }} {{ t('finanzas.arqueo.openingFloatAmount', { amount: formatCurrency(existingShift.openingCash) }) }}.
          <NuxtLink v-if="closeLink" :to="closeLink" class="font-semibold underline ms-1">{{ t('finanzas.arqueo.goToClose') }}</NuxtLink>
        </div>

        <p v-if="stepError" class="text-sm text-destructive">{{ stepError }}</p>

        <div class="flex gap-3">
          <NuxtLink
            to="/finanzas/arqueo"
            class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center"
          >
            {{ t('common.cancel') }}
          </NuxtLink>
          <button
            type="button"
            class="min-h-[44px] px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            :disabled="!canProceedToCount"
            @click="goToCount"
          >
            {{ t('finanzas.arqueo.countCashNext') }}
          </button>
        </div>
      </div>

      <div v-else class="bg-surface border-2 border-border rounded-lg p-3 sm:p-4">
        <h2 class="text-sm font-semibold text-text-primary mb-1">{{ t('finanzas.arqueo.openingCash') }}</h2>
        <p class="text-xs text-text-secondary mb-3">{{ t('finanzas.arqueo.countCashHint') }}</p>

        <div
          v-if="isPastAnchorDate"
          class="rounded-lg border border-state-info-border bg-state-info-bg px-3 py-2.5 text-sm text-state-info-text mb-3"
        >
          {{ t('finanzas.arqueo.pastPeriodOpeningHint') }}
        </div>

        <div
          v-if="suggestedOpeningCash > 0"
          class="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-text-primary mb-3 flex flex-wrap items-center gap-2"
        >
          {{ t('finanzas.arqueo.previousCloseSuggested', { amount: formatCurrency(suggestedOpeningCash) }) }}
          <button
            type="button"
            class="text-xs font-semibold text-primary hover:underline"
            @click="applySuggestedOpening"
          >
            {{ t('finanzas.arqueo.useSuggested') }}
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div class="bg-background rounded-lg border border-border overflow-hidden">
            <div class="px-3 py-2 bg-surface border-b border-border">
              <span class="text-xs font-semibold uppercase tracking-wide text-text-secondary">{{ t('finanzas.arqueo.billsCoins') }}</span>
            </div>
            <div class="divide-y divide-border">
              <div
                v-for="(denom, idx) in denominations"
                :key="denom"
                class="flex items-center gap-2 px-3 py-2"
              >
                <span class="text-sm w-24 text-end flex-shrink-0">{{ formatCurrency(denom) }}</span>
                <span class="text-text-tertiary text-xs">×</span>
                <input
                  :ref="el => setDenomRef(el, idx)"
                  v-model="counts[denom]"
                  type="text"
                  inputmode="numeric"
                  class="w-14 px-2 py-1 rounded-md border border-border bg-surface text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                  @input="counts[denom] = sanitizeInt($event)"
                  @keydown.enter.prevent="focusNext(idx)"
                  :aria-label="t('finanzas.arqueo.denominationCountAria', { amount: formatCurrency(denom) })"
                />
                <span class="text-sm flex-1 text-end">{{ formatCurrency(denom * (parseInt(counts[denom]) || 0)) }}</span>
              </div>
              <div class="flex items-center gap-2 px-3 py-2">
                <span class="text-sm w-24 text-end">{{ t('finanzas.arqueo.coins') }}</span>
                <span class="text-transparent text-xs">×</span>
                <input
                  v-model="monedasAmount"
                  type="text"
                  inputmode="numeric"
                  class="w-14 px-2 py-1 rounded-md border border-border bg-surface text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                  @input="monedasAmount = sanitizeIntStr($event)"
                  :aria-label="t('finanzas.arqueo.coinsAmountAria')"
                />
                <span class="text-sm flex-1 text-end">{{ formatCurrency(parseInt(monedasAmount) || 0) }}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <div class="bg-background rounded-lg border border-border p-4">
              <p class="text-xs text-text-secondary uppercase tracking-wide">{{ t('finanzas.arqueo.totalOpening') }}</p>
              <p class="text-2xl font-bold text-primary mt-1">{{ formatCurrency(totalCounted) }}</p>
            </div>
            <p v-if="submitError" class="text-sm text-destructive">{{ submitError }}</p>
            <div class="flex gap-3 mt-auto">
              <button type="button" class="min-h-[44px] px-4 py-2 rounded-lg border-2 border-border text-sm" @click="currentStep = 1">
                ← {{ t('finanzas.common.back') }}
              </button>
              <button
                type="button"
                class="min-h-[44px] flex-1 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                :disabled="isSubmitting || !canSubmitOpening"
                @click="submitOpening"
              >
                {{ t('finanzas.arqueo.openShift') }}
              </button>
            </div>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { useCashDenominationCount } from '~/composables/useCashDenominationCount'
import { useQueryCache } from '@pinia/colada'
import { buildCierreWindowParams, isShiftOpen } from '~/composables/useCierreShiftWindow'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
const { t, locale } = useI18n({ useScope: 'global' })
useHead({ title: () => t('finanzas.head.apertura') })

type AperturaMode = 'template' | 'day' | 'custom'

const DAY_SHIFT_KEY = '__day__'

interface ShiftTemplateOption {
  id: string
  name: string
  startTime: string
  endTime: string
}

const route = useRoute()
const { currentTenant } = useTenantReactive()
const cache = useQueryCache()
const { formatCalendarDate, formatCurrency } = useFormatters()
const { combineDateAndTimeISO, dateAtNoon, isoFromDate, timeHHMMFromISO, timezone, todayISO } = useTenantTimezone()

const today = todayISO()
const maxDate = computed(() => dateAtNoon(todayISO()))
const formatIsoDateLong = (iso: string) => formatCalendarDate(iso)
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
const selectedTemplateId = ref(initTemplate || DAY_SHIFT_KEY)

const isDayShiftSelected = computed(() =>
  aperturaMode.value === 'template' && selectedTemplateId.value === DAY_SHIFT_KEY,
)
const usesDayWindow = computed(() => aperturaMode.value === 'day' || isDayShiftSelected.value)
const effectiveTemplateId = computed(() =>
  isDayShiftSelected.value ? null : (selectedTemplateId.value || null),
)
const anchorDate = ref<Date>(dateAtNoon(initStart))
const customDateRangeDates = ref<Date[]>([
  dateAtNoon(initStart),
  dateAtNoon(initEnd),
])
const stepError = ref<string | null>(null)
const submitError = ref<string | null>(null)
const isSubmitting = ref(false)
const openSuccess = ref(false)
const successOpeningCash = ref(0)

const formatDateRange = (dates: Date[]) => {
  if (!dates?.[0]) return ''
  const from = formatIsoDateLong(isoFromDate(dates[0]))
  if (!dates[1]) return from
  const to = formatIsoDateLong(isoFromDate(dates[1]))
  return from === to ? from : `${from} – ${to}`
}
const dateOnlyFormats = { input: formatDateRange, preview: formatDateRange }

const {
  denominations, counts, monedasAmount, setDenomRef,
  sanitizeInt, sanitizeIntStr, totalCounted, toBreakdown, focusNext, setFromAmount,
} = useCashDenominationCount()

const periodStart = computed(() => {
  if (aperturaMode.value === 'custom') return isoFromDate(customDateRangeDates.value[0])
  return isoFromDate(anchorDate.value)
})
const periodEnd = computed(() => {
  if (aperturaMode.value === 'custom') {
    return isoFromDate(customDateRangeDates.value[1] ?? customDateRangeDates.value[0])
  }
  return periodStart.value
})

const periodStartTime = computed(() => {
  if (aperturaMode.value !== 'custom' || !initStartTime) return null
  return combineDateAndTimeISO(periodStart.value, initStartTime)
})
const periodEndTime = computed(() => {
  if (aperturaMode.value !== 'custom' || !initEndTime) return null
  return combineDateAndTimeISO(periodEnd.value, initEndTime)
})

const { data: rawShiftTemplates } = useQuery({
  key: () => ['cierre', 'shift-templates', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: ShiftTemplateOption[] }>('/api/cierre/shift-templates'),
  enabled: () => !!currentTenant.value && aperturaMode.value === 'template',
  staleTime: 120_000,
})
const shiftTemplates = computed(() => rawShiftTemplates.value?.data ?? [])

const isPastAnchorDate = computed(() => periodStart.value < today)

const canSubmitOpening = computed(() =>
  isPastAnchorDate.value ? totalCounted.value >= 0 : totalCounted.value > 0,
)

const { data: rawTemplateWindow } = useQuery({
  key: () => ['cierre', 'shift-window', currentTenant.value?.id, effectiveTemplateId.value, periodStart.value],
  query: () => $fetch<{ success: boolean; data: { periodStartTime: string; periodEndTime: string } }>(
    '/api/cierre/shift-window',
    { params: { shift_template_id: effectiveTemplateId.value!, date: periodStart.value } },
  ),
  enabled: () => !!currentTenant.value && aperturaMode.value === 'template' && !!effectiveTemplateId.value,
  staleTime: 30_000,
})

const windowParams = computed(() =>
  buildCierreWindowParams({
    periodStart: periodStart.value,
    periodEnd: periodEnd.value,
    shiftTemplateId: aperturaMode.value === 'template' ? effectiveTemplateId.value : null,
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
const dayWindowLoading = computed(() => rawShiftStatus.value == null && usesDayWindow.value)
const resolvedPeriodStart = computed(() =>
  usesDayWindow.value ? (existingShift.value?.periodStart ?? periodStart.value) : periodStart.value,
)
const resolvedPeriodEnd = computed(() =>
  usesDayWindow.value ? (existingShift.value?.periodEnd ?? periodEnd.value) : periodEnd.value,
)
const resolvedPeriodStartTime = computed(() =>
  usesDayWindow.value ? (existingShift.value?.periodStartTime ?? null) : periodStartTime.value,
)
const resolvedPeriodEndTime = computed(() =>
  usesDayWindow.value ? (existingShift.value?.periodEndTime ?? null) : periodEndTime.value,
)

const suggestedOpeningCash = computed(() => {
  const data = existingShift.value
  if (!data || isShiftOpen(data)) return 0
  return Number(data.suggestedOpeningCash ?? 0)
})

const applySuggestedOpening = () => {
  if (suggestedOpeningCash.value > 0) setFromAmount(suggestedOpeningCash.value)
}

const formatTemplateDateOnly = () => formatIsoDateLong(isoFromDate(anchorDate.value))

const templateHoursLabel = computed(() => {
  const w = rawTemplateWindow.value?.data
  if (!w?.periodStartTime || !w?.periodEndTime) return null
  return `${timeHHMMFromISO(w.periodStartTime)} – ${timeHHMMFromISO(w.periodEndTime)}`
})

const dayWindowDisplayLabel = computed(() => {
  if (dayWindowLoading.value) return t('finanzas.arqueo.resolvingDay')
  if (usesDayWindow.value && resolvedPeriodStartTime.value && resolvedPeriodEndTime.value) {
    return t('finanzas.arqueo.remainingDayWindow', {
      time: `${timeHHMMFromISO(resolvedPeriodStartTime.value)} – ${timeHHMMFromISO(resolvedPeriodEndTime.value)}`,
    })
  }
  return t('finanzas.arqueo.fullDayWindow')
})

const customWindowLabel = computed(() => {
  const fmt = (iso: string) => formatIsoDateLong(iso)
  const datePart = periodStart.value === periodEnd.value
    ? fmt(periodStart.value)
    : `${fmt(periodStart.value)} – ${fmt(periodEnd.value)}`
  if (initStartTime && initEndTime) return `${datePart} · ${initStartTime} – ${initEndTime}`
  return datePart
})

const closeLink = computed(() => {
  if (aperturaMode.value === 'day' || isDayShiftSelected.value) {
    if (resolvedPeriodStartTime.value && resolvedPeriodEndTime.value) {
      const q = new URLSearchParams({
        mode: 'custom',
        start: resolvedPeriodStart.value,
        end: resolvedPeriodEnd.value,
        startTime: timeHHMMFromISO(resolvedPeriodStartTime.value),
        endTime: timeHHMMFromISO(resolvedPeriodEndTime.value),
      })
      return `/finanzas/arqueo/z?${q.toString()}`
    }
    return `/finanzas/arqueo/nuevo?start=${resolvedPeriodStart.value}&end=${resolvedPeriodEnd.value}`
  }
  if (aperturaMode.value === 'custom') {
    const q = new URLSearchParams({ mode: 'custom', start: periodStart.value, end: periodEnd.value })
    if (initStartTime) q.set('startTime', initStartTime)
    if (initEndTime) q.set('endTime', initEndTime)
    return `/finanzas/arqueo/z?${q.toString()}`
  }
  if (!effectiveTemplateId.value) return null
  return `/finanzas/arqueo/z?mode=template&start=${periodStart.value}&template=${effectiveTemplateId.value}`
})

const closeLinkLabel = computed(() =>
  (aperturaMode.value === 'day' || isDayShiftSelected.value) ? t('finanzas.arqueo.goToDayClose') : t('finanzas.arqueo.goToCloseZ'),
)

const canProceedToCount = computed(() => {
  if (isShiftOpen(existingShift.value)) return false
  if (usesDayWindow.value && dayWindowLoading.value) return false
  if (aperturaMode.value === 'template') {
    return selectedTemplateId.value === DAY_SHIFT_KEY || !!effectiveTemplateId.value
  }
  return true
})

watch(selectedTemplateId, () => { stepError.value = null })

const goToCount = () => {
  stepError.value = null
  if (aperturaMode.value === 'template' && !canProceedToCount.value) {
    stepError.value = t('finanzas.arqueo.selectShift')
    return
  }
  if (isShiftOpen(existingShift.value)) {
    stepError.value = t('finanzas.arqueo.shiftAlreadyOpen')
    return
  }
  currentStep.value = 2
  if (suggestedOpeningCash.value > 0 && totalCounted.value === 0) {
    applySuggestedOpening()
  }
}

const submitOpening = async () => {
  submitError.value = null
  if (!isPastAnchorDate.value && totalCounted.value <= 0) {
    submitError.value = t('finanzas.arqueo.openingMustBePositive')
    return
  }
  if (isPastAnchorDate.value && totalCounted.value < 0) {
    submitError.value = t('finanzas.arqueo.openingNotNegative')
    return
  }
  isSubmitting.value = true
  try {
    const breakdown = toBreakdown()
    const body: Record<string, unknown> = {
      periodStart: resolvedPeriodStart.value,
      periodEnd: resolvedPeriodEnd.value,
      openingCash: totalCounted.value,
      openingBreakdown: Object.keys(breakdown).length ? breakdown : undefined,
    }
    if (aperturaMode.value === 'template' && effectiveTemplateId.value) {
      body.shiftTemplateId = effectiveTemplateId.value
    }
    if (resolvedPeriodStartTime.value) body.periodStartTime = resolvedPeriodStartTime.value
    if (resolvedPeriodEndTime.value) body.periodEndTime = resolvedPeriodEndTime.value
    await $fetch('/api/cierre/open-shift', { method: 'POST', body })
    successOpeningCash.value = totalCounted.value
    openSuccess.value = true
    await refetchShiftStatus()
    cache.invalidateQueries({ key: ['cierre', 'preview-x0'] })
    cache.invalidateQueries({ key: ['cierre', 'preview'] })
    cache.invalidateQueries({ key: ['cierre', 'list'] })
  } catch (err: any) {
    submitError.value = err?.data?.detail ?? err?.data?.message ?? t('finanzas.arqueo.openFailed')
  } finally {
    isSubmitting.value = false
  }
}
</script>
