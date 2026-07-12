<script setup lang="ts">
import { ref, computed } from 'vue'

const { t } = useI18n({ useScope: 'global' })

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
useHead({ title: () => t('finanzas.head.plMensual') })

// ── Query params (initial values from URL or current date) ────────────────────
const route = useRoute()
const { todayISO } = useTenantTimezone()

const tenantToday = computed(() => todayISO())
const tenantYear = computed(() => Number(tenantToday.value.slice(0, 4)))
const tenantMonth = computed(() => Number(tenantToday.value.slice(5, 7)))
const year = ref<number>(
  route.query.year ? Number(route.query.year) : tenantYear.value
)
const month = ref<number>(
  route.query.month ? Number(route.query.month) : tenantMonth.value
)

// ── Navigation helpers ────────────────────────────────────────────────────────
const monthName = (m: number): string => t(`finanzas.pl.months.${m}`)

const periodLabel = computed(() => `${monthName(month.value)} ${year.value}`)

const pageTitle = computed(() => t('finanzas.pl.pageTitle', { period: periodLabel.value }))

const isCurrentMonth = computed(() => {
  return year.value === tenantYear.value && month.value === tenantMonth.value
})

const goToPrev = () => {
  if (month.value === 1) {
    month.value = 12
    year.value -= 1
  } else {
    month.value -= 1
  }
}

const goToNext = () => {
  if (isCurrentMonth.value) return
  if (month.value === 12) {
    month.value = 1
    year.value += 1
  } else {
    month.value += 1
  }
}
</script>

<template>
  <div class="page-layout">

    <!-- Navigation header -->
    <div class="flex items-center justify-between gap-3 flex-wrap mb-1">
      <div>
        <h1 class="text-lg font-bold text-text-primary leading-tight">{{ pageTitle }}</h1>
        <p class="text-xs text-text-secondary mt-0.5">{{ t('finanzas.pl.monthlyTitle') }}</p>
      </div>

      <!-- Month navigation -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          :aria-label="t('finanzas.pl.prevMonth')"
          @click="goToPrev"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span class="text-sm font-semibold text-text-primary min-w-[140px] text-center select-none">
          {{ periodLabel }}
        </span>

        <button
          type="button"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="isCurrentMonth"
          :aria-label="t('finanzas.pl.nextMonth')"
          @click="goToNext"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- P&L Statement (full mode) -->
    <FinanzasPLStatement :year="year" :month="month" :compact="false" />

  </div>
</template>
