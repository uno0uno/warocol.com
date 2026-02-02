<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-ebony-800 mb-2">Error al cargar los empleados.</p>
        <p class="text-sm text-ebony-600">{{ fetchError.message }}</p>
        <button @click="refresh" class="mt-4 px-4 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <!-- Total Nomina -->
        <SharedMetricCard
          title="Nomina Mensual"
          :value="totalPayroll"
          format="currency"
          variant="primary"
          size="sm"
          :icon="CurrencyDollarIcon"
        />

        <!-- Empleados con salario -->
        <SharedMetricCard
          title="Empleados"
          :value="`${employeesWithSalary} / ${totalEmployees}`"
          format="text"
          variant="primary"
          size="sm"
          :icon="UsersIcon"
        />

        <!-- SMMLV Referencia -->
        <SharedMetricCard
          title="SMMLV 2026"
          :value="smmlv"
          format="currency"
          variant="primary"
          size="sm"
          :icon="CalculatorIcon"
        />
      </div>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="columns"
        :data="employees"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        title="Gestion de Salarios"
        empty-message="No hay empleados registrados"
        empty-sub-message="Los empleados apareceran aqui cuando sean agregados al equipo"
        variant="default"
      >
        <!-- Mobile Actions -->
        <template #mobileActions>
          <div class="flex flex-col gap-2">
            <div class="relative">
              <UiSearchWithField
                v-model="searchTerm"
                v-model:fieldValue="searchField"
                :fields="searchFields"
                placeholder="Buscar..."
                class="w-full"
                @search="performSearch"
              />
            </div>
          </div>
        </template>

        <!-- Mobile Card -->
        <template #card="{ item }">
          <div class="p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
                  :style="{ backgroundColor: item.color }">
                  {{ item.initials }}
                </div>
                <div>
                  <p class="font-medium text-ebony-800">{{ item.name }}</p>
                  <p class="text-xs text-titan-600">{{ item.role_label }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-ebony-800">{{ formatCurrency(item.calculated_salary || 0) }}</p>
                <p class="text-xs text-titan-600">
                  {{ item.salary_type === 'smmlv' ? `${item.multiplier || 0}x SMMLV` : item.salary_type === 'fixed' ? 'Fijo' : 'Sin config' }}
                </p>
              </div>
            </div>
            <div class="flex gap-2">
              <NuxtLink
                :to="`/equipo/salarios/${item.id}/configurar`"
                class="flex-1 px-3 py-2 text-sm text-center border border-titan-200 rounded-lg text-ebony-700 hover:bg-titan-50"
              >
                Configurar
              </NuxtLink>
              <NuxtLink
                :to="`/equipo/salarios/${item.id}/pago`"
                class="flex-1 px-3 py-2 text-sm text-center btn-primary rounded-lg"
              >
                Registrar Pago
              </NuxtLink>
            </div>
          </div>
        </template>

        <!-- Desktop Header -->
        <template #header>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <h3 class="text-base sm:text-lg font-bold text-ebony-800">
              Gestion de Salarios
            </h3>
          </div>
        </template>

        <!-- Desktop Table Cells - Simple one data per column -->
        <template #cell-name="{ value }">
          <span class="text-sm font-bold text-ebony-800">{{ value }}</span>
        </template>

        <template #cell-email="{ value }">
          <span class="text-sm text-titan-600">{{ value }}</span>
        </template>

        <template #cell-role_label="{ value }">
          <span class="text-sm text-titan-600">{{ value }}</span>
        </template>

        <template #cell-calculated_salary="{ value }">
          <span class="text-sm font-medium text-ebony-800">{{ formatCurrency(value || 0) }}</span>
        </template>

        <template #cell-salary_type_label="{ row }">
          <span class="text-sm text-titan-600">
            {{ row.salary_type === 'smmlv' ? `${row.multiplier || 0}x SMMLV` : row.salary_type === 'fixed' ? 'Fijo' : '-' }}
          </span>
        </template>

        <template #cell-status="{ row }">
          <UiStatusBadge
            :value="row.salary_type ? 'Configurado' : 'Pendiente'"
            format="text"
            :variant="row.salary_type ? 'success' : 'warning'"
            size="sm"
          />
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <NuxtLink
              :to="`/equipo/salarios/${row.id}/configurar`"
              class="text-blue-600 hover:text-blue-900 transition-colors"
              title="Configurar salario"
            >
              <Cog6ToothIcon class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink
              :to="`/equipo/salarios/${row.id}/pago`"
              class="text-emerald-600 hover:text-emerald-900 transition-colors"
              title="Registrar pago"
            >
              <BanknotesIcon class="h-4 w-4" />
            </NuxtLink>
            <NuxtLink
              :to="`/equipo/salarios/${row.id}`"
              class="text-crocus-600 hover:text-crocus-900 transition-colors"
              title="Ver historial"
            >
              <EyeIcon class="h-4 w-4" />
            </NuxtLink>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>
  </div>
</template>

<script setup>
import {
  CurrencyDollarIcon,
  UsersIcon,
  CalculatorIcon,
  Cog6ToothIcon,
  BanknotesIcon,
  EyeIcon
} from '@heroicons/vue/24/outline'
import { inject, onMounted } from 'vue'

useHead({ title: 'Salarios - Equipo' })

const toast = useToast()
const { currentTenant, onTenantChange } = useTenantReactive()

// SMMLV 2026
const smmlv = ref(1423500)

// Search state
const searchTerm = ref('')
const searchField = ref('name')

const searchFields = [
  { label: 'Nombre', value: 'name' },
  { label: 'Email', value: 'email' },
  { label: 'Rol', value: 'role_label' }
]

const performSearch = () => {
  // Filter handled client-side
}

// Sorting state
const sortField = ref('')
const sortDirection = ref('asc')

const handleSort = (field) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

// Fetch employees with salary data
const { data: employeesData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `employees-salaries-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/salaries/employees'),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ success: true, data: [], smmlv: 1423500 }),
    transform: (response) => {
      if (response?.smmlv) {
        smmlv.value = response.smmlv
      }
      return response?.data || []
    }
  }
)




// Filtered and sorted employees
const employees = computed(() => {
  let data = employeesData.value || []

  // Filter by search
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    data = data.filter(e => {
      const fieldValue = e[searchField.value]
      return fieldValue && String(fieldValue).toLowerCase().includes(term)
    })
  }

  // Sort
  if (sortField.value) {
    data = [...data].sort((a, b) => {
      const aValue = a[sortField.value]
      const bValue = b[sortField.value]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
      }

      const strA = String(aValue).toLowerCase()
      const strB = String(bValue).toLowerCase()
      return sortDirection.value === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
    })
  }

  return data
})

// Summary stats
const totalEmployees = computed(() => (employeesData.value || []).length)
const employeesWithSalary = computed(() =>
  (employeesData.value || []).filter(e => e.salary_type).length
)
const totalPayroll = computed(() =>
  (employeesData.value || []).reduce((sum, e) => sum + (e.calculated_salary || 0), 0)
)

// Table columns - one data item per column
const columns = [
  { key: 'name', title: 'Nombre', sortable: true, format: 'text', align: 'left' },
  { key: 'email', title: 'Email', sortable: true, format: 'text', align: 'left' },
  { key: 'role_label', title: 'Rol', sortable: true, format: 'text', align: 'left' },
  { key: 'calculated_salary', title: 'Salario', sortable: true, format: 'currency', align: 'right' },
  { key: 'salary_type_label', title: 'Tipo', sortable: false, format: 'text', align: 'center' },
  { key: 'status', title: 'Estado', sortable: false, format: 'text', align: 'center' },
  { key: 'actions', title: 'Acciones', sortable: false, format: 'text', align: 'center' }
]

// Formatters
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Inject refresh handler
const setRefreshHandler = inject('setRefreshHandler', () => {})
onMounted(() => {
  setRefreshHandler(refresh)
})
</script>
