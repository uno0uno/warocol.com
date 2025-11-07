<template>
  <Card class="mx-auto max-w-sm space-y-6 p-8">
    <!-- Verificando sesión existente -->
    <div v-if="checkingSession" class="text-center space-y-4">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      <p class="text-muted-foreground">Verificando sesión...</p>
    </div>

    <!-- Formulario de login -->
    <div v-else-if="!emailSent" class="space-y-6">
      <div class="space-y-2 text-center">
        <div class="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span class="text-white font-bold text-2xl">W</span>
        </div>
        <h1 class="text-3xl font-bold">Bienvenido a {{ organizationName }}</h1>
        <p class="text-muted-foreground">
          Ingresa tu email para acceder como profesional
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <label for="email" class="text-sm font-medium">
            Email Profesional
          </label>
          <Input
            id="email"
            v-model="email"
            type="email"
            placeholder="tu@email.com"
            required
            :disabled="loading"
          />
        </div>

        <Button 
          type="submit" 
          class="w-full"
          :disabled="loading || !email"
        >
          <div v-if="loading" class="flex items-center justify-center gap-2">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Enviando...
          </div>
          <span v-else>Enviar Magic Link</span>
        </Button>
      </form>

      <div class="text-center text-sm text-muted-foreground">
        <p>¿Eres fotógrafo, DJ o bartender?</p>
        <p class="mt-1">Se creará tu perfil automáticamente al iniciar sesión.</p>
      </div>
    </div>

    <!-- Verification Code Section -->
    <div v-else-if="emailSent" class="space-y-4">
      <div class="text-center space-y-2">
        <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <h3 class="text-lg font-semibold">Código de Verificación</h3>
        <p class="text-sm text-muted-foreground">
          Revisa tu email <span class="font-medium">({{ email }})</span> y usa el código de 6 dígitos:
        </p>
      </div>
      
      <div class="space-y-3">
        <Input
          v-model="verificationCode"
          type="text"
          placeholder="123456"
          class="w-full text-center text-2xl tracking-widest font-mono"
          :disabled="verifyingCode"
          @keyup.enter="verifyCode"
        />
        
        <Button 
          @click="verifyCode" 
          :disabled="!verificationCode || verificationCode.length !== 6 || verifyingCode"
          class="w-full"
        >
          <div v-if="verifyingCode" class="flex items-center justify-center gap-2">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Verificando...
          </div>
          <span v-else>Verificar Código</span>
        </Button>
      </div>
      
      <div class="text-center">
        <p class="text-xs text-muted-foreground">
          ¿No recibiste el email? 
          <Button 
            @click="emailSent = false; verificationCode = ''" 
            variant="link"
            type="button"
            class="h-auto p-0"
          >
            Reenviar
          </Button>
        </p>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="rounded-lg bg-red-50 p-4 border border-red-200">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-destructive">Error de autenticación</p>
          <p class="text-sm text-destructive-foreground mt-1">{{ error }}</p>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup>
import { Button, Input, Card } from '~/components/ui'

const email = ref('')
const loading = ref(false)
const error = ref('')
const checkingSession = ref(true)
const emailSent = ref(false)
const verificationCode = ref('')
const verifyingCode = ref(false)
const toast = useToast()

// Obtener configuración de runtime
const {
  public: {
    baseUrl,
    warolabsApiUrl,
    organizationName,
    defaultRedirectUrl
  }
} = useRuntimeConfig()


// Verificar si ya hay sesión al cargar el componente
onMounted(async () => {
  try {
    const session = await $fetch('/api/auth/session', {
      credentials: 'include'
    })
    if (session?.success && session?.user) {
      
      // Verificar que la sesión sea válida para warocol.com (tenant: Waro Colombia)
      const expectedTenantName = 'Waro Colombia'
      if (session.user.tenant_name === expectedTenantName || session.user.is_superuser) {
        
        // Redirigir al perfil de warocol
        const route = useRoute()
        const redirectUrl = route.query.redirect || '/financiero/tir'
        await navigateTo(redirectUrl)
        return
      } else {
      }
    }
  } catch (error) {
    // No hay sesión válida o es para otro tenant, mostrar formulario
  } finally {
    checkingSession.value = false
  }
})

async function handleSubmit() {
  if (!email.value) return
  
  loading.value = true
  error.value = ''

  try {
    const route = useRoute()
    const response = await $fetch('/api/auth/sign-in-magic-link', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Origin': baseUrl || 'http://localhost:8080'
      },
      body: {
        email: email.value,
        redirect: route.query.redirect
      }
    })
    
    // Mostrar toast de éxito y activar UI de código
    toast.success('Código enviado a tu email')
    emailSent.value = true
  } catch (err) {
    console.error('❌ Error al enviar magic link:', err)
    error.value = err.message || 'Error al enviar el magic link. Intenta nuevamente.'
  } finally {
    loading.value = false
  }
}

async function verifyCode() {
  if (!verificationCode.value || verificationCode.value.length !== 6) {
    error.value = 'Ingresa un código de 6 dígitos'
    return
  }
  
  verifyingCode.value = true
  error.value = ''
  
  try {
    const response = await $fetch('/api/auth/verify-code', {
      method: 'POST',
      body: {
        email: email.value,
        code: verificationCode.value
      },
      credentials: 'include'
    })
    
    toast.success('¡Acceso autorizado! Redirigiendo...')
    
    // Redirigir con recarga completa para asegurar que la cookie se incluya
    const route = useRoute()
    const redirectUrl = route.query.redirect || '/financiero/tir'
    
    // Agregar delay antes de redirección
    setTimeout(() => {
      // Usar window.location para forzar recarga completa
      window.location.href = redirectUrl
    }, 1000)
    
  } catch (err) {
    console.error('❌ Error al verificar código:', err)
    error.value = err.message || 'Código inválido o expirado'
  } finally {
    verifyingCode.value = false
  }
}

// Reset error state when email or code changes
watch([email, verificationCode], () => {
  if (error.value) {
    error.value = ''
  }
})
</script>