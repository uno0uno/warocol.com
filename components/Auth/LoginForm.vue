<template>
  <div class="flex flex-col md:flex-row w-screen h-screen overflow-hidden">
    <!-- Left Panel - Formulario -->
    <div class="relative flex flex-col items-center justify-center w-full h-full md:h-auto md:w-auto md:flex-1 md:max-w-[500px] px-6 sm:px-12 md:px-16 py-8 md:py-12 bg-[hsl(220,14%,97%)]">
      <!-- Fondo de emojis - Solo visible en mobile -->
      <div ref="foodBgContainer" class="absolute inset-0 md:hidden overflow-hidden pointer-events-none z-0">
        <div
          v-for="(item, index) in foodItems"
          :key="index"
          class="food-item mobile-emoji"
          :style="item.style"
        >
          {{ item.emoji }}
        </div>
      </div>

      <div class="relative z-10 flex flex-col w-full max-w-md">
        <!-- Logo -->
        <div class="mb-8 md:mb-16">
          <img src="/logo_waro_10_octubre.png" alt="Waro" class="h-8 md:h-10 w-auto">
        </div>

        <!-- Contenido del login -->
        <div class="flex-1">
          <!-- Verificando sesión -->
          <div v-if="checkingSession" class="text-center space-y-4">
            <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style="border-color: hsl(250, 30%, 16%); border-top-color: transparent;"></div>
            <p class="text-sm" style="color: hsl(220, 13%, 28%);">Verificando sesión...</p>
          </div>

          <!-- Formulario de login -->
          <div v-else-if="!emailSent">
            <h1 class="text-3xl font-medium mb-4" style="color: hsl(250, 30%, 16%);">Iniciar sesión</h1>
            <p class="text-base mb-10" style="color: hsl(220, 13%, 28%);">
              Ingresa tu email para recibir un código de acceso seguro.
            </p>

            <!-- Email Form -->
            <form @submit.prevent="handleSubmit">
              <div class="mb-6">
                <label for="email" class="block text-xs font-semibold mb-2" style="color: hsl(250, 30%, 16%);">
                  Dirección de Email
                </label>
                <input id="email" v-model="email" type="email" required :disabled="loading"
                  class="w-full px-4 py-3 rounded-md text-base border-2 transition-all"
                  style="background-color: white; border-color: hsl(250, 30%, 16%); color: hsl(250, 30%, 16%);"
                  @focus="$event.target.style.borderColor = 'hsl(250, 30%, 16%)'; $event.target.style.boxShadow = '0 0 0 3px hsl(250, 30%, 16%, 0.1)'"
                  @blur="$event.target.style.borderColor = 'hsl(250, 30%, 16%)'; $event.target.style.boxShadow = 'none'" />
              </div>

              <button type="submit" :disabled="loading || !email"
                class="px-6 py-3 rounded-md text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                :style="email && !loading ?
                  'background-color: hsl(250, 30%, 16%); color: white;' :
                  'background-color: hsl(220, 14%, 90%); color: hsl(220, 8%, 51%); cursor: not-allowed;'"
                @mouseenter="email && !loading && ($event.target.style.backgroundColor = 'hsl(243, 26%, 23%)')"
                @mouseleave="email && !loading && ($event.target.style.backgroundColor = 'hsl(250, 30%, 16%)')">
                <span v-if="loading" class="flex items-center justify-center gap-2">
                  <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Enviando...
                </span>
                <span v-else>Siguiente</span>
              </button>
            </form>
          </div>

          <!-- Código de verificación -->
          <div v-else-if="emailSent">
            <h1 class="text-3xl font-medium mb-4" style="color: hsl(250, 30%, 16%);">Código de Verificación</h1>
            <p class="text-base mb-10" style="color: hsl(220, 13%, 28%);">
              Revisa tu email <span class="font-medium" style="color: hsl(250, 30%, 16%);">({{ email }})</span> y usa el
              código de 6 dígitos:
            </p>

            <div class="space-y-6">
              <input v-model="verificationCode" type="text" placeholder="123456" :disabled="verifyingCode"
                @keyup.enter="verifyCode"
                class="w-full text-center text-2xl tracking-widest font-mono px-4 py-3.5 rounded-md transition-all border-2"
                style="background-color: white; border-color: hsl(250, 30%, 16%); color: hsl(250, 30%, 16%);"
                @focus="$event.target.style.borderColor = 'hsl(250, 30%, 16%)'; $event.target.style.boxShadow = '0 0 0 3px hsl(250, 30%, 16%, 0.1)'"
                @blur="$event.target.style.borderColor = 'hsl(250, 30%, 16%)'; $event.target.style.boxShadow = 'none'" />

              <button @click="verifyCode"
                :disabled="!verificationCode || verificationCode.length !== 6 || verifyingCode"
                class="w-full py-3 rounded-md text-base font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style="background-color: hsl(250, 30%, 16%); color: white;"
                @mouseenter="!verifyingCode && ($event.target.style.backgroundColor = 'hsl(243, 26%, 23%)')"
                @mouseleave="!verifyingCode && ($event.target.style.backgroundColor = 'hsl(250, 30%, 16%)')">
                <span v-if="verifyingCode" class="flex items-center justify-center gap-2">
                  <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Verificando...
                </span>
                <span v-else>Verificar Código</span>
              </button>
            </div>

            <div class="text-center mt-8">
              <p class="text-sm" style="color: hsl(220, 13%, 28%);">
                ¿No recibiste el email?
                <button @click="emailSent = false; verificationCode = ''" type="button"
                  class="font-medium ml-1 hover:underline" style="color: hsl(250, 30%, 16%);">
                  Reenviar
                </button>
              </p>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mt-5 rounded-md p-4 border"
            style="background-color: hsl(var(--destructive) / 0.1); border-color: hsl(var(--destructive));">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5" style="color: hsl(var(--destructive));" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium" style="color: hsl(var(--destructive));">Error de autenticación</p>
                <p class="text-sm mt-1" style="color: hsl(var(--destructive));">{{ error }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel - Fondo de alimentos (solo desktop) -->
    <div class="hidden md:flex flex-1 relative items-center justify-start px-8 md:px-12 lg:px-20 py-8 md:py-16 overflow-hidden bg-[hsl(220,14%,97%)]">
      <!-- Fondo de emojis para desktop -->
      <div ref="foodBgContainerDesktop" class="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          v-for="(item, index) in foodItemsDesktop"
          :key="index"
          class="food-item"
          :style="item.style"
        >
          {{ item.emoji }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const email = ref('')
const loading = ref(false)
const error = ref('')
const checkingSession = ref(true)
const emailSent = ref(false)
const verificationCode = ref('')
const verifyingCode = ref(false)
const toast = useToast()


// ========================================
// LÓGICA DINÁMICA PARA EMOJIS DE COMIDA
// ========================================

// Catálogo de emojis de comida
const foodEmojis = [
  '🍞', '🥖', '🥐', '🍕', '🍔', '🌮', '🍟', '🥪', '🌭', '🍖',
  '🥙', '🍗', '🥓', '🥩', '🍳', '🧀', '🥚', '🍱', '🥗', '🍝',
  '🍜', '🍲', '🍛', '🍣', '🍤', '🥟', '🥡', '🦐', '🦞', '🦀',
  '🐟', '🥘', '🍚', '🥫', '🧆', '🥧', '🧁', '🍰', '🎂', '🍪'
]

// Referencias a los contenedores de emojis
const foodBgContainer = ref(null) // Mobile
const foodBgContainerDesktop = ref(null) // Desktop

// Dimensiones de los contenedores
const containerWidth = ref(0)
const containerHeight = ref(0)
const containerWidthDesktop = ref(0)
const containerHeightDesktop = ref(0)

// Detectar si es mobile
const isMobile = ref(false)

// Función helper para generar emojis
const generateFoodItems = (width, height, size) => {
  if (width === 0 || height === 0) return []

  const cols = Math.ceil(width / size)
  const rows = Math.ceil(height / size)
  const totalItems = cols * rows

  const items = []
  for (let i = 0; i < totalItems; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols

    const emoji = foodEmojis[Math.floor(Math.random() * foodEmojis.length)]
    const left = (col * size) + (size / 2)
    const top = (row * size) + (size / 2)

    items.push({
      emoji,
      style: {
        left: `${left}px`,
        top: `${top}px`
      }
    })
  }

  return items
}

// Computed property para emojis en mobile
const foodItems = computed(() => {
  return generateFoodItems(containerWidth.value, containerHeight.value, 70)
})

// Computed property para emojis en desktop
const foodItemsDesktop = computed(() => {
  return generateFoodItems(containerWidthDesktop.value, containerHeightDesktop.value, 80)
})

// Observers para detectar cambios de tamaño
let resizeObserver = null
let resizeObserverDesktop = null

// Obtener configuración de runtime
const {
  public: {
    baseUrl,
    warolabsApiUrl,
    organizationName,
    defaultRedirectUrl
  }
} = useRuntimeConfig()

// Función para detectar mobile (necesita estar definida antes de onMounted)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// Verificar si ya hay sesión al cargar el componente y configurar observer de emojis
onMounted(async () => {
  // Detectar si es mobile
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // Configurar observer de emojis para mobile
  if (foodBgContainer.value) {
    const rect = foodBgContainer.value.getBoundingClientRect()
    containerWidth.value = rect.width
    containerHeight.value = rect.height

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
        containerHeight.value = entry.contentRect.height
      }
    })

    resizeObserver.observe(foodBgContainer.value)
  }

  // Configurar observer de emojis para desktop
  if (foodBgContainerDesktop.value) {
    const rect = foodBgContainerDesktop.value.getBoundingClientRect()
    containerWidthDesktop.value = rect.width
    containerHeightDesktop.value = rect.height

    resizeObserverDesktop = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidthDesktop.value = entry.contentRect.width
        containerHeightDesktop.value = entry.contentRect.height
      }
    })

    resizeObserverDesktop.observe(foodBgContainerDesktop.value)
  }

  // Verificar sesión existente
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

// Cleanup observers y event listeners cuando el componente se desmonte
onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (resizeObserverDesktop) {
    resizeObserverDesktop.disconnect()
  }
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
/* Estilos base para cada emoji (posición calculada dinámicamente) */
.food-item {
  position: absolute;
  font-size: 50px;
  opacity: 0.08;
  filter: grayscale(100%) brightness(0.7);
  transform: translate(-50%, -50%);
}

/* Emojis en mobile - más opacidad visible */
.mobile-emoji {
  font-size: 45px;
  opacity: 0.15;
}
</style>
