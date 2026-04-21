<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

useHead({ title: 'Nómina — Equipo' })

const { currentTenant } = useTenantReactive()
const { formatCurrency } = useFormatters()

// ── Filters ───────────────────────────────────────────────────────────────
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)
const selectedYear  = ref(currentYear)
const selectedMonth = ref<number | null>(null)  // null = todos los meses
const searchTerm    = ref('')

const monthOptions = [
  { label: 'Enero',      value: 1  },
  { label: 'Febrero',    value: 2  },
  { label: 'Marzo',      value: 3  },
  { label: 'Abril',      value: 4  },
  { label: 'Mayo',       value: 5  },
  { label: 'Junio',      value: 6  },
  { label: 'Julio',      value: 7  },
  { label: 'Agosto',     value: 8  },
  { label: 'Septiembre', value: 9  },
  { label: 'Octubre',    value: 10 },
  { label: 'Noviembre',  value: 11 },
  { label: 'Diciembre',  value: 12 },
]

const hasActiveFilters = computed(
  () => searchTerm.value !== '' || selectedMonth.value !== null
)

const clearFilters = () => {
  searchTerm.value    = ''
  selectedMonth.value = null
}

// ── Raw data ──────────────────────────────────────────────────────────────
// isLoading  = true only on first fetch (full-page spinner)
// isRefreshing = true on subsequent fetches (progressive bar, no page block)
const isLoading    = ref(true)
const isRefreshing = ref(false)
const fetchError   = ref(false)
const hasData      = ref(false)

// All eligible employees (non-contractor)
const allEmployees = ref<any[]>([])

// Per-employee raw benefit arrays
type BenefitCache = {
  primas:       any[]
  cesantias:    any[]
  intCesantias: any[]
  vacaciones:   any[]
}
const cache = ref<Record<string, BenefitCache>>({})

async function loadData() {
  fetchError.value = false

  // If we already have data, use progressive loading (no full-page spinner)
  if (hasData.value) {
    isRefreshing.value = true
  } else {
    isLoading.value = true
  }

  try {
    const empData = await $fetch<any>('/api/salaries/employees')
    const eligible = (empData?.data || []).filter(
      (e: any) => e.employment_type !== 'contractor'
    )
    allEmployees.value = eligible
    const newCache: Record<string, BenefitCache> = {}

    await Promise.all(
      eligible.map(async (emp: any) => {
        const [primaRes, cesantiasRes, intCesantiasRes, vacacionesRes] = await Promise.all([
          $fetch<any>(`/api/salaries/employees/${emp.id}/prima`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/cesantias`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/int-cesantias`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/vacaciones`).catch(() => null),
        ])
        newCache[emp.id] = {
          primas:       primaRes?.data       ?? [],
          cesantias:    cesantiasRes?.data    ?? [],
          intCesantias: intCesantiasRes?.data ?? [],
          vacaciones:   vacacionesRes?.data   ?? [],
        }
      })
    )
    cache.value = newCache
    hasData.value = true
  } catch {
    fetchError.value = true
  } finally {
    isLoading.value    = false
    isRefreshing.value = false
  }
}

onMounted(() => { if (currentTenant.value) loadData() })
watch(() => currentTenant.value?.id, (id) => { if (id) loadData() })
watch(selectedYear, loadData)

// ── Filtered employees (search) ───────────────────────────────────────────
const employees = computed(() => {
  if (!searchTerm.value) return allEmployees.value
  const term = searchTerm.value.toLowerCase()
  return allEmployees.value.filter((e: any) =>
    e.name?.toLowerCase().includes(term) || e.email?.toLowerCase().includes(term)
  )
})

// ── Helper: resolve a payment record considering month filter ─────────────
function matchMonth(paymentDate: string | null): boolean {
  if (selectedMonth.value === null) return true
  if (!paymentDate) return false
  return new Date(paymentDate).getMonth() + 1 === selectedMonth.value
}

function getPrimaAmount(id: string, semestre: string): number | null {
  const rec = (cache.value[id]?.primas ?? []).find(
    (p: any) => p.semestre === semestre && matchMonth(p.payment_date)
  )
  return rec ? Number(rec.prima_amount) : null
}

function getCesantiasAmount(id: string): number | null {
  const rec = (cache.value[id]?.cesantias ?? []).find(
    (c: any) => c.anio === selectedYear.value && matchMonth(c.payment_date)
  )
  return rec ? Number(rec.cesantias_amount) : null
}

function getIntCesantiasAmount(id: string): number | null {
  const rec = (cache.value[id]?.intCesantias ?? []).find(
    (c: any) => c.anio === selectedYear.value && matchMonth(c.payment_date)
  )
  return rec ? Number(rec.int_cesantias_amount) : null
}

function getVacacionesAmount(id: string): number | null {
  const rec = (cache.value[id]?.vacaciones ?? []).find(
    (v: any) => v.anio === selectedYear.value && matchMonth(v.payment_date)
  )
  return rec ? Number(rec.vacaciones_amount) : null
}

// ── Layout refresh integration (progressive loading bar, like ordenes) ────
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(loadData) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => { clearRefreshHandler(loadData) })
</script>

<template>
  <div class="page-layout">

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- Filters Bar -->
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">

        <!-- Search -->
        <div class="relative flex-1 min-w-[200px]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
          <input
            v-model="searchTerm"
            placeholder="Buscar empleado..."
            class="w-full h-10 pl-9 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Year selector -->
        <select
          v-model="selectedYear"
          class="h-10 py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
        >
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>

        <!-- Month selector -->
        <select
          v-model="selectedMonth"
          class="h-10 py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
        >
          <option :value="null">Todos los meses</option>
          <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>

        <!-- Clear filters -->
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          aria-label="Limpiar filtros"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Table -->
      <HealthSemaphore :is-unlocked="true" title="Estado de Prestaciones Sociales">
        <!-- Empty state -->
        <div
          v-if="employees.length === 0"
          class="flex flex-col items-center justify-center py-16 gap-3 text-text-secondary"
        >
          <svg class="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p class="text-sm">No hay empleados ni jornaleros registrados.</p>
        </div>

        <!-- Scrollable table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">Empleado</th>
                <th class="text-center px-3 py-3 font-semibold text-text-secondary whitespace-nowrap">Prima S1</th>
                <th class="text-center px-3 py-3 font-semibold text-text-secondary whitespace-nowrap">Prima S2</th>
                <th class="text-center px-3 py-3 font-semibold text-text-secondary whitespace-nowrap">Cesantías</th>
                <th class="text-center px-3 py-3 font-semibold text-text-secondary whitespace-nowrap">Int. Cesantías</th>
                <th class="text-center px-3 py-3 font-semibold text-text-secondary whitespace-nowrap">Vacaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(emp, idx) in employees"
                :key="emp.id"
                class="border-b border-border last:border-0 transition-colors hover:bg-surface-secondary/30"
                :class="idx % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/20'"
              >
                <!-- Employee -->
                <td class="px-4 py-3">
                  <NuxtLink
                    :to="`/equipo/salarios/${emp.id}`"
                    class="flex items-center gap-2 hover:text-primary transition-colors min-w-[160px]"
                  >
                    <div
                      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      :style="{ backgroundColor: emp.color }"
                    >
                      {{ emp.initials }}
                    </div>
                    <div class="min-w-0">
                      <p class="font-medium text-text-primary leading-tight truncate">{{ emp.name }}</p>
                      <p v-if="emp.employment_type === 'daily'" class="text-xs text-text-secondary">Jornalero</p>
                    </div>
                  </NuxtLink>
                </td>

                <!-- Prima S1 -->
                <td class="px-3 py-3 text-center">
                  <template v-if="getPrimaAmount(emp.id, `${selectedYear}-S1`) !== null">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap">
                      <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      {{ formatCurrency(getPrimaAmount(emp.id, `${selectedYear}-S1`)!) }}
                    </span>
                  </template>
                  <NuxtLink
                    v-else
                    :to="`/equipo/salarios/${emp.id}/prestaciones/prima`"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px] whitespace-nowrap"
                    :aria-label="`Registrar prima S1 ${selectedYear} para ${emp.name}`"
                  >
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Registrar
                  </NuxtLink>
                </td>

                <!-- Prima S2 -->
                <td class="px-3 py-3 text-center">
                  <template v-if="getPrimaAmount(emp.id, `${selectedYear}-S2`) !== null">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap">
                      <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      {{ formatCurrency(getPrimaAmount(emp.id, `${selectedYear}-S2`)!) }}
                    </span>
                  </template>
                  <NuxtLink
                    v-else
                    :to="`/equipo/salarios/${emp.id}/prestaciones/prima`"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px] whitespace-nowrap"
                    :aria-label="`Registrar prima S2 ${selectedYear} para ${emp.name}`"
                  >
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Registrar
                  </NuxtLink>
                </td>

                <!-- Cesantías -->
                <td class="px-3 py-3 text-center">
                  <template v-if="getCesantiasAmount(emp.id) !== null">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap">
                      <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      {{ formatCurrency(getCesantiasAmount(emp.id)!) }}
                    </span>
                  </template>
                  <NuxtLink
                    v-else
                    :to="`/equipo/salarios/${emp.id}/prestaciones/cesantias`"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px] whitespace-nowrap"
                    :aria-label="`Registrar cesantías ${selectedYear} para ${emp.name}`"
                  >
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Registrar
                  </NuxtLink>
                </td>

                <!-- Int. Cesantías -->
                <td class="px-3 py-3 text-center">
                  <template v-if="getIntCesantiasAmount(emp.id) !== null">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap">
                      <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      {{ formatCurrency(getIntCesantiasAmount(emp.id)!) }}
                    </span>
                  </template>
                  <NuxtLink
                    v-else
                    :to="`/equipo/salarios/${emp.id}/prestaciones/int-cesantias`"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px] whitespace-nowrap"
                    :aria-label="`Registrar intereses cesantías ${selectedYear} para ${emp.name}`"
                  >
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Registrar
                  </NuxtLink>
                </td>

                <!-- Vacaciones -->
                <td class="px-3 py-3 text-center">
                  <template v-if="getVacacionesAmount(emp.id) !== null">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap">
                      <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      {{ formatCurrency(getVacacionesAmount(emp.id)!) }}
                    </span>
                  </template>
                  <NuxtLink
                    v-else
                    :to="`/equipo/salarios/${emp.id}/prestaciones/vacaciones`"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px] whitespace-nowrap"
                    :aria-label="`Registrar vacaciones ${selectedYear} para ${emp.name}`"
                  >
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Registrar
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </HealthSemaphore>

    </div>
  </div>
</template>

<style scoped>
/* Consistent scrollbar hiding with the rest of the app */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
