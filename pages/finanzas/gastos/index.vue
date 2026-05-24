<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import MetricCard from '~/components/shared/MetricCard.vue'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Gastos' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

const defaultMonth = () => new Date().toISOString().slice(0, 7)
const currentMonth = ref(defaultMonth())
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const categoryFilter = ref<string | null>(null)
const expenseTypeFilter = ref<string | null>(null)

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!categoryFilter.value
    || !!expenseTypeFilter.value
    || currentMonth.value !== defaultMonth(),
)

const performSearch = () => applySearch()

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  cogs: 'Costo de ventas',
  admin_expense: 'Gasto administrativo',
  sales_expense: 'Gasto de ventas',
  financial_expense: 'Gasto financiero',
  other_expense: 'Otro gasto',
}

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
    search: appliedSearch.value || null,
    expenseType: expenseTypeFilter.value || null,
  }],
  query: () => $fetch('/api/finance/expenses', {
    params: {
      month_year: currentMonth.value,
      category_id: categoryFilter.value || undefined,
      search: appliedSearch.value || undefined,
      expense_type: expenseTypeFilter.value || undefined,
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

const clearFilters = () => {
  clearSearch()
  categoryFilter.value = null
  expenseTypeFilter.value = null
  currentMonth.value = defaultMonth()
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
  { key: 'expenseNumber', title: 'Número', sortable: false },
  { key: 'transactionDate', title: 'Fecha', sortable: true },
  { key: 'category', title: 'Categoría', sortable: false },
  { key: 'expenseType', title: 'Tipo', sortable: false },
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
      <div v-if="stats" class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3">
        <MetricCard title="Total gastos" :value="stats.totalAmount" format="currency" variant="primary" />
        <MetricCard title="Transacciones" :value="stats.count" format="number" variant="primary" />
        <MetricCard
          title="Promedio"
          :value="stats.count > 0 ? stats.totalAmount / stats.count : 0"
          format="currency"
          variant="primary"
          class="col-span-2 md:col-span-1"
        />
      </div>

      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        search-placeholder="Buscar gastos..."
        :search-fields="[]"
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <input
            v-model="currentMonth"
            type="month"
            :class="filterSelectClass"
            class="min-w-[9rem] cursor-pointer"
            aria-label="Filtrar por mes"
          >
          <select
            v-model="categoryFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por categoría"
          >
            <option :value="null">Categoría</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.categoryName }}
            </option>
          </select>
          <select
            v-model="expenseTypeFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por tipo de gasto"
          >
            <option :value="null">Tipo</option>
            <option value="cogs">Costo de ventas</option>
            <option value="admin_expense">Gasto administrativo</option>
            <option value="sales_expense">Gasto de ventas</option>
            <option value="financial_expense">Gasto financiero</option>
            <option value="other_expense">Otro gasto</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Responsive Data View -->
      <HealthSemaphore :is-unlocked="true" title="Control de Gastos">
        <template #header-actions>
          <NuxtLink
            to="/finanzas/gastos/crear"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
          >
            <span class="hidden sm:inline">+ Registrar Gasto</span>
            <span class="sm:hidden">+ Nuevo</span>
          </NuxtLink>
        </template>
      <UiResponsiveDataView
        row-size="sm"
        :columns="expensesTableColumns"
        :data="expenses"
        empty-message="No hay gastos registrados"
        empty-sub-message="Los gastos del mes aparecerán aquí"
        variant="default"
      >
        <!-- Mobile Card -->
        <template #card="{ item, index }">
          <div
            v-if="item"
            class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            @click="navigateTo(`/finanzas/gastos/${item.id}`)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <span class="text-sm font-bold text-text-primary">{{ item.expenseNumber || '—' }}</span>
                <span class="text-xs text-text-secondary">{{ formatDate(item.transactionDate) }}</span>
              </div>
              <p class="text-xs text-text-secondary mt-0.5 truncate">
                {{ item.category?.categoryName || 'Sin categoría' }}{{ item.description ? ` · ${item.description}` : '' }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(item.amount) }}</span>
              <UiStatusBadge v-if="item.isRecurring" value="Recurrente" format="text" variant="info" size="sm" />
            </div>
          </div>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-expenseNumber="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value || '—' }}</span>
        </template>

        <template #cell-transactionDate="{ value }">
          <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
        </template>

        <template #cell-category="{ value }">
          <UiStatusBadge :value="value?.categoryName || 'Sin categoría'" format="text" variant="secondary" size="sm" />
        </template>

        <template #cell-expenseType="{ value }">
          <UiStatusBadge
            v-if="value"
            :value="EXPENSE_TYPE_LABELS[value] || value"
            format="text"
            :variant="value === 'cogs' ? 'warning' : value === 'financial_expense' ? 'destructive' : value === 'admin_expense' ? 'info' : value === 'other_expense' ? 'secondary' : 'primary'"
            size="sm"
          />
          <span v-else class="text-xs text-text-secondary">Sin clasificar</span>
        </template>

        <template #cell-isRecurring="{ value }">
          <div class="flex justify-center">
            <UiStatusBadge v-if="value" value="Sí" format="text" variant="info" size="sm" />
            <span v-else class="text-sm text-text-secondary">No</span>
          </div>
        </template>

        <template #cell-description="{ value }">
          <span class="text-sm font-medium text-text-primary">{{ value || 'Sin descripción' }}</span>
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
      </HealthSemaphore>
    </div>
  </div>
</template>
