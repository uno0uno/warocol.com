<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="closeModal"></div>

    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-2xl bg-surface rounded-xl shadow-2xl border-2 border-border">
        <!-- Header -->
        <div class="border-b-2 border-border p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-emerald-500/10 p-3 rounded-lg">
                <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">Registrar Pago</h2>
                <p v-if="isBulkPayment" class="text-sm text-text-secondary">
                  Registrando pago para {{ props.purchases?.length }} orden(es)
                </p>
                <p v-else class="text-sm text-text-secondary">Registra el pago realizado al proveedor</p>
              </div>
            </div>
            <button @click="closeModal" class="text-text-secondary hover:text-text-primary transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
          <!-- Selected Purchases Summary (for bulk payment) -->
          <div v-if="isBulkPayment" class="bg-background border-2 border-border rounded-lg p-4">
            <h4 class="text-sm font-semibold text-text-primary mb-3">Órdenes seleccionadas:</h4>
            <div class="space-y-2 max-h-40 overflow-y-auto">
              <div v-for="purchase in props.purchases" :key="purchase.id"
                class="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                <div>
                  <p class="font-medium text-text-primary">{{ purchase.purchase_number }}</p>
                  <p class="text-xs text-text-secondary">{{ purchase.supplier_name || 'N/A' }}</p>
                </div>
                <p class="font-semibold text-text-primary">
                  {{ formatCurrency(getPurchaseAmount(purchase)) }}
                </p>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t-2 border-border flex justify-between items-center">
              <p class="font-semibold text-text-primary">Total a pagar:</p>
              <p class="text-lg font-bold text-emerald-500">{{ formatCurrency(totalAmount) }}</p>
            </div>
          </div>

          <!-- Payment Method -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Método de Pago *</label>
            <select v-model="formData.payment_method" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary">
              <option value="">Selecciona un método</option>
              <option value="transfer">Transferencia Bancaria</option>
              <option value="check">Cheque</option>
              <option value="cash">Efectivo</option>
              <option value="credit_card">Tarjeta de Crédito</option>
              <option value="debit_card">Tarjeta de Débito</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <!-- Payment Reference -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Referencia de Pago *</label>
            <input v-model="formData.payment_reference" type="text" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" placeholder="Ej: Transferencia #123456" />
            <p class="mt-1 text-xs text-text-secondary">Número de transacción, cheque, o referencia del pago</p>
          </div>

          <!-- Grid for Amount and Date -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Payment Amount -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Monto Pagado *</label>
              <input v-model.number="formData.payment_amount" type="number" step="0.01" min="0.01" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" placeholder="0.00" />
            </div>

            <!-- Payment Date -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Fecha de Pago *</label>
              <input v-model="formData.payment_date" type="datetime-local" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" />
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Notas</label>
            <textarea v-model="formData.notes" rows="3" class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary resize-none" placeholder="Notas sobre el pago..."></textarea>
          </div>

          <!-- Attachments Section -->
          <PurchasesAttachmentUploader v-model="selectedFiles" />

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4 border-t-2 border-border">
            <button type="button" @click="closeModal" :disabled="loading" class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-background transition-colors disabled:opacity-50">Cancelar</button>
            <button type="submit" :disabled="loading" class="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center space-x-2">
              <CommonsTheCustomLoader v-if="loading" size="small" />
              <span>{{ loading ? 'Registrando...' : 'Registrar Pago' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  isOpen: boolean
  purchaseId?: string
  purchases?: any[]
}>()
const emit = defineEmits<{ close: [], paid: [] }>()

const loading = ref(false)
const formData = ref({
  payment_method: '',
  payment_reference: '',
  payment_amount: 0,
  payment_date: '',
  notes: ''
})

const selectedFiles = ref<File[]>([])

// Computed properties
const isBulkPayment = computed(() => {
  return props.purchases && props.purchases.length > 0
})

const totalAmount = computed(() => {
  if (!isBulkPayment.value) return 0
  return props.purchases!.reduce((sum, purchase) => sum + getPurchaseAmount(purchase), 0)
})

// Helper functions
function getPurchaseAmount(purchase: any): number {
  const invoiceAmount = purchase.invoice_amount ? parseFloat(purchase.invoice_amount) : null
  const totalAmount = parseFloat(purchase.total_amount || 0)
  const taxAmount = parseFloat(purchase.tax_amount || 0)
  return invoiceAmount || (totalAmount + taxAmount)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    const now = new Date()
    const calculatedAmount = isBulkPayment.value ? totalAmount.value : 0
    formData.value = {
      payment_method: '',
      payment_reference: '',
      payment_amount: calculatedAmount,
      payment_date: now.toISOString().slice(0, 16),
      notes: ''
    }
    selectedFiles.value = []
  }
})

const closeModal = () => !loading.value && emit('close')

const handleSubmit = async () => {
  loading.value = true
  try {
    if (isBulkPayment.value) {
      // Process multiple payments
      const purchaseIds = props.purchases!.map(p => p.id)
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
          // Create FormData for each purchase
          const formDataPayload = new FormData()

          formDataPayload.append('payment_method', formData.value.payment_method)
          formDataPayload.append('payment_reference', formData.value.payment_reference)

          // Calculate individual amount
          const purchase = props.purchases!.find(p => p.id === purchaseId)
          const individualAmount = getPurchaseAmount(purchase)
          formDataPayload.append('payment_amount', individualAmount.toString())
          formDataPayload.append('payment_date', new Date(formData.value.payment_date).toISOString())

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
          errorCount++
        }
      }

      if (successCount > 0) {
        emit('paid')
        emit('close')
        if (errorCount > 0) {
          useToast().add({
            title: 'Pagos Parcialmente Registrados',
            description: `${successCount} pagos registrados, ${errorCount} fallaron`,
            color: 'yellow'
          })
        } else {
          useToast().add({
            title: 'Pagos Registrados',
            description: `${successCount} pagos registrados exitosamente`,
            color: 'green'
          })
        }
      } else {
        useToast().add({
          title: 'Error',
          description: 'No se pudo registrar ningún pago',
          color: 'red'
        })
      }
    } else {
      // Single payment (original logic)
      const formDataPayload = new FormData()

      formDataPayload.append('payment_method', formData.value.payment_method)
      formDataPayload.append('payment_reference', formData.value.payment_reference)
      formDataPayload.append('payment_amount', formData.value.payment_amount.toString())
      formDataPayload.append('payment_date', new Date(formData.value.payment_date).toISOString())

      if (formData.value.notes) {
        formDataPayload.append('notes', formData.value.notes)
      }

      if (selectedFiles.value.length > 0) {
        for (const file of selectedFiles.value) {
          formDataPayload.append('files', file)
        }
      }

      const response = await $fetch(`/api/suppliers/purchases/${props.purchaseId}/pay`, {
        method: 'POST',
        body: formDataPayload
      })

      if (response.success) {
        emit('paid')
        emit('close')
        useToast().add({
          title: 'Pago Registrado',
          description: 'El pago ha sido registrado exitosamente',
          color: 'green'
        })
      }
    }
  } catch (error: any) {
    console.error('Error paying purchase:', error)
    useToast().add({
      title: 'Error',
      description: error.data?.detail || 'No se pudo registrar el pago',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}
</script>
