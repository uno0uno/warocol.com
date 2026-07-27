<template>
  <form
    @submit.prevent="onSubmitClick"
    :class="compact ? 'flex min-h-0 flex-1 flex-col' : 'grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8'"
  >
    <div
      v-if="isPaymentMethodsLoading"
      :class="compact
        ? 'flex flex-1 items-center justify-center min-h-[400px]'
        : 'col-span-full flex min-h-[400px] items-center justify-center'"
      aria-live="polite"
      aria-busy="true"
    >
      <CommonsTheCustomLoader size="large" :show-phrase="true" />
    </div>

    <template v-else>
    <!-- Left Column: Payment Details -->
    <div :class="compact ? 'min-h-0 flex-1 overflow-y-auto px-6 py-5' : 'xl:col-span-2 space-y-6'">
      <div :class="compact ? 'space-y-4' : 'bg-surface border-2 border-border rounded-xl p-6 md:p-8 shadow-sm'">
        <h3 :class="compact ? 'text-sm font-semibold text-text-primary mb-3' : 'text-lg font-semibold text-text-primary mb-6'">Detalles del pago</h3>
        
        <div :class="compact ? 'space-y-4' : 'space-y-6'">
          <!-- Payment Method & Reference -->
          <div :class="compact ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-6'">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Método de Pago *</label>
              <select v-model="paymentSelectValue" required
                class="w-full px-4 py-2.5 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary transition-colors">
                <option value="">Selecciona un método</option>
                <template v-for="group in paymentGroups" :key="group.slug">
                  <option :value="`${group.slug}:`">{{ formatPaymentOptionLabel(group.name, group.glAccountCode) }}</option>
                  <optgroup v-if="group.methods.length > 0" :label="group.name">
                    <option
                      v-for="method in group.methods"
                      :key="method.id"
                      :value="`${group.slug}:${method.id}`"
                    >
                      {{ formatPaymentOptionLabel(`${group.name} · ${method.name}`, method.glAccountCode || group.glAccountCode) }}
                    </option>
                  </optgroup>
                </template>
              </select>
              <p v-if="selectedPaymentPucLabel" class="mt-1.5 text-xs text-text-secondary">
                PUC: <span class="font-medium text-text-primary">{{ selectedPaymentPucLabel }}</span>
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Referencia de Pago *</label>
              <input v-model="formData.payment_reference" type="text" required
                class="w-full px-4 py-2.5 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary transition-colors"
                placeholder="Ej: Transferencia #123456" />
            </div>
          </div>

          <!-- Amount & Date -->
          <div :class="compact ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-6'">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Monto Pagado *</label>
              <div class="relative">
                <span class="absolute start-4 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                <UiDecimalInput
                  v-model="formData.payment_amount"
                  :min="0.01"
                  :precision="2"
                  required
                  class="w-full ps-8 pe-4 py-2.5 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Fecha de Pago *</label>
              <input v-model="formData.payment_date" type="datetime-local" required
                class="w-full px-4 py-2.5 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary transition-colors" />
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Notas</label>
            <textarea v-model="formData.notes" rows="3"
              class="w-full px-4 py-2.5 bg-background border-2 border-border rounded-lg text-text-primary resize-none focus:border-primary transition-colors"
              placeholder="Notas adicionales sobre el pago..."></textarea>
          </div>

          <!-- Attachments -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Comprobantes</label>
            <PurchasesAttachmentUploader v-model="selectedFiles" :embedded="compact" />
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column: Summary & Actions -->
    <div v-if="!compact" class="xl:col-span-1">
      <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
        <h3 class="text-lg font-semibold text-text-primary mb-4">Resumen de Pago</h3>

        <!-- Bulk Summary -->
        <div v-if="isBulkPayment" class="space-y-4">
          <div class="bg-background rounded-lg p-4 border border-border">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-text-secondary">Órdenes seleccionadas</span>
              <span class="font-medium text-text-primary">{{ purchases.length }}</span>
            </div>
            <div class="max-h-48 overflow-y-auto space-y-2 pe-2 custom-scrollbar">
              <div v-for="purchase in purchases" :key="purchase.id"
                class="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0">
                <span class="text-text-secondary">#{{ purchase.purchase_number }}</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(getPurchaseAmount(purchase)) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Single Summary -->
        <div v-else class="space-y-4">
          <div class="bg-background rounded-lg p-4 border border-border">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm text-text-secondary">Orden de Compra</span>
              <span class="font-medium text-text-primary">#{{ purchases[0]?.purchase_number }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-text-secondary">Proveedor</span>
              <span class="font-medium text-text-primary truncate block max-w-[150px]">{{ purchases[0]?.supplier_name || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <!-- Total -->
        <div class="mt-6 pt-6 border-t-2 border-border">
          <div class="flex justify-between items-end mb-6">
            <span class="text-text-secondary font-medium">Total a Pagar</span>
            <span class="text-2xl font-bold text-state-success-text">{{ formatCurrency(totalAmount) }}</span>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <button type="submit" :disabled="!canSubmitPayment"
              class="w-full py-3 bg-action-success-bg text-action-success-text rounded-lg hover:bg-action-success-hover-bg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold shadow-lg shadow-primary/20">
              <CommonsTheCustomLoader v-if="loading" size="small" />
              <span>{{ submitButtonLabel }}</span>
            </button>
            
            <button type="button" @click="$emit('cancel')" :disabled="loading"
              class="w-full py-3 border-2 border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-background transition-colors font-medium">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-shrink-0 border-t border-border bg-surface px-6 py-4">
      <div class="mb-3 flex items-center justify-between gap-4">
        <div>
          <p class="text-xs text-text-secondary">Total a pagar</p>
          <p class="text-lg font-semibold text-text-primary">{{ formatCurrency(totalAmount) }}</p>
        </div>
        <p v-if="purchases[0]?.purchase_number" class="text-end text-xs text-text-secondary">
          {{ purchases[0].purchase_number }}
        </p>
      </div>
      <div class="flex gap-3">
        <button
          type="button"
          @click="$emit('cancel')"
          :disabled="loading"
          class="h-11 flex-1 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="!canSubmitPayment"
          class="h-11 flex-1 rounded-lg bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <span>{{ compactSubmitButtonLabel }}</span>
        </button>
      </div>
    </div>
    </template>
  </form>

  <UiConfirmActionModal
    v-model="quotaLimitModalOpen"
    :title="t('billing.upgrade.quotaBlocked')"
    :message="quotaLimitModalMessage"
    :confirm-label="t('nav.miPlan')"
    :cancel-label="t('billing.close')"
    @confirm="goToBillingFromQuotaLimitModal"
    @cancel="closeQuotaLimitModal"
  />
</template>

<script setup lang="ts">
const { t } = useI18n()
import { ref, computed, onMounted } from 'vue'
import { mergePosPaymentGroupsFromApi } from '~/utils/paymentDefaults'
import { usePaymentSelectValue } from '~/composables/usePaymentSelectValue'
import { useOperationalQuotaGate } from '~/composables/useOperationalQuotaGate'
import { useQuotaExceeded } from '~/composables/useQuotaExceeded'

const props = defineProps<{
  purchases: any[]
  compact?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  paid: []
}>()

const {
  quotaLimitModalOpen,
  quotaLimitModalMessage,
  closeQuotaLimitModal,
  goToBillingFromQuotaLimitModal,
  handleCreateClick,
} = useOperationalQuotaGate('supplier_payments_per_period')
const { handleQuotaError, getQuotaMessage, isQuotaExceededError } = useQuotaExceeded()

const loading = ref(false)
const formData = ref({
  payment_method: '',
  payment_method_id: null as string | null,
  payment_reference: '',
  payment_amount: 0,
  payment_date: '',
  notes: ''
})

const selectedFiles = ref<File[]>([])
const { todayISO, timeHHMMFromISO, combineDateAndTimeISO } = useTenantTimezone()
const {
  data: paymentMethodsData,
  error: paymentMethodsError,
} = useFetch<{ success: boolean; data: import('~/utils/paymentDefaults').PosPaymentGroup[] }>(
  '/api/pos/payment-methods',
  { server: false },
)
const isPaymentMethodsLoading = computed(() =>
  !paymentMethodsData.value && !paymentMethodsError.value,
)
const paymentGroups = computed(() =>
  mergePosPaymentGroupsFromApi(paymentMethodsData.value?.data ?? [])
    .filter(group => group.slug !== 'credit' && !group.triggersCartera),
)
const { paymentSelectValue } = usePaymentSelectValue(formData, paymentGroups)
const selectedPaymentPucLabel = computed(() => {
  if (!formData.value.payment_method) return ''
  const group = paymentGroups.value.find(g => g.slug === formData.value.payment_method)
  if (!group) return ''
  if (formData.value.payment_method_id) {
    const method = group.methods.find(m => m.id === formData.value.payment_method_id)
    const code = method?.glAccountCode || group.glAccountCode
    return code ? `${code} · ${method?.name || group.name}` : ''
  }
  return group.glAccountCode ? `${group.glAccountCode} · ${group.name}` : ''
})

// Computed properties
const isBulkPayment = computed(() => props.purchases.length > 1)

const totalAmount = computed(() => {
  return props.purchases.reduce((sum, purchase) => sum + getPurchaseAmount(purchase), 0)
})
const canSubmitPayment = computed(() =>
  !loading.value && !isPaymentMethodsLoading.value && Boolean(formData.value.payment_method),
)
const submitButtonLabel = computed(() => {
  if (loading.value) return t('finanzas.paymentForm.processing')
  if (isPaymentMethodsLoading.value) return t('finanzas.paymentForm.loadingMethods')
  return t('finanzas.paymentForm.register')
})
const compactSubmitButtonLabel = computed(() => {
  if (loading.value) return t('finanzas.paymentForm.processing')
  if (isPaymentMethodsLoading.value) return t('finanzas.paymentForm.loading')
  return t('finanzas.paymentForm.register')
})

// Helper functions
function getPurchaseAmount(purchase: any): number {
  const invoiceAmount = purchase.invoice_amount ? parseFloat(purchase.invoice_amount) : null
  const totalAmount = parseFloat(purchase.total_amount || 0)
  const taxAmount = parseFloat(purchase.tax_amount || 0)
  return Math.round(invoiceAmount || (totalAmount + taxAmount))
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

function formatPaymentOptionLabel(label: string, glAccountCode?: string | null): string {
  return glAccountCode ? `${label} · ${glAccountCode}` : label
}

const tenantDateTimeLocalNow = () => `${todayISO()}T${timeHHMMFromISO(new Date().toISOString())}`

const paymentDateToISO = (value: string) => {
  const [date, time] = value.split('T')
  return combineDateAndTimeISO(date, time) ?? new Date(value).toISOString()
}

// Initialize form data
onMounted(() => {
  formData.value = {
    payment_method: '',
    payment_method_id: null,
    payment_reference: '',
    payment_amount: totalAmount.value,
    payment_date: tenantDateTimeLocalNow(),
    notes: ''
  }
})

const handleSubmit = async () => {
  if (!canSubmitPayment.value) return

  loading.value = true
  try {
    if (isBulkPayment.value) {
      // Process multiple payments
      const purchaseIds = props.purchases.map(p => p.id)
      let successCount = 0
      let errorCount = 0

      // Read files into memory once to reuse them
      const fileData: { name: string; blob: Blob; type: string }[] = []
      if (selectedFiles.value.length > 0) {
        for (const file of selectedFiles.value) {
          const blob = new Blob([await file.arrayBuffer()], { type: file.type })
          fileData.push({ name: file.name, blob, type: file.type })
        }
      }

      for (const purchaseId of purchaseIds) {
        try {
          const formDataPayload = new FormData()
          formDataPayload.append('payment_method', formData.value.payment_method)
          if (formData.value.payment_method_id) {
            formDataPayload.append('payment_method_id', formData.value.payment_method_id)
          }
          formDataPayload.append('payment_reference', formData.value.payment_reference)

          // Calculate individual amount
          const purchase = props.purchases.find(p => p.id === purchaseId)
          const individualAmount = getPurchaseAmount(purchase)
          formDataPayload.append('payment_amount', individualAmount.toString())
          formDataPayload.append('payment_date', paymentDateToISO(formData.value.payment_date))

          if (formData.value.notes) {
            formDataPayload.append('notes', formData.value.notes)
          }

          // Create new File objects from stored blobs for each request
          if (fileData.length > 0) {
            for (const fd of fileData) {
              const newFile = new File([fd.blob], fd.name, { type: fd.type })
              formDataPayload.append('files', newFile)
            }
          }

          const response = await $fetch(`/api/suppliers/purchases/${purchaseId}/pay`, {
            method: 'POST',
            body: formDataPayload
          })

          if (response.success) {
            successCount++
          }
        } catch (error) {
          console.error(`Error paying purchase ${purchaseId}:`, error)
          if (isQuotaExceededError(error)) {
            quotaLimitModalMessage.value = getQuotaMessage(error, 'supplier_payments_per_period')
            quotaLimitModalOpen.value = true
            handleQuotaError(error, { resource: 'supplier_payments_per_period', showInline: false })
            break
          }
          errorCount++
        }
      }

      if (quotaLimitModalOpen.value && successCount === 0) {
        return
      }
      if (successCount > 0) {
        emit('paid')
        if (errorCount > 0) {
          useToast().warning(`${successCount} pagos registrados, ${errorCount} fallaron`, { title: t('finanzas.paymentForm.partialTitle') })
        } else {
          useToast().success(`${successCount} pagos registrados exitosamente`, { title: t('finanzas.paymentForm.multiTitle') })
        }
      } else {
        useToast().error(t('finanzas.paymentForm.failAny'), { title: t('finanzas.common.error') })
      }
    } else {
      // Single payment
      const formDataPayload = new FormData()
      formDataPayload.append('payment_method', formData.value.payment_method)
      if (formData.value.payment_method_id) {
        formDataPayload.append('payment_method_id', formData.value.payment_method_id)
      }
      formDataPayload.append('payment_reference', formData.value.payment_reference)
      formDataPayload.append('payment_amount', formData.value.payment_amount.toString())
      formDataPayload.append('payment_date', paymentDateToISO(formData.value.payment_date))

      if (formData.value.notes) {
        formDataPayload.append('notes', formData.value.notes)
      }

      if (selectedFiles.value.length > 0) {
        for (const file of selectedFiles.value) {
          formDataPayload.append('files', file)
        }
      }

      const response = await $fetch(`/api/suppliers/purchases/${props.purchases[0].id}/pay`, {
        method: 'POST',
        body: formDataPayload
      })

      if (response.success) {
        emit('paid')
        useToast().success(t('finanzas.paymentForm.successBody'), { title: t('finanzas.paymentForm.successTitle') })
      }
    }
  } catch (error: any) {
    if (handleQuotaError(error, { resource: 'supplier_payments_per_period', showInline: false })) {
      quotaLimitModalMessage.value = getQuotaMessage(error, 'supplier_payments_per_period')
      quotaLimitModalOpen.value = true
      return
    }
    console.error('Error paying purchase:', error)
    useToast().error(error.data?.detail || t('finanzas.paymentForm.fail'), { title: t('finanzas.common.error') })
  } finally {
    loading.value = false
  }
}

const onSubmitClick = () => {
  void handleCreateClick(() => { void handleSubmit() })
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 20px;
}
</style>
