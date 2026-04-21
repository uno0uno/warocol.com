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
const selectedMonth = ref<number | null>(null)
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
const isLoading    = ref(true)
const isRefreshing = ref(false)
const fetchError   = ref(false)
const hasData      = ref(false)

const allEmployees = ref<any[]>([])

type BenefitCache = {
  primas:       any[]
  cesantias:    any[]
  intCesantias: any[]
  vacaciones:   any[]
}
const cache = ref<Record<string, BenefitCache>>({})

async function loadData() {
  fetchError.value = false
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
    cache.value   = newCache
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

// ── Benefit resolvers (with optional month filter) ────────────────────────
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

// ── Table data — enriched with resolved benefit amounts ───────────────────
// Computed is re-evaluated reactively when selectedYear/Month/searchTerm change
const tableData = computed(() => {
  let list = allEmployees.value

  // Search filter
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    list = list.filter((e: any) =>
      e.name?.toLowerCase().includes(term) || e.email?.toLowerCase().includes(term)
    )
  }

  return list.map((emp: any) => ({
    ...emp,
    primaS1:      getPrimaAmount(emp.id, `${selectedYear.value}-S1`),
    primaS2:      getPrimaAmount(emp.id, `${selectedYear.value}-S2`),
    cesantias:    getCesantiasAmount(emp.id),
    intCesantias: getIntCesantiasAmount(emp.id),
    vacaciones:   getVacacionesAmount(emp.id),
  }))
})

const tableColumns = [
  { key: 'name',         title: 'Empleado',       sortable: false },
  { key: 'primaS1',     title: 'Prima S1',        sortable: false, align: 'center' as const },
  { key: 'primaS2',     title: 'Prima S2',        sortable: false, align: 'center' as const },
  { key: 'cesantias',   title: 'Cesantías',       sortable: false, align: 'center' as const },
  { key: 'intCesantias',title: 'Int. Cesantías',  sortable: false, align: 'center' as const },
  { key: 'vacaciones',  title: 'Vacaciones',      sortable: false, align: 'center' as const },
]

// ── Layout refresh integration ────────────────────────────────────────────
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(loadData) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => { clearRefreshHandler(loadData) })
</script>

<template>
  <div class="page-layout">

    <!-- Initial loading -->
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

        <!-- Year -->
        <select
          v-model="selectedYear"
          class="h-10 py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
        >
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>

        <!-- Month -->
        <select
          v-model="selectedMonth"
          class="h-10 py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
        >
          <option :value="null">Todos los meses</option>
          <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>

        <!-- Clear -->
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

      <!-- Data table -->
      <HealthSemaphore :is-unlocked="true" title="Estado de Prestaciones Sociales">
        <UiResponsiveDataView
          :columns="tableColumns"
          :data="tableData"
          empty-message="No hay empleados registrados"
          empty-sub-message="Los empleados y jornaleros aparecerán aquí"
          variant="default"
          row-size="sm"
        >

          <!-- ── Mobile card ──────────────────────────────────────────── -->
          <template #card="{ item, index }">
            <div
              class="flex flex-col gap-2 py-3 px-3 border-b border-border"
              :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            >
              <!-- Employee header -->
              <NuxtLink
                :to="`/equipo/salarios/${item.id}`"
                class="flex items-center gap-2"
              >
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                  :style="{ backgroundColor: item.color }"
                >
                  {{ item.initials }}
                </div>
                <div>
                  <p class="text-sm font-semibold text-text-primary leading-tight">{{ item.name }}</p>
                  <p v-if="item.employment_type === 'daily'" class="text-xs text-text-secondary">Jornalero</p>
                </div>
              </NuxtLink>

              <!-- Benefits grid 2×3 -->
              <div class="grid grid-cols-2 gap-1.5 pl-10">
                <template v-for="col in [
                  { key: 'primaS1',      label: 'Prima S1',       path: 'prima'         },
                  { key: 'primaS2',      label: 'Prima S2',       path: 'prima'         },
                  { key: 'cesantias',    label: 'Cesantías',      path: 'cesantias'     },
                  { key: 'intCesantias', label: 'Int. Cesantías', path: 'int-cesantias' },
                  { key: 'vacaciones',   label: 'Vacaciones',     path: 'vacaciones'    },
                ]">
                  <div :key="col.key" class="flex flex-col gap-0.5">
                    <span class="text-xs text-text-secondary">{{ col.label }}</span>
                    <span
                      v-if="item[col.key] !== null && item[col.key] !== undefined"
                      class="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-700"
                    >
                      <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      {{ formatCurrency(item[col.key]) }}
                    </span>
                    <NuxtLink
                      v-else
                      :to="`/equipo/salarios/${item.id}/prestaciones/${col.path}`"
                      class="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Registrar
                    </NuxtLink>
                  </div>
                </template>
              </div>
            </div>
          </template>

          <!-- ── Desktop cells ───────────────────────────────────────── -->

          <!-- Empleado -->
          <template #cell-name="{ row }">
            <NuxtLink
              :to="`/equipo/salarios/${row.id}`"
              class="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                :style="{ backgroundColor: row.color }"
              >
                {{ row.initials }}
              </div>
              <div>
                <p class="text-sm font-medium text-text-primary leading-tight">{{ row.name }}</p>
                <p v-if="row.employment_type === 'daily'" class="text-xs text-text-secondary">Jornalero</p>
              </div>
            </NuxtLink>
          </template>

          <!-- Prima S1 -->
          <template #cell-primaS1="{ row }">
            <span
              v-if="row.primaS1 !== null && row.primaS1 !== undefined"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              {{ formatCurrency(row.primaS1) }}
            </span>
            <NuxtLink
              v-else
              :to="`/equipo/salarios/${row.id}/prestaciones/prima`"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px] whitespace-nowrap"
              :aria-label="`Registrar prima S1 ${selectedYear} — ${row.name}`"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Registrar
            </NuxtLink>
          </template>

          <!-- Prima S2 -->
          <template #cell-primaS2="{ row }">
            <span
              v-if="row.primaS2 !== null && row.primaS2 !== undefined"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              {{ formatCurrency(row.primaS2) }}
            </span>
            <NuxtLink
              v-else
              :to="`/equipo/salarios/${row.id}/prestaciones/prima`"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px] whitespace-nowrap"
              :aria-label="`Registrar prima S2 ${selectedYear} — ${row.name}`"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Registrar
            </NuxtLink>
          </template>

          <!-- Cesantías -->
          <template #cell-cesantias="{ row }">
            <span
              v-if="row.cesantias !== null && row.cesantias !== undefined"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              {{ formatCurrency(row.cesantias) }}
            </span>
            <NuxtLink
              v-else
              :to="`/equipo/salarios/${row.id}/prestaciones/cesantias`"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px] whitespace-nowrap"
              :aria-label="`Registrar cesantías ${selectedYear} — ${row.name}`"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Registrar
            </NuxtLink>
          </template>

          <!-- Int. Cesantías -->
          <template #cell-intCesantias="{ row }">
            <span
              v-if="row.intCesantias !== null && row.intCesantias !== undefined"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              {{ formatCurrency(row.intCesantias) }}
            </span>
            <NuxtLink
              v-else
              :to="`/equipo/salarios/${row.id}/prestaciones/int-cesantias`"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px] whitespace-nowrap"
              :aria-label="`Registrar intereses cesantías ${selectedYear} — ${row.name}`"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Registrar
            </NuxtLink>
          </template>

          <!-- Vacaciones -->
          <template #cell-vacaciones="{ row }">
            <span
              v-if="row.vacaciones !== null && row.vacaciones !== undefined"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
              {{ formatCurrency(row.vacaciones) }}
            </span>
            <NuxtLink
              v-else
              :to="`/equipo/salarios/${row.id}/prestaciones/vacaciones`"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px] whitespace-nowrap"
              :aria-label="`Registrar vacaciones ${selectedYear} — ${row.name}`"
            >
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Registrar
            </NuxtLink>
          </template>

        </UiResponsiveDataView>
      </HealthSemaphore>

    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
