<template>
  <div :class="embedded ? '' : 'border-2 border-border rounded-lg p-4 bg-background/50'">
    <h3
      v-if="!embedded"
      class="text-sm font-semibold text-text-primary mb-3 flex items-center space-x-2"
    >
      <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      <span>{{ title }}</span>
    </h3>

    <!-- File Upload -->
    <div class="space-y-3">
      <div :class="embedded ? 'space-y-2' : 'flex items-center space-x-2'">
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
          multiple
          @change="handleFileSelect"
        />
        <button
          type="button"
          @click="$refs.fileInput.click()"
          :class="[
            'bg-primary/10 text-primary border-2 border-primary/30 rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium',
            embedded
              ? 'w-full flex items-center justify-center gap-2 px-4 py-3 border-dashed border-primary/25 bg-primary/5'
              : 'px-4 py-2'
          ]"
        >
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Adjuntar archivo
        </button>
        <span :class="embedded ? 'block text-xs text-text-secondary leading-relaxed' : 'text-xs text-text-secondary'">
          PDF, imágenes, documentos (máx. 10MB)
        </span>
      </div>

      <!-- Selected Files Preview -->
      <div v-if="modelValue.length > 0" class="space-y-2">
        <div
          v-for="(file, index) in modelValue"
          :key="index"
          class="flex items-center justify-between p-2 bg-surface border border-border rounded-lg"
        >
          <div class="flex items-center space-x-2 flex-1 min-w-0">
            <svg class="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span class="text-xs text-text-primary truncate">{{ file.name }}</span>
            <span class="text-xs text-text-secondary">({{ formatFileSize(file.size) }})</span>
          </div>
          <button
            type="button"
            @click="removeFile(index)"
            class="text-destructive hover:bg-destructive/10 p-1 rounded"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: File[]
  title?: string
  embedded?: boolean
}>(), {
  title: 'Documentos Adjuntos',
  embedded: false
})

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files)
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        useToast().error(`${file.name} excede el tamaño máximo de 10MB`, { title: 'Archivo muy grande' })
        return false
      }
      return true
    })
    emit('update:modelValue', [...props.modelValue, ...validFiles])
  }
  // Reset input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const removeFile = (index: number) => {
  const newFiles = [...props.modelValue]
  newFiles.splice(index, 1)
  emit('update:modelValue', newFiles)
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
</script>
