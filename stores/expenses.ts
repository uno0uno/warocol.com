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
    const expenses = ref<Expense[]>([])
    const categories = ref<ExpenseCategory[]>([])
    const stats = ref<ExpensesStats | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const totalCount = ref(0)

    // Actions
    const fetchCategories = async () => {
        try {
            const { data } = await useFetch('/api/finance/expenses/categories')
            if (data.value?.success) {
                categories.value = data.value.data
            }
        } catch (e) {
            console.error('Failed to fetch categories', e)
        }
    }

    const fetchExpenses = async (params: { page?: number, limit?: number, month_year?: string, category_id?: string, search?: string } = {}) => {
        isLoading.value = true
        try {
            const { data } = await useFetch('/api/finance/expenses', { query: params })
            if (data.value?.success) {
                expenses.value = data.value.data
                stats.value = data.value.stats
                totalCount.value = data.value.total
            }
        } catch (e) {
            error.value = 'Failed to fetch expenses'
            console.error(e)
        } finally {
            isLoading.value = false
        }
    }

    const createExpense = async (expense: ExpenseCreate) => {
        isLoading.value = true
        try {
            const { data, error: fetchError } = await useFetch('/api/finance/expenses', {
                method: 'POST',
                body: expense
            })

            if (fetchError.value) throw fetchError.value

            if (data.value?.success) {
                return data.value.data
            }
        } catch (e) {
            console.error(e)
            throw e
        } finally {
            isLoading.value = false
        }
    }

    const updateExpense = async (id: string, updates: ExpenseUpdate) => {
        isLoading.value = true
        try {
            const { data, error: fetchError } = await useFetch(`/api/finance/expenses/${id}`, {
                method: 'PUT',
                body: updates
            })

            if (fetchError.value) throw fetchError.value

            if (data.value?.success) {
                return data.value.data
            }
        } catch (e) {
            console.error(e)
            throw e
        } finally {
            isLoading.value = false
        }
    }

    const deleteExpense = async (id: string) => {
        isLoading.value = true
        try {
            const { error: fetchError } = await useFetch(`/api/finance/expenses/${id}`, {
                method: 'DELETE'
            })

            if (fetchError.value) throw fetchError.value

            // Remove from list locally if successful
            expenses.value = expenses.value.filter(e => e.id !== id)
        } catch (e) {
            console.error(e)
            throw e
        } finally {
            isLoading.value = false
        }
    }

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
        deleteExpense
    }
})
