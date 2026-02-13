<template>
  <!-- Full Height Layout dentro del page-layout -->
  <div class="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100">

    <!-- Main Content Area - Full Height Split View -->
    <div class="flex-1 flex flex-col md:flex-row overflow-hidden">

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
            <h3 class="text-base md:text-lg font-semibold text-gray-700 mb-1">Sube tu factura</h3>
            <p class="text-xs md:text-sm text-gray-500 mb-1">Arrastra o haz clic para tomar foto</p>
            <p class="text-xs text-gray-400 mt-2">Optimizamos tu imagen automáticamente</p>
          </div>

          <!-- Image Preview - Miniatura -->
          <div v-else class="flex items-center gap-4 p-4">
            <div class="flex-shrink-0 relative">
              <img
                :src="imagePreview"
                alt="Preview"
                class="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 shadow-sm filter grayscale"
              />
              <div class="absolute -bottom-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                OPTIMIZADA
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-700 truncate">{{ imageFile?.name || 'Imagen cargada' }}</p>
              <div class="flex gap-2 mt-1">
                 <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                   {{ (imageFile?.size / 1024).toFixed(1) }} KB
                 </span>
              </div>
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
          @click="processInvoice"
          :disabled="!imageFile || isProcessing"
          class="flex-shrink-0 w-full px-4 md:px-6 py-3 md:py-4 rounded-xl font-semibold text-base md:text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          :class="imageFile && !isProcessing
            ? 'bg-gradient-to-r from-crocus-500 to-crocus-600 text-white hover:shadow-xl hover:scale-[1.02]'
            : 'bg-gray-200 text-gray-500'"
        >
          <span v-if="isProcessing" class="flex items-center justify-center gap-3">
            <svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando factura...
          </span>
          <span v-else class="flex items-center justify-center gap-2">
            <AppIcon name="heroicons:sparkles" class="w-6 h-6" />
            Extraer Datos con IA
          </span>
        </button>

        <!-- Use Canvas for client-side processing (Hidden) -->
        <canvas ref="canvasParams" class="hidden"></canvas>

        <!-- Tips Card -->
        <div class="flex-shrink-0 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 md:p-5">
          <h3 class="text-xs md:text-sm font-bold text-blue-900 mb-2 md:mb-3 flex items-center gap-2">
            <AppIcon name="heroicons:light-bulb" class="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            Nueva Tecnología Google Gemini
          </h3>
          <p class="text-xs text-blue-800 mb-2 leading-relaxed">
            Hemos actualizado nuestro motor de lectura. Ahora procesamos tu factura en la nube con Google AI para mayor precisión.
          </p>
          <ul class="text-xs md:text-sm text-blue-800 space-y-1.5 md:space-y-2">
            <li class="flex items-start gap-2">
              <span class="text-blue-500 mt-0.5">✓</span>
              <span>Sube fotos claras y bien iluminadas</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-500 mt-0.5">✓</span>
              <span>Nosotros optimizamos la imagen (escala de grises)</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-500 mt-0.5">✓</span>
              <span>Detectamos items, precios y proveedores</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Right Panel - Results -->
      <div class="w-full md:w-1/2 bg-white p-4 md:p-8 overflow-y-auto flex flex-col">

        <!-- Results Header -->
        <div class="flex-shrink-0 mb-4 md:mb-6 flex justify-between items-center">
          <h2 class="text-xl md:text-2xl font-bold text-gray-900">
            Datos Extraídos
          </h2>
          <div v-if="invoiceData" class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium">
            Procesado con Gemini Flash
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-h-0">

          <!-- Empty State -->
          <div v-if="!invoiceData && !isProcessing && !error" class="h-full flex flex-col items-center justify-center text-gray-400">
            <div class="w-24 h-24 md:w-32 md:h-32 bg-gray-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
              <AppIcon name="heroicons:document-text" class="w-12 h-12 md:w-16 md:h-16 text-gray-300" />
            </div>
            <p class="text-lg md:text-xl font-medium text-gray-500 mb-2">Los datos aparecerán aquí</p>
            <p class="text-sm md:text-base text-gray-400">Sube una factura para comenzar</p>
          </div>

          <!-- Loading State -->
          <div v-else-if="isProcessing" class="h-full flex flex-col items-center justify-center">
            <CommonsTheCustomLoader size="large" />
            <p class="text-base md:text-lg text-gray-600 mt-4 md:mt-6 font-medium">Analizando documento con IA...</p>
            <p class="text-xs md:text-sm text-gray-500 mt-2">Estamos identificando items y valores</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="flex flex-col items-center justify-center py-8">
             <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AppIcon name="heroicons:exclamation-triangle" class="w-8 h-8 text-red-500" />
             </div>
             <p class="text-sm text-red-600 font-medium mb-2">Error al procesar</p>
             <p class="text-xs text-gray-500 mb-4 text-center max-w-xs">{{ error }}</p>
             <button
                @click="processInvoice"
                class="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
             >
                Reintentar
             </button>
          </div>

          <!-- Structured Data -->
          <div v-else-if="invoiceData" class="space-y-4">

            <!-- Warning if any -->
            <div v-if="invoiceData.advertencia" class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3 text-yellow-800">
                <AppIcon name="heroicons:exclamation-circle" class="w-5 h-5 flex-shrink-0" />
                <p class="text-sm">{{ invoiceData.advertencia }}</p>
            </div>

            <!-- Invoice Header -->
            <div class="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-xs text-indigo-600 font-medium uppercase tracking-wide">Factura</p>
                  <p class="text-lg font-bold text-gray-900">{{ invoiceData.numero_factura || 'N/A' }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-indigo-600 font-medium uppercase tracking-wide">Fecha</p>
                  <p class="text-sm font-semibold text-gray-800">{{ invoiceData.fecha || 'N/A' }}</p>
                </div>
              </div>
              <div v-if="invoiceData.forma_pago" class="mt-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  {{ invoiceData.forma_pago }}
                </span>
              </div>
            </div>

            <!-- Supplier & Client -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Supplier -->
              <div class="bg-white border border-gray-200 rounded-xl p-4">
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Proveedor</p>
                <p class="text-sm font-semibold text-gray-900">{{ invoiceData.proveedor?.nombre || 'N/A' }}</p>
                <p v-if="invoiceData.proveedor?.nit" class="text-xs text-gray-600 mt-1">NIT: {{ invoiceData.proveedor.nit }}</p>
                <p v-if="invoiceData.proveedor?.direccion" class="text-xs text-gray-500 mt-1">{{ invoiceData.proveedor.direccion }}</p>
                <p v-if="invoiceData.proveedor?.telefono" class="text-xs text-gray-500 mt-0.5">{{ invoiceData.proveedor.telefono }}</p>
              </div>
              <!-- Client -->
              <div class="bg-white border border-gray-200 rounded-xl p-4">
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Cliente</p>
                <p class="text-sm font-semibold text-gray-900">{{ invoiceData.cliente?.nombre || 'N/A' }}</p>
                <p v-if="invoiceData.cliente?.nit" class="text-xs text-gray-600 mt-1">NIT: {{ invoiceData.cliente.nit }}</p>
              </div>
            </div>

            <!-- Items Table -->
            <div v-if="invoiceData.items && invoiceData.items.length > 0" class="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Items ({{ invoiceData.items.length }})</p>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-100">
                      <th class="text-left py-2 px-4 text-xs font-medium text-gray-500">Descripción</th>
                      <th class="text-right py-2 px-4 text-xs font-medium text-gray-500">Cant.</th>
                      <th class="text-right py-2 px-4 text-xs font-medium text-gray-500">P. Unit.</th>
                      <th class="text-right py-2 px-4 text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in invoiceData.items" :key="index" class="border-b border-gray-50 hover:bg-gray-50">
                      <td class="py-2 px-4 text-gray-800">{{ item.descripcion }}</td>
                      <td class="py-2 px-4 text-right text-gray-600">{{ item.cantidad }}</td>
                      <td class="py-2 px-4 text-right text-gray-600">{{ formatCurrency(item.precio_unitario) }}</td>
                      <td class="py-2 px-4 text-right font-medium text-gray-800">{{ formatCurrency(item.total) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Totals -->
            <div class="bg-white border border-gray-200 rounded-xl p-4">
              <div class="space-y-2">
                <div v-if="invoiceData.subtotal" class="flex justify-between text-sm">
                  <span class="text-gray-500">Subtotal</span>
                  <span class="font-medium text-gray-700">{{ formatCurrency(invoiceData.subtotal) }}</span>
                </div>
                <div v-if="invoiceData.iva" class="flex justify-between text-sm">
                  <span class="text-gray-500">IVA</span>
                  <span class="font-medium text-gray-700">{{ formatCurrency(invoiceData.iva) }}</span>
                </div>
                <div class="flex justify-between text-base pt-2 border-t border-gray-200">
                  <span class="font-semibold text-gray-900">Total</span>
                  <span class="font-bold text-indigo-600 text-lg">{{ formatCurrency(invoiceData.total) }}</span>
                </div>
              </div>
            </div>

            <!-- Observations -->
            <div v-if="invoiceData.observaciones" class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p class="text-xs text-yellow-700 font-medium uppercase tracking-wide mb-1">Observaciones</p>
              <p class="text-sm text-yellow-800">{{ invoiceData.observaciones }}</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, inject } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'Lector de Facturas - Warocol',
  meta: [
    { name: 'description', content: 'Sube facturas y extrae información con Google Gemini' }
  ]
})

// Inject dashboard layout functions
const setPageTitle = inject('setPageTitle', () => {})
const setPageSubtitle = inject('setPageSubtitle', () => {})

// State
const fileInput = ref(null)
const canvasParams = ref(null)
const imageFile = ref(null) // The optimized file to send
const imagePreview = ref(null)
const isDragging = ref(false)
const isProcessing = ref(false)
const invoiceData = ref(null)
const error = ref('')

onMounted(() => {
  setPageTitle('Lector de Facturas')
  setPageSubtitle('Procesa tus facturas con Inteligencia Artificial')
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) handleFile(file)
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    handleFile(file)
  }
}

const handleFile = async (file) => {
  try {
    isProcessing.value = true
    error.value = ''
    invoiceData.value = null
    
    // Create preview immediately for better UX
    imagePreview.value = URL.createObjectURL(file)
    
    // Optimize image (resize > grayscale > compress)
    const optimizedBlob = await optimizeImage(file)
    
    // Create new File object from blob
    imageFile.value = new File([optimizedBlob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now()
    })
    
    // Update preview with optimized image to show what we're sending
    imagePreview.value = URL.createObjectURL(imageFile.value)
    
  } catch (e) {
    console.error('Error optimizing image:', e)
    error.value = 'Error al procesar la imagen para envío.'
  } finally {
    isProcessing.value = false
  }
}

// Client-side image optimization
const optimizeImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = canvasParams.value || document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // 1. Resize logic (Max 1024px width/height)
      let width = img.width
      let height = img.height
      const maxSize = 1024

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
      }

      canvas.width = width
      canvas.height = height

      // 2. Grayscale conversion logic
      ctx.filter = 'grayscale(100%)'
      ctx.drawImage(img, 0, 0, width, height)

      // 3. Compress to JPEG
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas conversion failed'))
      }, 'image/jpeg', 0.7) // 70% quality
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

const clearImage = () => {
  imageFile.value = null
  imagePreview.value = null
  invoiceData.value = null
  error.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const processInvoice = async () => {
  if (!imageFile.value) return

  isProcessing.value = true
  error.value = ''
  invoiceData.value = null

  try {
    const formData = new FormData()
    formData.append('file', imageFile.value)

    const response = await $fetch('/api/suppliers/purchases/extract-invoice', {
      method: 'POST',
      body: formData
    })

    if (response.success && response.data) {
      invoiceData.value = response.data
    } else {
      throw new Error(response.error || 'Error desconocido en el servidor')
    }
  } catch (e) {
    console.error('API Error:', e)
    error.value = e.data?.detail || e.message || 'Error al conectar con el servidor de IA'
  } finally {
    isProcessing.value = false
  }
}

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}
</script>
