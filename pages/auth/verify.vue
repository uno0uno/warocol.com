<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      
      <!-- Verificando token -->
      <div v-if="verifying" class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div class="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <div class="w-8 h-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Verificando acceso</h1>
        <p class="text-gray-600">Por favor espera mientras verificamos tu magic link...</p>
      </div>

      <!-- Verificación exitosa -->
      <div v-else-if="success" class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">¡Acceso autorizado!</h1>
        <p class="text-gray-600 mb-4">Tu sesión se ha iniciado correctamente. Serás redirigido en unos segundos...</p>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300" :style="{ width: `${redirectProgress}%` }"></div>
        </div>
      </div>

      <!-- Error en la verificación -->
      <div v-else-if="error" class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Error de verificación</h1>
        <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
        
        <div class="space-y-3">
          <NuxtLink 
            to="/auth/login"
            class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 inline-block text-center"
          >
            Intentar nuevamente
          </NuxtLink>
          
          <p class="text-xs text-gray-500">
            Si el problema persiste, solicita un nuevo magic link
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: false // Sin layout para página de verificación
});

const route = useRoute()
const toast = useToast()
const { public: { defaultRedirectUrl } } = useRuntimeConfig()


// Estados reactivos
const verifying = ref(true)
const success = ref(false)
const error = ref(false)
const errorMessage = ref('')
const redirectProgress = ref(0)

// Obtener parámetros de la URL
const token = route.query.token
const email = route.query.email
const redirectUrl = route.query.redirect || '/financiero/tir'


// Función para verificar el token
const verifyToken = async () => {
  try {
    
    if (!token || !email) {
      throw new Error('Token o email faltante en la URL')
    }

    // Llamar al endpoint de verificación
    const response = await $fetch('/api/auth/verify', {
      method: 'POST',
      body: {
        email: email,
        token: token
      },
      credentials: 'include'
    })

    
    // Marcar como exitoso
    verifying.value = false
    success.value = true
    
    // Animar la barra de progreso
    const progressInterval = setInterval(() => {
      redirectProgress.value += 10
      if (redirectProgress.value >= 100) {
        clearInterval(progressInterval)
        
        // Redirigir después de completar la animación
        setTimeout(() => {
          navigateTo(redirectUrl)
        }, 500)
      }
    }, 200)

  } catch (err) {
    console.error('❌ Error verifying token:', err)
    
    verifying.value = false
    error.value = true
    
    // Determinar mensaje de error específico
    if (err.message?.includes('Token inválido') || err.message?.includes('expirado')) {
      errorMessage.value = 'El magic link ha expirado o es inválido. Solicita uno nuevo.'
    } else if (err.message?.includes('faltante')) {
      errorMessage.value = 'El enlace de verificación está incompleto.'
    } else {
      errorMessage.value = err.message || 'Error al verificar el magic link. Inténtalo nuevamente.'
    }
  }
}

// Verificar token al montar el componente
onMounted(() => {
  // Pequeño delay para mejor UX
  setTimeout(() => {
    verifyToken()
  }, 1000)
})
</script>