<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div class="bg-surface border-2 border-border rounded-xl w-full max-w-md shadow-xl">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 class="text-base font-semibold text-text-primary">{{ headerTitle }}</h2>
          <button
            @click="$emit('close')"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-surface-secondary text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Cerrar modal"
          >
            <XMarkIcon class="w-5 h-5" aria-hidden="true" />
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
            <img
              v-if="preview"
              :src="preview"
              :alt="`Preview de ${imageType}`"
              class="w-full object-cover"
              :class="previewClass"
            />

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
                JPEG, PNG o WebP · máx 5 MB · {{ recommendationText }}
              </p>
            </div>

            <div
              v-if="preview && compressedSize"
              class="absolute bottom-2 right-2 bg-foreground/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm"
            >
              {{ compressedSize }}
            </div>

            <button
              v-if="preview"
              type="button"
              @click="fileInput?.click()"
              class="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group"
              aria-label="Cambiar imagen"
            >
              <span class="hidden group-hover:flex items-center gap-1.5 bg-foreground/60 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
                <PhotoIcon class="w-4 h-4" aria-hidden="true" />
                Cambiar imagen
              </span>
            </button>
          </div>

          <p v-if="errorMsg" class="flex items-center gap-1.5 text-sm text-destructive" role="alert">
            <ExclamationCircleIcon class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {{ errorMsg }}
          </p>

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
            class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface-secondary transition-colors min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="!preview || isUploading"
            @click="confirmUpload"
            class="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px] min-w-[130px] justify-center"
          >
            <span v-if="isUploading" class="flex items-center gap-2">
              Subiendo
              <CommonsInlineDots aria-label="Subiendo imagen" :size="5" />
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
import { computed, onUnmounted, ref } from 'vue'
import { XMarkIcon, PhotoIcon, ExclamationCircleIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'

interface Props {
  /** Logical bucket — drives default dimensions, header title, and the
   *  `image_type` field added to the FormData (only when uploadEndpoint is
   *  the legacy tenant endpoint). */
  imageType: 'logo' | 'banner' | 'product'
  /** Backend POST URL. Receives a multipart/form-data with `file`. */
  uploadEndpoint: string
  /** Whether to also send `image_type` as a form field — needed by the legacy
   *  tenant endpoint that handles logo + banner under one route. */
  sendImageTypeField?: boolean
  /** Override max dimensions for compression. Defaults per imageType apply
   *  if omitted. */
  maxDims?: { w: number; h: number }
  /** Helper text inside the empty state, e.g. "cuadrada 800×800 recomendada". */
  recommendationText?: string
  /** Custom title in the modal header. Defaults to "Subir imagen de X". */
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  sendImageTypeField: false,
  maxDims: undefined,
  recommendationText: '',
  title: '',
})

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

const DEFAULT_DIMS = {
  logo: { w: 400, h: 400 },
  banner: { w: 1400, h: 470 },
  product: { w: 800, h: 800 },
} as const

const DEFAULT_RECOMMENDATIONS: Record<string, string> = {
  logo: 'cuadrada recomendada',
  banner: '1200 × 400 px recomendado',
  product: 'cuadrada · 800×800 recomendada',
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024

const headerTitle = computed(() => {
  if (props.title) return props.title
  if (props.imageType === 'logo') return 'Subir imagen de logo'
  if (props.imageType === 'banner') return 'Subir imagen de banner'
  return 'Subir imagen del producto'
})

const recommendationText = computed(() => {
  return props.recommendationText || DEFAULT_RECOMMENDATIONS[props.imageType] || ''
})

const previewClass = computed(() => {
  if (props.imageType === 'logo') return 'max-h-48 object-contain'
  if (props.imageType === 'product') return 'h-48 object-cover'
  return 'h-36'
})

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const dims = props.maxDims || DEFAULT_DIMS[props.imageType]
      let { naturalWidth: w, naturalHeight: h } = img

      if (w > dims.w || h > dims.h) {
        const ratio = Math.min(dims.w / w, dims.h / h)
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
    if (props.sendImageTypeField) {
      formData.append('image_type', props.imageType)
    }

    const response = await $fetch<{ url: string }>(props.uploadEndpoint, {
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
