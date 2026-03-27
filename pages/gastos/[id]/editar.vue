<template>
  <div class="page-layout">
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Guardando cambios...</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Edit Form -->
    <div v-else-if="expense">
      <!-- Header -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
        <div class="p-4 sm:p-6">
          <h1 class="text-xl sm:text-2xl font-bold text-text-primary mb-2">Editar Gasto</h1>
          <p class="text-sm text-text-secondary">Modifica los datos del gasto</p>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit">
        <div class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6">Información del Gasto</h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <!-- Date -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Fecha del Gasto *
                </label>
                <input
                  type="date"
                  v-model="form.transactionDate"
                  required
                  class="input-base w-full px-4 py-2"
                />
              </div>

              <!-- Category -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Categoría *
                </label>
                <select
                  v-model="form.expenseCategoryId"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <option value="" disabled>Seleccionar categoría...</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.categoryName }}
                  </option>
                </select>
              </div>

              <!-- Description -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Descripción *
                </label>
                <input
                  type="text"
                  v-model="form.description"
                  required
                  class="input-base w-full px-4 py-2"
                  placeholder="Ej: Reparación de tubería"
                />
              </div>

              <!-- Amount -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Monto *
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                  <input
                    type="number"
                    v-model.number="form.amount"
                    required
                    min="0"
                    step="100"
                    class="input-base w-full pl-8 pr-4 py-2"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="bg-surface border-t border-border shadow-lg mt-6">
          <div class="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
            <div class="flex justify-between items-center gap-3">
              <NuxtLink
                :to="`/gastos/${expenseId}`"
                class="btn-secondary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
              >
                Cancelar
              </NuxtLink>

              <button
                type="submit"
                :disabled="isSubmitting || !isFormValid"
                class="btn-primary px-4 sm:px-6 py-2 rounded-lg disabled:opacity-50 text-sm sm:text-base bg-success hover:bg-success/90"
              >
                {{ isSubmitting ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const expenseId = route.params.id as string

const { currentTenant } = useTenantReactive()

// State
const isSubmitting = ref(false)

// Load categories
const { data: categoriesData } = await useAsyncData(
  `expense-categories-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/finance/expenses/categories'),
  {
    server: false,
    default: () => ({ data: [] })
  }
)

const categories = computed(() => {
  const data = categoriesData.value
  if (!data) return []
  return Array.isArray(data) ? data : (data.data || [])
})

// Fetch expense data
const { data: expenseData, pending: isLoading, error: fetchError } = await useAsyncData(
  `expense-edit-${expenseId}`,
  () => $fetch(`/api/finance/expenses/${expenseId}`),
  {
    server: false
  }
)

const expense = computed(() => expenseData.value?.data)

// Form state
const form = reactive({
  transactionDate: '',
  expenseCategoryId: '',
  description: '',
  amount: null as number | null
})

// Initialize form with expense data
watch(expense, (newExpense) => {
  if (newExpense) {
    form.transactionDate = newExpense.transactionDate?.split('T')[0] || ''
    form.expenseCategoryId = newExpense.expenseCategoryId || ''
    form.description = newExpense.description || ''
    form.amount = newExpense.amount || null
  }
}, { immediate: true })

useHead({
  title: expense.value ? `Editar - ${expense.value.description}` : 'Editar Gasto'
})

// Validation
const isFormValid = computed(() => {
  return form.transactionDate && form.expenseCategoryId && form.description && form.amount && form.amount > 0
})

// Submit
const handleSubmit = async () => {
  if (!isFormValid.value) {
    alert('Por favor complete todos los campos requeridos')
    return
  }

  isSubmitting.value = true
  try {
    // Send JSON payload
    const payload = {
      transactionDate: form.transactionDate,
      expenseCategoryId: form.expenseCategoryId,
      description: form.description,
      amount: form.amount
    }

    await $fetch(`/api/finance/expenses/${expenseId}`, {
      method: 'PUT',
      body: payload
    })

    // Success - redirect to detail
    navigateTo(`/gastos/${expenseId}`)
  } catch (error: any) {
    console.error('Error updating expense:', error)

    let errorMessage = 'Error al actualizar el gasto. Por favor intente nuevamente.'

    if (error?.data?.detail) {
      if (typeof error.data.detail === 'string') {
        errorMessage = error.data.detail
      } else if (Array.isArray(error.data.detail)) {
        errorMessage = error.data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
      } else {
        errorMessage = JSON.stringify(error.data.detail)
      }
    } else if (error?.message) {
      errorMessage = error.message
    }

    alert(errorMessage)
  } finally {
    isSubmitting.value = false
  }
}
</script>
