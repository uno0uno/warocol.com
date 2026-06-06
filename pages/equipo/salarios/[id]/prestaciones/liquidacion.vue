<script setup>
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const employeeId = route.params.id

// ── Employee & existing liquidación ──────────────────────────────────────────
const { data: employeeData } = await useAsyncData(
  `employee-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}`),
  { server: false }
)
const employee = computed(() => employeeData.value?.data ?? null)

const { data: existingData, refresh: refreshLiquidacion } = await useAsyncData(
  `liquidacion-${employeeId}`,
  () => $fetch(`/api/salaries/employees/${employeeId}/liquidacion`),
  { server: false }
)
const existing = computed(() => existingData.value?.data ?? null)

// ── Phase management ─────────────────────────────────────────────────────────
// phase: 'form' | 'preview' | 'confirm' | 'done'
const phase = ref('form')

// ── Form state ───────────────────────────────────────────────────────────────
const form = reactive({
  contract_start_date: '',
  termination_date: '',
  cause: 'sin_justa_causa',
  base_salary: '',
  employment_type: '',
  payment_method: '',
  payment_date: new Date().toISOString().split('T')[0],
  notes: '',
})

// Pre-fill from employee data
watch(employee, (emp) => {
  if (!emp) return
  if (emp.salary_config?.contract_start_date) {
    form.contract_start_date = emp.salary_config.contract_start_date
  }
  if (emp.salary_config?.base_salary) {
    form.base_salary = String(emp.salary_config.base_salary)
  }
  if (emp.employment_type) {
    form.employment_type = emp.employment_type
  }
  form.termination_date = new Date().toISOString().split('T')[0]
}, { immediate: true })

// ── Breakdown preview ────────────────────────────────────────────────────────
const breakdown = ref(null)
const previewError = ref('')
const previewLoading = ref(false)

async function calculatePreview() {
  previewError.value = ''
  if (!form.contract_start_date || !form.termination_date || !form.base_salary || !form.employment_type) {
    previewError.value = 'Por favor completa todos los campos requeridos.'
    return
  }
  previewLoading.value = true
  try {
    const res = await $fetch(`/api/salaries/employees/${employeeId}/liquidacion/calculate`, {
      method: 'POST',
      body: {
        contract_start_date: form.contract_start_date,
        termination_date: form.termination_date,
        cause: form.cause,
        base_salary: parseFloat(form.base_salary),
        employment_type: form.employment_type,
      },
    })
    breakdown.value = res.data
    phase.value = 'preview'
  } catch (err) {
    previewError.value = err?.data?.detail ?? 'Error al calcular la liquidación.'
  } finally {
    previewLoading.value = false
  }
}

function goToConfirm() {
  phase.value = 'confirm'
}

function backToForm() {
  phase.value = 'form'
  breakdown.value = null
}

// ── Confirm & submit ─────────────────────────────────────────────────────────
const submitLoading = ref(false)
const submitError = ref('')

async function submitLiquidacion() {
  submitError.value = ''
  submitLoading.value = true
  try {
    await $fetch(`/api/salaries/employees/${employeeId}/liquidacion`, {
      method: 'POST',
      body: {
        contract_start_date: form.contract_start_date,
        termination_date: form.termination_date,
        cause: form.cause,
        base_salary: parseFloat(form.base_salary),
        employment_type: form.employment_type,
        cesantias_amount: breakdown.value.cesantias_amount,
        prima_amount: breakdown.value.prima_amount,
        vacaciones_amount: breakdown.value.vacaciones_amount,
        int_cesantias_amount: breakdown.value.int_cesantias_amount,
        indemnizacion_amount: breakdown.value.indemnizacion_amount,
        total_amount: breakdown.value.total_amount,
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        notes: form.notes || null,
      },
    })
    await refreshLiquidacion()
    phase.value = 'done'
  } catch (err) {
    submitError.value = err?.data?.detail ?? 'Error al registrar la liquidación.'
    phase.value = 'preview'
  } finally {
    submitLoading.value = false
  }
}

// ── Formatting helpers ───────────────────────────────────────────────────────
function formatCOP(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

const causeLabels = {
  sin_justa_causa: 'Sin justa causa',
  justa_causa: 'Con justa causa',
  renuncia: 'Renuncia voluntaria',
}

const { paymentGroups, fetchPaymentMethods } = usePaymentMethods()
fetchPaymentMethods()
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6 p-4">

    <!-- Header -->
    <div class="flex items-center gap-3">
      <NuxtLink :to="`/equipo/salarios/${employeeId}`" class="text-text-secondary hover:text-text-primary">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </NuxtLink>
      <div>
        <h1 class="text-xl font-semibold text-text-primary">Liquidación de contrato</h1>
        <p v-if="employee" class="text-sm text-text-secondary">{{ employee.full_name }}</p>
      </div>
    </div>

    <!-- Already liquidated -->
    <template v-if="existing">
      <div class="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div class="flex items-center gap-2 text-state-warning-text bg-state-warning-bg rounded-lg px-4 py-3 text-sm font-medium">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Este empleado ya tiene una liquidación registrada.
        </div>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt class="text-text-secondary">Causa</dt>
            <dd class="font-medium">{{ causeLabels[existing.cause] ?? existing.cause }}</dd>
          </div>
          <div>
            <dt class="text-text-secondary">Fecha retiro</dt>
            <dd class="font-medium">{{ formatDate(existing.termination_date) }}</dd>
          </div>
          <div>
            <dt class="text-text-secondary">Días trabajados</dt>
            <dd class="font-medium">{{ existing.days_worked }}</dd>
          </div>
          <div>
            <dt class="text-text-secondary">Salario base</dt>
            <dd class="font-medium">{{ formatCOP(existing.base_salary) }}</dd>
          </div>
          <div>
            <dt class="text-text-secondary">Cesantías</dt>
            <dd class="font-medium">{{ formatCOP(existing.cesantias_amount) }}</dd>
          </div>
          <div>
            <dt class="text-text-secondary">Prima</dt>
            <dd class="font-medium">{{ formatCOP(existing.prima_amount) }}</dd>
          </div>
          <div>
            <dt class="text-text-secondary">Vacaciones</dt>
            <dd class="font-medium">{{ formatCOP(existing.vacaciones_amount) }}</dd>
          </div>
          <div>
            <dt class="text-text-secondary">Int. cesantías</dt>
            <dd class="font-medium">{{ formatCOP(existing.int_cesantias_amount) }}</dd>
          </div>
          <div v-if="Number(existing.indemnizacion_amount) > 0">
            <dt class="text-text-secondary">Indemnización</dt>
            <dd class="font-medium text-state-danger-text">{{ formatCOP(existing.indemnizacion_amount) }}</dd>
          </div>
          <div class="col-span-2 border-t pt-3">
            <dt class="text-text-secondary">Total liquidación</dt>
            <dd class="text-lg font-bold text-text-primary">{{ formatCOP(existing.total_amount) }}</dd>
          </div>
        </dl>
      </div>
    </template>

    <!-- Phase: form -->
    <template v-else-if="phase === 'form'">
      <div class="rounded-xl border border-border bg-surface p-6 space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-text-secondary">Fecha inicio contrato *</label>
            <input v-model="form.contract_start_date" type="date"
              class="rounded-lg border border-form-control-border px-3 py-2 text-sm focus:ring-2 focus:ring-form-control-focus-ring focus:border-form-control-focus-border min-h-[44px]" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-text-secondary">Fecha retiro *</label>
            <input v-model="form.termination_date" type="date"
              class="rounded-lg border border-form-control-border px-3 py-2 text-sm focus:ring-2 focus:ring-form-control-focus-ring focus:border-form-control-focus-border min-h-[44px]" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-text-secondary">Salario base mensual *</label>
            <input v-model="form.base_salary" type="number" min="0" step="1000" placeholder="1300000"
              class="rounded-lg border border-form-control-border px-3 py-2 text-sm focus:ring-2 focus:ring-form-control-focus-ring focus:border-form-control-focus-border min-h-[44px]" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-text-secondary">Tipo de contrato *</label>
            <select v-model="form.employment_type"
              class="rounded-lg border border-form-control-border px-3 py-2 text-sm focus:ring-2 focus:ring-form-control-focus-ring focus:border-form-control-focus-border min-h-[44px]">
              <option value="">Seleccionar...</option>
              <option value="employee">Empleado (contrato laboral)</option>
              <option value="daily">Jornalero</option>
              <option value="contractor">Contratista / prestación de servicios</option>
            </select>
          </div>
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-medium text-text-secondary">Causa de terminación *</label>
            <select v-model="form.cause"
              class="rounded-lg border border-form-control-border px-3 py-2 text-sm focus:ring-2 focus:ring-form-control-focus-ring focus:border-form-control-focus-border min-h-[44px]">
              <option value="sin_justa_causa">Sin justa causa (empleador termina sin causa)</option>
              <option value="justa_causa">Con justa causa (falta grave del empleado)</option>
              <option value="renuncia">Renuncia voluntaria</option>
            </select>
          </div>
        </div>

        <p v-if="previewError" class="flex items-center gap-1 text-sm text-state-danger-text">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ previewError }}
        </p>

        <button @click="calculatePreview" :disabled="previewLoading"
          class="w-full rounded-lg bg-action-info-bg px-4 py-3 text-sm font-semibold text-action-info-text hover:bg-action-info-hover-bg focus:ring-2 focus:ring-action-info-focus-ring active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">
          <span v-if="previewLoading">Calculando...</span>
          <span v-else>Calcular liquidación</span>
        </button>
      </div>
    </template>

    <!-- Phase: preview -->
    <template v-else-if="phase === 'preview'">
      <div class="rounded-xl border border-border bg-surface p-6 space-y-5">
        <h2 class="text-base font-semibold text-text-primary">Desglose de liquidación</h2>

        <dl class="space-y-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-text-secondary">Días trabajados</dt>
            <dd class="font-medium">{{ breakdown?.days_worked }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-text-secondary">Cesantías</dt>
            <dd class="font-medium">{{ formatCOP(breakdown?.cesantias_amount) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-text-secondary">Prima de servicios</dt>
            <dd class="font-medium">{{ formatCOP(breakdown?.prima_amount) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-text-secondary">Vacaciones</dt>
            <dd class="font-medium">{{ formatCOP(breakdown?.vacaciones_amount) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-text-secondary">Intereses sobre cesantías</dt>
            <dd class="font-medium">{{ formatCOP(breakdown?.int_cesantias_amount) }}</dd>
          </div>
          <div v-if="Number(breakdown?.indemnizacion_amount) > 0" class="flex justify-between">
            <dt class="text-text-secondary">Indemnización (sin justa causa)</dt>
            <dd class="font-medium text-state-danger-text">{{ formatCOP(breakdown?.indemnizacion_amount) }}</dd>
          </div>
          <div class="flex justify-between border-t pt-3">
            <dt class="font-semibold text-text-primary">Total a pagar</dt>
            <dd class="text-lg font-bold text-text-primary">{{ formatCOP(breakdown?.total_amount) }}</dd>
          </div>
        </dl>

        <!-- Payment fields -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-text-secondary">Método de pago</label>
            <select v-model="form.payment_method"
              class="rounded-lg border border-form-control-border px-3 py-2 text-sm focus:ring-2 focus:ring-form-control-focus-ring focus:border-form-control-focus-border min-h-[44px]">
              <option value="">Sin especificar</option>
              <template v-for="group in paymentGroups">
                <option v-if="group.methods.length === 0" :key="group.id" :value="group.slug">{{ group.name }}</option>
                <option v-for="method in group.methods" :key="method.id" :value="method.id">{{ method.name }}</option>
              </template>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-text-secondary">Fecha de pago</label>
            <input v-model="form.payment_date" type="date"
              class="rounded-lg border border-form-control-border px-3 py-2 text-sm focus:ring-2 focus:ring-form-control-focus-ring focus:border-form-control-focus-border min-h-[44px]" />
          </div>
          <div class="flex flex-col gap-1 sm:col-span-2">
            <label class="text-sm font-medium text-text-secondary">Notas (opcional)</label>
            <textarea v-model="form.notes" rows="2" placeholder="Observaciones adicionales..."
              class="rounded-lg border border-form-control-border px-3 py-2 text-sm focus:ring-2 focus:ring-form-control-focus-ring focus:border-form-control-focus-border resize-none" />
          </div>
        </div>

        <div class="flex gap-3">
          <button @click="backToForm"
            class="flex-1 rounded-lg border border-action-secondary-border px-4 py-3 text-sm font-medium text-action-secondary-text hover:bg-action-secondary-hover-bg focus:ring-2 focus:ring-action-secondary-focus-ring transition-all min-h-[44px]">
            Volver
          </button>
          <button @click="goToConfirm"
            class="flex-1 rounded-lg bg-action-destructive-bg px-4 py-3 text-sm font-semibold text-action-destructive-text hover:bg-action-destructive-hover-bg focus:ring-2 focus:ring-action-destructive-focus-ring active:scale-[0.98] transition-all min-h-[44px]">
            Continuar
          </button>
        </div>
      </div>
    </template>

    <!-- Phase: confirm (danger gate) -->
    <template v-else-if="phase === 'confirm'">
      <div class="rounded-xl border-2 border-state-danger-border bg-state-danger-bg p-6 space-y-4">
        <div class="flex items-start gap-3">
          <svg class="w-6 h-6 text-state-danger-icon flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <h2 class="text-base font-bold text-state-danger-text">Confirmar liquidación — acción irreversible</h2>
            <p class="mt-1 text-sm text-state-danger-text">
              Esta acción registrará la liquidación de <strong>{{ employee?.full_name }}</strong> por
              <strong>{{ formatCOP(breakdown?.total_amount) }}</strong> ({{ causeLabels[form.cause] }})
              y marcará al empleado como retirado. No se puede deshacer.
            </p>
          </div>
        </div>

        <p v-if="submitError" class="flex items-center gap-1 text-sm text-state-danger-text font-medium">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ submitError }}
        </p>

        <div class="flex gap-3">
          <button @click="phase = 'preview'"
            class="flex-1 rounded-lg border border-state-danger-border px-4 py-3 text-sm font-medium text-state-danger-text hover:bg-state-danger-bg focus:ring-2 focus:ring-action-destructive-focus-ring transition-all min-h-[44px]">
            Cancelar
          </button>
          <button @click="submitLiquidacion" :disabled="submitLoading"
            class="flex-1 rounded-lg bg-action-destructive-bg px-4 py-3 text-sm font-bold text-action-destructive-text hover:bg-action-destructive-hover-bg focus:ring-2 focus:ring-action-destructive-focus-ring active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">
            <span v-if="submitLoading">Registrando...</span>
            <span v-else>Sí, registrar liquidación</span>
          </button>
        </div>
      </div>
    </template>

    <!-- Phase: done -->
    <template v-else-if="phase === 'done'">
      <div class="rounded-xl border border-state-success-border bg-state-success-bg p-6 flex items-center gap-3">
        <svg class="w-8 h-8 text-state-success-icon flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-base font-semibold text-state-success-text">Liquidación registrada exitosamente</p>
          <p class="text-sm text-state-success-text mt-0.5">El empleado ha sido marcado como retirado y el asiento contable fue generado.</p>
        </div>
      </div>
    </template>

  </div>
</template>
