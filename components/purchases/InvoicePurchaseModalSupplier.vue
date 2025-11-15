<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="closeModal"></div>

    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-2xl bg-surface rounded-xl shadow-2xl border-2 border-border">
        <!-- Header -->
        <div class="border-b-2 border-border p-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="bg-orange-500/10 p-3 rounded-lg">
                <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-text-primary">Registrar Factura</h2>
                <p class="text-sm text-text-secondary">Ingresa los detalles de tu factura</p>
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
          <!-- Invoice Number -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Número de Factura *</label>
            <input v-model="formData.invoice_number" type="text" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" placeholder="Ej: FAC-2025-001" />
          </div>

          <!-- Invoice Date -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Fecha de Factura *</label>
            <input v-model="formData.invoice_date" type="datetime-local" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" />
          </div>

          <!-- Grid for Amounts -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Invoice Amount -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">Monto de Factura *</label>
              <input v-model.number="formData.invoice_amount" type="number" step="0.01" min="0" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" placeholder="0.00" />
            </div>

            <!-- Tax Amount -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">IVA</label>
              <input v-model.number="formData.tax_amount" type="number" step="0.01" min="0" class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" placeholder="0.00" />
            </div>
          </div>

          <!-- Payment Due Date -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Fecha de Vencimiento</label>
            <input v-model="formData.payment_due_date" type="datetime-local" class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">Notas</label>
            <textarea v-model="formData.notes" rows="3" class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary resize-none" placeholder="Notas adicionales..."></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4 border-t-2 border-border">
            <button type="button" @click="closeModal" :disabled="loading" class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-background transition-colors disabled:opacity-50">Cancelar</button>
            <button type="submit" :disabled="loading" class="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center space-x-2">
              <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ loading ? 'Registrando...' : 'Registrar Factura' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  purchase: any
  token: string
}>()

const emit = defineEmits<{
  close: []
  invoiced: []
}>()

const loading = ref(false)
const formData = ref({
  invoice_number: '',
  invoice_date: '',
  invoice_amount: 0,
  tax_amount: 0,
  payment_due_date: '',
  notes: ''
})

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    // Pre-fill with purchase data if available
    const totalAmount = (props.purchase?.total_amount || 0) + (props.purchase?.tax_amount || 0)
    formData.value = {
      invoice_number: '',
      invoice_date: '',
      invoice_amount: totalAmount,
      tax_amount: props.purchase?.tax_amount || 0,
      payment_due_date: '',
      notes: ''
    }
  }
})

const closeModal = () => !loading.value && emit('close')

const handleSubmit = async () => {
  loading.value = true
  try {
    const body: any = {
      invoice_number: formData.value.invoice_number,
      invoice_date: new Date(formData.value.invoice_date).toISOString(),
      invoice_amount: formData.value.invoice_amount,
      tax_amount: formData.value.tax_amount,
      notes: formData.value.notes || null
    }

    if (formData.value.payment_due_date) {
      body.payment_due_date = new Date(formData.value.payment_due_date).toISOString()
    }

    const response = await $fetch(`/api/supplier-portal/${props.token}/purchases/${props.purchase.id}/invoice`, {
      method: 'POST',
      body
    })

    if (response.success) {
      emit('invoiced')
      emit('close')
      useToast().add({ title: 'Factura Registrada', description: 'La factura ha sido registrada exitosamente', color: 'green' })
    }
  } catch (error: any) {
    console.error('Error invoicing purchase:', error)
    useToast().add({ title: 'Error', description: error.data?.detail || 'No se pudo registrar la factura', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>
