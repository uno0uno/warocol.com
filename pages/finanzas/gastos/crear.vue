<template>
  <div class="page-layout">
    <!-- Loading overlay during submit -->
    <div v-if="isSubmitting" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">Registrando gasto...</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingCategories" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <template v-else>
    <!-- Header Card -->
    <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
      <div class="p-4 sm:p-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <!-- Expense Number -->
          <div class="flex items-center space-x-2 sm:space-x-3">
            <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
              </svg>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Nuevo Gasto
              </p>
              <p class="text-lg font-semibold text-text-primary">
                Registro
              </p>
            </div>
          </div>

          <!-- Date -->
          <div class="flex items-center space-x-2 sm:space-x-3">
            <div class="bg-background p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Fecha
              </p>
              <p class="text-sm sm:text-lg font-semibold text-text-primary">
                {{ formatDate(new Date().toISOString()) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Steps -->
    <div class="bg-surface border-border border rounded-lg mb-4 sm:mb-6">
      <div class="p-3 sm:p-6">
        <div class="flex items-center justify-between">
          <!-- Step 1 -->
          <div class="flex items-center flex-1">
            <div
              class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
              :class="{
                'bg-primary text-primary-foreground border-primary': currentStep === 1,
                'bg-secondary text-secondary-foreground border-secondary': currentStep > 1,
                'border-border text-text-secondary bg-transparent': currentStep < 1
              }"
            >
              <svg v-if="currentStep > 1" class="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span v-else class="font-semibold text-sm sm:text-base">1</span>
            </div>
            <div class="ml-1 sm:ml-3 flex-1 min-w-0">
              <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 1 ? 'text-text-primary' : 'text-text-secondary'">
                Datos Básicos
              </p>
              <p class="text-xs text-text-secondary hidden sm:block">Categoría y fecha</p>
            </div>
            <div class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4" :class="currentStep > 1 ? 'bg-secondary' : 'bg-border'"></div>
          </div>

          <!-- Step 2 -->
          <div class="flex items-center flex-1">
            <div
              class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
              :class="{
                'bg-primary text-primary-foreground border-primary': currentStep === 2,
                'bg-secondary text-secondary-foreground border-secondary': currentStep > 2,
                'border-border text-text-secondary bg-transparent': currentStep < 2
              }"
            >
              <span class="font-semibold text-sm sm:text-base">2</span>
              <svg v-if="currentStep > 2" class="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-1 sm:ml-3 flex-1 min-w-0">
              <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 2 ? 'text-text-primary' : 'text-text-secondary'">
                Documentos
              </p>
              <p class="text-xs text-text-secondary hidden sm:block">Opcional</p>
            </div>
            <div class="flex-1 h-0.5 sm:h-1 mx-1 sm:mx-4" :class="currentStep > 2 ? 'bg-secondary' : 'bg-border'"></div>
          </div>

          <!-- Step 3 -->
          <div class="flex items-center">
            <div
              class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors border-2 flex-shrink-0"
              :class="{
                'bg-primary text-primary-foreground border-primary': currentStep === 3,
                'bg-secondary text-secondary-foreground border-secondary': currentStep > 3,
                'border-border text-text-secondary bg-transparent': currentStep < 3
              }"
            >
              <span class="font-semibold text-sm sm:text-base">3</span>
            </div>
            <div class="ml-1 sm:ml-3 min-w-0">
              <p class="text-xs sm:text-sm font-medium truncate" :class="currentStep >= 3 ? 'text-text-primary' : 'text-text-secondary'">
                Confirmar
              </p>
              <p class="text-xs text-text-secondary hidden sm:block">Revisar y guardar</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Content -->
    <form @submit.prevent="handleNext">
      <!-- Step 1: Basic Data -->
      <Transition name="fade" mode="out-in">
        <div v-if="currentStep === 1" key="step-1" class="bg-surface border-border border rounded-lg">
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

              <!-- Payment Method -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Método de pago *
                </label>
                <select
                  v-model="form.paymentMethod"
                  required
                  class="input-base w-full px-4 py-2"
                >
                  <template v-for="group in paymentGroups">
                    <option v-if="!group.methods.length" :key="group.slug" :value="group.slug">{{ group.name }}</option>
                    <optgroup v-else :key="group.slug" :label="group.name">
                      <option v-for="m in group.methods" :key="m.id" :value="m.id">{{ m.name }}</option>
                    </optgroup>
                  </template>
                </select>
              </div>

              <!-- Recurring Expense Checkbox -->
              <div class="md:col-span-2">
                <label class="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    v-model="form.isRecurring"
                    class="w-5 h-5 text-primary border-border rounded focus:ring-2 focus:ring-primary focus:ring-offset-0"
                  />
                  <div>
                    <span class="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                      Gasto recurrente
                    </span>
                    <p class="text-xs text-text-secondary">
                      Marcar si este gasto se repite periódicamente
                    </p>
                  </div>
                </label>
              </div>

              <!-- Recurring Options (conditional) -->
              <div v-if="form.isRecurring" class="md:col-span-2 space-y-4 border-l-4 border-primary pl-4 sm:pl-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Frequency -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
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

                  <!-- Recurring End Date -->
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-2">
                      Fecha de finalización
                    </label>
                    <input
                      type="date"
                      v-model="form.recurringEndDate"
                      :min="form.transactionDate"
                      class="input-base w-full px-4 py-2"
                      placeholder="Opcional"
                    />
                    <p class="text-xs text-text-secondary mt-1">
                      Dejar vacío si el gasto no tiene fecha de fin
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Documents -->
        <div v-else-if="currentStep === 2" key="step-2" class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6">Documentos de Soporte</h3>
            <p class="text-sm text-text-secondary mb-4">Puedes adjuntar facturas, recibos u otros documentos relacionados con este gasto (opcional).</p>
            
            <div class="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                ref="fileInput"
                type="file"
                @change="handleFileSelect"
                accept="image/*,application/pdf"
                multiple
                class="hidden"
              />
              
              <div v-if="selectedFiles.length === 0">
                <svg class="mx-auto h-12 w-12 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p class="mt-2 text-sm text-text-secondary">Arrastra archivos aquí o</p>
                <button
                  type="button"
                  @click="$refs.fileInput.click()"
                  class="mt-2 btn-secondary px-4 py-2 rounded-lg text-sm"
                >
                  Seleccionar archivos
                </button>
              </div>
              
              <div v-else class="space-y-2">
                <div v-for="(file, index) in selectedFiles" :key="index" class="flex items-center justify-between bg-background p-3 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div class="text-left">
                      <p class="text-sm font-medium text-text-primary">{{ file.name }}</p>
                      <p class="text-xs text-text-secondary">{{ formatFileSize(file.size) }}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="removeFile(index)"
                    class="text-destructive hover:text-destructive/80"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  @click="$refs.fileInput.click()"
                  class="btn-secondary px-4 py-2 rounded-lg text-sm w-full"
                >
                  Agregar más archivos
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Review -->
        <div v-else-if="currentStep === 3" key="step-3" class="bg-surface border border-border rounded-lg">
          <!-- Header -->
          <div class="border-b border-border p-4 sm:p-6 md:p-8">
            <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 class="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary mb-2">GASTO</h1>
                <p class="text-xs sm:text-sm text-text-secondary">Resumen antes de guardar</p>
              </div>
              <div class="text-left sm:text-right w-full sm:w-auto">
                <div class="border-2 border-border px-3 sm:px-4 py-2 rounded-lg inline-block mb-2 bg-surface-secondary">
                  <p class="text-xs font-medium text-text-secondary">FECHA</p>
                  <p class="text-lg sm:text-xl font-bold text-text-primary">{{ formatDate(form.transactionDate) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Details -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Categoría</p>
                <p class="text-lg font-bold text-text-primary">{{ getCategoryName(form.expenseCategoryId) }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Descripción</p>
                <p class="text-base font-medium text-text-primary">{{ form.description }}</p>
              </div>
            </div>
          </div>

          <!-- Recurring Information (if applicable) -->
          <div v-if="form.isRecurring" class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-border bg-primary/5">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p class="text-sm font-bold text-primary uppercase tracking-wide">Gasto Recurrente</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Frecuencia</p>
                <p class="text-base font-medium text-text-primary">{{ formatFrequency(form.frequency) }}</p>
              </div>
              <div v-if="form.recurringEndDate">
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Finaliza</p>
                <p class="text-base font-medium text-text-primary">{{ formatDate(form.recurringEndDate) }}</p>
              </div>
              <div v-else>
                <p class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Finaliza</p>
                <p class="text-base font-medium text-text-primary italic">Sin fecha de fin</p>
              </div>
            </div>
          </div>

          <!-- Amount -->
          <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 bg-primary/5 border-b border-primary/20">
            <div class="flex justify-between items-center">
              <span class="text-lg font-bold text-text-primary">Monto Total:</span>
              <span class="text-2xl sm:text-3xl font-bold text-primary">{{ formatCurrency(form.amount) }}</span>
            </div>
          </div>

          <!-- Success Message -->
          <div class="px-4 sm:px-6 md:px-8 py-4 bg-success/10 border-t border-success/20">
            <div class="flex items-center gap-3">
              <svg class="w-6 h-6 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p class="font-medium text-success">El gasto se registrará inmediatamente</p>
                <p class="text-xs text-success/80">Podrás verlo en el listado de gastos</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </form>

    <!-- Navigation Buttons -->
    <div class="bg-surface border-t border-border shadow-lg mt-6">
      <div class="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
        <div class="flex justify-between items-center gap-3">
          <button
            v-if="currentStep > 1"
            type="button"
            @click="previousStep"
            class="btn-secondary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
          >
            <span class="hidden sm:inline">← Anterior</span>
            <span class="sm:hidden">←</span>
          </button>
          <NuxtLink
            v-else
            to='/finanzas/gastos'
            class="btn-secondary px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base"
          >
            Cancelar
          </NuxtLink>

          <button
            v-if="currentStep < 3"
            type="button"
            @click="handleNext"
            :disabled="!isStepValid"
            class="btn-primary px-4 sm:px-6 py-2 rounded-lg transition-opacity text-sm sm:text-base"
            :class="{ 'opacity-50 cursor-not-allowed': !isStepValid }"
          >
            <span class="hidden sm:inline">Siguiente →</span>
            <span class="sm:hidden">→</span>
          </button>
          <button
            v-else
            type="button"
            @click="handleSubmit"
            :disabled="isSubmitting"
            class="btn-primary px-4 sm:px-6 py-2 rounded-lg disabled:opacity-50 text-sm sm:text-base bg-success hover:bg-success/90"
          >
            <span class="hidden sm:inline">{{ isSubmitting ? 'Guardando...' : 'Guardar Gasto' }}</span>
            <span class="sm:hidden">{{ isSubmitting ? '...' : 'Guardar' }}</span>
          </button>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { usePaymentMethods } from '~/composables/usePaymentMethods'
import { useFormatters } from '~/composables/useFormatters'
import { computed } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Registrar Gasto' })

const { currentTenant } = useTenantReactive()

// Payment methods
const { paymentGroups, fetchPaymentMethods } = usePaymentMethods()
fetchPaymentMethods()

// Wizard state
const currentStep = ref(1)
const isSubmitting = ref(false)

// Load categories
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
  // Handle both { data: [...] } and direct array responses
  return Array.isArray(data) ? data : (data.data || [])
})

// Set refresh handler for layout
const { setRefreshHandler } = useLayoutActions()
const refreshCategories = async () => {
  // Refresh categories when refresh button is clicked
  await refreshNuxtData(`expense-categories-${currentTenant.value?.id || 'default'}`)
}
onMounted(() => {
  setRefreshHandler(refreshCategories)
})

// Form state
const form = reactive({
  transactionDate: new Date().toISOString().split('T')[0],
  expenseCategoryId: '',
  description: '',
  amount: null as number | null,
  paymentMethod: 'cash',
  isRecurring: false,
  frequency: '',
  recurringEndDate: ''
})

// File upload state
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value.push(...Array.from(target.files))
    target.value = '' // Reset input
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
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Validation
const isStepValid = computed(() => {
  if (currentStep.value === 1) {
    const baseValid = form.transactionDate && form.expenseCategoryId && form.description && form.amount && form.amount > 0

    // If recurring is enabled, frequency is required
    if (form.isRecurring) {
      return baseValid && form.frequency !== ''
    }

    return baseValid
  }
  return true
})

// Methods
const handleNext = () => {
  if (isStepValid.value) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const getCategoryName = (categoryId: string) => {
  if (!categoryId) return 'Sin categoría'
  const category = categories.value.find((c: any) => c.id === categoryId)
  return category?.categoryName || category?.name || 'Sin categoría'
}

const { formatDate } = useFormatters()

const formatCurrency = (value: number | null) => {
  if (!value) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const formatFrequency = (frequency: string) => {
  const frequencies: { [key: string]: string } = {
    'weekly': 'Semanal',
    'biweekly': 'Quincenal',
    'monthly': 'Mensual',
    'quarterly': 'Trimestral',
    'yearly': 'Anual'
  }
  return frequencies[frequency] || frequency
}

const handleSubmit = async () => {
  if (!form.amount || !form.expenseCategoryId) {
    alert('Por favor complete todos los campos requeridos')
    return
  }

  isSubmitting.value = true
  try {
    // Build JSON payload (backend now expects JSON)
    const payload = {
      transactionDate: form.transactionDate,
      expenseCategoryId: form.expenseCategoryId,
      description: form.description || '',
      amount: form.amount,
      isRecurring: form.isRecurring,
      frequency: form.isRecurring ? form.frequency : null,
      recurringEndDate: form.isRecurring && form.recurringEndDate ? form.recurringEndDate : null,
      paymentMethod: form.paymentMethod
    }

    const response = await $fetch('/api/finance/expenses', {
      method: 'POST',
      body: payload
    })

    console.log('Expense created successfully:', response)

    // If there are files, upload them separately
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
        // Don't fail the whole operation, just warn
        alert('Gasto creado, pero hubo un error al subir los archivos')
      }
    }
    
    // Success - redirect to list
    navigateTo('/finanzas/gastos')
  } catch (error: any) {
    console.error('Error creating expense:', error)
    
    // Extract meaningful error message
    let errorMessage = 'Error al guardar el gasto. Por favor intente nuevamente.'
    
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

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
