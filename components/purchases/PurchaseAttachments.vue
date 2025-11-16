<template>
  <div class="bg-surface border-2 border-border rounded-lg p-6">
    <h3 class="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
      <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      <span>Documentos Adjuntos</span>
    </h3>

    <!-- Upload Area -->
    <div class="mb-6">
      <div
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        :class="[
          'border-2 border-dashed rounded-lg p-6 transition-all text-center',
          isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
        ]"
      >
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.csv"
          @change="handleFileSelect"
        />

        <svg class="w-12 h-12 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>

        <p class="text-sm text-text-primary font-medium mb-2">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <p class="text-xs text-text-secondary mb-4">
          PDF, imágenes, Excel, Word (máx. 10MB)
        </p>

        <div class="space-y-3">
          <button
            type="button"
            @click="$refs.fileInput.click()"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Seleccionar Archivo
          </button>

          <!-- Attachment Type Selection -->
          <div v-if="selectedFile" class="max-w-sm mx-auto space-y-3">
            <select
              v-model="attachmentType"
              class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary text-sm"
            >
              <option value="">Seleccionar tipo de documento...</option>
              <option value="invoice">Factura</option>
              <option value="receipt">Recibo de Pago</option>
              <option value="contract">Contrato</option>
              <option value="delivery_note">Remisión/Nota de Entrega</option>
              <option value="quotation">Cotización</option>
              <option value="other">Otro</option>
            </select>

            <input
              v-model="description"
              type="text"
              placeholder="Descripción (opcional)"
              class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary text-sm"
            />

            <div class="flex space-x-2">
              <button
                @click="uploadFile"
                :disabled="!attachmentType || uploading"
                class="flex-1 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center space-x-2"
              >
                <svg v-if="uploading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ uploading ? 'Subiendo...' : 'Subir Archivo' }}</span>
              </button>
              <button
                @click="cancelUpload"
                :disabled="uploading"
                class="px-4 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-background transition-colors disabled:opacity-50 text-sm"
              >
                Cancelar
              </button>
            </div>

            <p class="text-xs text-text-secondary">
              {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Attachments List -->
    <div v-if="loading" class="flex items-center justify-center py-8">
      <CommonsTheCustomLoader />
    </div>

    <div v-else-if="attachments.length === 0" class="text-center py-8">
      <svg class="w-16 h-16 mx-auto text-text-secondary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <p class="text-sm text-text-secondary">No hay documentos adjuntos</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="attachment in attachments"
        :key="attachment.id"
        class="flex items-center justify-between p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
      >
        <div class="flex items-center space-x-4 flex-1 min-w-0">
          <!-- File Icon -->
          <div class="flex-shrink-0">
            <svg v-if="isImage(attachment.file_type)" class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <svg v-else-if="isPDF(attachment.file_type)" class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <svg v-else class="w-10 h-10 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <!-- File Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate">{{ attachment.file_name }}</p>
            <div class="flex items-center space-x-3 mt-1">
              <span class="text-xs text-text-secondary">{{ getAttachmentTypeLabel(attachment.attachment_type) }}</span>
              <span class="text-xs text-text-secondary">•</span>
              <span class="text-xs text-text-secondary">{{ formatFileSize(attachment.file_size) }}</span>
              <span class="text-xs text-text-secondary">•</span>
              <span class="text-xs text-text-secondary">{{ formatDate(attachment.uploaded_at) }}</span>
            </div>
            <p v-if="attachment.description" class="text-xs text-text-secondary mt-1">{{ attachment.description }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center space-x-2 flex-shrink-0 ml-4">
          <a
            :href="attachment.s3_url"
            target="_blank"
            class="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Descargar"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
          <button
            @click="deleteAttachment(attachment.id)"
            class="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="Eliminar"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  purchaseId: string
}>()

const emit = defineEmits<{
  uploaded: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const attachmentType = ref('')
const description = ref('')
const isDragging = ref(false)
const uploading = ref(false)
const loading = ref(false)
const attachments = ref<any[]>([])

onMounted(() => {
  loadAttachments()
})

const loadAttachments = async () => {
  loading.value = true
  try {
    const response = await $fetch(`/api/attachments/purchases/${props.purchaseId}`)
    if (response.success) {
      attachments.value = response.data
    }
  } catch (error: any) {
    console.error('Error loading attachments:', error)
    useToast().add({
      title: 'Error',
      description: 'No se pudieron cargar los archivos adjuntos',
      color: 'red'
    })
  } finally {
    loading.value = false
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    selectedFile.value = event.dataTransfer.files[0]
  }
}

const cancelUpload = () => {
  selectedFile.value = null
  attachmentType.value = ''
  description.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const uploadFile = async () => {
  if (!selectedFile.value || !attachmentType.value) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('attachment_type', attachmentType.value)
    if (description.value) {
      formData.append('description', description.value)
    }

    const response = await $fetch(`/api/attachments/purchases/${props.purchaseId}/upload`, {
      method: 'POST',
      body: formData
    })

    if (response.success) {
      useToast().add({
        title: 'Archivo Subido',
        description: 'El archivo se ha subido exitosamente',
        color: 'green'
      })
      cancelUpload()
      await loadAttachments()
      emit('uploaded')
    }
  } catch (error: any) {
    console.error('Error uploading file:', error)
    useToast().add({
      title: 'Error',
      description: error.data?.detail || 'No se pudo subir el archivo',
      color: 'red'
    })
  } finally {
    uploading.value = false
  }
}

const deleteAttachment = async (id: string) => {
  if (!confirm('¿Estás seguro de eliminar este archivo?')) return

  try {
    const response = await $fetch(`/api/attachments/${id}`, {
      method: 'DELETE'
    })

    if (response.success) {
      useToast().add({
        title: 'Archivo Eliminado',
        description: 'El archivo se ha eliminado exitosamente',
        color: 'green'
      })
      await loadAttachments()
    }
  } catch (error: any) {
    console.error('Error deleting attachment:', error)
    useToast().add({
      title: 'Error',
      description: 'No se pudo eliminar el archivo',
      color: 'red'
    })
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

const getAttachmentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'invoice': 'Factura',
    'receipt': 'Recibo',
    'contract': 'Contrato',
    'delivery_note': 'Remisión',
    'quotation': 'Cotización',
    'other': 'Otro'
  }
  return labels[type] || type
}

const isImage = (fileType: string): boolean => {
  return fileType.startsWith('image/')
}

const isPDF = (fileType: string): boolean => {
  return fileType === 'application/pdf'
}
</script>
