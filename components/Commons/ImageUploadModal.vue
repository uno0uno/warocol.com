<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div
        class="bg-surface border-2 border-border rounded-xl w-full max-w-md shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-upload-title"
      >

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 id="image-upload-title" class="text-base font-semibold text-text-primary">{{ headerTitle }}</h2>
          <button
            @click="$emit('close')"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-surface-secondary text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            :aria-label="t('common.imageUpload.close')"
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
              :alt="t('common.imageUpload.previewAlt', { type: imageTypeLabel })"
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
                {{ t('common.imageUpload.dropPrompt') }}
                <button type="button" class="text-primary hover:underline" @click.stop="fileInput?.click()">
                  {{ t('common.imageUpload.selectFile') }}
                </button>
              </p>
              <p class="text-xs text-text-secondary">
                {{ t('common.imageUpload.formatsHint', { recommendation: recommendationText }) }}
              </p>
            </div>

            <div
              v-if="preview && compressedSize"
              class="absolute bottom-2 end-2 bg-foreground/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm"
            >
              {{ compressedSize }}
            </div>

            <button
              v-if="preview"
              type="button"
              @click="fileInput?.click()"
              class="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group"
              :aria-label="t('common.imageUpload.changeImage')"
            >
              <span class="hidden group-hover:flex items-center gap-1.5 bg-foreground/60 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
                <PhotoIcon class="w-4 h-4" aria-hidden="true" />
                {{ t('common.imageUpload.changeImage') }}
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
          <span v-if="isUploading" class="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {{ t('common.imageUpload.uploadingStable') }}
          </span>
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border rounded-lg hover:bg-surface-secondary transition-colors min-h-[44px]"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="!preview || isUploading"
            @click="confirmUpload"
            class="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px] w-[180px] justify-center"
          >
            <span
              v-if="isUploading"
              class="flex items-center justify-center gap-2"
              aria-hidden="true"
            >
              <UiLoadingDots size="8px" color="currentColor" aria-hidden="true" />
              <span class="whitespace-nowrap">{{ uploadingPhrase }}</span>
            </span>
            <span v-else class="flex items-center gap-2">
              <ArrowUpTrayIcon class="w-4 h-4" aria-hidden="true" />
              {{ t('common.imageUpload.uploadAction') }}
            </span>
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { XMarkIcon, PhotoIcon, ExclamationCircleIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline'

interface Props {
  /** Logical bucket — drives default dimensions, header title, and the
   *  `image_type` field added to the FormData (only when uploadEndpoint is
   *  the legacy tenant endpoint). */
  imageType: 'logo' | 'banner' | 'product' | 'avatar'
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
const { t } = useI18n({ useScope: 'global' })
const {
  currentPhrase: uploadingPhraseKey,
  start: startUploadingPhrases,
  stop: stopUploadingPhrases,
} = useLoadingPhrases(['preparing', 'optimizing', 'uploading'])
const uploadingPhrase = computed(() => t(`common.imageUpload.uploadingPhrases.${uploadingPhraseKey.value}`))

watch(isUploading, (uploading) => {
  if (uploading) startUploadingPhrases()
  else stopUploadingPhrases()
})

const DEFAULT_DIMS = {
  logo: { w: 400, h: 400 },
  banner: { w: 1400, h: 470 },
  product: { w: 800, h: 800 },
  avatar: { w: 800, h: 800 },
} as const

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024

const headerTitle = computed(() => {
  if (props.title) return props.title
  return t(`common.imageUpload.titles.${props.imageType}`)
})

const recommendationText = computed(() => {
  return props.recommendationText || t(`common.imageUpload.recommendations.${props.imageType}`)
})

const imageTypeLabel = computed(() => t(`common.imageUpload.types.${props.imageType}`))

const previewClass = computed(() => {
  if (props.imageType === 'logo') return 'max-h-48 object-contain'
  if (props.imageType === 'product') return 'h-48 object-cover'
  if (props.imageType === 'avatar') return 'h-48 w-48 mx-auto rounded-full object-cover'
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
    errorMsg.value = t('common.imageUpload.errors.invalidType')
    return
  }
  if (file.size > MAX_SIZE_BYTES) {
    errorMsg.value = t('common.imageUpload.errors.tooLarge', { size: formatBytes(file.size) })
    return
  }

  try {
    const blob = await compressImage(file)
    compressedBlob.value = blob
    preview.value = URL.createObjectURL(blob)
    compressedSize.value = formatBytes(blob.size)
  } catch {
    errorMsg.value = t('common.imageUpload.errors.processing')
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
    errorMsg.value = err?.data?.detail || t('common.imageUpload.errors.upload')
  } finally {
    isUploading.value = false
  }
}

onUnmounted(() => {
  if (preview.value) URL.revokeObjectURL(preview.value)
})
</script>
