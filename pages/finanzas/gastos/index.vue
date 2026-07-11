<script setup lang="ts">
const { t } = useI18n()
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { useFormatters } from '~/composables/useFormatters'
import { filterSelectClass } from '~/composables/useFilterSelectClass'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import MetricCard from '~/components/shared/MetricCard.vue'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })

useHead({ title: 'Gastos' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()
const { todayISO } = useTenantTimezone()
const cache = useQueryCache()

const defaultMonth = () => todayISO().slice(0, 7)
const currentMonth = ref(defaultMonth())
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const categoryFilter = ref('')
const expenseTypeFilter = ref('')

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!categoryFilter.value
    || !!expenseTypeFilter.value
    || currentMonth.value !== defaultMonth(),
)

const performSearch = () => applySearch()

const EXPENSE_TYPE_LABELS = computed<Record<string, string>>(() => ({
  cogs: t('finanzas.gastos.typeCogs'),
  admin_expense: t('finanzas.gastos.typeAdmin'),
  sales_expense: t('finanzas.gastos.typeSales'),
  financial_expense: t('finanzas.gastos.typeFinancial'),
  other_expense: t('finanzas.gastos.typeOther'),
}))

const expenseTypeFilterOptions = computed(() => Object.entries(EXPENSE_TYPE_LABELS.value).map(([value, label]) => ({ value, label })))

// Load categories from API
const { data: categoriesData } = useQuery({
  key: () => ['finance', 'expense-categories', currentTenant.value?.id],
  query: () => $fetch('/api/finance/expenses/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const categories = computed(() => (categoriesData.value as any)?.data || [])
const categoryFilterOptions = computed(() =>
  categories.value.map((cat: any) => ({
    label: cat.categoryName,
    value: cat.id,
  })),
)

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
  categoryFilter.value = ''
  expenseTypeFilter.value = ''
  currentMonth.value = defaultMonth()
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const { formatCalendarDate } = useFormatters()

// Table columns
const expensesTableColumns = [
  { key: 'expenseNumber', title: t('finanzas.gastos.colNumber'), sortable: false },
  { key: 'transactionDate', title: t('finanzas.gastos.colDate'), sortable: true },
  { key: 'category', title: t('finanzas.gastos.colCategory'), sortable: false },
  { key: 'expenseType', title: t('finanzas.gastos.colType'), sortable: false },
  { key: 'isRecurring', title: t('finanzas.gastos.recurring'), sortable: false },
  { key: 'description', title: t('finanzas.gastos.colDesc'), sortable: true },
  { key: 'amount', title: t('finanzas.gastos.colAmount'), sortable: true },
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

    // Invalidate list + detail so UI updates optimistically (progressive refresh)
    cache.invalidateQueries({ key: ['finance', 'expenses'] })
    cache.invalidateQueries({ key: ['expense', expenseId] })
    await refetch()
  } catch (error: any) {
    console.error('Error deleting expense:', error)
    alert(error?.data?.detail || t('finanzas.gastos.deleteError'))
  }
}

// Set refresh handler for layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
// Progressive: full-page loader only on first fetch; refetches use header matrix
registerProgressiveLoading(isRefreshing)
// When returning from crear/editar/detalle, force a background refresh
useMenuReturnRefresh('/finanzas/gastos', refetch, 'finanzas-last-path')
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })
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
        :search-placeholder="t('finanzas.gastos.search')"
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
            :class="[filterSelectClass, 'min-w-[9rem] cursor-pointer']"
            aria-label="Filtrar por mes"
          >
          <select
            v-model="categoryFilter"
            :class="[filterSelectClass, 'md:hidden']"
            aria-label="Filtrar por categoría"
          >
            <option value="">Categoría</option>
            <option v-for="option in categoryFilterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select
            v-model="expenseTypeFilter"
            :class="[filterSelectClass, 'md:hidden']"
            aria-label="Filtrar por tipo de gasto"
          >
            <option value="">Tipo</option>
            <option v-for="option in expenseTypeFilterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </template>
        <template #trailing>
          <NuxtLink
            to="/finanzas/gastos/crear"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
          >
            <span class="hidden sm:inline">{{ t('finanzas.gastos.save') }}</span>
            <span class="sm:hidden">{{ t('finanzas.gastos.new') }}</span>
          </NuxtLink>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        row-size="sm"
        :columns="expensesTableColumns"
        :data="expenses"
        empty-message="No hay gastos registrados"
        empty-sub-message="Los gastos del mes aparecerán aquí"
        variant="default"
      >
        <template #header-category>
          <UiTableHeaderFilter
            v-model="categoryFilter"
            title="Categoría"
            filter-type="select"
            :options="categoryFilterOptions"
            :all-label="t('finanzas.gastos.allCategories')"
          />
        </template>

        <template #header-expenseType>
          <UiTableHeaderFilter
            v-model="expenseTypeFilter"
            title="Tipo"
            filter-type="select"
            :options="expenseTypeFilterOptions"
            :all-label="t('finanzas.gastos.allTypes')"
          />
        </template>

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
                <span class="text-xs text-text-secondary">{{ formatCalendarDate(item.transactionDate) }}</span>
              </div>
              <p class="text-xs text-text-secondary mt-0.5 truncate">
                {{ item.category?.categoryName || t('finanzas.common.noCategory') }}{{ item.description ? ` · ${item.description}` : '' }}
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
          <span class="text-sm text-text-secondary">{{ formatCalendarDate(value) }}</span>
        </template>

        <template #cell-category="{ value }">
          <UiStatusBadge :value="value?.categoryName || t('finanzas.common.noCategory')" format="text" variant="secondary" size="sm" />
        </template>

        <template #cell-expenseType="{ value }">
          <UiStatusBadge
            v-if="value"
            :value="EXPENSE_TYPE_LABELS[value] || value"
            format="text"
            :variant="value === 'cogs' ? 'warning' : value === 'financial_expense' ? 'destructive' : value === 'admin_expense' ? 'info' : value === 'other_expense' ? 'secondary' : 'primary'"
            size="sm"
          />
          <span v-else class="text-xs text-text-secondary">{{ t('finanzas.gastos.unclassified') }}</span>
        </template>

        <template #cell-isRecurring="{ value }">
          <div class="flex justify-center">
            <UiStatusBadge v-if="value" :value="t('common.yes')" format="text" variant="info" size="sm" />
            <span v-else class="text-sm text-text-secondary">{{ t('common.no') }}</span>
          </div>
        </template>

        <template #cell-description="{ value }">
          <span class="text-sm font-medium text-text-primary">{{ value || t('finanzas.gastos.noDesc') }}</span>
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
