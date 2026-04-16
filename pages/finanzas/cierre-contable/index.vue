<template>
  <div class="page-layout">
    <!-- Header -->
    <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
      <div class="p-4 sm:p-6">
        <h1 class="text-xl sm:text-2xl font-bold text-text-primary mb-1">Cierre contable</h1>
        <p class="text-sm text-text-secondary">Gestión de períodos contables mensuales. Al cerrar un período, las órdenes de ese mes quedan bloqueadas.</p>
      </div>
    </div>

    <!-- Year selector -->
    <div class="flex items-center gap-3 mb-4">
      <button
        @click="prevYear"
        class="h-10 w-10 flex items-center justify-center rounded-lg border-2 border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
        aria-label="Año anterior"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span class="text-lg font-bold text-text-primary min-w-[4ch] text-center">{{ selectedYear }}</span>
      <button
        @click="nextYear"
        :disabled="selectedYear >= currentYear"
        class="h-10 w-10 flex items-center justify-center rounded-lg border-2 border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Año siguiente"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Months grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      <div
        v-for="m in months"
        :key="m.number"
        class="bg-surface border-2 rounded-xl p-4 flex flex-col gap-3"
        :class="m.isFuture ? 'border-border opacity-50' : 'border-border'"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-semibold text-text-primary">{{ m.name }}</p>
            <p class="text-xs text-text-secondary mt-0.5">{{ selectedYear }}</p>
          </div>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            :class="m.status === 'closed'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-success/10 text-success'"
          >
            <svg v-if="m.status === 'closed'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            {{ m.status === 'closed' ? 'Cerrado' : 'Abierto' }}
          </span>
        </div>

        <div v-if="m.closedAt" class="text-xs text-text-secondary">
          Cerrado el {{ formatDate(m.closedAt) }}
        </div>

        <button
          v-if="!m.isFuture && m.status === 'open'"
          @click="openModal(m)"
          class="mt-auto min-h-[36px] w-full px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-semibold hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Cerrar período
        </button>

        <div
          v-else-if="m.status === 'closed'"
          class="mt-auto text-xs text-text-secondary text-center py-1"
        >
          Período bloqueado
        </div>
      </div>
    </div>

    <!-- Confirmation modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="closeModal" />
        <div class="relative bg-surface rounded-xl shadow-xl w-full max-w-sm p-6">
          <div class="text-center">
            <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-text-primary mb-1">Cerrar período contable</h3>
            <p class="text-sm text-text-secondary mb-4">
              ¿Cerrar el período contable de <strong>{{ selectedMonth?.name }} {{ selectedYear }}</strong>?
              Todas las órdenes de este mes quedarán <strong>bloqueadas</strong> y no podrán modificarse.
            </p>
            <textarea
              v-model="notes"
              placeholder="Notas para el contador (opcional)..."
              rows="2"
              class="w-full mb-4 px-3 py-2 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div class="flex gap-3">
              <button
                @click="closeModal"
                :disabled="closing"
                class="flex-1 min-h-[44px] px-4 py-2 border-2 border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                @click="handleClose"
                :disabled="closing"
                class="flex-1 min-h-[44px] px-4 py-2 bg-destructive text-white rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {{ closing ? 'Cerrando...' : 'Cerrar período' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Cierre contable - Warocol' })

const { formatDateTime } = useFormatters()
const { fetchPeriodStatus, closePeriod } = useClosedPeriods()

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1 // 1-12

const selectedYear = ref(currentYear)

const prevYear = () => { selectedYear.value-- }
const nextYear = () => { if (selectedYear.value < currentYear) selectedYear.value++ }

// Per-month status cache: key = 'YYYY-M'
const statusCache = ref<Record<string, { status: string; closedAt?: string }>>({})
const loading = ref(false)

const loadYear = async (year: number) => {
  loading.value = true
  const promises = Array.from({ length: 12 }, (_, i) => i + 1).map(async (m) => {
    const key = `${year}-${m}`
    if (statusCache.value[key]) return
    try {
      const data: any = await $fetch(`/api/finanzas/periodos/${year}/${m}/status`)
      statusCache.value[key] = {
        status: data?.data?.status ?? 'open',
        closedAt: data?.data?.closedAt ?? undefined,
      }
    } catch {
      statusCache.value[key] = { status: 'open' }
    }
  })
  await Promise.all(promises)
  loading.value = false
}

watch(selectedYear, (y) => loadYear(y), { immediate: true })

const months = computed(() =>
  MONTH_NAMES.map((name, i) => {
    const m = i + 1
    const key = `${selectedYear.value}-${m}`
    const cached = statusCache.value[key]
    const isFuture = selectedYear.value === currentYear && m > currentMonth
    return {
      number: m,
      name,
      status: cached?.status ?? 'open',
      closedAt: cached?.closedAt,
      isFuture,
    }
  })
)

const formatDate = (iso: string) => iso ? formatDateTime(iso) : ''

// Modal
const showModal = ref(false)
const selectedMonth = ref<{ number: number; name: string } | null>(null)
const notes = ref('')
const closing = ref(false)

const openModal = (m: { number: number; name: string }) => {
  selectedMonth.value = m
  notes.value = ''
  showModal.value = true
}

const closeModal = () => {
  if (closing.value) return
  showModal.value = false
  selectedMonth.value = null
}

const handleClose = async () => {
  if (!selectedMonth.value) return
  closing.value = true
  try {
    await closePeriod(selectedYear.value, selectedMonth.value.number, notes.value || undefined)
    const key = `${selectedYear.value}-${selectedMonth.value.number}`
    statusCache.value[key] = { status: 'closed', closedAt: new Date().toISOString() }
    showModal.value = false
    selectedMonth.value = null
  } catch (err: any) {
    alert(err?.data?.detail ?? err?.data?.message ?? 'Error al cerrar el período')
  } finally {
    closing.value = false
  }
}
</script>
