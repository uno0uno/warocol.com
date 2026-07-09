<template>
  <div class="page-layout">
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      label="Registrando gasto..."
      hint="Estamos guardando el gasto y actualizando su registro financiero."
      variant="glass"
      indicator="matrix"
    />

    <div v-if="isLoadingCategories" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <form v-else @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
      <div class="xl:col-span-2 space-y-6">
        <div class="bg-surface border-2 border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
          <UiFormSection title="Información del gasto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">
                  Fecha del gasto *
                </label>
                <input
                  v-model="form.transactionDate"
                  type="date"
                  required
                  class="input-base w-full px-4 py-2"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">
                  Categoría *
                </label>
                <select
                  v-model="form.expenseCategoryId"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <option value="" disabled>Seleccionar categoría...</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                    {{ cat.categoryName || cat.name }}
                  </option>
                </select>
              </div>

              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-1">
                  Descripción *
                </label>
                <input
                  v-model="form.description"
                  type="text"
                  required
                  class="input-base w-full px-4 py-2"
                  placeholder="Ej. reparación de tubería"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">
                  Monto *
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                  <input
                    v-model.number="form.amount"
                    type="number"
                    required
                    min="0"
                    step="1"
                    class="input-base w-full pl-8 pr-4 py-2"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">
                  Método de pago *
                </label>
                <select
                  v-model="form.paymentMethod"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <template v-for="group in paymentGroups" :key="group.slug">
                    <option v-if="!group.methods.length" :value="group.slug">{{ group.name }}</option>
                    <optgroup v-else :label="group.name">
                      <option v-for="m in group.methods" :key="m.id" :value="m.id">{{ m.name }}</option>
                    </optgroup>
                  </template>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">
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
          </UiFormSection>

          <UiFormSection title="Recurrencia">
            <div class="space-y-4">
              <label class="flex items-start gap-3 cursor-pointer group">
                <input
                  v-model="form.isRecurring"
                  type="checkbox"
                  class="w-5 h-5 mt-0.5 text-primary border-border rounded focus:ring-2 focus:ring-primary focus:ring-offset-0"
                />
                <span>
                  <span class="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                    Gasto recurrente
                  </span>
                  <span class="block text-xs text-text-secondary mt-1">
                    Marca esta opción si el gasto se repite periódicamente.
                  </span>
                </span>
              </label>

              <div v-if="form.isRecurring" class="grid grid-cols-1 md:grid-cols-2 gap-4 border-l-4 border-primary pl-4 sm:pl-5">
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Frecuencia *
                  </label>
                  <select
                    v-model="form.frequency"
                    :required="form.isRecurring"
                    class="input-base w-full px-4 py-2"
                  >
                    <option value="" disabled>Seleccionar frecuencia...</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    Fecha de finalización
                  </label>
                  <input
                    v-model="form.recurringEndDate"
                    type="date"
                    :min="form.transactionDate"
                    class="input-base w-full px-4 py-2"
                  />
                  <p class="text-xs text-text-secondary mt-1">
                    Deja vacío si no tiene fecha de fin.
                  </p>
                </div>
              </div>
            </div>
          </UiFormSection>

          <UiFormSection title="Documentos de soporte">
            <p class="text-sm text-text-secondary mb-4">
              Adjunta facturas, recibos u otros documentos relacionados con este gasto.
            </p>

            <div class="border-2 border-dashed border-border rounded-lg p-5 sm:p-6 text-center bg-background">
              <input
                ref="fileInput"
                type="file"
                accept="image/*,application/pdf"
                multiple
                class="hidden"
                @change="handleFileSelect"
              />

              <div v-if="selectedFiles.length === 0">
                <svg class="mx-auto h-10 w-10 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="mt-2 text-sm text-text-secondary">Agrega documentos opcionales</p>
                <button
                  type="button"
                  class="mt-3 btn-secondary px-4 py-2 rounded-lg text-sm"
                  @click="fileInput?.click()"
                >
                  Seleccionar archivos
                </button>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="(file, index) in selectedFiles"
                  :key="`${file.name}-${index}`"
                  class="flex items-center justify-between gap-3 bg-surface p-3 rounded-lg border border-border text-left"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <svg class="w-6 h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-text-primary truncate">{{ file.name }}</p>
                      <p class="text-xs text-text-secondary">{{ formatFileSize(file.size) }}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                    :aria-label="`Eliminar ${file.name}`"
                    @click="removeFile(index)"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <button
                  type="button"
                  class="btn-secondary px-4 py-2 rounded-lg text-sm w-full"
                  @click="fileInput?.click()"
                >
                  Agregar más archivos
                </button>
              </div>
            </div>
          </UiFormSection>
        </div>
      </div>

      <aside class="xl:col-span-1">
        <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm xl:sticky xl:top-6">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Resumen</h3>

          <div class="space-y-3">
            <div class="flex justify-between gap-3 text-sm">
              <span class="text-text-secondary">Fecha:</span>
              <span class="font-semibold text-text-primary text-right">{{ formatCalendarDate(form.transactionDate) }}</span>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <span class="text-text-secondary">Categoría:</span>
              <span class="font-semibold text-text-primary text-right truncate">{{ getCategoryName(form.expenseCategoryId) }}</span>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <span class="text-text-secondary">Monto:</span>
              <span class="font-semibold text-primary text-right">{{ formatCurrency(form.amount) }}</span>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <span class="text-text-secondary">Método:</span>
              <span class="font-semibold text-text-primary text-right truncate">{{ paymentMethodLabel }}</span>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <span class="text-text-secondary">Tipo:</span>
              <span class="font-semibold text-text-primary text-right">{{ expenseTypeLabel }}</span>
            </div>
            <div v-if="form.isRecurring" class="flex justify-between gap-3 text-sm pt-3 border-t border-border">
              <span class="text-text-secondary">Recurrencia:</span>
              <span class="font-semibold text-text-primary text-right">{{ formatFrequency(form.frequency) }}</span>
            </div>
            <div class="flex justify-between gap-3 text-sm">
              <span class="text-text-secondary">Documentos:</span>
              <span class="font-semibold text-text-primary text-right">{{ selectedFiles.length }}</span>
            </div>
          </div>

          <div v-if="submitError" class="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {{ submitError }}
          </div>

          <div class="mt-6 space-y-3">
            <button
              type="submit"
              :disabled="isSubmitting || !isFormValid"
              class="btn-primary w-full min-h-[44px] px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Guardando...' : 'Guardar gasto' }}
            </button>
            <NuxtLink
              to="/finanzas/gastos"
              class="btn-secondary w-full min-h-[44px] px-4 py-2 rounded-lg flex items-center justify-center"
            >
              Cancelar
            </NuxtLink>
          </div>
        </div>
      </aside>
    </form>
  </div>
</template>

<script setup lang="ts">
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })

useHead({ title: 'Registrar Gasto' })

const { currentTenant } = useTenantReactive()
const { todayISO } = useTenantTimezone()
const { formatCalendarDate } = useFormatters()

const { paymentGroups, fetchPaymentMethods } = usePaymentMethods()
fetchPaymentMethods()

const isSubmitting = ref(false)
const submitError = ref<string | null>(null)

const { data: categoriesData, pending: isLoadingCategories } = useAsyncData(
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

const { setRefreshHandler } = useLayoutActions()
const refreshCategories = async () => {
  await refreshNuxtData(`expense-categories-${currentTenant.value?.id || 'default'}`)
}

onMounted(() => {
  setRefreshHandler(refreshCategories)
})

const form = reactive({
  transactionDate: todayISO(),
  expenseCategoryId: '',
  description: '',
  amount: null as number | null,
  paymentMethod: 'cash',
  expenseType: '' as string,
  isRecurring: false,
  frequency: '',
  recurringEndDate: ''
})

const paymentOptionValues = computed(() => paymentGroups.value.flatMap((group: any) => {
  if (group.methods?.length) return group.methods.map((method: any) => method.id)
  return [group.slug]
}))

const firstPaymentOption = computed(() => paymentOptionValues.value[0] || 'cash')

watch(paymentGroups, () => {
  if (!paymentOptionValues.value.includes(form.paymentMethod)) {
    form.paymentMethod = firstPaymentOption.value
  }
}, { immediate: true, deep: true })

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value.push(...Array.from(target.files))
    target.value = ''
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

const isFormValid = computed(() => {
  const baseValid = form.transactionDate
    && form.expenseCategoryId
    && form.description.trim()
    && form.amount
    && form.amount > 0
    && form.paymentMethod

  return form.isRecurring ? Boolean(baseValid && form.frequency) : Boolean(baseValid)
})

const getCategoryName = (categoryId: string) => {
  if (!categoryId) return 'Sin categoría'
  const category = categories.value.find((c: any) => c.id === categoryId)
  return category?.categoryName || category?.name || 'Sin categoría'
}

const formatCurrency = (value: number | null) => {
  if (!value) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const expenseTypeLabels: Record<string, string> = {
  cogs: 'Costo de ventas',
  admin_expense: 'Gasto administrativo',
  sales_expense: 'Gasto de ventas',
  financial_expense: 'Gasto financiero',
  other_expense: 'Otro gasto'
}

const expenseTypeLabel = computed(() => expenseTypeLabels[form.expenseType] || 'Sin clasificar')

const formatFrequency = (frequency: string) => {
  const frequencies: Record<string, string> = {
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    yearly: 'Anual'
  }
  return frequencies[frequency] || 'Sin frecuencia'
}

const paymentMethodLabel = computed(() => {
  for (const group of paymentGroups.value as any[]) {
    if (!group.methods?.length && group.slug === form.paymentMethod) return group.name
    const method = group.methods?.find((m: any) => m.id === form.paymentMethod)
    if (method) return method.name
  }
  return form.paymentMethod || 'Sin método'
})

const extractErrorMessage = (error: any) => {
  if (error?.data?.detail) {
    if (typeof error.data.detail === 'string') return error.data.detail
    if (Array.isArray(error.data.detail)) {
      return error.data.detail.map((e: any) => e.msg || e.message || 'Revisa los datos del gasto.').join(', ')
    }
    return error.data.detail.message
      || error.data.detail.msg
      || error.data.detail.error
      || error.data.detail.detail
      || 'No se pudo guardar el gasto. Revisa los datos e intenta nuevamente.'
  }
  return error?.message || 'Error al guardar el gasto. Por favor intenta nuevamente.'
}

const handleSubmit = async () => {
  submitError.value = null
  if (!isFormValid.value) {
    submitError.value = 'Completa los campos requeridos antes de guardar.'
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      transactionDate: form.transactionDate,
      expenseCategoryId: form.expenseCategoryId,
      description: form.description || '',
      amount: form.amount,
      isRecurring: form.isRecurring,
      frequency: form.isRecurring ? form.frequency : null,
      recurringEndDate: form.isRecurring && form.recurringEndDate ? form.recurringEndDate : null,
      paymentMethod: form.paymentMethod,
      expenseType: form.expenseType || null,
    }

    const response: any = await $fetch('/api/finance/expenses', {
      method: 'POST',
      body: payload
    })

    if (selectedFiles.value.length > 0 && response.data?.id) {
      try {
        const formData = new FormData()
        selectedFiles.value.forEach(file => {
          formData.append('files', file)
        })

        await $fetch(`/api/finance/expenses/${response.data.id}/attachments`, {
          method: 'POST',
          body: formData
        })
      } catch (fileError) {
        console.error('Error uploading files:', fileError)
        submitError.value = 'Gasto creado, pero hubo un error al subir los archivos.'
        return
      }
    }

    await navigateTo('/finanzas/gastos')
  } catch (error: any) {
    console.error('Error creating expense:', error)
    submitError.value = extractErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>
