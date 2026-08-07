<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      label="Guardando cambios..."
      hint="Estamos actualizando el gasto y sus datos asociados."
      variant="glass"
      indicator="matrix"
    />

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
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Monto *
                </label>
                <div class="relative">
                  <span class="absolute start-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-secondary pointer-events-none">{{ currencyCode }}</span>
                  <input
                    type="number"
                    v-model.number="form.amount"
                    required
                    min="0"
                    step="1"
                    class="input-base w-full ps-12 pe-4 py-2"
                    placeholder="0"
                  />
                </div>
              </div>

              <!-- Payment Method -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Método de pago *
                </label>
                <select v-model="form.paymentMethod" required class="input-base w-full px-4 py-2">
                  <template v-for="group in paymentGroups">
                    <option v-if="!group.methods.length" :key="group.slug" :value="group.slug">{{ group.name }}</option>
                    <optgroup v-else :key="group.slug" :label="group.name">
                      <option v-for="m in group.methods" :key="m.id" :value="m.id">{{ m.name }}</option>
                    </optgroup>
                  </template>
                </select>
              </div>

              <div v-if="isCashMethodSelected" class="space-y-1.5">
                <span class="block text-sm font-medium text-text-primary">
                  {{ t('finanzas.gastos.fromCashDrawerLabel') }}
                </span>
                <div
                  class="grid grid-cols-2 gap-2"
                  role="radiogroup"
                  :aria-label="t('finanzas.gastos.fromCashDrawerLabel')"
                >
                  <button
                    type="button"
                    role="radio"
                    :aria-checked="form.fromCashDrawer === true"
                    class="h-10 min-h-[40px] rounded-lg border px-2 text-sm font-medium text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    :class="form.fromCashDrawer === true
                      ? 'border-primary bg-primary/8'
                      : 'border-border bg-background hover:border-primary/40'"
                    @click="form.fromCashDrawer = true"
                  >
                    {{ t('finanzas.gastos.fromCashDrawerYes') }}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    :aria-checked="form.fromCashDrawer === false"
                    class="h-10 min-h-[40px] rounded-lg border px-2 text-sm font-medium text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    :class="form.fromCashDrawer === false
                      ? 'border-primary bg-primary/8'
                      : 'border-border bg-background hover:border-primary/40'"
                    @click="form.fromCashDrawer = false"
                  >
                    {{ t('finanzas.gastos.fromCashDrawerNo') }}
                  </button>
                </div>
                <p class="text-xs text-text-secondary">{{ t('finanzas.gastos.fromCashDrawerHelp') }}</p>
              </div>

              <!-- Expense Type -->
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Tipo de gasto
                </label>
                <select v-model="form.expenseType" class="input-base w-full px-4 py-2">
                  <option value="">Sin clasificar</option>
                  <option value="cogs">Costo de ventas</option>
                  <option value="admin_expense">Gasto administrativo</option>
                  <option value="sales_expense">Gasto de ventas</option>
                  <option value="financial_expense">Gasto financiero</option>
                  <option value="other_expense">Otro gasto</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="bg-surface border-t border-border shadow-lg mt-6">
          <div class="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
            <div class="flex justify-between items-center gap-3">
              <NuxtLink
                :to="`/finanzas/gastos/${expenseId}`"
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
import { useQuery, useQueryCache } from '@pinia/colada'
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { useFormatters } from '~/composables/useFormatters'
import { isCashPaymentSelection, readFromCashDrawer } from '~/utils/paymentDefaults'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const expenseId = route.params.id as string

const { currentTenant } = useTenantReactive()
const cache = useQueryCache()
const { currencyCode } = useFormatters()

// Payment methods
const { paymentGroups, fetchPaymentMethods } = usePaymentMethods()
fetchPaymentMethods()

// State
const isSubmitting = ref(false)

// Shared Colada key with list → cache hit when navigating from index
const { data: categoriesData } = useQuery({
  key: () => ['finance', 'expense-categories', currentTenant.value?.id],
  query: () => $fetch('/api/finance/expenses/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const categories = computed(() => {
  const data = categoriesData.value as any
  if (!data) return []
  return Array.isArray(data) ? data : (data.data || [])
})

// Shared key with detail page → open edit with cached expense (optimistic)
const { data: expenseData, error: fetchError } = useQuery({
  key: () => ['expense', expenseId],
  query: () => $fetch(`/api/finance/expenses/${expenseId}`),
  staleTime: 30_000,
})

const expense = computed(() => (expenseData.value as any)?.data)
// Full-page loader only when no cache yet
const isLoading = computed(() => !expenseData.value && !fetchError.value)

// Form state
const form = reactive({
  transactionDate: '',
  expenseCategoryId: '',
  description: '',
  amount: null as number | null,
  paymentMethod: 'cash',
  fromCashDrawer: true,
  expenseType: '' as string,
})

const paymentOptionValues = computed(() => paymentGroups.value.flatMap((group: any) => {
  if (group.methods?.length) return group.methods.map((method: any) => method.id)
  return [group.slug]
}))

const firstPaymentOption = computed(() => paymentOptionValues.value[0] || 'cash')

const isCashMethodSelected = computed(() =>
  isCashPaymentSelection(form.paymentMethod, paymentGroups.value as any[]),
)

watch(paymentGroups, () => {
  if (!paymentOptionValues.value.includes(form.paymentMethod)) {
    form.paymentMethod = firstPaymentOption.value
  }
}, { immediate: true, deep: true })

watch(isCashMethodSelected, (isCash) => {
  if (!isCash) form.fromCashDrawer = true
})

// Initialize form with expense data
watch(expense, (newExpense) => {
  if (newExpense) {
    form.transactionDate = newExpense.transactionDate?.split('T')[0] || ''
    form.expenseCategoryId = newExpense.expenseCategoryId || ''
    form.description = newExpense.description || ''
    form.amount = newExpense.amount || null
    form.paymentMethod = newExpense.paymentMethodId || newExpense.paymentMethod || firstPaymentOption.value
    form.fromCashDrawer = readFromCashDrawer(newExpense)
    form.expenseType = newExpense.expenseType || ''
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
      amount: form.amount,
      paymentMethod: form.paymentMethod,
      expenseType: form.expenseType || null,
      ...(isCashMethodSelected.value ? { fromCashDrawer: form.fromCashDrawer } : {}),
    }

    await $fetch(`/api/finance/expenses/${expenseId}`, {
      method: 'PUT',
      body: payload
    })

    // Invalidate list + detail so return path progressive-refreshes (like productos)
    cache.invalidateQueries({ key: ['finance', 'expenses'] })
    cache.invalidateQueries({ key: ['expense', expenseId] })
    await navigateTo(`/finanzas/gastos/${expenseId}`)
  } catch (error: any) {
    console.error('Error updating expense:', error)

    let errorMessage = 'Error al actualizar el gasto. Por favor intente nuevamente.'

    if (error?.data?.detail) {
      if (typeof error.data.detail === 'string') {
        errorMessage = error.data.detail
      } else if (Array.isArray(error.data.detail)) {
        errorMessage = error.data.detail.map((e: any) => e.msg || e.message || 'Revisa los datos del gasto.').join(', ')
      } else {
        errorMessage = error.data.detail.message
          || error.data.detail.msg
          || error.data.detail.error
          || error.data.detail.detail
          || 'No se pudo actualizar el gasto. Revisa los datos e intenta nuevamente.'
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
