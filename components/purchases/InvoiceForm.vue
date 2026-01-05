<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Document Type (only show if multiple options available) -->
    <div v-if="availableDocumentTypes.length > 1">
      <label class="block text-sm font-medium text-text-primary mb-2">Tipo de Documento *</label>
      <div class="grid gap-3" :class="availableDocumentTypes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'">
        <button
          v-for="docType in availableDocumentTypes"
          :key="docType.value"
          type="button"
          @click="formData.document_type = docType.value"
          :class="[
            'px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium',
            formData.document_type === docType.value
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-text-secondary hover:border-primary/50'
          ]"
        >
          {{ docType.label }}
        </button>
      </div>
      <p v-if="purchase?.payment_type" class="text-xs text-text-secondary mt-2">
        Opciones basadas en el tipo de pago: {{ getPaymentTypeText(purchase.payment_type) }}
      </p>
    </div>

    <!-- Single Document Type Info (shown when only one option) -->
    <div v-else class="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
      <div class="flex items-center space-x-3">
        <div class="bg-primary/10 p-2 rounded-lg">
          <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-text-primary">{{ availableDocumentTypes[0]?.label }}</p>
          <p class="text-xs text-text-secondary mt-0.5">Tipo de documento para {{ getPaymentTypeText(purchase?.payment_type) }}</p>
        </div>
      </div>
    </div>

    <!-- Document Number -->
    <div>
      <label class="block text-sm font-medium text-text-primary mb-2">
        {{ formData.document_type === 'remision' ? 'Número de Remisión' : 'Número de Factura' }} *
      </label>
      <input v-model="formData.invoice_number" type="text" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" :placeholder="formData.document_type === 'remision' ? 'Ej: REM-2025-001' : 'Ej: FAC-2025-001'" />
    </div>

    <!-- Document Date -->
    <div>
      <label class="block text-sm font-medium text-text-primary mb-2">
        {{ formData.document_type === 'remision' ? 'Fecha de Remisión' : 'Fecha de Factura' }} *
      </label>
      <input v-model="formData.invoice_date" type="datetime-local" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" />
    </div>

    <!-- Amounts (only for invoices, not for remision) -->
    <div v-if="formData.document_type !== 'remision'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Invoice Amount -->
      <div>
        <label class="block text-sm font-medium text-text-primary mb-2">Monto de Factura *</label>
        <input v-model.number="formData.invoice_amount" type="number" step="0.01" min="0.01" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" placeholder="0.00" />
      </div>

      <!-- Tax Amount -->
      <div>
        <label class="block text-sm font-medium text-text-primary mb-2">IVA</label>
        <input v-model.number="formData.tax_amount" type="number" step="0.01" min="0" class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary" placeholder="0.00" />
      </div>
    </div>

    <!-- Credit Days (only for factura_credito) -->
    <div v-if="formData.document_type === 'factura_credito'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-text-primary mb-2">Días de Crédito *</label>
        <select v-model.number="formData.credit_days" required class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary">
          <option :value="null">Seleccionar...</option>
          <option :value="15">15 días</option>
          <option :value="30">30 días</option>
          <option :value="45">45 días</option>
          <option :value="60">60 días</option>
          <option :value="90">90 días</option>
          <option :value="120">120 días</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-text-primary mb-2">Fecha de Vencimiento</label>
        <input :value="calculatedDueDate" type="text" disabled class="w-full px-4 py-2 bg-surface-secondary border-2 border-border rounded-lg text-text-secondary" />
      </div>
    </div>

    <!-- Notes -->
    <div>
      <label class="block text-sm font-medium text-text-primary mb-2">Notas</label>
      <textarea v-model="formData.notes" rows="3" class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary resize-none" placeholder="Notas adicionales..."></textarea>
    </div>

    <!-- Attachments Section -->
    <PurchasesAttachmentUploader v-model="selectedFiles" />

    <!-- Actions -->
    <div class="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t-2 border-border">
      <button type="button" @click="$emit('cancel')" :disabled="loading" class="w-full sm:w-auto px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-background transition-colors disabled:opacity-50">Cancelar</button>
      <button type="submit" :disabled="loading" class="w-full sm:w-auto px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2">
        <CommonsTheCustomLoader v-if="loading" size="small" />
        <span>{{ loading ? 'Registrando...' : 'Registrar Factura' }}</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  purchase: any
  token: string
}>()

const emit = defineEmits<{
  cancel: []
  invoiced: []
  loading: [isLoading: boolean]
}>()

const loading = ref(false)
const formData = ref({
  document_type: 'factura_contado',
  invoice_number: '',
  invoice_date: '',
  invoice_amount: 0,
  tax_amount: 0,
  credit_days: null,
  notes: ''
})

const selectedFiles = ref<File[]>([])

// Determine available document types based on payment_type
const availableDocumentTypes = computed(() => {
  const paymentType = props.purchase?.payment_type
  const types: Array<{ value: string, label: string }> = []

  if (!paymentType) {
    types.push({ value: 'remision', label: 'Remisión' })
    types.push({ value: 'factura_contado', label: 'Factura de Contado' })
    types.push({ value: 'factura_credito', label: 'Factura a Crédito' })
  } else if (paymentType === 'contado') {
    types.push({ value: 'remision', label: 'Remisión' })
    types.push({ value: 'factura_contado', label: 'Factura de Contado' })
  } else if (paymentType === 'credito') {
    types.push({ value: 'remision', label: 'Remisión' })
    types.push({ value: 'factura_credito', label: 'Factura a Crédito' })
  } else if (paymentType === 'contraentrega') {
    types.push({ value: 'remision', label: 'Remisión' })
  }

  return types
})

// Computed property for due date calculation
const calculatedDueDate = computed(() => {
  if (formData.value.document_type !== 'factura_credito' || !formData.value.invoice_date || !formData.value.credit_days) {
    return ''
  }

  const invoiceDate = new Date(formData.value.invoice_date)
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + formData.value.credit_days)

  return dueDate.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

onMounted(() => {
  // Set default document_type based on payment_type
  const paymentType = props.purchase?.payment_type
  let defaultDocType = 'factura_contado'

  if (paymentType === 'credito') {
    defaultDocType = 'factura_credito'
  } else if (paymentType === 'contraentrega') {
    defaultDocType = 'remision'
  }

  // Pre-fill with purchase data if available
  const totalAmount = (props.purchase?.total_amount || 0) + (props.purchase?.tax_amount || 0)
  formData.value = {
    document_type: defaultDocType,
    invoice_number: '',
    invoice_date: '',
    invoice_amount: totalAmount,
    tax_amount: props.purchase?.tax_amount || 0,
    credit_days: null,
    notes: ''
  }
  selectedFiles.value = []
})

const getPaymentTypeText = (paymentType: string): string => {
  const types: Record<string, string> = {
    'contado': 'Contado',
    'credito': 'Crédito',
    'contraentrega': 'Contraentrega'
  }
  return types[paymentType] || paymentType
}

const handleSubmit = async () => {
  loading.value = true
  emit('loading', true)
  try {
    const formDataPayload = new FormData()

    formDataPayload.append('document_type', formData.value.document_type)
    formDataPayload.append('invoice_number', formData.value.invoice_number)
    formDataPayload.append('invoice_date', new Date(formData.value.invoice_date).toISOString())

    if (formData.value.notes) {
      formDataPayload.append('notes', formData.value.notes)
    }

    if (formData.value.document_type !== 'remision') {
      formDataPayload.append('invoice_amount', formData.value.invoice_amount.toString())
      formDataPayload.append('tax_amount', formData.value.tax_amount.toString())
    }

    if (formData.value.document_type === 'factura_credito' && formData.value.credit_days) {
      formDataPayload.append('credit_days', formData.value.credit_days.toString())
      const invoiceDate = new Date(formData.value.invoice_date)
      const dueDate = new Date(invoiceDate)
      dueDate.setDate(dueDate.getDate() + formData.value.credit_days)
      formDataPayload.append('payment_due_date', dueDate.toISOString())
    }

    if (selectedFiles.value.length > 0) {
      for (const file of selectedFiles.value) {
        formDataPayload.append('files', file)
      }
    }

    const response = await $fetch(`/api/supplier-portal/${props.token}/purchases/${props.purchase.id}/invoice`, {
      method: 'POST',
      body: formDataPayload
    })

    if (response.success) {
      emit('invoiced')
      const docTypeLabel = formData.value.document_type === 'remision' ? 'Remisión' : 'Factura'
      useToast().success(`La ${docTypeLabel.toLowerCase()} ha sido registrada exitosamente`, { title: `${docTypeLabel} Registrada` })
    }
  } catch (error: any) {
    console.error('Error invoicing purchase:', error)
    useToast().error(error.data?.detail || 'No se pudo registrar el documento', { title: 'Error' })
  } finally {
    loading.value = false
    emit('loading', false)
  }
}
</script>
