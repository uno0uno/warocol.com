/**
 * Expenses Store
 * Migrated to Pinia Colada useQuery + useMutation — eliminates useFetch-in-store
 * anti-pattern and manual isLoading/error/try-catch/finally boilerplate.
 *
 * fetchExpenses(params) updates reactive filter refs; useQuery re-runs automatically.
 * No active callers in current pages (gastos/ uses useAsyncData directly) — zero-risk migration.
 */
import { defineStore } from 'pinia'

export interface ExpenseCategory {
    id: string
    categoryCode: string
    categoryName: string
    description?: string
    isActive: boolean
}

export interface Expense {
    id: string
    tenantId: string
    expenseCategoryId: string
    monthYear: string
    amount: number
    description?: string
    sourceSystem?: string
    createdAt: string
    transactionDate: string
    category?: ExpenseCategory
}

export interface ExpenseCreate {
    expenseCategoryId: string
    amount: number
    description?: string
    transactionDate: string
}

export interface ExpenseUpdate {
    expenseCategoryId?: string
    amount?: number
    description?: string
    transactionDate?: string
}

export interface ExpensesStats {
    totalAmount: number
    count: number
    byCategory: Record<string, number>
}

export const useExpensesStore = defineStore('expenses', () => {
    const cache = useQueryCache()

    // ── Filter state — fetchExpenses(params) sets these; query re-runs automatically ──
    const page = ref(1)
    const limit = ref(20)
    const filters = ref<{ month_year?: string; category_id?: string; search?: string }>({})

    // ── Categories query ──────────────────────────────────────────────────────────────
    const { data: categoriesData } = useQuery({
        key: ['expenses', 'categories'],
        query: () => $fetch<{ success: boolean; data: ExpenseCategory[] }>('/api/finance/expenses/categories'),
    })

    const categories = computed<ExpenseCategory[]>(() => categoriesData.value?.data ?? [])

    // ── Expenses list query (reactive key tracks pagination + filters) ─────────────
    const { data: expensesData, status } = useQuery({
        key: () => ['expenses', 'list', { page: page.value, limit: limit.value, ...filters.value }],
        query: () => $fetch<{ success: boolean; data: Expense[]; stats: ExpensesStats; total: number }>(
            '/api/finance/expenses',
            { query: { page: page.value, limit: limit.value, ...filters.value } }
        ),
    })

    const expenses = computed<Expense[]>(() => expensesData.value?.data ?? [])
    const stats = computed<ExpensesStats | null>(() => expensesData.value?.stats ?? null)
    const totalCount = computed<number>(() => expensesData.value?.total ?? 0)
    const isLoading = computed(() => status.value === 'loading')
    const error = computed(() => null as string | null)

    // ── Public API: fetchCategories / fetchExpenses ──────────────────────────────
    const fetchCategories = () =>
        cache.invalidateQueries({ key: ['expenses', 'categories'] })

    const fetchExpenses = (
        params: { page?: number; limit?: number; month_year?: string; category_id?: string; search?: string } = {}
    ) => {
        page.value = params.page ?? 1
        limit.value = params.limit ?? 20
        filters.value = {
            month_year: params.month_year,
            category_id: params.category_id,
            search: params.search,
        }
        // Reactive key change triggers automatic refetch
    }

    // ── Mutations ─────────────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutation: (expense: ExpenseCreate) =>
            $fetch<{ success: boolean; data: Expense }>('/api/finance/expenses', {
                method: 'POST',
                body: expense,
            }),
        onSettled: () => cache.invalidateQueries({ key: ['expenses'] }),
    })

    const updateMutation = useMutation({
        mutation: ({ id, updates }: { id: string; updates: ExpenseUpdate }) =>
            $fetch<{ success: boolean; data: Expense }>(`/api/finance/expenses/${id}`, {
                method: 'PUT',
                body: updates,
            }),
        onSettled: () => cache.invalidateQueries({ key: ['expenses'] }),
    })

    const deleteMutation = useMutation({
        mutation: (id: string) => $fetch(`/api/finance/expenses/${id}`, { method: 'DELETE' }),
        onSettled: () => cache.invalidateQueries({ key: ['expenses'] }),
    })

    const createExpense = (expense: ExpenseCreate) => createMutation.mutateAsync(expense)
    const updateExpense = (id: string, updates: ExpenseUpdate) => updateMutation.mutateAsync({ id, updates })
    const deleteExpense = (id: string) => deleteMutation.mutateAsync(id)

    return {
        expenses,
        categories,
        stats,
        isLoading,
        error,
        totalCount,
        fetchCategories,
        fetchExpenses,
        createExpense,
        updateExpense,
        deleteExpense,
    }
})
