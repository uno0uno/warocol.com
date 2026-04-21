<script setup lang="ts">
import { ref, computed, onUnmounted, watch, reactive } from 'vue'
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
  dotacion:     any[]
  horasExtras:  any[]
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
        const [primaRes, cesantiasRes, intCesantiasRes, vacacionesRes, dotacionRes, horasExtrasRes] = await Promise.all([
          $fetch<any>(`/api/salaries/employees/${emp.id}/prima`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/cesantias`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/int-cesantias`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/vacaciones`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/dotacion`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/horas-extras`).catch(() => null),
        ])
        newCache[emp.id] = {
          primas:       primaRes?.data       ?? [],
          cesantias:    cesantiasRes?.data    ?? [],
          intCesantias: intCesantiasRes?.data ?? [],
          vacaciones:   vacacionesRes?.data   ?? [],
          dotacion:     dotacionRes?.data     ?? [],
          horasExtras:  horasExtrasRes?.data  ?? [],
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

function getDotacionAmount(id: string): number | null {
  const rec = (cache.value[id]?.dotacion ?? []).find(
    (d: any) => d.year === selectedYear.value && matchMonth(d.payment_date)
  )
  return rec ? Number(rec.total_amount) : null
}

function getHorasExtrasTotal(id: string): number | null {
  const recs = (cache.value[id]?.horasExtras ?? []).filter(
    (h: any) => {
      if (!matchMonth(h.payment_date)) return false
      if (!h.period_month) return true
      return new Date(h.period_month + '-01').getFullYear() === selectedYear.value
    }
  )
  if (!recs.length) return null
  return recs.reduce((sum: number, h: any) => sum + Number(h.total_amount), 0)
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
    dotacion:     getDotacionAmount(emp.id),
    horasExtras:  getHorasExtrasTotal(emp.id),
  }))
})

const mobileBenefitCols = [
  { key: 'primaS1',      label: 'Prima S1',       benefit: 'primaS1'      },
  { key: 'primaS2',      label: 'Prima S2',       benefit: 'primaS2'      },
  { key: 'cesantias',    label: 'Cesantías',      benefit: 'cesantias'    },
  { key: 'intCesantias', label: 'Int. Cesantías', benefit: 'intCesantias' },
  { key: 'vacaciones',   label: 'Vacaciones',     benefit: 'vacaciones'   },
  { key: 'dotacion',     label: 'Dotación',       benefit: 'dotacion'     },
  { key: 'horasExtras',  label: 'H. Extras',      benefit: 'horasExtras'  },
]

const tableColumns = [
  { key: 'name',          title: 'Empleado',       sortable: false },
  { key: 'employmentType',title: 'Tipo',           sortable: false, align: 'center' as const },
  { key: 'primaS1',       title: 'Prima S1',       sortable: false, align: 'center' as const },
  { key: 'primaS2',       title: 'Prima S2',       sortable: false, align: 'center' as const },
  { key: 'cesantias',     title: 'Cesantías',      sortable: false, align: 'center' as const },
  { key: 'intCesantias',  title: 'Int. Cesantías', sortable: false, align: 'center' as const },
  { key: 'vacaciones',    title: 'Vacaciones',     sortable: false, align: 'center' as const },
  { key: 'dotacion',      title: 'Dotación',       sortable: false, align: 'center' as const },
  { key: 'horasExtras',   title: 'H. Extras',      sortable: false, align: 'center' as const },
]

const employmentTypeLabel: Record<string, string> = {
  employee:   'Empleado',
  daily:      'Jornalero',
  contractor: 'Contratista',
}

// ── PILA ──────────────────────────────────────────────────────────────────
const pilaPendingLoading = ref(false)
const pilaPending = ref<any[]>([])
const pilaHistory = ref<any[]>([])
const pilaHistoryLoading = ref(false)
const pilaSubmitting = ref(false)
const pilaError = ref<string | null>(null)
const pilaSuccess = ref<string | null>(null)
const activePilaPeriod = ref<string | null>(null)

const pilaForm = reactive({
  period_month: '',
  employee_ss_amount: 0,
  employer_ss_amount: 0,
  total_amount: 0,
  payment_method: 'transfer',
  payment_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()),
  notes: '',
})

async function loadPilaPending() {
  pilaPendingLoading.value = true
  try {
    const res = await $fetch<any>('/api/salaries/pila/pending')
    pilaPending.value = res?.data ?? []
  } catch {
    pilaPending.value = []
  } finally {
    pilaPendingLoading.value = false
  }
}

async function loadPilaHistory() {
  pilaHistoryLoading.value = true
  try {
    const res = await $fetch<any>('/api/salaries/pila')
    pilaHistory.value = res?.data ?? []
  } catch {
    pilaHistory.value = []
  } finally {
    pilaHistoryLoading.value = false
  }
}

function openPilaForm(period: any) {
  activePilaPeriod.value = period.period_month
  pilaForm.period_month = period.period_month
  pilaForm.employee_ss_amount = Number(period.employee_ss_pending)
  pilaForm.employer_ss_amount = Number(period.employer_ss_pending)
  pilaForm.total_amount = Number(period.total_pending)
  pilaError.value = null
  pilaSuccess.value = null
}

function closePilaForm() {
  activePilaPeriod.value = null
  pilaError.value = null
}

const pilaFormValid = computed(() =>
  pilaForm.period_month !== '' &&
  pilaForm.total_amount > 0 &&
  pilaForm.payment_date !== ''
)

async function submitPila() {
  if (!pilaFormValid.value) return
  pilaSubmitting.value = true
  pilaError.value = null
  pilaSuccess.value = null
  try {
    await $fetch('/api/salaries/pila', {
      method: 'POST',
      body: {
        period_month: pilaForm.period_month,
        employee_ss_amount: pilaForm.employee_ss_amount,
        employer_ss_amount: pilaForm.employer_ss_amount,
        total_amount: pilaForm.total_amount,
        payment_method: pilaForm.payment_method || null,
        payment_date: `${pilaForm.payment_date}T00:00:00`,
        notes: pilaForm.notes || null,
      },
    })
    pilaSuccess.value = `PILA ${pilaForm.period_month} registrada correctamente`
    activePilaPeriod.value = null
    await Promise.all([loadPilaPending(), loadPilaHistory()])
  } catch (err: any) {
    pilaError.value = err?.data?.detail || 'Error al registrar el pago PILA'
  } finally {
    pilaSubmitting.value = false
  }
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function formatPeriodMonth(pm: string): string {
  const [y, m] = pm.split('-')
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`
}

// ── Inline benefit form ────────────────────────────────────────────────────
const TODAY_STR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

const activeCell = ref<{ empId: string; benefit: string } | null>(null)
const cellSubmitting = ref(false)
const cellError = ref<string | null>(null)

const cellForm = reactive({
  payment_date: TODAY_STR,
  payment_method: 'transfer',
  // Prima / Cesantías / Int-Cesantías / Vacaciones
  anio: currentYear,
  semestre: '',
  gross_salary: 0,
  days_worked: 360,
  cesantias_base: 0,
  int_cesantias_amount: 0,
  // Dotación
  period: '',
  year: currentYear,
  total_amount: 0,
  items_description: '',
  // Horas Extras
  period_month: '',
  base_hourly_rate: 0,
  hours_diurna: 0,
  hours_nocturna: 0,
  hours_dominical_diurna: 0,
  hours_dominical_nocturna: 0,
})

function openCellForm(empId: string, benefit: string, row: any) {
  if (activeCell.value?.empId === empId && activeCell.value?.benefit === benefit) {
    closeCellForm()
    return
  }
  activeCell.value = { empId, benefit }
  cellError.value = null
  // Reset all fields
  cellForm.payment_date = TODAY_STR
  cellForm.payment_method = 'transfer'
  cellForm.anio = selectedYear.value
  cellForm.year = selectedYear.value
  cellForm.semestre = benefit === 'primaS1' ? `${selectedYear.value}-S1` : `${selectedYear.value}-S2`
  cellForm.gross_salary = row.calculated_salary ? Number(row.calculated_salary) : 0
  cellForm.base_hourly_rate = row.hourly_rate ? Number(row.hourly_rate) : 0
  cellForm.days_worked = 360
  cellForm.total_amount = 0
  cellForm.period = ''
  cellForm.items_description = ''
  cellForm.period_month = ''
  cellForm.hours_diurna = 0
  cellForm.hours_nocturna = 0
  cellForm.hours_dominical_diurna = 0
  cellForm.hours_dominical_nocturna = 0
  cellForm.cesantias_base = 0
  cellForm.int_cesantias_amount = 0
}

function closeCellForm() {
  activeCell.value = null
  cellError.value = null
}

const cellComputedTotal = computed(() => {
  const r = cellForm.base_hourly_rate || 0
  return Math.round(
    (cellForm.hours_diurna || 0) * r * 1.25 +
    (cellForm.hours_nocturna || 0) * r * 1.75 +
    (cellForm.hours_dominical_diurna || 0) * r * 2.0 +
    (cellForm.hours_dominical_nocturna || 0) * r * 2.5
  )
})

const cellIntCesantiasPreview = computed(() =>
  cellForm.cesantias_base ? Math.round(cellForm.cesantias_base * 0.12) : 0
)

const BENEFIT_LABELS: Record<string, string> = {
  primaS1:      'Prima de Servicios — S1',
  primaS2:      'Prima de Servicios — S2',
  cesantias:    'Cesantías',
  intCesantias: 'Intereses sobre Cesantías',
  vacaciones:   'Vacaciones',
  dotacion:     'Dotación',
  horasExtras:  'Horas Extras',
}

const showBenefitModal = computed({
  get: () => activeCell.value !== null,
  set: (v) => { if (!v) closeCellForm() },
})

const modalTitle = computed(() => {
  if (!activeCell.value) return ''
  const label = BENEFIT_LABELS[activeCell.value.benefit] ?? activeCell.value.benefit
  const emp = allEmployeesRaw.value.find((e: any) => e.id === activeCell.value!.empId)
  return emp ? `${label} — ${emp.name}` : label
})

async function submitCellForm() {
  if (!activeCell.value) return
  const { empId, benefit } = activeCell.value
  cellSubmitting.value = true
  cellError.value = null
  try {
    const BASE = `/api/salaries/employees/${empId}`
    if (benefit === 'primaS1' || benefit === 'primaS2') {
      await $fetch(`${BASE}/prima`, {
        method: 'POST',
        body: {
          semestre: cellForm.semestre,
          gross_salary: cellForm.gross_salary,
          days_worked: cellForm.days_worked || 360,
          payment_method: cellForm.payment_method || null,
          payment_date: `${cellForm.payment_date}T00:00:00`,
        },
      })
    } else if (benefit === 'cesantias') {
      await $fetch(`${BASE}/cesantias`, {
        method: 'POST',
        body: {
          anio: cellForm.anio,
          gross_salary: cellForm.gross_salary,
          days_worked: cellForm.days_worked || 360,
          payment_method: cellForm.payment_method || null,
          payment_date: `${cellForm.payment_date}T00:00:00`,
        },
      })
    } else if (benefit === 'intCesantias') {
      await $fetch(`${BASE}/int-cesantias`, {
        method: 'POST',
        body: {
          anio: cellForm.anio,
          cesantias_base: cellForm.cesantias_base,
          int_cesantias_amount: cellForm.int_cesantias_amount || null,
          payment_method: cellForm.payment_method || null,
          payment_date: `${cellForm.payment_date}T00:00:00`,
        },
      })
    } else if (benefit === 'vacaciones') {
      await $fetch(`${BASE}/vacaciones`, {
        method: 'POST',
        body: {
          anio: cellForm.anio,
          gross_salary: cellForm.gross_salary,
          days_worked: cellForm.days_worked || 360,
          payment_method: cellForm.payment_method || null,
          payment_date: `${cellForm.payment_date}T00:00:00`,
        },
      })
    } else if (benefit === 'dotacion') {
      await $fetch(`${BASE}/dotacion`, {
        method: 'POST',
        body: {
          period: cellForm.period,
          year: cellForm.year,
          total_amount: cellForm.total_amount,
          items_description: cellForm.items_description || null,
          payment_date: `${cellForm.payment_date}T00:00:00`,
        },
      })
    } else if (benefit === 'horasExtras') {
      await $fetch(`${BASE}/horas-extras`, {
        method: 'POST',
        body: {
          period_month: cellForm.period_month,
          base_hourly_rate: cellForm.base_hourly_rate,
          hours_diurna: cellForm.hours_diurna || 0,
          hours_nocturna: cellForm.hours_nocturna || 0,
          hours_dominical_diurna: cellForm.hours_dominical_diurna || 0,
          hours_dominical_nocturna: cellForm.hours_dominical_nocturna || 0,
          payment_method: cellForm.payment_method || null,
          payment_date: `${cellForm.payment_date}T00:00:00`,
        },
      })
    }
    // Refresh only this employee's benefits
    const emp = allEmployeesRaw.value.find((e: any) => e.id === empId)
    if (emp) await loadBenefits([emp])
    closeCellForm()
  } catch (err: any) {
    cellError.value = err?.data?.detail || 'Error al registrar. Intente de nuevo.'
  } finally {
    cellSubmitting.value = false
  }
}

onMounted(() => {
  loadPilaPending()
  loadPilaHistory()
})

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
                  <span v-if="col.benefit === 'dotacion' && item.employment_type !== 'employee'" class="text-xs text-text-tertiary">N/A</span>
                  <button
                    v-else-if="item[col.key] == null || col.benefit === 'horasExtras'"
                    class="text-left focus:outline-none focus:ring-2 focus:ring-primary rounded min-h-[44px] flex items-center"
                    :aria-label="`${item[col.key] != null ? 'Agregar más ' : 'Registrar '}${col.label} — ${item.name}`"
                    @click="openCellForm(item.id, col.benefit, item)"
                  >
                    <UiStatusBadge
                      :value="item[col.key] != null ? formatCurrency(item[col.key]) : 'Sin registrar'"
                      :variant="item[col.key] != null ? 'success' : 'secondary'"
                      size="sm"
                    />
                  </button>
                  <UiStatusBadge
                    v-else
                    :value="formatCurrency(item[col.key])"
                    variant="success"
                    size="sm"
                  />
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
            <button
              v-if="row.primaS1 == null"
              class="focus:outline-none focus:ring-2 focus:ring-primary rounded"
              :aria-label="`Registrar Prima S1 ${selectedYear} — ${row.name}`"
              @click="openCellForm(row.id, 'primaS1', row)"
            >
              <UiStatusBadge value="Sin registrar" variant="secondary" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.primaS1)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Prima S2 -->
          <template #cell-primaS2="{ row }">
            <button
              v-if="row.primaS2 == null"
              class="focus:outline-none focus:ring-2 focus:ring-primary rounded"
              :aria-label="`Registrar Prima S2 ${selectedYear} — ${row.name}`"
              @click="openCellForm(row.id, 'primaS2', row)"
            >
              <UiStatusBadge value="Sin registrar" variant="secondary" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.primaS2)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Cesantías -->
          <template #cell-cesantias="{ row }">
            <button
              v-if="row.cesantias == null"
              class="focus:outline-none focus:ring-2 focus:ring-primary rounded"
              :aria-label="`Registrar Cesantías ${selectedYear} — ${row.name}`"
              @click="openCellForm(row.id, 'cesantias', row)"
            >
              <UiStatusBadge value="Sin registrar" variant="secondary" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.cesantias)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Int. Cesantías -->
          <template #cell-intCesantias="{ row }">
            <button
              v-if="row.intCesantias == null"
              class="focus:outline-none focus:ring-2 focus:ring-primary rounded"
              :aria-label="`Registrar Int. Cesantías ${selectedYear} — ${row.name}`"
              @click="openCellForm(row.id, 'intCesantias', row)"
            >
              <UiStatusBadge value="Sin registrar" variant="secondary" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.intCesantias)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Vacaciones -->
          <template #cell-vacaciones="{ row }">
            <button
              v-if="row.vacaciones == null"
              class="focus:outline-none focus:ring-2 focus:ring-primary rounded"
              :aria-label="`Registrar Vacaciones ${selectedYear} — ${row.name}`"
              @click="openCellForm(row.id, 'vacaciones', row)"
            >
              <UiStatusBadge value="Sin registrar" variant="secondary" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.vacaciones)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Dotación -->
          <template #cell-dotacion="{ row }">
            <span v-if="row.employment_type !== 'employee'" class="text-xs text-text-tertiary px-2">N/A</span>
            <template v-else>
              <button
                v-if="row.dotacion == null"
                class="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                :aria-label="`Registrar Dotación ${selectedYear} — ${row.name}`"
                @click="openCellForm(row.id, 'dotacion', row)"
              >
                <UiStatusBadge value="Sin registrar" variant="secondary" size="sm" format="text" class="font-normal" />
              </button>
              <UiStatusBadge v-else :value="formatCurrency(row.dotacion)" variant="success" size="sm" format="text" class="font-normal" />
            </template>
          </template>

          <!-- Horas Extras (always clickable to add more) -->
          <template #cell-horasExtras="{ row }">
            <button
              class="focus:outline-none focus:ring-2 focus:ring-primary rounded"
              :aria-label="`${row.horasExtras != null ? 'Agregar más horas extras' : 'Registrar Horas Extras'} — ${row.name}`"
              @click="openCellForm(row.id, 'horasExtras', row)"
            >
              <UiStatusBadge
                :value="row.horasExtras != null ? formatCurrency(row.horasExtras) : 'Agregar'"
                :variant="row.horasExtras != null ? 'success' : 'secondary'"
                size="sm"
                format="text"
                class="font-normal"
              />
            </button>
          </template>

        </UiResponsiveDataView>
      </HealthSemaphore>

      <!-- ── Benefit Registration Modal (desktop) ──────────────────────── -->
      <UiModal v-model="showBenefitModal" :title="modalTitle" max-height="md">
        <form v-if="activeCell" class="p-6 space-y-4 overflow-y-auto max-h-[70vh]" @submit.prevent="submitCellForm" novalidate>
          <template v-if="activeCell.benefit === 'primaS1' || activeCell.benefit === 'primaS2'">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Salario base *</label>
                <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                  <input v-model.number="cellForm.gross_salary" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2" /></div>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Días trabajados</label>
                <input v-model.number="cellForm.days_worked" type="number" min="1" max="180" step="1" class="input-base w-full px-3 py-2" placeholder="180" />
              </div>
            </div>
          </template>
          <template v-else-if="activeCell.benefit === 'cesantias' || activeCell.benefit === 'vacaciones'">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Salario base *</label>
                <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                  <input v-model.number="cellForm.gross_salary" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2" /></div>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Días trabajados</label>
                <input v-model.number="cellForm.days_worked" type="number" min="1" max="360" step="1" class="input-base w-full px-3 py-2" placeholder="360" />
              </div>
            </div>
          </template>
          <template v-else-if="activeCell.benefit === 'intCesantias'">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Base cesantías *</label>
                <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                  <input v-model.number="cellForm.cesantias_base" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2" /></div>
                <p class="text-xs text-text-tertiary mt-0.5">Saldo cesantías sobre el cual se calcula el 12%</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Calculado (12%)</label>
                <div class="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span class="font-bold text-emerald-700">{{ formatCurrency(cellIntCesantiasPreview) }}</span>
                </div>
              </div>
            </div>
          </template>
          <template v-else-if="activeCell.benefit === 'dotacion'">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Período *</label>
                <select v-model="cellForm.period" required class="input-base w-full px-3 py-2">
                  <option value="" disabled>Seleccionar</option>
                  <option value="Abr">Abril (antes 30 Abr)</option>
                  <option value="Ago">Agosto (antes 31 Ago)</option>
                  <option value="Dic">Diciembre (antes 20 Dic)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Valor total *</label>
                <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                  <input v-model.number="cellForm.total_amount" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2" /></div>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Artículos entregados</label>
              <textarea v-model="cellForm.items_description" class="input-base w-full px-3 py-2 min-h-[60px]" placeholder="Ej: 2 camisas, 1 pantalón..." />
            </div>
          </template>
          <template v-else-if="activeCell.benefit === 'horasExtras'">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Período (mes) *</label>
              <input v-model="cellForm.period_month" type="month" required class="input-base w-full px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Tarifa horaria base *</label>
              <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                <input v-model.number="cellForm.base_hourly_rate" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Diurnas (×1.25)</label>
                <input v-model.number="cellForm.hours_diurna" type="number" min="0" step="0.5" class="input-base w-full px-3 py-2" placeholder="0" />
                <p v-if="cellForm.hours_diurna > 0 && cellForm.base_hourly_rate > 0" class="text-xs text-emerald-700 mt-0.5">= {{ formatCurrency(Math.round(cellForm.hours_diurna * cellForm.base_hourly_rate * 1.25)) }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Nocturnas (×1.75)</label>
                <input v-model.number="cellForm.hours_nocturna" type="number" min="0" step="0.5" class="input-base w-full px-3 py-2" placeholder="0" />
                <p v-if="cellForm.hours_nocturna > 0 && cellForm.base_hourly_rate > 0" class="text-xs text-emerald-700 mt-0.5">= {{ formatCurrency(Math.round(cellForm.hours_nocturna * cellForm.base_hourly_rate * 1.75)) }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Dom/festivo diurna (×2.00)</label>
                <input v-model.number="cellForm.hours_dominical_diurna" type="number" min="0" step="0.5" class="input-base w-full px-3 py-2" placeholder="0" />
                <p v-if="cellForm.hours_dominical_diurna > 0 && cellForm.base_hourly_rate > 0" class="text-xs text-emerald-700 mt-0.5">= {{ formatCurrency(Math.round(cellForm.hours_dominical_diurna * cellForm.base_hourly_rate * 2.0)) }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">Dom/festivo nocturna (×2.50)</label>
                <input v-model.number="cellForm.hours_dominical_nocturna" type="number" min="0" step="0.5" class="input-base w-full px-3 py-2" placeholder="0" />
                <p v-if="cellForm.hours_dominical_nocturna > 0 && cellForm.base_hourly_rate > 0" class="text-xs text-emerald-700 mt-0.5">= {{ formatCurrency(Math.round(cellForm.hours_dominical_nocturna * cellForm.base_hourly_rate * 2.5)) }}</p>
              </div>
            </div>
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <p class="text-sm text-text-secondary">Total calculado</p>
              <p class="text-xl font-bold text-emerald-700">{{ formatCurrency(cellComputedTotal) }}</p>
            </div>
          </template>

          <!-- Shared: payment method + date -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Método de pago</label>
              <select v-model="cellForm.payment_method" class="input-base w-full px-3 py-2">
                <option value="transfer">Transferencia</option>
                <option value="cash">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
                <option value="check">Cheque</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Fecha de pago *</label>
              <input v-model="cellForm.payment_date" type="date" required class="input-base w-full px-3 py-2" />
            </div>
          </div>

          <!-- Error -->
          <div v-if="cellError" role="alert" class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-sm text-red-700">{{ cellError }}</p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="cellSubmitting"
              class="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold min-h-[44px]"
            >
              <CommonsTheCustomLoader v-if="cellSubmitting" size="small" />
              <span>{{ cellSubmitting ? 'Registrando...' : 'Registrar' }}</span>
            </button>
            <button type="button" @click="closeCellForm" class="px-4 py-2.5 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors min-h-[44px]">
              Cancelar
            </button>
          </div>
        </form>
      </UiModal>

      <!-- ── Benefit Registration Sheet (mobile) ───────────────────────── -->
      <UiBottomSheetModal v-model="showBenefitModal" :title="modalTitle">
        <form v-if="activeCell" class="p-4 space-y-4 overflow-y-auto max-h-[75vh]" @submit.prevent="submitCellForm" novalidate>
          <template v-if="activeCell.benefit === 'primaS1' || activeCell.benefit === 'primaS2'">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Salario base *</label>
              <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                <input v-model.number="cellForm.gross_salary" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2" /></div>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Días trabajados (≤180)</label>
              <input v-model.number="cellForm.days_worked" type="number" min="1" max="180" step="1" class="input-base w-full px-3 py-2" placeholder="180" />
            </div>
          </template>
          <template v-else-if="activeCell.benefit === 'cesantias' || activeCell.benefit === 'vacaciones'">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Salario base *</label>
              <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                <input v-model.number="cellForm.gross_salary" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2" /></div>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Días trabajados (≤360)</label>
              <input v-model.number="cellForm.days_worked" type="number" min="1" max="360" step="1" class="input-base w-full px-3 py-2" placeholder="360" />
            </div>
          </template>
          <template v-else-if="activeCell.benefit === 'intCesantias'">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Base cesantías *</label>
              <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                <input v-model.number="cellForm.cesantias_base" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2" /></div>
              <p class="text-xs text-text-tertiary mt-0.5">Intereses = base × 12%</p>
            </div>
            <div v-if="cellIntCesantiasPreview > 0" class="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
              <span class="font-bold text-emerald-700">{{ formatCurrency(cellIntCesantiasPreview) }}</span>
            </div>
          </template>
          <template v-else-if="activeCell.benefit === 'dotacion'">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Período *</label>
              <select v-model="cellForm.period" required class="input-base w-full px-3 py-2">
                <option value="" disabled>Seleccionar</option>
                <option value="Abr">Abril</option>
                <option value="Ago">Agosto</option>
                <option value="Dic">Diciembre</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Valor total *</label>
              <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                <input v-model.number="cellForm.total_amount" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2" /></div>
            </div>
          </template>
          <template v-else-if="activeCell.benefit === 'horasExtras'">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Período (mes) *</label>
              <input v-model="cellForm.period_month" type="month" required class="input-base w-full px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Tarifa horaria base *</label>
              <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                <input v-model.number="cellForm.base_hourly_rate" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-text-primary mb-1">Diurnas (×1.25)</label>
                <input v-model.number="cellForm.hours_diurna" type="number" min="0" step="0.5" class="input-base w-full px-3 py-2" placeholder="0" />
              </div>
              <div>
                <label class="block text-xs font-medium text-text-primary mb-1">Nocturnas (×1.75)</label>
                <input v-model.number="cellForm.hours_nocturna" type="number" min="0" step="0.5" class="input-base w-full px-3 py-2" placeholder="0" />
              </div>
              <div>
                <label class="block text-xs font-medium text-text-primary mb-1">Dom. diurna (×2.00)</label>
                <input v-model.number="cellForm.hours_dominical_diurna" type="number" min="0" step="0.5" class="input-base w-full px-3 py-2" placeholder="0" />
              </div>
              <div>
                <label class="block text-xs font-medium text-text-primary mb-1">Dom. nocturna (×2.50)</label>
                <input v-model.number="cellForm.hours_dominical_nocturna" type="number" min="0" step="0.5" class="input-base w-full px-3 py-2" placeholder="0" />
              </div>
            </div>
            <div v-if="cellComputedTotal > 0" class="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">
              <p class="text-xs text-text-secondary">Total</p>
              <p class="font-bold text-emerald-700">{{ formatCurrency(cellComputedTotal) }}</p>
            </div>
          </template>

          <!-- Shared: payment method + date -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Método</label>
              <select v-model="cellForm.payment_method" class="input-base w-full px-3 py-2">
                <option value="transfer">Transferencia</option>
                <option value="cash">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
                <option value="check">Cheque</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Fecha *</label>
              <input v-model="cellForm.payment_date" type="date" required class="input-base w-full px-3 py-2" />
            </div>
          </div>

          <!-- Error -->
          <div v-if="cellError" role="alert" class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-sm text-red-700">{{ cellError }}</p>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-2 pb-safe">
            <button
              type="submit"
              :disabled="cellSubmitting"
              class="flex-1 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold min-h-[44px]"
            >
              <CommonsTheCustomLoader v-if="cellSubmitting" size="small" />
              <span>{{ cellSubmitting ? 'Registrando...' : 'Registrar' }}</span>
            </button>
            <button type="button" @click="closeCellForm" class="px-4 py-3 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary min-h-[44px]">
              Cancelar
            </button>
          </div>
        </form>
      </UiBottomSheetModal>

      <!-- ── PILA Section ──────────────────────────────────────────────── -->
      <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-semibold text-text-primary">Pago PILA</h3>
            <p class="text-sm text-text-secondary mt-0.5">Seguridad social — liquidar cuentas 237005 y 237010</p>
          </div>
          <svg class="w-6 h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <!-- Pending periods -->
        <div v-if="pilaPendingLoading" class="space-y-2 animate-pulse mb-4">
          <div v-for="i in 2" :key="i" class="h-16 rounded-lg bg-titan-200" />
        </div>

        <div v-else-if="pilaPending.length === 0" class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4 flex items-center gap-3">
          <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <p class="text-sm text-emerald-800 font-medium">Sin PILA pendiente — todas las cuentas SS están saldadas</p>
        </div>

        <div v-else class="space-y-2 mb-4">
          <p class="text-sm text-text-secondary mb-2">Períodos con saldo SS pendiente:</p>

          <div
            v-for="period in pilaPending"
            :key="period.period_month"
            class="border-2 rounded-xl overflow-hidden transition-colors"
            :class="activePilaPeriod === period.period_month ? 'border-primary' : 'border-border'"
          >
            <!-- Period header row -->
            <button
              class="w-full flex items-center justify-between p-4 hover:bg-background transition-colors text-left min-h-[44px]"
              :class="activePilaPeriod === period.period_month ? 'bg-primary/5' : ''"
              @click="activePilaPeriod === period.period_month ? closePilaForm() : openPilaForm(period)"
              :aria-expanded="activePilaPeriod === period.period_month"
              :aria-label="`Pagar PILA de ${formatPeriodMonth(period.period_month)}`"
            >
              <div class="flex items-center gap-4">
                <span class="font-semibold text-text-primary">{{ formatPeriodMonth(period.period_month) }}</span>
                <div class="flex items-center gap-3 text-sm text-text-secondary">
                  <span>Empleado: <strong class="text-text-primary">{{ formatCurrency(Number(period.employee_ss_pending)) }}</strong></span>
                  <span>Empleador: <strong class="text-text-primary">{{ formatCurrency(Number(period.employer_ss_pending)) }}</strong></span>
                </div>
              </div>
              <div class="flex items-center gap-3 flex-shrink-0">
                <span class="text-lg font-bold text-amber-600">{{ formatCurrency(Number(period.total_pending)) }}</span>
                <svg
                  class="w-4 h-4 text-text-secondary transition-transform"
                  :class="activePilaPeriod === period.period_month ? 'rotate-180' : ''"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            <!-- Inline payment form -->
            <div v-if="activePilaPeriod === period.period_month" class="border-t border-border p-4 bg-background">
              <form @submit.prevent="submitPila" novalidate>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <!-- Employee SS -->
                  <div>
                    <label for="pila-emp-ss" class="block text-sm font-medium text-text-primary mb-1">Aporte empleado (237005)</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                      <input
                        id="pila-emp-ss"
                        v-model.number="pilaForm.employee_ss_amount"
                        type="number" min="0" step="any"
                        class="input-base w-full pl-7 pr-3 py-2"
                        aria-label="Aporte seguridad social empleado"
                      />
                    </div>
                  </div>

                  <!-- Employer SS -->
                  <div>
                    <label for="pila-er-ss" class="block text-sm font-medium text-text-primary mb-1">Aporte empleador (237010)</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                      <input
                        id="pila-er-ss"
                        v-model.number="pilaForm.employer_ss_amount"
                        type="number" min="0" step="any"
                        class="input-base w-full pl-7 pr-3 py-2"
                        aria-label="Aporte seguridad social empleador"
                      />
                    </div>
                  </div>

                  <!-- Total -->
                  <div>
                    <label for="pila-total" class="block text-sm font-medium text-text-primary mb-1">Total PILA *</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                      <input
                        id="pila-total"
                        v-model.number="pilaForm.total_amount"
                        type="number" min="1" step="any" required
                        class="input-base w-full pl-7 pr-3 py-2 font-semibold"
                        aria-label="Total pago PILA"
                      />
                    </div>
                    <p class="text-xs text-text-tertiary mt-0.5">Puede diferir si incluye recargos</p>
                  </div>

                  <!-- Payment method -->
                  <div>
                    <label for="pila-method" class="block text-sm font-medium text-text-primary mb-1">Método de pago</label>
                    <select
                      id="pila-method"
                      v-model="pilaForm.payment_method"
                      class="input-base w-full px-3 py-2"
                      aria-label="Método de pago PILA"
                    >
                      <option value="transfer">Transferencia</option>
                      <option value="cash">Efectivo</option>
                      <option value="check">Cheque</option>
                    </select>
                  </div>

                  <!-- Date -->
                  <div>
                    <label for="pila-date" class="block text-sm font-medium text-text-primary mb-1">Fecha de pago *</label>
                    <input
                      id="pila-date"
                      v-model="pilaForm.payment_date"
                      type="date" required
                      class="input-base w-full px-3 py-2"
                      aria-label="Fecha de pago PILA"
                    />
                  </div>

                  <!-- Notes -->
                  <div>
                    <label for="pila-notes" class="block text-sm font-medium text-text-primary mb-1">Notas</label>
                    <input
                      id="pila-notes"
                      v-model="pilaForm.notes"
                      type="text"
                      class="input-base w-full px-3 py-2"
                      placeholder="Número de planilla PILA (opcional)"
                      aria-label="Notas adicionales PILA"
                    />
                  </div>
                </div>

                <!-- Error -->
                <div v-if="pilaError" role="alert" class="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p class="text-sm text-red-700">{{ pilaError }}</p>
                </div>

                <!-- Actions -->
                <div class="flex gap-3 mt-4">
                  <button
                    type="submit"
                    :disabled="pilaSubmitting || !pilaFormValid"
                    class="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold min-h-[44px]"
                  >
                    <CommonsTheCustomLoader v-if="pilaSubmitting" size="small" />
                    <span>{{ pilaSubmitting ? 'Registrando...' : 'Registrar PILA' }}</span>
                  </button>
                  <button
                    type="button"
                    @click="closePilaForm"
                    class="px-4 py-2.5 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors min-h-[44px]"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Success banner -->
        <div v-if="pilaSuccess" role="status" class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <p class="text-sm text-emerald-800">{{ pilaSuccess }}</p>
        </div>

        <!-- PILA History -->
        <div v-if="pilaHistory.length > 0">
          <h4 class="text-sm font-semibold text-text-primary mb-2">Historial de pagos PILA</h4>
          <div v-if="pilaHistoryLoading" class="space-y-2 animate-pulse">
            <div v-for="i in 3" :key="i" class="h-10 rounded bg-titan-200" />
          </div>
          <div v-else class="space-y-1">
            <div
              v-for="p in pilaHistory"
              :key="p.id"
              class="flex items-center justify-between px-4 py-2.5 bg-background border border-border rounded-lg text-sm"
            >
              <span class="font-medium text-text-primary">{{ formatPeriodMonth(p.period_month) }}</span>
              <div class="flex items-center gap-4 text-text-secondary">
                <span>{{ new Date(p.payment_date).toLocaleDateString('es-CO') }}</span>
                <span class="font-semibold text-text-primary">{{ formatCurrency(Number(p.total_amount)) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
