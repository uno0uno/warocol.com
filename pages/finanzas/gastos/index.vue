<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Gastos' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// State
const currentMonth = ref(new Date().toISOString().slice(0, 7)) // YYYY-MM
const localSearchTerm = ref('')
const apiSearchTerm = ref('')
const categoryFilter = ref<string | null>(null)

// Load categories from API
const { data: categoriesData } = useQuery({
  key: () => ['finance', 'expense-categories', currentTenant.value?.id],
  query: () => $fetch('/api/finance/expenses/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const categories = computed(() => (categoriesData.value as any)?.data || [])

// Load expenses from API
const { data: expensesData, status: queryStatus, asyncStatus: queryAsyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['finance', 'expenses', currentTenant.value?.id, {
    month: currentMonth.value,
    category: categoryFilter.value || null,
    search: apiSearchTerm.value || null,
  }],
  query: () => $fetch('/api/finance/expenses', {
    params: {
      month_year: currentMonth.value,
      category_id: categoryFilter.value || undefined,
      search: apiSearchTerm.value || undefined
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !expensesData.value && !fetchError.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && expensesData.value != null)

// Computed
const expenses = computed(() => expensesData.value?.data || [])
const stats = computed(() => expensesData.value?.stats || null)

// Methods
const performSearch = () => {
  apiSearchTerm.value = localSearchTerm.value
}

const clearFilters = () => {
  localSearchTerm.value = ''
  apiSearchTerm.value = ''
  categoryFilter.value = null
  currentMonth.value = new Date().toISOString().slice(0, 7)
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const { formatDateTime: formatDate } = useFormatters()

// Table columns
const expensesTableColumns = [
  { key: 'transactionDate', title: 'Fecha', sortable: true },
  { key: 'category', title: 'Categoría', sortable: false },
  { key: 'isRecurring', title: 'Recurrente', sortable: false },
  { key: 'description', title: 'Descripción', sortable: true },
  { key: 'amount', title: 'Monto', sortable: true },
  { key: 'actions', title: '', sortable: false }
]

// Delete expense
const deleteExpense = async (expenseId: string) => {
  if (!confirm('¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.')) {
    return
  }

  try {
    await $fetch(`/api/finance/expenses/${expenseId}`, {
      method: 'DELETE'
    })

    // Refresh the list after deletion
    await refetch()
  } catch (error: any) {
    console.error('Error deleting expense:', error)
    alert(error?.data?.detail || 'Error al eliminar el gasto')
  }
}

// Set refresh handler for layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch)
})
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Metrics Cards -->
      <div v-if="stats" class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <SharedMetricCard
          title="Total Gastos"
          :value="stats.totalAmount"
          format="currency"
          variant="primary"
          size="sm"
        />
        <SharedMetricCard
          title="Transacciones"
          :value="stats.count"
          format="number"
          variant="primary"
          size="sm"
        />
        <SharedMetricCard
          title="Promedio"
          :value="stats.count > 0 ? stats.totalAmount / stats.count : 0"
          format="currency"
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
            placeholder="Buscar gastos..."
            class="w-full h-10 pl-9 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Month Picker -->
        <input 
          type="month" 
          v-model="currentMonth"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[140px]"
        />

        <!-- Category Filter -->
        <select
          v-model="categoryFilter"
          class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[150px]"
        >
          <option :value="null">Todas las categorías</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.categoryName }}
          </option>
        </select>

        <!-- Clear Filters Button -->
        <button
          v-if="localSearchTerm || categoryFilter || currentMonth !== new Date().toISOString().slice(0, 7)"
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
      <UiResponsiveDataView
        row-size="sm"
        :columns="expensesTableColumns"
        :data="expenses"
        empty-message="No hay gastos registrados"
        empty-sub-message="Los gastos del mes aparecerán aquí"
        variant="default"
      >
        <!-- Mobile Actions -->
        <template #mobileActions>
          <NuxtLink
            to="/finanzas/gastos/crear"
            class="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium text-center hover:bg-primary/90"
          >
            + Registrar Gasto
          </NuxtLink>
        </template>

        <!-- Mobile Card -->
        <template #card="{ item }">
          <div
            v-if="item"
            class="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
            @click="navigateTo(`/finanzas/gastos/${item.id}`)"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="text-sm text-text-secondary">{{ formatDate(item.transactionDate) }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <p class="text-sm font-medium text-text-primary">{{ item.category?.categoryName || 'Sin categoría' }}</p>
                  <span v-if="item.isRecurring" class="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full" title="Gasto recurrente">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </span>
                </div>
              </div>
              <p class="text-lg font-bold text-primary">{{ formatCurrency(item.amount) }}</p>
            </div>

            <p class="text-sm text-text-secondary">{{ item.description || 'Sin descripción' }}</p>
          </div>
        </template>

        <!-- Desktop Header -->
        <template #header>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <h3 class="text-base sm:text-lg font-bold text-text-primary">
              Control de Gastos
            </h3>
            <NuxtLink
              to="/finanzas/gastos/crear"
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
            >
              <span class="hidden sm:inline">+ Registrar Gasto</span>
              <span class="sm:hidden">+ Nuevo</span>
            </NuxtLink>
          </div>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-transactionDate="{ value }">
          <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
        </template>

        <template #cell-category="{ value }">
          <span class="text-sm text-text-primary">{{ value?.categoryName || 'Sin categoría' }}</span>
        </template>

        <template #cell-isRecurring="{ value }">
          <div class="flex justify-center">
            <span v-if="value" class="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">Sí</span>
            <span v-else class="text-sm text-text-tertiary">No</span>
          </div>
        </template>

        <template #cell-description="{ value }">
          <span class="text-sm text-text-secondary">{{ value || 'Sin descripción' }}</span>
        </template>

        <template #cell-amount="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <NuxtLink
              :to="`/finanzas/gastos/${row.id}`"
              class="text-text-secondary hover:text-primary transition-colors"
              title="Ver y editar"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </NuxtLink>
            <button
              @click="deleteExpense(row.id)"
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
    </div>
  </div>
</template>
