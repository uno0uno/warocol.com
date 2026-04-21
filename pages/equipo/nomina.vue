<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
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

// ── Employees (cached via useQuery) ───────────────────────────────────────
type BenefitCache = {
  primas:       any[]
  cesantias:    any[]
  intCesantias: any[]
  vacaciones:   any[]
}

const { data: empData, asyncStatus: empAsyncStatus, refetch: refetchEmployees } = useQuery({
  key: () => ['nomina', 'employees', currentTenant.value?.id],
  query: () => $fetch<any>('/api/salaries/employees'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const allEmployeesRaw = computed(() =>
  (empData.value?.data ?? []).filter((e: any) => e.employment_type !== 'contractor')
)

const isLoading = computed(() => empData.value == null && empAsyncStatus.value === 'loading')
const fetchError = ref(false)

// ── Benefit cache (loaded after employees or on year change) ──────────────
const isBenefitLoading = ref(false)
const isRefreshing = computed(() =>
  (empAsyncStatus.value === 'loading' && empData.value != null) || isBenefitLoading.value
)
const cache = ref<Record<string, BenefitCache>>({})

async function loadBenefits(employees: any[]) {
  if (!employees.length) return
  isBenefitLoading.value = true
  fetchError.value = false
  const newCache: Record<string, BenefitCache> = {}
  try {
    await Promise.all(
      employees.map(async (emp: any) => {
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
  } catch {
    fetchError.value = true
  } finally {
    isBenefitLoading.value = false
  }
}

watch(allEmployeesRaw, (employees) => { loadBenefits(employees) }, { immediate: true })
watch(selectedYear, () => { loadBenefits(allEmployeesRaw.value) })

async function loadData() {
  await refetchEmployees()
}

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
  let list = allEmployeesRaw.value

  // Search filter
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    list = list.filter((e: any) =>
      e.name?.toLowerCase().includes(term) || e.email?.toLowerCase().includes(term)
    )
  }

  return list.map((emp: any) => ({
    ...emp,
    employmentType: emp.employment_type,
    primaS1:      getPrimaAmount(emp.id, `${selectedYear.value}-S1`),
    primaS2:      getPrimaAmount(emp.id, `${selectedYear.value}-S2`),
    cesantias:    getCesantiasAmount(emp.id),
    intCesantias: getIntCesantiasAmount(emp.id),
    vacaciones:   getVacacionesAmount(emp.id),
  }))
})

const mobileBenefitCols = [
  { key: 'primaS1',      label: 'Prima S1',       path: 'prima'         },
  { key: 'primaS2',      label: 'Prima S2',       path: 'prima'         },
  { key: 'cesantias',    label: 'Cesantías',      path: 'cesantias'     },
  { key: 'intCesantias', label: 'Int. Cesantías', path: 'int-cesantias' },
  { key: 'vacaciones',   label: 'Vacaciones',     path: 'vacaciones'    },
]

const tableColumns = [
  { key: 'name',          title: 'Empleado',       sortable: false },
  { key: 'employmentType',title: 'Tipo',           sortable: false, align: 'center' as const },
  { key: 'primaS1',       title: 'Prima S1',       sortable: false, align: 'center' as const },
  { key: 'primaS2',       title: 'Prima S2',       sortable: false, align: 'center' as const },
  { key: 'cesantias',     title: 'Cesantías',      sortable: false, align: 'center' as const },
  { key: 'intCesantias',  title: 'Int. Cesantías', sortable: false, align: 'center' as const },
  { key: 'vacaciones',    title: 'Vacaciones',     sortable: false, align: 'center' as const },
]

const employmentTypeLabel: Record<string, string> = {
  employee:   'Empleado',
  daily:      'Jornalero',
  contractor: 'Contratista',
}

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
          row-size="xs"
        >

          <!-- ── Mobile card ──────────────────────────────────────────── -->
          <template #card="{ item, index }">
            <div
              class="flex flex-col gap-2 py-3 px-3 border-b border-border"
              :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            >
              <!-- Employee header -->
              <NuxtLink :to="`/equipo/salarios/${item.id}`" class="flex items-center gap-2">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                  :style="{ backgroundColor: item.color }"
                >{{ item.initials }}</div>
                <div>
                  <p class="text-sm font-semibold text-text-primary leading-tight">{{ item.name }}</p>
                  <UiStatusBadge :value="employmentTypeLabel[item.employment_type] ?? item.employment_type" variant="secondary" size="sm" class="mt-0.5" />
                </div>
              </NuxtLink>

              <!-- Benefits grid -->
              <div class="grid grid-cols-2 gap-1.5 pl-10">
                <div v-for="col in mobileBenefitCols" :key="col.key" class="flex flex-col gap-0.5">
                  <span class="text-xs text-text-secondary">{{ col.label }}</span>
                  <NuxtLink v-if="item[col.key] != null" :to="`/equipo/salarios/${item.id}/prestaciones/${col.path}`">
                    <UiStatusBadge :value="formatCurrency(item[col.key])" variant="success" size="sm" />
                  </NuxtLink>
                  <NuxtLink v-else :to="`/equipo/salarios/${item.id}/prestaciones/${col.path}`">
                    <UiStatusBadge value="Sin registrar" variant="secondary" size="sm" />
                  </NuxtLink>
                </div>
              </div>
            </div>
          </template>

          <!-- ── Desktop cells ───────────────────────────────────────── -->

          <!-- Empleado -->
          <template #cell-name="{ row }">
            <NuxtLink :to="`/equipo/salarios/${row.id}`" class="text-sm font-semibold text-text-primary hover:text-primary transition-colors">
              {{ row.name }}
            </NuxtLink>
          </template>

          <!-- Tipo de contrato -->
          <template #cell-employmentType="{ value }">
            <UiStatusBadge
              :value="employmentTypeLabel[value] ?? 'Sin configurar'"
              :variant="value === 'employee' ? 'info' : value === 'daily' ? 'warning' : 'secondary'"
              size="sm"
              format="text"
              class="font-normal"
            />
          </template>

          <!-- Prima S1 -->
          <template #cell-primaS1="{ row }">
            <NuxtLink :to="`/equipo/salarios/${row.id}/prestaciones/prima`" :aria-label="`Prima S1 ${selectedYear} — ${row.name}`">
              <UiStatusBadge
                :value="row.primaS1 != null ? formatCurrency(row.primaS1) : 'Sin registrar'"
                :variant="row.primaS1 != null ? 'success' : 'secondary'"
                size="sm"
                format="text"
                class="font-normal"
              />
            </NuxtLink>
          </template>

          <!-- Prima S2 -->
          <template #cell-primaS2="{ row }">
            <NuxtLink :to="`/equipo/salarios/${row.id}/prestaciones/prima`" :aria-label="`Prima S2 ${selectedYear} — ${row.name}`">
              <UiStatusBadge
                :value="row.primaS2 != null ? formatCurrency(row.primaS2) : 'Sin registrar'"
                :variant="row.primaS2 != null ? 'success' : 'secondary'"
                size="sm"
                format="text"
                class="font-normal"
              />
            </NuxtLink>
          </template>

          <!-- Cesantías -->
          <template #cell-cesantias="{ row }">
            <NuxtLink :to="`/equipo/salarios/${row.id}/prestaciones/cesantias`" :aria-label="`Cesantías ${selectedYear} — ${row.name}`">
              <UiStatusBadge
                :value="row.cesantias != null ? formatCurrency(row.cesantias) : 'Sin registrar'"
                :variant="row.cesantias != null ? 'success' : 'secondary'"
                size="sm"
                format="text"
                class="font-normal"
              />
            </NuxtLink>
          </template>

          <!-- Int. Cesantías -->
          <template #cell-intCesantias="{ row }">
            <NuxtLink :to="`/equipo/salarios/${row.id}/prestaciones/int-cesantias`" :aria-label="`Int. Cesantías ${selectedYear} — ${row.name}`">
              <UiStatusBadge
                :value="row.intCesantias != null ? formatCurrency(row.intCesantias) : 'Sin registrar'"
                :variant="row.intCesantias != null ? 'success' : 'secondary'"
                size="sm"
                format="text"
                class="font-normal"
              />
            </NuxtLink>
          </template>

          <!-- Vacaciones -->
          <template #cell-vacaciones="{ row }">
            <NuxtLink :to="`/equipo/salarios/${row.id}/prestaciones/vacaciones`" :aria-label="`Vacaciones ${selectedYear} — ${row.name}`">
              <UiStatusBadge
                :value="row.vacaciones != null ? formatCurrency(row.vacaciones) : 'Sin registrar'"
                :variant="row.vacaciones != null ? 'success' : 'secondary'"
                size="sm"
                format="text"
                class="font-normal"
              />
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
