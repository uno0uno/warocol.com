<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div class="bg-surface border-2 border-border rounded-xl w-full max-w-md shadow-xl">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 class="text-base font-semibold text-text-primary">
            Subir imagen de {{ imageType === 'logo' ? 'logo' : 'banner' }}
          </h2>
          <button
            @click="$emit('close')"
            class="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary transition-colors"
            aria-label="Cerrar modal"
          >
            <XMarkIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-5 space-y-4">

          <!-- Drop zone / Preview -->
          <div
            class="relative border-2 border-dashed rounded-xl transition-colors overflow-hidden"
            :class="isDragging
              ? 'border-primary bg-primary/5'
              : preview ? 'border-border' : 'border-border/60 hover:border-primary/50 bg-surface-secondary'"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <!-- Preview image -->
            <img
              v-if="preview"
              :src="preview"
              :alt="`Preview de ${imageType}`"
              class="w-full object-cover"
              :class="imageType === 'logo' ? 'max-h-48 object-contain' : 'h-36'"
            />

            <!-- Empty state -->
            <div
              v-else
              class="flex flex-col items-center justify-center py-10 px-6 text-center cursor-pointer"
              @click="fileInput?.click()"
            >
              <PhotoIcon class="w-10 h-10 text-text-secondary/40 mb-3" aria-hidden="true" />
              <p class="text-sm font-medium text-text-primary mb-1">
                Arrastra tu imagen o
                <button type="button" class="text-primary hover:underline" @click.stop="fileInput?.click()">
                  selecciona un archivo
                </button>
              </p>
              <p class="text-xs text-text-secondary">
                JPEG, PNG o WebP · máx 5 MB ·
                {{ imageType === 'logo' ? 'cuadrada recomendada' : '1200 × 400 px recomendado' }}
              </p>
            </div>

            <!-- Compressed size badge -->
            <div
              v-if="preview && compressedSize"
              class="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm"
            >
              {{ compressedSize }}
            </div>

            <!-- Change overlay on preview -->
            <button
              v-if="preview"
              type="button"
              @click="fileInput?.click()"
              class="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group"
              aria-label="Cambiar imagen"
            >
              <span class="hidden group-hover:flex items-center gap-1.5 bg-black/60 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
                <PhotoIcon class="w-4 h-4" aria-hidden="true" />
                Cambiar imagen
              </span>
            </button>
          </div>

          <!-- Error message -->
          <p v-if="errorMsg" class="flex items-center gap-1.5 text-sm text-destructive" role="alert">
            <ExclamationCircleIcon class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {{ errorMsg }}
          </p>

          <!-- Hidden file input -->
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="onFileSelected"
          />
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="!preview || isUploading"
            @click="confirmUpload"
            class="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[130px] justify-center"
          >
            <span v-if="isUploading" class="flex items-center gap-2">
              <CommonsTheCustomLoader size="small" />
              Subiendo...
            </span>
            <span v-else class="flex items-center gap-2">
              <ArrowUpTrayIcon class="w-4 h-4" aria-hidden="true" />
              Subir imagen
            </span>
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon, PhotoIcon, ExclamationCircleIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  imageType: 'logo' | 'banner'
}>()

const emit = defineEmits<{
  upload: [url: string]
  close: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const preview = ref<string | null>(null)
const compressedSize = ref<string | null>(null)
const compressedBlob = ref<Blob | null>(null)
const errorMsg = ref<string | null>(null)
const isDragging = ref(false)
const isUploading = ref(false)

const toast = useToast()

// ─── Max dimensions per image type ───
const MAX_DIMS = {
  logo: { w: 400, h: 400 },
  banner: { w: 1400, h: 470 },
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024

// ─── Compress via Canvas ───
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const { w: maxW, h: maxH } = MAX_DIMS[props.imageType]
      let { naturalWidth: w, naturalHeight: h } = img

      // Scale down if exceeds max dimensions
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas compression failed'))
        },
        'image/jpeg',
        0.85,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function processFile(file: File) {
  errorMsg.value = null

  if (!ALLOWED_TYPES.has(file.type)) {
    errorMsg.value = 'Tipo de archivo no permitido. Usa JPEG, PNG o WebP.'
    return
  }
  if (file.size > MAX_SIZE_BYTES) {
    errorMsg.value = `El archivo es demasiado grande (${formatBytes(file.size)}). Máximo 5 MB.`
    return
  }

  try {
    const blob = await compressImage(file)
    compressedBlob.value = blob
    preview.value = URL.createObjectURL(blob)
    compressedSize.value = formatBytes(blob.size)
  } catch {
    errorMsg.value = 'No se pudo procesar la imagen. Intenta con otro archivo.'
  }
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) processFile(file)
  input.value = ''
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) processFile(file)
}

async function confirmUpload() {
  if (!compressedBlob.value || isUploading.value) return

  isUploading.value = true
  errorMsg.value = null

  try {
    const formData = new FormData()
    formData.append('file', compressedBlob.value, `${props.imageType}.jpg`)
    formData.append('image_type', props.imageType)

    const response = await $fetch<{ url: string }>('/api/api/tenant/upload-image', {
      method: 'POST',
      body: formData,
    })

    emit('upload', response.url)
  } catch (err: any) {
    errorMsg.value = err?.data?.detail || 'Error al subir la imagen. Intenta de nuevo.'
  } finally {
    isUploading.value = false
  }
}

onUnmounted(() => {
  if (preview.value) URL.revokeObjectURL(preview.value)
})
</script>
