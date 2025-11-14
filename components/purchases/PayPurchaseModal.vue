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
                <p class="text-sm text-text-secondary">Registra el pago realizado al proveedor</p>
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
              <input v-model.number="formData.payment_amount" type="number" step="0.01" min="0" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" placeholder="0.00" />
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

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4 border-t-2 border-border">
            <button type="button" @click="closeModal" :disabled="loading" class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-background transition-colors disabled:opacity-50">Cancelar</button>
            <button type="submit" :disabled="loading" class="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center space-x-2">
              <svg v-if="loading" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ loading ? 'Registrando...' : 'Registrar Pago' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ isOpen: boolean, purchaseId: string }>()
const emit = defineEmits<{ close: [], paid: [] }>()

const loading = ref(false)
const formData = ref({
  payment_method: '',
  payment_reference: '',
  payment_amount: 0,
  payment_date: '',
  notes: ''
})

watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    const now = new Date()
    formData.value = {
      payment_method: '',
      payment_reference: '',
      payment_amount: 0,
      payment_date: now.toISOString().slice(0, 16),
      notes: ''
    }
  }
})

const closeModal = () => !loading.value && emit('close')

const handleSubmit = async () => {
  loading.value = true
  try {
    const response = await $fetch(`/api/suppliers/purchases/${props.purchaseId}/pay`, {
      method: 'POST',
      body: {
        payment_method: formData.value.payment_method,
        payment_reference: formData.value.payment_reference,
        payment_amount: formData.value.payment_amount,
        payment_date: new Date(formData.value.payment_date).toISOString(),
        notes: formData.value.notes || null
      }
    })

    if (response.success) {
      emit('paid')
      emit('close')
      useToast().add({ title: 'Pago Registrado', description: 'El pago ha sido registrado exitosamente', color: 'green' })
    }
  } catch (error: any) {
    console.error('Error paying purchase:', error)
    useToast().add({ title: 'Error', description: error.data?.detail || 'No se pudo registrar el pago', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>
