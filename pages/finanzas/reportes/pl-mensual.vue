<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Estado de Resultados mensual - Warocol' })

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
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const monthName = (m: number): string => MONTH_NAMES[m - 1] ?? ''

const periodLabel = computed(() => `${monthName(month.value)} ${year.value}`)

const pageTitle = computed(() => `Estado de Resultados — ${periodLabel.value}`)

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
        <p class="text-xs text-text-secondary mt-0.5">P&amp;L mensual consolidado</p>
      </div>

      <!-- Month navigation -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Mes anterior"
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
          aria-label="Mes siguiente"
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
