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
