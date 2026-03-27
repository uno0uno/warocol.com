<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Salarios' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// State
const localSearchTerm = ref('')

// Fetch employees with salary data
const { data: employeesData, status: queryStatus, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['salaries', 'employees', currentTenant.value?.id],
  query: () => $fetch('/api/salaries/employees'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !employeesData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && employeesData.value != null)

// Computed
const employees = computed(() => {
  let data = employeesData.value?.data || []

  // Filter by search
  if (localSearchTerm.value) {
    const term = localSearchTerm.value.toLowerCase()
    data = data.filter(e =>
      (e.name && e.name.toLowerCase().includes(term)) ||
      (e.email && e.email.toLowerCase().includes(term)) ||
      (e.role_label && e.role_label.toLowerCase().includes(term))
    )
  }

  return data
})

const smmlv = computed(() => employeesData.value?.smmlv || 1423500)

// Stats
const stats = computed(() => {
  const data = employeesData.value?.data || []
  return {
    totalPayroll: data.reduce((sum, e) => sum + (e.calculated_salary || 0), 0),
    totalEmployees: data.length,
    employeesWithSalary: data.filter(e => e.salary_type).length
  }
})

// Methods
const performSearch = () => {
  // Trigger reactivity by keeping the search term
}

const clearFilters = () => {
  localSearchTerm.value = ''
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

// Table columns
const employeesTableColumns = [
  { key: 'name', title: 'Nombre', sortable: true },
  { key: 'email', title: 'Email', sortable: false },
  { key: 'role_label', title: 'Rol', sortable: false },
  { key: 'calculated_salary', title: 'Salario', sortable: true },
  { key: 'salary_type_display', title: 'Tipo', sortable: false },
  { key: 'actions', title: '', sortable: false }
]

// Delete employee
const deleteEmployee = async (employeeId: string) => {
  if (!confirm('¿Estás seguro de que deseas eliminar este empleado? Esta acción no se puede deshacer.')) {
    return
  }

  try {
    await $fetch(`/api/team/employees/${employeeId}`, {
      method: 'DELETE'
    })

    // Refresh the list after deletion
    await refetch()
  } catch (error: any) {
    console.error('Error deleting employee:', error)
    alert(error?.data?.detail || 'Error al eliminar empleado')
  }
}

// Set refresh handler for layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  setRefreshHandler(refetch)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar los empleados.</p>
        <p class="text-sm text-text-secondary">{{ fetchError.message }}</p>
        <button @click="refresh" class="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Metrics Cards -->
      <div v-if="stats" class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <SharedMetricCard
          title="Nómina Mensual"
          :value="stats.totalPayroll"
          format="currency"
          variant="primary"
          size="sm"
        />
        <SharedMetricCard
          title="Empleados"
          :value="stats.totalEmployees"
          format="number"
          variant="primary"
          size="sm"
        />
        <SharedMetricCard
          title="Con Salario"
          :value="stats.employeesWithSalary"
          format="number"
          variant="primary"
          size="sm"
        />
      </div>

      <!-- Filters Bar -->
      <div class="flex flex-wrap items-center gap-2 w-full">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[200px]">
          <button
            @click="performSearch"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <input
            v-model="localSearchTerm"
            @keydown.enter="performSearch"
            placeholder="Buscar empleados..."
            class="w-full h-10 pl-9 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Clear Filters Button -->
        <button
          v-if="localSearchTerm"
          @click="clearFilters"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          title="Limpiar filtros"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Responsive Data View -->
      <HealthSemaphore :is-unlocked="true" title="Gestión de Salarios">
        <template #header-actions>
          <NuxtLink
            to="/equipo/miembros"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
          >
            <span class="hidden sm:inline">+ Agregar Empleado</span>
            <span class="sm:hidden">+ Nuevo</span>
          </NuxtLink>
        </template>
      <UiResponsiveDataView
        :columns="employeesTableColumns"
        :data="employees"
        empty-message="No hay empleados registrados"
        empty-sub-message="Los empleados con salario configurado aparecerán aquí"
        variant="default"
        row-size="sm"
      >

        <!-- Mobile Card -->
        <template #card="{ item }">
          <div
            v-if="item"
            class="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
            @click="navigateTo(`/equipo/salarios/${item.id}`)"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
                  :style="{ backgroundColor: item.color }">
                  {{ item.initials }}
                </div>
                <div>
                  <p class="text-sm font-medium text-text-primary">{{ item.name }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <p class="text-xs text-text-secondary">{{ item.role_label }}</p>
                    <span v-if="!item.salary_type" class="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      Sin configurar
                    </span>
                  </div>
                </div>
              </div>
              <div class="text-right">
                <p class="text-lg font-bold text-primary">{{ formatCurrency(item.calculated_salary || 0) }}</p>
                <p v-if="item.salary_type" class="text-xs text-text-secondary">
                  {{ item.salary_type === 'smmlv' ? `${item.multiplier || 0}x SMMLV` : item.salary_type === 'fixed' ? 'Fijo' : 'Por hora' }}
                </p>
              </div>
            </div>
          </div>
        </template>


        <!-- Desktop Table Cells -->
        <template #cell-name="{ row }">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white text-xs flex-shrink-0"
              :style="{ backgroundColor: row.color }">
              {{ row.initials }}
            </div>
            <span class="text-sm font-medium text-text-primary">{{ row.name }}</span>
          </div>
        </template>

        <template #cell-email="{ value }">
          <span class="text-sm text-text-secondary">{{ value || '-' }}</span>
        </template>

        <template #cell-role_label="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-calculated_salary="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value || 0) }}</span>
        </template>

        <template #cell-salary_type_display="{ row }">
          <div class="flex justify-center">
            <span v-if="row.salary_type === 'smmlv'" class="text-sm text-text-secondary">
              {{ row.multiplier || 0 }}x SMMLV
            </span>
            <span v-else-if="row.salary_type === 'fixed'" class="text-sm text-text-secondary">
              Fijo
            </span>
            <span v-else-if="row.salary_type === 'hourly'" class="text-sm text-text-secondary">
              Por hora
            </span>
            <span v-else class="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
              Sin configurar
            </span>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <NuxtLink
              :to="`/equipo/salarios/${row.id}`"
              class="text-text-secondary hover:text-primary transition-colors"
              title="Ver y editar"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </NuxtLink>
            <button
              @click="deleteEmployee(row.id)"
              class="text-destructive hover:text-destructive/80 transition-colors"
              title="Eliminar"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
      </HealthSemaphore>
    </div>
  </div>
</template>
