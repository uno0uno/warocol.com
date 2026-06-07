<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { usePaymentMethods } from '~/composables/usePaymentMethods'

useHead({ title: 'Nómina — Equipo' })

const { currentTenant } = useTenantReactive()
const { formatCurrency } = useFormatters()

// ── Filters ───────────────────────────────────────────────────────────────
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)
const selectedYear = ref(currentYear)
const selectedMonth = ref<number | null>(null)
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()

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
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || selectedMonth.value !== null,
)

const performSearch = () => applySearch()

const clearFilters = () => {
  clearSearch()
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

  const q = appliedSearch.value.trim().toLowerCase()
  if (q) {
    const term = q
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

// ── Cell-level selection ──────────────────────────────────────────────────
// Key format: "${empId}:${benefit}"
const selectedCells = ref<string[]>([])

const BENEFIT_KEYS = ['primaS1', 'primaS2', 'cesantias', 'intCesantias', 'vacaciones', 'dotacion', 'horasExtras'] as const
type BenefitKey = typeof BENEFIT_KEYS[number]

function cellKey(empId: string, benefit: string) { return `${empId}:${benefit}` }
function isCellSelected(empId: string, benefit: string) { return selectedCells.value.includes(cellKey(empId, benefit)) }

// Returns which benefits a row is eligible to select (pending or always-addable)
function getEligibleBenefits(row: any): BenefitKey[] {
  const out: BenefitKey[] = []
  if (row.primaS1 == null) out.push('primaS1')
  if (row.primaS2 == null) out.push('primaS2')
  if (row.cesantias == null) out.push('cesantias')
  if (row.intCesantias == null) out.push('intCesantias')
  if (row.vacaciones == null) out.push('vacaciones')
  if (row.dotacion == null && row.employment_type === 'employee') out.push('dotacion')
  out.push('horasExtras')
  return out
}

function isRowSelected(empId: string): boolean {
  const row = tableData.value.find(r => r.id === empId)
  if (!row) return false
  const eligible = getEligibleBenefits(row)
  return eligible.length > 0 && eligible.every(b => selectedCells.value.includes(cellKey(empId, b)))
}

function isColumnSelected(benefit: BenefitKey): boolean {
  const eligible = tableData.value.filter(r => getEligibleBenefits(r).includes(benefit))
  return eligible.length > 0 && eligible.every(r => selectedCells.value.includes(cellKey(r.id, benefit)))
}

function allSelected(): boolean {
  if (!tableData.value.length) return false
  return tableData.value.every(r => isRowSelected(r.id))
}

function toggleCell(empId: string, benefit: string) {
  const key = cellKey(empId, benefit)
  if (selectedCells.value.includes(key)) {
    selectedCells.value = selectedCells.value.filter(k => k !== key)
  } else {
    selectedCells.value = [...selectedCells.value, key]
    initSlideData(empId)
  }
}

function toggleRow(empId: string) {
  const row = tableData.value.find(r => r.id === empId)
  if (!row) return
  const eligible = getEligibleBenefits(row)
  if (isRowSelected(empId)) {
    selectedCells.value = selectedCells.value.filter(k => !k.startsWith(`${empId}:`))
  } else {
    const toAdd = eligible.map(b => cellKey(empId, b)).filter(k => !selectedCells.value.includes(k))
    selectedCells.value = [...selectedCells.value, ...toAdd]
    initSlideData(empId)
  }
}

function toggleColumn(benefit: BenefitKey) {
  const eligible = tableData.value.filter(r => getEligibleBenefits(r).includes(benefit))
  if (isColumnSelected(benefit)) {
    selectedCells.value = selectedCells.value.filter(k => !k.endsWith(`:${benefit}`))
  } else {
    const toAdd = eligible.map(r => cellKey(r.id, benefit)).filter(k => !selectedCells.value.includes(k))
    selectedCells.value = [...selectedCells.value, ...toAdd]
    eligible.forEach(r => initSlideData(r.id))
  }
}

function toggleAll() {
  if (allSelected()) {
    selectedCells.value = []
  } else {
    const toAdd: string[] = []
    tableData.value.forEach(r => {
      getEligibleBenefits(r).forEach(b => {
        const k = cellKey(r.id, b)
        if (!selectedCells.value.includes(k)) toAdd.push(k)
      })
      initSlideData(r.id)
    })
    selectedCells.value = [...selectedCells.value, ...toAdd]
  }
}

function clearSelection() {
  selectedCells.value = []
  showSlideOver.value = false
  slideError.value = null
  slideSuccess.value = null
}

// Group selected cells by employee
const selectedByEmployee = computed(() => {
  const map: Record<string, BenefitKey[]> = {}
  for (const key of selectedCells.value) {
    const colonIdx = key.indexOf(':')
    const empId = key.substring(0, colonIdx)
    const benefit = key.substring(colonIdx + 1) as BenefitKey
    if (!map[empId]) map[empId] = []
    map[empId].push(benefit)
  }
  return map
})

// ── Payment methods (shared with individual prestaciones pages) ────────────
const { paymentGroups, fetchPaymentMethods } = usePaymentMethods()

// ── Slide-over state ──────────────────────────────────────────────────────
const TODAY_STR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

const showSlideOver = ref(false)
const slideDate    = ref(TODAY_STR)
const slideMethod  = ref('')
const isSlideSubmitting = ref(false)
const slideError   = ref<string | null>(null)
const slideSuccess = ref<string | null>(null)

function openSlideOver() { showSlideOver.value = true }
function closeSlideOver() { showSlideOver.value = false; slideError.value = null; slideSuccess.value = null }

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
  Object.keys(selectedByEmployee.value)
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

      const sel = selectedByEmployee.value[empId] ?? []
      if (sel.includes('primaS1') && row.primaS1 == null) {
        tasks.push(
          $fetch(`${BASE}/prima`, { method: 'POST', body: { semestre: `${selectedYear.value}-S1`, gross_salary: d.gross_salary, days_worked: d.days_worked || 180, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Prima S1: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      if (sel.includes('primaS2') && row.primaS2 == null) {
        tasks.push(
          $fetch(`${BASE}/prima`, { method: 'POST', body: { semestre: `${selectedYear.value}-S2`, gross_salary: d.gross_salary, days_worked: d.days_worked || 180, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Prima S2: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      if (sel.includes('cesantias') && row.cesantias == null) {
        tasks.push(
          $fetch(`${BASE}/cesantias`, { method: 'POST', body: { anio: selectedYear.value, gross_salary: d.gross_salary, days_worked: d.days_worked || 360, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Cesantías: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      if (sel.includes('intCesantias') && row.intCesantias == null && d.cesantias_base > 0) {
        tasks.push(
          $fetch(`${BASE}/int-cesantias`, { method: 'POST', body: { anio: selectedYear.value, cesantias_base: d.cesantias_base, int_cesantias_amount: d.int_cesantias_amount || null, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Int. Cesantías: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      if (sel.includes('vacaciones') && row.vacaciones == null) {
        tasks.push(
          $fetch(`${BASE}/vacaciones`, { method: 'POST', body: { anio: selectedYear.value, gross_salary: d.gross_salary, days_worked: d.days_worked || 360, payment_method: pm, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Vacaciones: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      if (sel.includes('dotacion') && row.dotacion == null && row.employment_type === 'employee' && d.dot_period && d.dot_total > 0) {
        tasks.push(
          $fetch(`${BASE}/dotacion`, { method: 'POST', body: { period: d.dot_period, year: d.dot_year, total_amount: d.dot_total, items_description: d.dot_items || null, payment_date: pd } })
            .then(() => { affectedEmpIds.add(empId) })
            .catch(e => { errors.push(`${row.name} — Dotación: ${e?.data?.detail ?? 'error'}`) })
        )
      }
      const totalHrs = (d.hours_diurna || 0) + (d.hours_nocturna || 0) + (d.hours_dominical_diurna || 0) + (d.hours_dominical_nocturna || 0)
      if (sel.includes('horasExtras') && totalHrs > 0 && d.period_month && d.base_hourly_rate > 0) {
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
    selectedCells.value = []
    showSlideOver.value = false
    slideData.value = {}
  }
}

onMounted(() => {
  loadPilaPending()
  loadPilaHistory()
  fetchPaymentMethods()
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

      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        :search-fields="[]"
        :show-date-range="false"
        search-placeholder="Buscar empleado..."
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="selectedYear"
            :class="filterSelectClass"
            aria-label="Filtrar por año"
          >
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
          <select
            v-model="selectedMonth"
            :class="filterSelectClass"
            aria-label="Filtrar por mes"
          >
            <option :value="null">Mes</option>
            <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Bulk action bar -->
      <Transition name="slide-down">
        <div v-if="selectedCells.length > 0" class="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border-2 border-primary rounded-xl">
          <span class="text-sm font-semibold text-primary">{{ selectedCells.length }} prestación(es) · {{ selectedEmployeeRows.length }} empleado(s)</span>
          <button
            @click="openSlideOver"
            class="ml-auto px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors min-h-[36px]"
          >
            Registrar prestaciones →
          </button>
          <button @click="clearSelection" class="text-xs text-text-secondary hover:text-text-primary underline">Cancelar</button>
        </div>
      </Transition>

      <!-- Data table -->
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
              :class="[index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30', isRowSelected(item.id) ? 'ring-2 ring-primary ring-inset' : '']"
            >
              <!-- Employee header with checkbox -->
              <div class="flex items-center gap-2">
                <label class="cursor-pointer flex-shrink-0">
                  <input type="checkbox" class="sr-only peer" :checked="isRowSelected(item.id)" @change="toggleRow(item.id)" />
                  <span class="w-5 h-5 rounded-[5px] border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center text-white">
                    <svg v-if="isRowSelected(item.id)" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
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
            <label class="cursor-pointer" :title="allSelected() ? 'Deseleccionar todo' : 'Seleccionar todo'">
              <input type="checkbox" class="sr-only peer" :checked="allSelected()" @change="toggleAll" />
              <span class="w-5 h-5 rounded-[5px] border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center text-white">
                <svg v-if="allSelected()" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </label>
          </template>

          <!-- ── Desktop: per-row checkbox (selects all benefits for that employee) ── -->
          <template #cell-select="{ row }">
            <label class="cursor-pointer" :title="isRowSelected(row.id) ? 'Deseleccionar fila' : 'Seleccionar todas las prestaciones de esta fila'">
              <input type="checkbox" class="sr-only peer" :checked="isRowSelected(row.id)" @change="toggleRow(row.id)" />
              <span class="w-5 h-5 rounded-[5px] border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center text-white">
                <svg v-if="isRowSelected(row.id)" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
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

          <!-- ── Column-select headers ───────────────────────────────── -->
          <template v-for="col in (['primaS1','primaS2','cesantias','intCesantias','vacaciones','dotacion','horasExtras'] as const)" :key="`h-${col}`" #[`header-${col}`]>
            <label class="cursor-pointer flex flex-col items-center gap-0.5 select-none" :title="`Seleccionar columna ${col}`" @click.stop>
              <input type="checkbox" class="sr-only peer" :checked="isColumnSelected(col)" @change="toggleColumn(col)" />
              <span class="w-3.5 h-3.5 rounded border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center text-white">
                <svg v-if="isColumnSelected(col)" viewBox="0 0 10 8" fill="none" class="w-2 h-1.5">
                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="text-xs font-medium text-text-primary">{{ { primaS1: 'Prima S1', primaS2: 'Prima S2', cesantias: 'Cesantías', intCesantias: 'Int. Ces.', vacaciones: 'Vacaciones', dotacion: 'Dotación', horasExtras: 'H. Extras' }[col] }}</span>
            </label>
          </template>

          <!-- Prima S1 -->
          <template #cell-primaS1="{ row }">
            <button v-if="row.primaS1 == null" @click="toggleCell(row.id, 'primaS1')" :class="['focus:outline-none focus:ring-2 focus:ring-primary rounded transition-all', isCellSelected(row.id,'primaS1') ? 'ring-2 ring-primary' : '']" :aria-label="`${isCellSelected(row.id,'primaS1') ? 'Deseleccionar' : 'Seleccionar'} Prima S1 — ${row.name}`">
              <UiStatusBadge :value="isCellSelected(row.id,'primaS1') ? '✓ Seleccionada' : 'Pendiente'" :variant="isCellSelected(row.id,'primaS1') ? 'info' : 'secondary'" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.primaS1)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Prima S2 -->
          <template #cell-primaS2="{ row }">
            <button v-if="row.primaS2 == null" @click="toggleCell(row.id, 'primaS2')" :class="['focus:outline-none focus:ring-2 focus:ring-primary rounded transition-all', isCellSelected(row.id,'primaS2') ? 'ring-2 ring-primary' : '']" :aria-label="`${isCellSelected(row.id,'primaS2') ? 'Deseleccionar' : 'Seleccionar'} Prima S2 — ${row.name}`">
              <UiStatusBadge :value="isCellSelected(row.id,'primaS2') ? '✓ Seleccionada' : 'Pendiente'" :variant="isCellSelected(row.id,'primaS2') ? 'info' : 'secondary'" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.primaS2)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Cesantías -->
          <template #cell-cesantias="{ row }">
            <button v-if="row.cesantias == null" @click="toggleCell(row.id, 'cesantias')" :class="['focus:outline-none focus:ring-2 focus:ring-primary rounded transition-all', isCellSelected(row.id,'cesantias') ? 'ring-2 ring-primary' : '']" :aria-label="`${isCellSelected(row.id,'cesantias') ? 'Deseleccionar' : 'Seleccionar'} Cesantías — ${row.name}`">
              <UiStatusBadge :value="isCellSelected(row.id,'cesantias') ? '✓ Seleccionada' : 'Pendiente'" :variant="isCellSelected(row.id,'cesantias') ? 'info' : 'secondary'" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.cesantias)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Int. Cesantías -->
          <template #cell-intCesantias="{ row }">
            <button v-if="row.intCesantias == null" @click="toggleCell(row.id, 'intCesantias')" :class="['focus:outline-none focus:ring-2 focus:ring-primary rounded transition-all', isCellSelected(row.id,'intCesantias') ? 'ring-2 ring-primary' : '']" :aria-label="`${isCellSelected(row.id,'intCesantias') ? 'Deseleccionar' : 'Seleccionar'} Int. Cesantías — ${row.name}`">
              <UiStatusBadge :value="isCellSelected(row.id,'intCesantias') ? '✓ Seleccionada' : 'Pendiente'" :variant="isCellSelected(row.id,'intCesantias') ? 'info' : 'secondary'" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.intCesantias)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Vacaciones -->
          <template #cell-vacaciones="{ row }">
            <button v-if="row.vacaciones == null" @click="toggleCell(row.id, 'vacaciones')" :class="['focus:outline-none focus:ring-2 focus:ring-primary rounded transition-all', isCellSelected(row.id,'vacaciones') ? 'ring-2 ring-primary' : '']" :aria-label="`${isCellSelected(row.id,'vacaciones') ? 'Deseleccionar' : 'Seleccionar'} Vacaciones — ${row.name}`">
              <UiStatusBadge :value="isCellSelected(row.id,'vacaciones') ? '✓ Seleccionada' : 'Pendiente'" :variant="isCellSelected(row.id,'vacaciones') ? 'info' : 'secondary'" size="sm" format="text" class="font-normal" />
            </button>
            <UiStatusBadge v-else :value="formatCurrency(row.vacaciones)" variant="success" size="sm" format="text" class="font-normal" />
          </template>

          <!-- Dotación -->
          <template #cell-dotacion="{ row }">
            <span v-if="row.employment_type !== 'employee'" class="text-xs text-text-tertiary px-2">N/A</span>
            <template v-else>
              <button v-if="row.dotacion == null" @click="toggleCell(row.id, 'dotacion')" :class="['focus:outline-none focus:ring-2 focus:ring-primary rounded transition-all', isCellSelected(row.id,'dotacion') ? 'ring-2 ring-primary' : '']" :aria-label="`${isCellSelected(row.id,'dotacion') ? 'Deseleccionar' : 'Seleccionar'} Dotación — ${row.name}`">
                <UiStatusBadge :value="isCellSelected(row.id,'dotacion') ? '✓ Seleccionada' : 'Pendiente'" :variant="isCellSelected(row.id,'dotacion') ? 'info' : 'secondary'" size="sm" format="text" class="font-normal" />
              </button>
              <UiStatusBadge v-else :value="formatCurrency(row.dotacion)" variant="success" size="sm" format="text" class="font-normal" />
            </template>
          </template>

          <!-- Horas Extras (always addable) -->
          <template #cell-horasExtras="{ row }">
            <button @click="toggleCell(row.id, 'horasExtras')" :class="['focus:outline-none focus:ring-2 focus:ring-primary rounded transition-all', isCellSelected(row.id,'horasExtras') ? 'ring-2 ring-primary' : '']" :aria-label="`${isCellSelected(row.id,'horasExtras') ? 'Deseleccionar' : 'Seleccionar'} Horas Extras — ${row.name}`">
              <UiStatusBadge
                :value="isCellSelected(row.id,'horasExtras') ? '✓ Seleccionada' : (row.horasExtras != null ? formatCurrency(row.horasExtras) : 'Agregar')"
                :variant="isCellSelected(row.id,'horasExtras') ? 'info' : (row.horasExtras != null ? 'success' : 'secondary')"
                size="sm" format="text" class="font-normal"
              />
            </button>
          </template>

      </UiResponsiveDataView>

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
                      <option value="">Sin especificar</option>
                      <template v-for="group in paymentGroups">
                        <option v-if="group.methods.length === 0" :key="group.id" :value="group.slug">{{ group.name }}</option>
                        <option v-for="method in group.methods" :key="method.id" :value="method.id">{{ method.name }}</option>
                      </template>
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
        v-if="showSlideOver && selectedCells.length > 0"
        class="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-background border-l border-border shadow-xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Registrar prestaciones"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 class="text-base font-semibold text-text-primary">Registrar Prestaciones</h2>
            <p class="text-sm text-text-secondary">{{ selectedCells.length }} prestación(es) · {{ selectedEmployeeRows.length }} empleado(s)</p>
          </div>
          <button @click="closeSlideOver" class="p-2 rounded-lg hover:bg-surface transition-colors" aria-label="Cerrar panel">
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
                <option value="">Sin especificar</option>
                <template v-for="group in paymentGroups">
                  <option v-if="group.methods.length === 0" :key="group.id" :value="group.slug">{{ group.name }}</option>
                  <option v-for="method in group.methods" :key="method.id" :value="method.id">{{ method.name }}</option>
                </template>
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
              <button @click="toggleRow(row.id)" class="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors" :aria-label="`Quitar ${row.name}`">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <template v-if="slideData[row.id]">

              <!-- Shared salary fields (shown if any salary-based benefit is selected) -->
              <div v-if="selectedByEmployee[row.id]?.some(b => ['primaS1','primaS2','cesantias','vacaciones'].includes(b))" class="mb-4 p-3 bg-surface rounded-xl space-y-3">
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

              <!-- Selected salary-based benefits list -->
              <div class="space-y-1.5 mb-3">
                <div v-if="selectedByEmployee[row.id]?.includes('primaS1') && row.primaS1 == null" class="flex items-center gap-2 py-1.5 px-3 bg-primary/5 border border-primary/30 rounded-lg">
                  <span class="text-xs font-medium text-text-primary flex-1">Prima S1 — {{ selectedYear }}-S1</span>
                  <UiStatusBadge value="Incluida" variant="info" size="sm" />
                </div>
                <div v-if="selectedByEmployee[row.id]?.includes('primaS2') && row.primaS2 == null" class="flex items-center gap-2 py-1.5 px-3 bg-primary/5 border border-primary/30 rounded-lg">
                  <span class="text-xs font-medium text-text-primary flex-1">Prima S2 — {{ selectedYear }}-S2</span>
                  <UiStatusBadge value="Incluida" variant="info" size="sm" />
                </div>
                <div v-if="selectedByEmployee[row.id]?.includes('cesantias') && row.cesantias == null" class="flex items-center gap-2 py-1.5 px-3 bg-primary/5 border border-primary/30 rounded-lg">
                  <span class="text-xs font-medium text-text-primary flex-1">Cesantías {{ selectedYear }}</span>
                  <UiStatusBadge value="Incluida" variant="info" size="sm" />
                </div>
                <div v-if="selectedByEmployee[row.id]?.includes('vacaciones') && row.vacaciones == null" class="flex items-center gap-2 py-1.5 px-3 bg-primary/5 border border-primary/30 rounded-lg">
                  <span class="text-xs font-medium text-text-primary flex-1">Vacaciones {{ selectedYear }}</span>
                  <UiStatusBadge value="Incluida" variant="info" size="sm" />
                </div>
              </div>

              <!-- Int. Cesantías -->
              <div v-if="selectedByEmployee[row.id]?.includes('intCesantias') && row.intCesantias == null" class="mb-4 p-3 bg-surface rounded-xl space-y-2">
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
              <div v-if="selectedByEmployee[row.id]?.includes('dotacion') && row.dotacion == null && row.employment_type === 'employee'" class="mb-4 p-3 bg-surface rounded-xl space-y-2">
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
              <div v-if="selectedByEmployee[row.id]?.includes('horasExtras')" class="p-3 bg-surface rounded-xl space-y-2">
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
              <span>{{ isSlideSubmitting ? 'Registrando...' : `Registrar ${selectedCells.length} prestación(es)` }}</span>
            </button>
            <button type="button" @click="closeSlideOver" class="px-4 py-2.5 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-colors min-h-[44px]">
              Cerrar
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
