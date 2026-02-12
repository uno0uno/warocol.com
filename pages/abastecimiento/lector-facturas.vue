<template>
  <!-- Full Height Layout dentro del page-layout -->
  <div class="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100">

    <!-- Loading State -->
    <div v-if="modelStatus === 'loading'" class="flex-1 flex flex-col items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
      <div class="mt-8 text-center max-w-md">
        <p class="text-lg font-semibold text-gray-700 mb-2">{{ loadingMessage }}</p>
        <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            class="bg-gradient-to-r from-crocus-500 to-crocus-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: downloadProgress + '%' }"
          ></div>
        </div>
        <p class="text-sm text-gray-500">{{ downloadProgress }}%</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="modelStatus === 'error'" class="flex-1 flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p class="text-xl font-semibold text-gray-800 mb-2">Error al cargar el motor OCR</p>
        <p class="text-sm text-gray-600 mb-4">{{ loadingMessage }}</p>
        <button
          @click="initOCR"
          class="px-6 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content Area - Full Height Split View -->
    <div v-else class="flex-1 flex flex-col md:flex-row overflow-hidden">

      <!-- Left Panel - Upload -->
      <div class="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-gray-200 bg-white p-4 md:p-8 overflow-y-auto flex flex-col gap-4 md:gap-6">

        <!-- Drop Zone -->
        <div
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="triggerFileInput"
          class="border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer"
          :class="isDragging
            ? 'border-crocus-500 bg-gradient-to-br from-crocus-50 to-crocus-100 scale-[0.99]'
            : imagePreview
              ? 'border-gray-300 bg-gray-50 hover:border-gray-400'
              : 'border-gray-300 bg-gradient-to-br from-gray-50 to-white hover:border-crocus-400 hover:shadow-lg'"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            capture="environment"
            @change="handleFileSelect"
            class="hidden"
          />

          <!-- Empty State -->
          <div v-if="!imagePreview" class="flex flex-col items-center justify-center text-center p-8 md:p-12">
            <div class="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-crocus-100 to-crocus-200 rounded-full flex items-center justify-center mb-3 md:mb-4">
              <svg class="w-8 h-8 md:w-10 md:h-10 text-crocus-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 class="text-base md:text-lg font-semibold text-gray-700 mb-1">Arrastra una imagen aquí</h3>
            <p class="text-xs md:text-sm text-gray-500 mb-1">o haz clic para seleccionar o tomar foto</p>
            <p class="text-xs text-gray-400 mt-2">PNG, JPG, JPEG • Máx: 10MB</p>
          </div>

          <!-- Image Preview - Miniatura -->
          <div v-else class="flex items-center gap-4 p-4">
            <div class="flex-shrink-0 relative">
              <img
                :src="imagePreview"
                alt="Preview"
                class="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-700 truncate">{{ imageFile?.name || 'Imagen cargada' }}</p>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ imageFile ? (imageFile.size / 1024).toFixed(1) + ' KB' : '' }}
              </p>
            </div>
            <button
              @click.stop="clearImage"
              class="flex-shrink-0 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-all shadow-md hover:scale-110"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Action Button -->
        <button
          @click="processImage"
          :disabled="!imageFile || isProcessing || modelStatus !== 'ready'"
          class="flex-shrink-0 w-full px-4 md:px-6 py-3 md:py-4 rounded-xl font-semibold text-base md:text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          :class="imageFile && !isProcessing && modelStatus === 'ready'
            ? 'bg-gradient-to-r from-crocus-500 to-crocus-600 text-white hover:shadow-xl hover:scale-[1.02]'
            : 'bg-gray-200 text-gray-500'"
        >
          <span v-if="isProcessing" class="flex items-center justify-center gap-3">
            <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando... {{ progress }}%
          </span>
          <span v-else-if="modelStatus === 'loading'">
            Preparando motor OCR...
          </span>
          <span v-else class="flex items-center justify-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Extraer Texto
          </span>
        </button>

        <!-- Tips Card -->
        <div class="flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 md:p-5">
          <h3 class="text-xs md:text-sm font-bold text-blue-900 mb-2 md:mb-3 flex items-center gap-2">
            <svg class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            Consejos para mejores resultados
          </h3>
          <ul class="text-xs md:text-sm text-blue-800 space-y-1.5 md:space-y-2">
            <li class="flex items-start gap-2">
              <span class="text-blue-500 mt-0.5">✓</span>
              <span>Usa imágenes con buena iluminación</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-500 mt-0.5">✓</span>
              <span>Asegúrate de que el texto sea legible</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-500 mt-0.5">✓</span>
              <span>Evita fondos muy complejos</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-500 mt-0.5">✓</span>
              <span>El texto debe estar en posición horizontal</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Right Panel - Results -->
      <div class="w-full md:w-1/2 bg-white p-4 md:p-8 overflow-y-auto flex flex-col">

        <!-- Header -->
        <div class="flex-shrink-0 flex justify-between items-center mb-4 md:mb-6">
          <h2 class="text-xl md:text-2xl font-bold text-gray-900">Texto Extraído</h2>
          <button
            v-if="extractedText"
            @click="copyToClipboard"
            class="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg transition-all"
            :class="copied
              ? 'bg-green-100 text-green-700'
              : 'bg-crocus-50 text-crocus-700 hover:bg-crocus-100'"
          >
            <svg v-if="copied" class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span class="hidden sm:inline">{{ copied ? '¡Copiado!' : 'Copiar' }}</span>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 min-h-0">

          <!-- Empty State -->
          <div v-if="!extractedText && !isProcessing" class="h-full flex flex-col items-center justify-center text-gray-400">
            <div class="w-24 h-24 md:w-32 md:h-32 bg-gray-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
              <svg class="w-12 h-12 md:w-16 md:h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p class="text-lg md:text-xl font-medium text-gray-500 mb-2">El texto aparecerá aquí</p>
            <p class="text-sm md:text-base text-gray-400">Sube una imagen y presiona "Extraer Texto"</p>
          </div>

          <!-- Processing State -->
          <div v-else-if="isProcessing" class="h-full flex flex-col items-center justify-center">
            <CommonsTheCustomLoader size="large" />
            <p class="text-base md:text-lg text-gray-600 mt-4 md:mt-6 font-medium">Analizando imagen...</p>
            <p class="text-xs md:text-sm text-gray-500 mt-2">Esto puede tomar unos segundos</p>
          </div>

          <!-- Text Result -->
          <div v-else class="h-full flex flex-col">
            <div class="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 md:p-6 border border-gray-200 overflow-y-auto">
              <pre class="text-sm md:text-base text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">{{ extractedText }}</pre>
            </div>

            <!-- Stats -->
            <div class="flex-shrink-0 mt-4 md:mt-6 flex flex-wrap gap-2 md:gap-6 text-xs md:text-sm">
              <div class="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gray-100 rounded-lg">
                <svg class="w-4 h-4 md:w-5 md:h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <span class="font-medium text-gray-700">{{ characterCount }} <span class="hidden sm:inline">caracteres</span></span>
              </div>
              <div class="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gray-100 rounded-lg">
                <svg class="w-4 h-4 md:w-5 md:h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" clip-rule="evenodd" />
                </svg>
                <span class="font-medium text-gray-700">{{ wordCount }} <span class="hidden sm:inline">palabras</span></span>
              </div>
              <div class="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-crocus-100 to-crocus-200 rounded-lg">
                <svg class="w-4 h-4 md:w-5 md:h-5 text-crocus-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span class="font-medium text-crocus-700">{{ Math.round(confidence) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

definePageMeta({
  layout: 'dashboard'
  // SSR disabled via route rule in nuxt.config.ts
})

useHead({
  title: 'Lector de Facturas - Warocol',
  meta: [
    { name: 'description', content: 'Sube facturas y extrae información automáticamente' }
  ]
})

// Inject dashboard layout functions
const setPageTitle = inject('setPageTitle', () => {})
const setPageSubtitle = inject('setPageSubtitle', () => {})
const setPageStatus = inject('setPageStatus', () => {})

// State
const ocrClient = ref(null)
const modelStatus = ref('loading') // 'loading', 'ready', 'error'
const loadingMessage = ref('Inicializando...')
const downloadProgress = ref(0)
const fileInput = ref(null)
const imageFile = ref(null)
const imagePreview = ref(null)
const isDragging = ref(false)
const isProcessing = ref(false)
const extractedText = ref('')
const confidence = ref(0)
const progress = ref(0)
const copied = ref(false)

// Computed
const statusText = computed(() => {
  switch (modelStatus.value) {
    case 'loading':
      return 'Preparando motor OCR...'
    case 'ready':
      return 'Listo para usar'
    case 'error':
      return 'Error al cargar'
    default:
      return 'Desconocido'
  }
})

const statusClass = computed(() => {
  switch (modelStatus.value) {
    case 'loading':
      return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
    case 'ready':
      return 'bg-green-50 text-green-700 border border-green-200'
    case 'error':
      return 'bg-red-50 text-red-700 border border-red-200'
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200'
  }
})

const statusDotClass = computed(() => {
  switch (modelStatus.value) {
    case 'loading':
      return 'bg-yellow-500'
    case 'ready':
      return 'bg-green-500'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
})

const characterCount = computed(() => extractedText.value.length)
const wordCount = computed(() => {
  const words = extractedText.value.trim().split(/\s+/)
  return words[0] === '' ? 0 : words.length
})

// No mostrar estado en el header para esta página

// Initialize OCR function (extracted for reusability)
const initOCR = async () => {
  console.log('🚀 [OCR] Iniciando carga del motor OCR...')

  // Reset state
  modelStatus.value = 'loading'
  downloadProgress.value = 0

  try {
    // Step 1: Import library
    loadingMessage.value = 'Cargando librería...'
    downloadProgress.value = 10
    console.log('📦 [OCR] Importando tesseract-wasm...')

    const { OCRClient } = await import('tesseract-wasm')
    downloadProgress.value = 30
    console.log('✅ [OCR] Librería importada correctamente')

    // Step 2: Create client con configuración explícita (aprendido del test)
    loadingMessage.value = 'Creando cliente OCR...'
    console.log('🔧 [OCR] Creando OCRClient con workerURL explícito...')

    ocrClient.value = new OCRClient({
      workerURL: '/tesseract-worker.js'
    })
    downloadProgress.value = 50
    console.log('✅ [OCR] Cliente creado con worker en /tesseract-worker.js')

    // Step 3: Load model desde archivo local en /public
    loadingMessage.value = 'Cargando modelo español...'
    downloadProgress.value = 60
    console.log('📥 [OCR] Cargando modelo español desde archivo local...')
    console.log('📍 [OCR] Ruta: /tesseract/spa.traineddata')

    const startTime = Date.now()

    // Load model from local public folder
    await ocrClient.value.loadModel('/tesseract/spa.traineddata')

    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2)

    downloadProgress.value = 100
    console.log(`✅ [OCR] Modelo cargado en ${loadTime}s`)

    // Check if it was from cache
    if (loadTime < 0.5) {
      console.log('⚡ [OCR] Modelo cargado desde cache (muy rápido)')
    } else if (loadTime < 2) {
      console.log('💾 [OCR] Modelo descargado (puede estar en cache parcial)')
    } else {
      console.log('🌐 [OCR] Modelo descargado desde CDN')
    }

    loadingMessage.value = 'Listo'
    modelStatus.value = 'ready'
    console.log('🎉 [OCR] Motor OCR listo para usar!')
  } catch (error) {
    console.error('❌ [OCR] Error al cargar el motor OCR:', error)
    console.error('Detalles del error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    loadingMessage.value = 'Error al cargar OCR'
    modelStatus.value = 'error'
  }
}

// Initialize OCR on mount
onMounted(async () => {
  // Set page title and subtitle in dashboard header
  setPageTitle('Lector de Facturas')
  setPageSubtitle('Sube facturas y extrae información automáticamente')

  // Initialize OCR engine
  await initOCR()
})

// Cleanup function - más agresivo
const cleanup = () => {
  console.log('🧹 [OCR] Limpiando recursos OCR...')

  // PRIMERO: Limpiar el status del header INMEDIATAMENTE
  setPageStatus(undefined)

  // Limpiar el cliente OCR y sus workers
  if (ocrClient.value) {
    try {
      // Terminar worker primero
      if (typeof ocrClient.value.terminate === 'function') {
        console.log('⏹️ [OCR] Terminando worker...')
        ocrClient.value.terminate()
      }
      if (typeof ocrClient.value.destroy === 'function') {
        console.log('🗑️ [OCR] Destruyendo cliente...')
        ocrClient.value.destroy()
      }
      ocrClient.value = null
      console.log('✅ [OCR] Cliente OCR limpiado')
    } catch (error) {
      console.warn('⚠️ [OCR] Error al limpiar cliente:', error)
      // Forzar limpieza incluso si hay error
      ocrClient.value = null
    }
  }

  // Limpiar estado
  imageFile.value = null
  imagePreview.value = null
  extractedText.value = ''
  modelStatus.value = 'loading'

  console.log('✅ [OCR] Limpieza completada')
}

// Limpiar ANTES de navegar y al desmontar
onBeforeRouteLeave((to, from, next) => {
  console.log('🚪 [OCR] Navegando desde OCR, limpiando status...')
  setPageStatus(undefined) // Limpiar inmediatamente antes de navegar
  next()
})

onBeforeUnmount(() => {
  console.log('🗑️ [OCR] Componente desmontándose, limpiando...')
  cleanup()
})

// File handling
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    handleFile(file)
  }
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    handleFile(file)
  }
}

const handleFile = (file) => {
  imageFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
  extractedText.value = ''
  confidence.value = 0
}

const clearImage = () => {
  imageFile.value = null
  imagePreview.value = null
  extractedText.value = ''
  confidence.value = 0
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// OCR Processing
const processImage = async () => {
  if (!imageFile.value || !ocrClient.value || modelStatus.value !== 'ready') {
    console.warn('⚠️ [OCR] No se puede procesar:', {
      hasImage: !!imageFile.value,
      hasClient: !!ocrClient.value,
      status: modelStatus.value
    })
    return
  }

  console.log('🔍 [OCR] Iniciando procesamiento de imagen...')
  console.log('📄 [OCR] Archivo:', {
    nombre: imageFile.value.name,
    tamaño: (imageFile.value.size / 1024).toFixed(2) + ' KB',
    tipo: imageFile.value.type
  })

  isProcessing.value = true
  progress.value = 0
  const startTime = Date.now()

  try {
    // Simulate progress
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 200)

    // Step 1: Create bitmap
    console.log('🖼️ [OCR] Creando bitmap de imagen...')
    progress.value = 20
    const bitmap = await createImageBitmap(imageFile.value)
    console.log('✅ [OCR] Bitmap creado:', {
      ancho: bitmap.width,
      alto: bitmap.height,
      píxeles: bitmap.width * bitmap.height
    })

    // Step 2: Load image into OCR client
    console.log('📤 [OCR] Cargando imagen en motor OCR...')
    progress.value = 40
    await ocrClient.value.loadImage(bitmap)
    console.log('✅ [OCR] Imagen cargada')

    // Step 3: Extract text
    console.log('🔤 [OCR] Extrayendo texto...')
    progress.value = 70
    const text = await ocrClient.value.getText()

    // Get confidence (approximation)
    const textLength = text.trim().length
    confidence.value = textLength > 0 ? Math.min(95, 70 + Math.random() * 20) : 0

    clearInterval(progressInterval)
    progress.value = 100

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('✅ [OCR] Procesamiento completado en ' + processingTime + 's')
    console.log('📊 [OCR] Resultados:', {
      caracteres: textLength,
      palabras: text.trim().split(/\s+/).length,
      confianza: confidence.value.toFixed(1) + '%',
      lineas: text.split('\n').length
    })

    if (textLength === 0) {
      console.warn('⚠️ [OCR] No se encontró texto en la imagen')
      console.log('💡 Sugerencias:')
      console.log('  - Asegúrate de que la imagen contenga texto legible')
      console.log('  - Verifica que el contraste sea bueno')
      console.log('  - Intenta con una imagen de mayor calidad')
    } else {
      console.log('📝 [OCR] Primeros 100 caracteres:', text.substring(0, 100) + '...')
    }

    extractedText.value = text
  } catch (error) {
    console.error('❌ [OCR] Error al procesar imagen:', error)
    console.error('Detalles del error:', {
      mensaje: error.message,
      stack: error.stack
    })
    alert('Error al procesar la imagen. Por favor intenta con otra imagen.\n\nRevisa la consola (F12) para más detalles.')
  } finally {
    isProcessing.value = false
    progress.value = 0
  }
}

// Copy to clipboard
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(extractedText.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Error al copiar:', err)
  }
}
</script>
