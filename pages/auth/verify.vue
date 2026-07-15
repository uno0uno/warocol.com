<template>
  <div class="flex w-screen h-screen overflow-hidden">
    <!-- Verificación con fondo de emojis -->
    <div class="relative flex items-center justify-center w-full h-full px-6 sm:px-12 md:px-16 py-8 md:py-12 bg-[hsl(220,14%,97%)]">
      <!-- Fondo de emojis -->
      <div ref="foodBgContainer" class="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          v-for="(item, index) in foodItems"
          :key="index"
          class="food-item"
          :style="item.style"
        >
          {{ item.emoji }}
        </div>
      </div>

      <div class="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-lg p-8 md:p-10">
        <!-- Logo -->
        <div class="mb-8 md:mb-16 flex justify-center">
          <img src="/logo_waro_colombia.png" alt="Waro" class="h-8 md:h-10 w-auto">
        </div>

        <!-- Verificando token -->
        <div v-if="verifying" class="text-center">
          <div class="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
            style="background-color: hsl(250, 30%, 16%, 0.1);">
            <div class="w-8 h-8 animate-spin rounded-full border-2 border-t-transparent"
              style="border-color: hsl(250, 30%, 16%); border-top-color: transparent;"></div>
          </div>
          <h1 class="text-2xl font-bold mb-2" style="color: hsl(250, 30%, 16%);">{{ t('auth.verifyingAccess') }}</h1>
          <p class="text-base" style="color: hsl(220, 13%, 28%);">{{ t('auth.verifyingMagicLinkHint') }}</p>
        </div>

        <!-- Verificación exitosa -->
        <div v-else-if="success" class="text-center">
          <div class="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center bg-green-100">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold mb-2" style="color: hsl(250, 30%, 16%);">{{ t('auth.accessAuthorized') }}</h1>
          <p class="text-base mb-6" style="color: hsl(220, 13%, 28%);">{{ t('auth.sessionStartedRedirect') }}</p>
          <div class="w-full rounded-full h-2" style="background-color: hsl(220, 14%, 90%);">
            <div class="h-2 rounded-full transition-all duration-300"
              style="background-color: hsl(250, 30%, 16%);"
              :style="{ width: `${redirectProgress}%` }"></div>
          </div>
        </div>

        <!-- Error en la verificación -->
        <div v-else-if="error" class="text-center" role="alert" aria-live="assertive">
          <div class="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center bg-red-100">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold mb-2" style="color: hsl(250, 30%, 16%);">{{ t('auth.verifyErrorTitle') }}</h1>
          <p class="text-base mb-6" style="color: hsl(220, 13%, 28%);">{{ errorMessage }}</p>

          <div class="space-y-3">
            <NuxtLink
              :to="errorActionTo"
              class="w-full py-3 px-6 rounded-md text-base font-medium transition-all inline-block text-center"
              style="background-color: hsl(250, 30%, 16%); color: white;"
              @mouseenter="$event.target.style.backgroundColor = 'hsl(243, 26%, 23%)'"
              @mouseleave="$event.target.style.backgroundColor = 'hsl(250, 30%, 16%)'"
            >
              {{ errorActionLabel }}
            </NuxtLink>

            <p class="text-xs" style="color: hsl(220, 13%, 28%);">
              {{ t('auth.verifyErrorPersist') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CUSTOMER_PORTAL_LOGIN,
  canUseInternalSession,
  getAccessAwareRedirect,
  getInternalAccessDeniedMessage,
  isInternalAccessDeniedError,
} from '~/utils/internalAccess'
import { ONBOARDING_PATH, isOnboardingEntrySession } from '~/utils/onboardingFlow'
import { clearRegistrationDraft } from '~/utils/registrationFlow'
import {
  readPublicCtaAnalyticsContext,
  writeVerifiedPublicCtaAttribution,
} from '~/utils/publicCta'
import { trackOnboardingEvent } from '~/utils/onboardingAnalytics'

definePageMeta({
  layout: false,
  robots: 'noindex, nofollow'
});

const { t } = useI18n()
useHead({ title: () => t('auth.verifyAccessTitle') })

const route = useRoute()
const router = useRouter()

// Estados reactivos
const verifying = ref(true)
const success = ref(false)
const error = ref(false)
const errorMessage = ref('')
const errorActionTo = ref('/auth/login')
const errorActionLabel = ref('')
const redirectProgress = ref(0)

// Obtener parámetros de la URL
const firstQueryString = (value: unknown) => {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' ? candidate : ''
}
const token = firstQueryString(route.query.token)
const email = firstQueryString(route.query.email)
const isRegistration = firstQueryString(route.query.purpose) === 'registration'
const authStore = useAuthStore()
const accessStore = useAccessStore()
const { syncAuthenticatedLocale } = useAppLocale()
const redirectUrl = ref<string | null>(null)

// ========================================
// LÓGICA PARA EMOJIS DE COMIDA
// ========================================

// Catálogo de emojis de comida
const foodEmojis = [
  '🍞', '🥖', '🥐', '🍕', '🍔', '🌮', '🍟', '🥪', '🌭', '🍖',
  '🥙', '🍗', '🥓', '🥩', '🍳', '🧀', '🥚', '🍱', '🥗', '🍝',
  '🍜', '🍲', '🍛', '🍣', '🍤', '🥟', '🥡', '🦐', '🦞', '🦀',
  '🐟', '🥘', '🍚', '🥫', '🧆', '🥧', '🧁', '🍰', '🎂', '🍪'
]

// Referencias
const foodBgContainer = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const containerHeight = ref(0)

// Función helper para generar emojis
const generateFoodItems = (width: number, height: number, size: number) => {
  if (width === 0 || height === 0) return []

  const cols = Math.ceil(width / size)
  const rows = Math.ceil(height / size)
  const totalItems = cols * rows

  const items = []
  for (let i = 0; i < totalItems; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols

    const emoji = foodEmojis[Math.floor(Math.random() * foodEmojis.length)]

    // Agregar variación aleatoria para desorganizar la cuadrícula
    const randomOffsetX = (Math.random() - 0.5) * size * 0.6
    const randomOffsetY = (Math.random() - 0.5) * size * 0.6

    const left = (col * size) + (size / 2) + randomOffsetX
    const top = (row * size) + (size / 2) + randomOffsetY

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

// Computed property para emojis
const foodItems = computed(() => {
  return generateFoodItems(containerWidth.value, containerHeight.value, 100)
})

// Observer para detectar cambios de tamaño
let resizeObserver: ResizeObserver | null = null

// Función para verificar el token
const verifyToken = async () => {
  try {
    if (!token || (!isRegistration && !email)) {
      throw new Error('VERIFY_MISSING_PARAMS')
    }

    const response = await $fetch<any>(
      isRegistration ? '/api/auth/registration/verify' : '/api/auth/verify',
      {
        method: 'POST',
        body: isRegistration ? { token } : { email, token },
        credentials: 'include'
      },
    )

    if (response?.success === false || (
      response?.user &&
      !response?.onboarding &&
      !canUseInternalSession(response)
    )) {
      throw response
    }

    const sessionData = await authStore.refreshSession()
    if (isRegistration && (sessionData as { user?: unknown } | null)?.user && import.meta.client) {
      writeVerifiedPublicCtaAttribution(
        window.sessionStorage,
        response?.registration_attribution,
      )
      trackOnboardingEvent('email_verified', {
        ...readPublicCtaAnalyticsContext(window.sessionStorage),
        dedupeId: 'registration-magic-link',
      }, undefined, window.sessionStorage)
    }
    if (isOnboardingEntrySession(sessionData)) {
      if (isRegistration && import.meta.client) clearRegistrationDraft(window.sessionStorage)
      redirectUrl.value = ONBOARDING_PATH
      verifying.value = false
      success.value = true
      await navigateTo(ONBOARDING_PATH)
      return
    }
    if (!canUseInternalSession(sessionData)) {
      throw { status: 403, data: { code: 'no_internal_access' } }
    }
    if (isRegistration && import.meta.client) clearRegistrationDraft(window.sessionStorage)
    await syncAuthenticatedLocale(sessionData)
    await accessStore.load()
    redirectUrl.value = getAccessAwareRedirect(route.query.redirect, accessStore, router)

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
          navigateTo(redirectUrl.value || getAccessAwareRedirect(undefined, accessStore, router))
        }, 500)
      }
    }, 200)

  } catch (err: any) {
    verifying.value = false
    error.value = true
    errorActionTo.value = isRegistration ? '/registro' : '/auth/login'
    errorActionLabel.value = t('auth.tryAgain')

    // Determinar mensaje de error específico
    if (isInternalAccessDeniedError(err)) {
      errorMessage.value = getInternalAccessDeniedMessage()
      errorActionTo.value = CUSTOMER_PORTAL_LOGIN
      errorActionLabel.value = t('auth.customerPortal')
    } else if (err.message === 'VERIFY_MISSING_PARAMS' || err.message?.includes('faltante')) {
      errorMessage.value = t('auth.verifyLinkIncomplete')
    } else if (err.message?.includes('Token inválido') || err.message?.includes('expirado') || err.message?.includes('expired') || err.message?.includes('invalid')) {
      errorMessage.value = t('auth.magicLinkExpired')
    } else {
      errorMessage.value = err.message || t('auth.verifyMagicLinkError')
    }
  }
}

// Montar componente y configurar observer de emojis
onMounted(async () => {
  // Configurar observer de emojis
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

  // Verificar token con pequeño delay para mejor UX
  setTimeout(() => {
    verifyToken()
  }, 1000)
})

// Cleanup observer
onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
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
</style>
