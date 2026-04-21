<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'

useHead({ title: 'Nómina — Equipo' })

const { currentTenant } = useTenantReactive()

// Year selector
const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

// State
const isLoading = ref(true)
const employees = ref<any[]>([])
const benefitMap = ref<Record<string, {
  primaS1?: number
  primaS2?: number
  cesantias?: number
  intCesantias?: number
  vacaciones?: number
}>>({})

const { formatCurrency } = useFormatters()

async function loadData() {
  isLoading.value = true
  benefitMap.value = {}

  try {
    // 1. Fetch employee list
    const empData = await $fetch<any>('/api/salaries/employees')
    const eligible = (empData?.data || []).filter(
      (e: any) => e.employment_type !== 'contractor'
    )
    employees.value = eligible

    // 2. For each employee, fetch all 4 benefit endpoints in parallel
    await Promise.all(
      eligible.map(async (emp: any) => {
        const [primaRes, cesantiasRes, intCesantiasRes, vacacionesRes] = await Promise.all([
          $fetch<any>(`/api/salaries/employees/${emp.id}/prima`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/cesantias`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/int-cesantias`).catch(() => null),
          $fetch<any>(`/api/salaries/employees/${emp.id}/vacaciones`).catch(() => null),
        ])

        const yr = selectedYear.value
        const entry: typeof benefitMap.value[string] = {}

        // Prima: filter by semestre starting with selected year
        const primas: any[] = primaRes?.data || []
        const primaS1 = primas.find((p: any) => p.semestre === `${yr}-S1`)
        const primaS2 = primas.find((p: any) => p.semestre === `${yr}-S2`)
        if (primaS1) entry.primaS1 = Number(primaS1.prima_amount)
        if (primaS2) entry.primaS2 = Number(primaS2.prima_amount)

        // Cesantías: filter by anio
        const cesantias: any[] = cesantiasRes?.data || []
        const ces = cesantias.find((c: any) => c.anio === yr)
        if (ces) entry.cesantias = Number(ces.cesantias_amount)

        // Intereses cesantías
        const intCes: any[] = intCesantiasRes?.data || []
        const intC = intCes.find((c: any) => c.anio === yr)
        if (intC) entry.intCesantias = Number(intC.int_cesantias_amount)

        // Vacaciones
        const vacs: any[] = vacacionesRes?.data || []
        const vac = vacs.find((v: any) => v.anio === yr)
        if (vac) entry.vacaciones = Number(vac.vacaciones_amount)

        benefitMap.value[emp.id] = entry
      })
    )
  } catch (e) {
    console.error('Error loading nómina data', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (currentTenant.value) loadData()
})

watch(() => currentTenant.value?.id, (id) => {
  if (id) loadData()
})

watch(selectedYear, () => {
  loadData()
})

const fmt = (v: number) => formatCurrency(v)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header row: year selector -->
    <div class="flex items-center gap-3">
      <label for="year-select" class="text-sm font-medium text-text-secondary whitespace-nowrap">Año</label>
      <select
        id="year-select"
        v-model="selectedYear"
        class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="employees.length === 0"
      class="flex flex-col items-center justify-center min-h-[300px] gap-3 text-text-secondary"
    >
      <svg class="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p class="text-sm">No hay empleados ni jornaleros registrados.</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-surface-secondary/50">
              <th class="text-left px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">Empleado</th>
              <th class="text-center px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">Prima S1</th>
              <th class="text-center px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">Prima S2</th>
              <th class="text-center px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">Cesantías</th>
              <th class="text-center px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">Int. Cesantías</th>
              <th class="text-center px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">Vacaciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(emp, idx) in employees"
              :key="emp.id"
              class="border-b border-border last:border-0 transition-colors hover:bg-surface-secondary/30"
              :class="idx % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/20'"
            >
              <!-- Employee name -->
              <td class="px-4 py-3">
                <NuxtLink
                  :to="`/equipo/salarios/${emp.id}`"
                  class="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <div
                    class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                    :style="{ backgroundColor: emp.color }"
                  >
                    {{ emp.initials }}
                  </div>
                  <span class="font-medium text-text-primary">{{ emp.name }}</span>
                  <span
                    v-if="emp.employment_type === 'daily'"
                    class="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium"
                  >Jornalero</span>
                </NuxtLink>
              </td>

              <!-- Prima S1 -->
              <td class="px-4 py-3 text-center">
                <span
                  v-if="benefitMap[emp.id]?.primaS1 != null"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ fmt(benefitMap[emp.id].primaS1!) }}
                </span>
                <NuxtLink
                  v-else
                  :to="`/equipo/salarios/${emp.id}/prestaciones/prima`"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px]"
                  :aria-label="`Registrar prima S1 para ${emp.name}`"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Registrar
                </NuxtLink>
              </td>

              <!-- Prima S2 -->
              <td class="px-4 py-3 text-center">
                <span
                  v-if="benefitMap[emp.id]?.primaS2 != null"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ fmt(benefitMap[emp.id].primaS2!) }}
                </span>
                <NuxtLink
                  v-else
                  :to="`/equipo/salarios/${emp.id}/prestaciones/prima`"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px]"
                  :aria-label="`Registrar prima S2 para ${emp.name}`"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Registrar
                </NuxtLink>
              </td>

              <!-- Cesantías -->
              <td class="px-4 py-3 text-center">
                <span
                  v-if="benefitMap[emp.id]?.cesantias != null"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ fmt(benefitMap[emp.id].cesantias!) }}
                </span>
                <NuxtLink
                  v-else
                  :to="`/equipo/salarios/${emp.id}/prestaciones/cesantias`"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px]"
                  :aria-label="`Registrar cesantías para ${emp.name}`"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Registrar
                </NuxtLink>
              </td>

              <!-- Int. Cesantías -->
              <td class="px-4 py-3 text-center">
                <span
                  v-if="benefitMap[emp.id]?.intCesantias != null"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ fmt(benefitMap[emp.id].intCesantias!) }}
                </span>
                <NuxtLink
                  v-else
                  :to="`/equipo/salarios/${emp.id}/prestaciones/int-cesantias`"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px]"
                  :aria-label="`Registrar intereses cesantías para ${emp.name}`"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Registrar
                </NuxtLink>
              </td>

              <!-- Vacaciones -->
              <td class="px-4 py-3 text-center">
                <span
                  v-if="benefitMap[emp.id]?.vacaciones != null"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ fmt(benefitMap[emp.id].vacaciones!) }}
                </span>
                <NuxtLink
                  v-else
                  :to="`/equipo/salarios/${emp.id}/prestaciones/vacaciones`"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors min-h-[28px]"
                  :aria-label="`Registrar vacaciones para ${emp.name}`"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Registrar
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
