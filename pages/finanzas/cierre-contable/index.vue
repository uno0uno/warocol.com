<template>
  <div class="page-layout">

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

    <!-- Months table -->
    <HealthSemaphore :is-unlocked="true" title="Períodos contables">
      <UiResponsiveDataView
        row-size="sm"
        :columns="columns"
        :data="months"
        empty-message="No hay períodos disponibles"
      >
        <!-- Mobile card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border"
            :class="[
              index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30',
              item.isFuture ? 'opacity-50' : ''
            ]"
          >
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-text-primary">{{ item.name }} {{ selectedYear }}</span>
              <p v-if="item.closedAt" class="text-xs text-text-secondary mt-0.5">
                Cerrado el {{ formatDate(item.closedAt) }}
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <UiStatusBadge
                :value="item.status === 'closed' ? 'Cerrado' : 'Abierto'"
                format="text"
                :variant="item.status === 'closed' ? 'destructive' : 'success'"
                size="sm"
              />
              <button
                v-if="!item.isFuture && item.status === 'open'"
                @click="openModal(item)"
                class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Cerrar período"
                aria-label="Cerrar período"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-name="{ row }">
          <span class="text-sm font-semibold text-text-primary">{{ row.name }}</span>
        </template>

        <template #cell-status="{ row }">
          <UiStatusBadge
            :value="row.status === 'closed' ? 'Cerrado' : (row.isFuture ? 'Futuro' : 'Abierto')"
            format="text"
            :variant="row.status === 'closed' ? 'destructive' : (row.isFuture ? 'secondary' : 'success')"
            size="sm"
          />
        </template>

        <template #cell-closedAt="{ row }">
          <span class="text-xs text-text-secondary">
            {{ row.closedAt ? formatDate(row.closedAt) : '—' }}
          </span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center">
            <button
              v-if="!row.isFuture && row.status === 'open'"
              @click="openModal(row)"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Cerrar período"
              aria-label="Cerrar período"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
            <span v-else-if="row.status === 'closed'" class="text-xs text-text-secondary">Bloqueado</span>
          </div>
        </template>
      </UiResponsiveDataView>
    </HealthSemaphore>

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
import { ref, computed, watch } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

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
const currentMonth = now.getMonth() + 1

const selectedYear = ref(currentYear)
const prevYear = () => { selectedYear.value-- }
const nextYear = () => { if (selectedYear.value < currentYear) selectedYear.value++ }

const columns = [
  { key: 'name',     title: 'Mes',            sortable: false },
  { key: 'status',   title: 'Estado',         sortable: false },
  { key: 'closedAt', title: 'Fecha de cierre', sortable: false },
  { key: 'actions',  title: '',               sortable: false },
]

// Per-month status cache: key = 'YYYY-M'
const statusCache = ref<Record<string, { status: string; closedAt?: string }>>({})

const loadYear = async (year: number) => {
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

const formatDate = (iso: string) => iso ? formatDateTime(iso) : '—'

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
