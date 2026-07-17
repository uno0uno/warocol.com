<template>
  <AuthSplitShell
    image-src="/brand/auth-login-trattoria.webp"
    image-position="62% center"
  >
        <!-- Logo -->
        <div class="mb-6 flex justify-center">
          <img src="/logo_waro_colombia.png" alt="Waro" class="h-8 w-auto">
        </div>

        <!-- Contenido del login -->
        <div>
          <!-- Verificando sesión -->
          <div v-if="checkingSession" class="text-center space-y-4">
            <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-text-primary border-t-transparent"></div>
            <p class="text-sm text-text-secondary">{{ t('auth.checkingSession') }}</p>
          </div>

          <!-- Formulario de login -->
          <div v-else-if="!emailSent" class="text-center">
            <h1 class="text-2xl font-semibold text-text-primary">{{ t('auth.signIn') }}</h1>
            <p class="mb-6 mt-2 text-sm text-text-secondary">
              {{ t('auth.emailPrompt') }}
            </p>

            <!-- Email Form -->
            <form @submit.prevent="handleSubmit">
              <div class="mb-6 text-start">
                <label for="email" class="mb-2 block text-sm font-semibold text-text-primary">
                  {{ t('auth.emailLabel') }}
                </label>
                <input id="email" v-model="email" type="email" required :disabled="loading"
                  autocomplete="email"
                  class="auth-input" />
              </div>

              <button type="submit" :disabled="loading || !email"
                class="auth-primary-button">
                <span v-if="loading" class="flex items-center justify-center gap-2">
                  <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  {{ t('auth.sending') }}
                </span>
                <span v-else>{{ t('auth.next') }}</span>
              </button>
            </form>
          </div>

          <!-- Código de Verificación -->
          <div v-else-if="emailSent" class="text-center">
            <h1 class="mb-4 text-3xl font-semibold text-text-primary">{{ t('auth.checkEmail') }}</h1>
            <p class="mb-2 text-base text-text-secondary">
              {{ t('auth.linkSentTo') }}
            </p>
            <p class="mb-6 break-all text-base font-medium text-text-primary">
              {{ email }}
            </p>

            <div class="mb-6 rounded-lg border border-border bg-surface-secondary p-4">
              <p class="text-sm text-text-secondary">
                {{ t('auth.openEmailHint') }}
              </p>
            </div>

            <!-- Separador -->
            <div class="relative my-8">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-border"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="bg-surface px-4 text-text-secondary">{{ t('auth.orUseCode') }}</span>
              </div>
            </div>

            <!-- Input de código -->
            <div class="space-y-6">
              <label for="login-verification-code" class="sr-only">{{ t('auth.verificationCodeLabel') }}</label>
              <input id="login-verification-code" v-model="verificationCode" type="text" placeholder="123456"
                inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6"
                :aria-describedby="error ? 'login-auth-error' : undefined" :disabled="verifyingCode"
                @keyup.enter="verifyCode"
                class="auth-input text-center font-mono text-2xl tracking-widest" />

              <button @click="verifyCode"
                :disabled="!verificationCode || verificationCode.length !== 6 || verifyingCode"
                class="auth-primary-button">
                <span v-if="verifyingCode" class="flex items-center justify-center gap-2">
                  <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  {{ t('auth.verifying') }}
                </span>
                <span v-else>{{ t('auth.verifyCode') }}</span>
              </button>
            </div>

            <div class="text-center mt-8">
              <p class="text-sm text-text-secondary">
                {{ t('auth.noEmail') }}
                <button @click="emailSent = false; verificationCode = ''" type="button"
                  class="auth-text-link ms-1 font-semibold underline-offset-4 hover:underline">
                  {{ t('auth.resend') }}
                </button>
              </p>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" id="login-auth-error" role="alert" aria-live="assertive" class="mt-5 rounded-md border border-form-control-error-border bg-[hsl(var(--state-danger-bg))] p-4 text-form-control-error">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ms-3">
                <p class="text-sm font-medium">{{ t('auth.authError') }}</p>
                <p class="mt-1 text-sm">{{ error }}</p>
                <NuxtLink
                  v-if="showCustomerPortalLink"
                  :to="CUSTOMER_PORTAL_LOGIN"
                  class="mt-3 inline-flex text-sm font-semibold underline"
                >
                  {{ t('auth.customerPortal') }}
                </NuxtLink>
              </div>
            </div>
          </div>

          <p v-if="!checkingSession" class="mt-8 text-center text-sm text-text-secondary">
            {{ t('auth.noAccount') }}
            <NuxtLink
              to="/registro"
              class="auth-text-link ms-1 font-semibold underline underline-offset-4"
              @click="rememberEmailForRegistration"
            >
              {{ t('auth.createAccount') }}
            </NuxtLink>
          </p>
        </div>
  </AuthSplitShell>
</template>

<script setup lang="ts">
import AuthSplitShell from './SplitShell.vue'
import {
  CUSTOMER_PORTAL_LOGIN,
  canUseInternalSession,
  getAccessAwareRedirect,
  getInternalAccessDeniedMessage,
  isInternalAccessDeniedError,
} from '~/utils/internalAccess'
import { ONBOARDING_PATH, isOnboardingEntrySession } from '~/utils/onboardingFlow'
import { prefillRegistrationEmail } from '~/utils/registrationFlow'

const { t } = useI18n()
const email = ref('')
const loading = ref(false)
const error = ref('')
const checkingSession = ref(true)
const emailSent = ref(false)
const verificationCode = ref('')
const verifyingCode = ref(false)
const showCustomerPortalLink = ref(false)
const toast = useToast()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const accessStore = useAccessStore()
const { syncAuthenticatedLocale } = useAppLocale()


// Obtener configuración de runtime
const {
  public: {
    baseUrl
  }
} = useRuntimeConfig()

// Verificar si ya hay sesión al cargar el componente
onMounted(async () => {
  const emailQuery = Array.isArray(route.query.email) ? route.query.email[0] : route.query.email
  if (typeof emailQuery === 'string') {
    email.value = emailQuery.trim().toLowerCase()
  }

  // Verificar sesión existente
  try {
    const session = await $fetch('/api/auth/session', {
      credentials: 'include'
    })
    if (isOnboardingEntrySession(session)) {
      authStore.hydrateSession(session)
      await navigateTo(ONBOARDING_PATH)
      return
    }
    if (session?.success && canUseInternalSession(session)) {

      // Verificar que la sesión sea válida para warocol.com
      const { public: config } = useRuntimeConfig()
      const expectedTenantName = config.siteName || 'Waro Colombia'
      if (session.user.tenant_name === expectedTenantName) {

        await syncAuthenticatedLocale(session)
        await accessStore.load()
        const redirectUrl = getAccessAwareRedirect(route.query.redirect, accessStore, router)
        await navigateTo(redirectUrl)
        return
      } else {
      }
    } else if (session?.user) {
      await navigateTo(CUSTOMER_PORTAL_LOGIN)
      return
    }
  } catch (error) {
    if (isInternalAccessDeniedError(error)) {
      await navigateTo(CUSTOMER_PORTAL_LOGIN)
      return
    }
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
    await $fetch('/api/auth/sign-in-magic-link', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Origin': baseUrl || 'http://localhost:8080'
      },
      body: {
        email: email.value.trim().toLowerCase(),
        redirect: route.query.redirect
      }
    })

    // Mostrar toast de éxito y activar UI de código
    toast.success(t('auth.codeSentToast'))
    emailSent.value = true
  } catch (err) {
    if (isInternalAccessDeniedError(err)) {
      showCustomerPortalLink.value = true
      error.value = getInternalAccessDeniedMessage()
    } else {
      error.value = err?.data?.message || err?.message || t('auth.magicLinkError')
    }
  } finally {
    loading.value = false
  }
}

async function verifyCode() {
  if (!verificationCode.value || verificationCode.value.length !== 6) {
    error.value = t('auth.codeRequired')
    return
  }

  verifyingCode.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/verify-code', {
      method: 'POST',
      body: {
        email: email.value.trim().toLowerCase(),
        code: verificationCode.value
      },
      credentials: 'include'
    })

    const session = await authStore.refreshSession()
    if (isOnboardingEntrySession(session)) {
      toast.success(t('auth.accessGranted'))
      window.location.href = ONBOARDING_PATH
      return
    }
    if (!canUseInternalSession(session)) {
      throw { status: 403, data: { code: 'no_internal_access' } }
    }
    await syncAuthenticatedLocale(session)

    toast.success(t('auth.accessGranted'))

    // Redirigir con recarga completa para asegurar que la cookie se incluya
    await accessStore.load()
    const redirectUrl = getAccessAwareRedirect(route.query.redirect, accessStore, router)

    // Agregar delay antes de redirección
    setTimeout(() => {
      // Usar window.location para forzar recarga completa
      window.location.href = redirectUrl
    }, 1000)

  } catch (err) {
    if (isInternalAccessDeniedError(err)) {
      showCustomerPortalLink.value = true
      error.value = getInternalAccessDeniedMessage()
      return
    }
    error.value = err.message || t('auth.invalidCode')
  } finally {
    verifyingCode.value = false
  }
}

function rememberEmailForRegistration() {
  if (!import.meta.client) return
  prefillRegistrationEmail(window.sessionStorage, email.value)
}

// Reset error state when email or code changes
watch([email, verificationCode], () => {
  if (error.value) {
    error.value = ''
  }
  showCustomerPortalLink.value = false
})

</script>

<style scoped>
.auth-input {
  width: 100%;
  border: 1px solid hsl(var(--form-control-border));
  border-radius: var(--radius);
  background: hsl(var(--form-control-bg));
  padding: 0.75rem 1rem;
  color: hsl(var(--form-control-text));
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.auth-input:focus-visible {
  border-color: hsl(var(--auth-action-bg));
  outline: 2px solid hsl(var(--auth-action-focus-ring));
  outline-offset: 2px;
}

.auth-primary-button {
  width: 100%;
  min-height: 3rem;
  border-radius: var(--radius);
  background: hsl(var(--auth-action-bg));
  padding: 0.75rem 1.5rem;
  color: hsl(var(--auth-action-text));
  font-weight: 600;
  transition: background-color 150ms ease, opacity 150ms ease;
}

.auth-primary-button:hover:not(:disabled) {
  background: hsl(var(--auth-action-hover-bg));
}

.auth-primary-button:focus-visible {
  outline: 2px solid hsl(var(--auth-action-focus-ring));
  outline-offset: 3px;
}

.auth-primary-button:disabled {
  cursor: not-allowed;
  background: hsl(var(--auth-action-disabled-bg));
  color: hsl(var(--auth-action-disabled-text));
}

.auth-text-link {
  color: hsl(var(--auth-link-text));
}

.auth-text-link:hover {
  color: hsl(var(--auth-link-hover-text));
}

.auth-text-link:focus-visible {
  outline: 2px solid hsl(var(--auth-action-focus-ring));
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .auth-input,
  .auth-primary-button {
    transition: none;
  }
}
</style>
