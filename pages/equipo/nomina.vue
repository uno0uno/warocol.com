<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
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
    // Merge into existing cache instead of replacing (so partial refresh doesn't wipe other employees)
    cache.value = { ...cache.value, ...newCache }
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
const tableData = computed(() => {
  let list = allEmployeesRaw.value

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
  { key: 'select',        title: '',               sortable: false, align: 'center' as const },
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

// ── Bulk selection ────────────────────────────────────────────────────────
const selectedEmpIds = ref<string[]>([])

const allPageSelected = computed(() => {
  if (!tableData.value.length) return false
  return tableData.value.every(r => selectedEmpIds.value.includes(r.id))
})

function toggleSelect(id: string) {
  const idx = selectedEmpIds.value.indexOf(id)
  if (idx === -1) {
    selectedEmpIds.value = [...selectedEmpIds.value, id]
    initSlideData(id)
  } else {
    selectedEmpIds.value = selectedEmpIds.value.filter(i => i !== id)
  }
}

function toggleSelectAll() {
  if (allPageSelected.value) {
    selectedEmpIds.value = []
  } else {
    selectedEmpIds.value = tableData.value.map(r => r.id)
    tableData.value.forEach(r => initSlideData(r.id))
  }
}

function clearSelection() {
  selectedEmpIds.value = []
  slideError.value = null
  slideSuccess.value = null
}

// ── Slide-over state ──────────────────────────────────────────────────────
const TODAY_STR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

const slideDate    = ref(TODAY_STR)
const slideMethod  = ref('transfer')
const isSlideSubmitting = ref(false)
const slideError   = ref<string | null>(null)
const slideSuccess = ref<string | null>(null)

type EmpSlideData = {
  gross_salary: number
  days_worked: number
  cesantias_base: number
  int_cesantias_amount: number
  dot_period: string
  dot_year: number
  dot_total: number
  dot_items: string
  period_month: string
  base_hourly_rate: number
  hours_diurna: number
  hours_nocturna: number
  hours_dominical_diurna: number
  hours_dominical_nocturna: number
}

const slideData = ref<Record<string, EmpSlideData>>({})

function initSlideData(empId: string) {
  if (slideData.value[empId]) return
  const row = tableData.value.find(r => r.id === empId)
  slideData.value = {
    ...slideData.value,
    [empId]: {
      gross_salary: row?.calculated_salary ? Number(row.calculated_salary) : 0,
      days_worked: 360,
      cesantias_base: 0,
      int_cesantias_amount: 0,
      dot_period: '',
      dot_year: selectedYear.value,
      dot_total: 0,
      dot_items: '',
      period_month: '',
      base_hourly_rate: row?.hourly_rate ? Number(row.hourly_rate) : 0,
      hours_diurna: 0,
      hours_nocturna: 0,
      hours_dominical_diurna: 0,
      hours_dominical_nocturna: 0,
    },
  }
}

const selectedEmployeeRows = computed(() =>
  selectedEmpIds.value
    .map(id => tableData.value.find(r => r.id === id))
    .filter(Boolean) as (typeof tableData.value)[number][]
)

function horasExtrasTotal(empId: string): number {
  const d = slideData.value[empId]
  if (!d) return 0
  const r = d.base_hourly_rate || 0
  return Math.round(
    (d.hours_diurna || 0) * r * 1.25 +
    (d.hours_nocturna || 0) * r * 1.75 +
    (d.hours_dominical_diurna || 0) * r * 2.0 +
    (d.hours_dominical_nocturna || 0) * r * 2.5
  )
}

function intCesantiasPreview(empId: string): number {
  const d = slideData.value[empId]
  return d?.cesantias_base ? Math.round(d.cesantias_base * 0.12) : 0
}

async function submitBulk() {
  isSlideSubmitting.value = true
  slideError.value = null
  slideSuccess.value = null
  const affectedEmpIds = new Set<string>()
  const errors: string[] = []

  await Promise.all(
    selectedEmployeeRows.value.map(async (row) => {
      const empId = row.id
      const d = slideData.value[empId]
      if (!d) return
      const BASE = `/api/salaries/employees/${empId}`
      const pd = `${slideDate.value}T00:00:00`
      const pm = slideMethod.value || null
      const tasks: Promise<void>[] = []

      if (row.primaS1 == null) {
        tasks.push(
          $fetch(`${BASE}/prima`, { method: 'POST', body: { semestre: `${selectedYear.value}-S1`, gross_salary: d.gross_salary, days_worked: d.days_worked || 180, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Prima S1: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      if (row.primaS2 == null) {
        tasks.push(
          $fetch(`${BASE}/prima`, { method: 'POST', body: { semestre: `${selectedYear.value}-S2`, gross_salary: d.gross_salary, days_worked: d.days_worked || 180, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Prima S2: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      if (row.cesantias == null) {
        tasks.push(
          $fetch(`${BASE}/cesantias`, { method: 'POST', body: { anio: selectedYear.value, gross_salary: d.gross_salary, days_worked: d.days_worked || 360, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Cesantías: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      if (row.intCesantias == null && d.cesantias_base > 0) {
        tasks.push(
          $fetch(`${BASE}/int-cesantias`, { method: 'POST', body: { anio: selectedYear.value, cesantias_base: d.cesantias_base, int_cesantias_amount: d.int_cesantias_amount || null, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Int. Cesantías: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      if (row.vacaciones == null) {
        tasks.push(
          $fetch(`${BASE}/vacaciones`, { method: 'POST', body: { anio: selectedYear.value, gross_salary: d.gross_salary, days_worked: d.days_worked || 360, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Vacaciones: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      if (row.dotacion == null && row.employment_type === 'employee' && d.dot_period && d.dot_total > 0) {
        tasks.push(
          $fetch(`${BASE}/dotacion`, { method: 'POST', body: { period: d.dot_period, year: d.dot_year, total_amount: d.dot_total, items_description: d.dot_items || null, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Dotación: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      const totalHrs = (d.hours_diurna || 0) + (d.hours_nocturna || 0) + (d.hours_dominical_diurna || 0) + (d.hours_dominical_nocturna || 0)
      if (totalHrs > 0 && d.period_month && d.base_hourly_rate > 0) {
        tasks.push(
          $fetch(`${BASE}/horas-extras`, { method: 'POST', body: { period_month: d.period_month, base_hourly_rate: d.base_hourly_rate, hours_diurna: d.hours_diurna || 0, hours_nocturna: d.hours_nocturna || 0, hours_dominical_diurna: d.hours_dominical_diurna || 0, hours_dominical_nocturna: d.hours_dominical_nocturna || 0, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Horas Extras: ${e?.data?.detail ?? 'error'}`) })
        )
      }

      await Promise.all(tasks)
    })
  )

  if (affectedEmpIds.size > 0) {
    const emps = allEmployeesRaw.value.filter((e: any) => affectedEmpIds.has(e.id))
    await loadBenefits(emps)
  }

  isSlideSubmitting.value = false

  if (errors.length > 0) {
    slideError.value = errors.join('\n')
  } else {
    slideSuccess.value = 'Prestaciones registradas correctamente'
    selectedEmpIds.value = []
    slideData.value = {}
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

      <!-- Bulk action bar -->
      <Transition name="slide-down">
        <div v-if="selectedEmpIds.length > 0" class="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border-2 border-primary rounded-xl">
          <span class="text-sm font-semibold text-primary">{{ selectedEmpIds.length }} empleado(s) seleccionado(s)</span>
          <button @click="clearSelection" class="ml-auto text-xs text-text-secondary hover:text-text-primary underline">Deseleccionar</button>
          <span class="text-xs text-text-secondary">→ Complete el panel de la derecha para registrar</span>
        </div>
      </Transition>

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
              :class="[index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30', selectedEmpIds.includes(item.id) ? 'ring-2 ring-primary ring-inset' : '']"
            >
              <!-- Employee header with checkbox -->
              <div class="flex items-center gap-2">
                <label class="cursor-pointer flex-shrink-0">
                  <input type="checkbox" class="sr-only peer" :checked="selectedEmpIds.includes(item.id)" @change="toggleSelect(item.id)" />
                  <span class="w-5 h-5 rounded-[5px] border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center text-white">
                    <svg v-if="selectedEmpIds.includes(item.id)" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
                      <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                </label>
                <NuxtLink :to="`/equipo/salarios/${item.id}`" class="flex items-center gap-2 flex-1">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                    :style="{ backgroundColor: item.color }"
                  >{{ item.initials }}</div>
                  <div>
                    <p class="text-sm font-semibold text-text-primary leading-tight">{{ item.name }}</p>
                    <UiStatusBadge :value="employmentTypeLabel[item.employment_type] ?? item.employment_type" variant="secondary" size="sm" class="mt-0.5" />
                  </div>
                </NuxtLink>
              </div>

              <!-- Benefits grid -->
              <div class="grid grid-cols-2 gap-1.5 pl-7">
                <div v-for="col in mobileBenefitCols" :key="col.key" class="flex flex-col gap-0.5">
                  <span class="text-xs text-text-secondary">{{ col.label }}</span>
                  <span v-if="col.benefit === 'dotacion' && item.employment_type !== 'employee'" class="text-xs text-text-tertiary">N/A</span>
                  <UiStatusBadge
                    v-else
                    :value="item[col.key] != null ? formatCurrency(item[col.key]) : (col.benefit === 'horasExtras' ? 'Agregar' : 'Pendiente')"
                    :variant="item[col.key] != null ? 'success' : 'secondary'"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </template>

          <!-- ── Desktop: select-all header ─────────────────────────────── -->
          <template #header-select>
            <label class="cursor-pointer">
              <input type="checkbox" class="sr-only peer" :checked="allPageSelected" @change="toggleSelectAll" />
              <span class="w-5 h-5 rounded-[5px] border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center text-white">
                <svg v-if="allPageSelected" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </label>
          </template>

          <!-- ── Desktop: per-row checkbox ──────────────────────────────── -->
          <template #cell-select="{ row }">
            <label class="cursor-pointer">
              <input type="checkbox" class="sr-only peer" :checked="selectedEmpIds.includes(row.id)" @change="toggleSelect(row.id)" />
              <span class="w-5 h-5 rounded-[5px] border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center text-white">
                <svg v-if="selectedEmpIds.includes(row.id)" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </label>
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
            <button v-if="row.primaS1 == null" class="focus:outline-none focus:ring-2 focus:ring-primary rounded" @click="toggleSelect(row.id)" :aria-label="`Seleccionar ${row.name}`">
              <UiStatusBadge value="Pendiente" variant="secondary" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.primaS1)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Prima S2 -->
          <template #cell-primaS2="{ row }">
            <button v-if="row.primaS2 == null" class="focus:outline-none focus:ring-2 focus:ring-primary rounded" @click="toggleSelect(row.id)" :aria-label="`Seleccionar ${row.name}`">
              <UiStatusBadge value="Pendiente" variant="secondary" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.primaS2)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Cesantías -->
          <template #cell-cesantias="{ row }">
            <button v-if="row.cesantias == null" class="focus:outline-none focus:ring-2 focus:ring-primary rounded" @click="toggleSelect(row.id)" :aria-label="`Seleccionar ${row.name}`">
              <UiStatusBadge value="Pendiente" variant="secondary" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.cesantias)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Int. Cesantías -->
          <template #cell-intCesantias="{ row }">
            <button v-if="row.intCesantias == null" class="focus:outline-none focus:ring-2 focus:ring-primary rounded" @click="toggleSelect(row.id)" :aria-label="`Seleccionar ${row.name}`">
              <UiStatusBadge value="Pendiente" variant="secondary" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.intCesantias)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Vacaciones -->
          <template #cell-vacaciones="{ row }">
            <button v-if="row.vacaciones == null" class="focus:outline-none focus:ring-2 focus:ring-primary rounded" @click="toggleSelect(row.id)" :aria-label="`Seleccionar ${row.name}`">
              <UiStatusBadge value="Pendiente" variant="secondary" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.vacaciones)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Dotación -->
          <template #cell-dotacion="{ row }">
            <span v-if="row.employment_type !== 'employee'" class="text-xs text-text-tertiary px-2">N/A</span>
            <template v-else>
              <button v-if="row.dotacion == null" class="focus:outline-none focus:ring-2 focus:ring-primary rounded" @click="toggleSelect(row.id)" :aria-label="`Seleccionar ${row.name}`">
                <UiStatusBadge value="Pendiente" variant="secondary" size="sm" format="text" class="font-normal" />
              </button>
              <UiStatusBadge v-else :value="formatCurrency(row.dotacion)" variant="success" size="sm" format="text" class="font-normal" />
            </template>
          </template>

          <!-- Horas Extras -->
          <template #cell-horasExtras="{ row }">
            <button class="focus:outline-none focus:ring-2 focus:ring-primary rounded" @click="toggleSelect(row.id)" :aria-label="`Seleccionar ${row.name}`">
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
                  <div>
                    <label for="pila-emp-ss" class="block text-sm font-medium text-text-primary mb-1">Aporte empleado (237005)</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                      <input id="pila-emp-ss" v-model.number="pilaForm.employee_ss_amount" type="number" min="0" step="any" class="input-base w-full pl-7 pr-3 py-2" aria-label="Aporte seguridad social empleado" />
                    </div>
                  </div>
                  <div>
                    <label for="pila-er-ss" class="block text-sm font-medium text-text-primary mb-1">Aporte empleador (237010)</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                      <input id="pila-er-ss" v-model.number="pilaForm.employer_ss_amount" type="number" min="0" step="any" class="input-base w-full pl-7 pr-3 py-2" aria-label="Aporte seguridad social empleador" />
                    </div>
                  </div>
                  <div>
                    <label for="pila-total" class="block text-sm font-medium text-text-primary mb-1">Total PILA *</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                      <input id="pila-total" v-model.number="pilaForm.total_amount" type="number" min="1" step="any" required class="input-base w-full pl-7 pr-3 py-2 font-semibold" aria-label="Total pago PILA" />
                    </div>
                    <p class="text-xs text-text-tertiary mt-0.5">Puede diferir si incluye recargos</p>
                  </div>
                  <div>
                    <label for="pila-method" class="block text-sm font-medium text-text-primary mb-1">Método de pago</label>
                    <select id="pila-method" v-model="pilaForm.payment_method" class="input-base w-full px-3 py-2" aria-label="Método de pago PILA">
                      <option value="transfer">Transferencia</option>
                      <option value="cash">Efectivo</option>
                      <option value="check">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label for="pila-date" class="block text-sm font-medium text-text-primary mb-1">Fecha de pago *</label>
                    <input id="pila-date" v-model="pilaForm.payment_date" type="date" required class="input-base w-full px-3 py-2" aria-label="Fecha de pago PILA" />
                  </div>
                  <div>
                    <label for="pila-notes" class="block text-sm font-medium text-text-primary mb-1">Notas</label>
                    <input id="pila-notes" v-model="pilaForm.notes" type="text" class="input-base w-full px-3 py-2" placeholder="Número de planilla PILA (opcional)" aria-label="Notas adicionales PILA" />
                  </div>
                </div>

                <div v-if="pilaError" role="alert" class="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p class="text-sm text-red-700">{{ pilaError }}</p>
                </div>

                <div class="flex gap-3 mt-4">
                  <button
                    type="submit"
                    :disabled="pilaSubmitting || !pilaFormValid"
                    class="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold min-h-[44px]"
                  >
                    <CommonsTheCustomLoader v-if="pilaSubmitting" size="small" />
                    <span>{{ pilaSubmitting ? 'Registrando...' : 'Registrar PILA' }}</span>
                  </button>
                  <button type="button" @click="closePilaForm" class="px-4 py-2.5 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors min-h-[44px]">
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

    <!-- ── Slide-over: Bulk benefit registration ─────────────────────────── -->
    <Teleport to="body">

    <!-- Panel -->
    <Transition name="slide-right">
      <div
        v-if="selectedEmpIds.length > 0"
        class="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-background border-l border-border shadow-xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Registrar prestaciones"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 class="text-base font-semibold text-text-primary">Registrar Prestaciones</h2>
            <p class="text-sm text-text-secondary">{{ selectedEmpIds.length }} empleado(s) seleccionado(s)</p>
          </div>
          <button @click="clearSelection" class="p-2 rounded-lg hover:bg-surface transition-colors" aria-label="Cerrar panel">
            <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Shared: date + method -->
        <div class="px-6 py-4 border-b border-border bg-surface flex-shrink-0">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Fecha de pago *</label>
              <input v-model="slideDate" type="date" required class="input-base w-full px-3 py-2" />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-primary mb-1">Método de pago</label>
              <select v-model="slideMethod" class="input-base w-full px-3 py-2">
                <option value="transfer">Transferencia</option>
                <option value="cash">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
                <option value="check">Cheque</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Scrollable per-employee forms -->
        <div class="flex-1 overflow-y-auto divide-y divide-border">
          <div v-for="row in selectedEmployeeRows" :key="row.id" class="px-6 py-5">

            <!-- Employee header -->
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                :style="{ backgroundColor: row.color }"
              >{{ row.initials }}</div>
              <div class="flex-1">
                <p class="text-sm font-semibold text-text-primary">{{ row.name }}</p>
                <UiStatusBadge :value="employmentTypeLabel[row.employment_type] ?? row.employment_type" variant="secondary" size="sm" />
              </div>
              <button @click="toggleSelect(row.id)" class="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors" :aria-label="`Quitar ${row.name}`">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <template v-if="slideData[row.id]">

              <!-- Shared salary fields (if any salary-based benefit is pending) -->
              <div v-if="row.primaS1 == null || row.primaS2 == null || row.cesantias == null || row.vacaciones == null" class="mb-4 p-3 bg-surface rounded-xl space-y-3">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Campos compartidos</p>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-text-primary mb-1">Salario base *</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs">$</span>
                      <input v-model.number="slideData[row.id].gross_salary" type="number" min="1" step="any" class="input-base w-full pl-6 pr-2 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-text-primary mb-1">Días trabajados</label>
                    <input v-model.number="slideData[row.id].days_worked" type="number" min="1" max="360" step="1" class="input-base w-full px-3 py-2 text-sm" placeholder="360" />
                    <p class="text-xs text-text-tertiary mt-0.5">Prima ≤180 · Cesantías/Vac ≤360</p>
                  </div>
                </div>
              </div>

              <!-- Pending salary-based benefits -->
              <div class="space-y-1.5 mb-3">
                <div v-if="row.primaS1 == null" class="flex items-center gap-2 py-1.5 px-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M12 8v4M12 16h.01"/></svg>
                  <span class="text-xs font-medium text-amber-800 flex-1">Prima S1 — {{ selectedYear }}-S1</span>
                  <UiStatusBadge value="Pendiente" variant="warning" size="sm" />
                </div>
                <div v-if="row.primaS2 == null" class="flex items-center gap-2 py-1.5 px-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M12 8v4M12 16h.01"/></svg>
                  <span class="text-xs font-medium text-amber-800 flex-1">Prima S2 — {{ selectedYear }}-S2</span>
                  <UiStatusBadge value="Pendiente" variant="warning" size="sm" />
                </div>
                <div v-if="row.cesantias == null" class="flex items-center gap-2 py-1.5 px-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M12 8v4M12 16h.01"/></svg>
                  <span class="text-xs font-medium text-amber-800 flex-1">Cesantías {{ selectedYear }}</span>
                  <UiStatusBadge value="Pendiente" variant="warning" size="sm" />
                </div>
                <div v-if="row.vacaciones == null" class="flex items-center gap-2 py-1.5 px-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <svg class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M12 8v4M12 16h.01"/></svg>
                  <span class="text-xs font-medium text-amber-800 flex-1">Vacaciones {{ selectedYear }}</span>
                  <UiStatusBadge value="Pendiente" variant="warning" size="sm" />
                </div>
              </div>

              <!-- Int. Cesantías -->
              <div v-if="row.intCesantias == null" class="mb-4 p-3 bg-surface rounded-xl space-y-2">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Int. Cesantías {{ selectedYear }}</p>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs font-medium text-text-primary mb-1">Base cesantías (× 12%)</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs">$</span>
                      <input v-model.number="slideData[row.id].cesantias_base" type="number" min="0" step="any" class="input-base w-full pl-6 pr-2 py-2 text-sm" placeholder="0" />
                    </div>
                  </div>
                  <div class="flex items-end">
                    <div class="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg w-full">
                      <p class="text-xs text-text-secondary">Calculado (12%)</p>
                      <p class="text-sm font-bold text-emerald-700">{{ formatCurrency(intCesantiasPreview(row.id)) }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Dotación (employees only) -->
              <div v-if="row.dotacion == null && row.employment_type === 'employee'" class="mb-4 p-3 bg-surface rounded-xl space-y-2">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Dotación {{ selectedYear }}</p>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs font-medium text-text-primary mb-1">Período *</label>
                    <select v-model="slideData[row.id].dot_period" class="input-base w-full px-2 py-2 text-sm">
                      <option value="">Seleccionar</option>
                      <option value="Abr">Abril</option>
                      <option value="Ago">Agosto</option>
                      <option value="Dic">Diciembre</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-text-primary mb-1">Valor total *</label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs">$</span>
                      <input v-model.number="slideData[row.id].dot_total" type="number" min="0" step="any" class="input-base w-full pl-6 pr-2 py-2 text-sm" placeholder="0" />
                    </div>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-text-primary mb-1">Artículos entregados</label>
                  <textarea v-model="slideData[row.id].dot_items" class="input-base w-full px-3 py-2 text-sm min-h-[52px]" placeholder="Ej: 2 camisas, 1 pantalón..." />
                </div>
              </div>

              <!-- Horas Extras -->
              <div class="p-3 bg-surface rounded-xl space-y-2">
                <div class="flex items-center gap-2">
                  <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide">Horas Extras</p>
                  <span v-if="row.horasExtras != null" class="text-xs text-text-secondary">(registradas: {{ formatCurrency(row.horasExtras) }})</span>
                </div>
                <div>
                  <label class="block text-xs font-medium text-text-primary mb-1">Período (mes)</label>
                  <input v-model="slideData[row.id].period_month" type="month" class="input-base w-full px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-text-primary mb-1">Tarifa horaria base</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs">$</span>
                    <input v-model.number="slideData[row.id].base_hourly_rate" type="number" min="0" step="any" class="input-base w-full pl-6 pr-2 py-2 text-sm" placeholder="0" />
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs text-text-secondary mb-1">Diurnas ×1.25</label>
                    <input v-model.number="slideData[row.id].hours_diurna" type="number" min="0" step="0.5" class="input-base w-full px-2 py-2 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label class="block text-xs text-text-secondary mb-1">Nocturnas ×1.75</label>
                    <input v-model.number="slideData[row.id].hours_nocturna" type="number" min="0" step="0.5" class="input-base w-full px-2 py-2 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label class="block text-xs text-text-secondary mb-1">Dom. diurna ×2.00</label>
                    <input v-model.number="slideData[row.id].hours_dominical_diurna" type="number" min="0" step="0.5" class="input-base w-full px-2 py-2 text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label class="block text-xs text-text-secondary mb-1">Dom. nocturna ×2.50</label>
                    <input v-model.number="slideData[row.id].hours_dominical_nocturna" type="number" min="0" step="0.5" class="input-base w-full px-2 py-2 text-sm" placeholder="0" />
                  </div>
                </div>
                <div v-if="horasExtrasTotal(row.id) > 0" class="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span class="text-xs text-text-secondary">Total calculado</span>
                  <span class="text-sm font-bold text-emerald-700 ml-auto">{{ formatCurrency(horasExtrasTotal(row.id)) }}</span>
                </div>
              </div>

            </template>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-border bg-surface flex-shrink-0">
          <div v-if="slideError" role="alert" class="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <pre class="text-xs text-red-700 whitespace-pre-wrap font-sans">{{ slideError }}</pre>
          </div>
          <div v-if="slideSuccess" role="status" class="mb-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <p class="text-sm text-emerald-800">{{ slideSuccess }}</p>
          </div>
          <div class="flex gap-3">
            <button
              @click="submitBulk"
              :disabled="isSlideSubmitting"
              class="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold min-h-[44px]"
            >
              <CommonsTheCustomLoader v-if="isSlideSubmitting" size="small" />
              <span>{{ isSlideSubmitting ? 'Registrando...' : `Registrar — ${selectedEmpIds.length} empleado(s)` }}</span>
            </button>
            <button type="button" @click="clearSelection" class="px-4 py-2.5 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-colors min-h-[44px]">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

/* Bulk bar animation */
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-8px); }

/* Slide-over panel */
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }
</style>
