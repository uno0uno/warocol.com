<template>
  <main class="relative flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto bg-[hsl(220,14%,97%)] px-4 py-8 sm:px-8">
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span
        v-for="(emoji, index) in foodEmojis"
        :key="`${emoji}-${index}`"
        class="food-item"
        :style="foodItemStyle(index)"
      >{{ emoji }}</span>
    </div>

    <section class="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg sm:p-10" aria-labelledby="registration-title">
      <div class="mb-8 flex justify-center">
        <img :src="'/logo_waro_colombia.png'" alt="Waro" class="h-9 w-auto">
      </div>

      <div v-if="phase === 'form'">
        <h1 id="registration-title" class="text-center text-3xl font-medium text-[hsl(250,30%,16%)]">
          {{ t('auth.createAccount') }}
        </h1>
        <p class="mt-3 text-center text-base text-[hsl(220,13%,28%)]">
          {{ t('auth.registrationIntro') }}
        </p>

        <form class="mt-8 space-y-5" novalidate @submit.prevent="sendRegistration(false)">
          <div>
            <label for="registration-email" class="mb-2 block text-sm font-semibold text-[hsl(250,30%,16%)]">
              {{ t('auth.emailLabel') }}
            </label>
            <input
              id="registration-email"
              :value="email"
              type="email"
              autocomplete="email"
              required
              :disabled="sending"
              :aria-invalid="Boolean(fieldErrors.email)"
              :aria-describedby="fieldErrors.email ? 'registration-email-error' : undefined"
              class="form-input"
              @input="updateEmail"
            >
            <p v-if="fieldErrors.email" id="registration-email-error" class="field-error" role="alert">
              {{ fieldErrors.email }}
            </p>
          </div>

          <fieldset>
            <legend class="mb-2 block text-sm font-semibold text-[hsl(250,30%,16%)]">
              {{ t('auth.whatsappLabel') }}
            </legend>
            <div class="grid grid-cols-[7.5rem_1fr] gap-3">
              <div>
                <label for="registration-country-code" class="sr-only">{{ t('auth.phoneCountryCode') }}</label>
                <div class="relative">
                  <span class="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[hsl(220,13%,28%)]">+</span>
                  <input
                    id="registration-country-code"
                    :value="phoneCountryCode"
                    type="text"
                    inputmode="numeric"
                    autocomplete="tel-country-code"
                    maxlength="3"
                    required
                    :disabled="sending"
                    :aria-invalid="Boolean(fieldErrors.phoneCountryCode)"
                    :aria-describedby="fieldErrors.phoneCountryCode ? 'registration-country-error' : 'registration-phone-hint'"
                    class="form-input ps-7"
                    @input="updateCountryCode"
                  >
                </div>
              </div>
              <div>
                <label for="registration-phone" class="sr-only">{{ t('auth.whatsappLabel') }}</label>
                <input
                  id="registration-phone"
                  :value="phoneNumber"
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel-national"
                  maxlength="20"
                  required
                  :disabled="sending"
                  :aria-invalid="Boolean(fieldErrors.phoneNumber)"
                  :aria-describedby="fieldErrors.phoneNumber ? 'registration-phone-error' : 'registration-phone-hint'"
                  class="form-input"
                  @input="updatePhoneNumber"
                >
              </div>
            </div>
            <p id="registration-phone-hint" class="mt-2 text-xs text-[hsl(220,13%,38%)]">
              {{ t('auth.whatsappHint') }}
            </p>
            <p v-if="fieldErrors.phoneCountryCode" id="registration-country-error" class="field-error" role="alert">
              {{ fieldErrors.phoneCountryCode }}
            </p>
            <p v-if="fieldErrors.phoneNumber" id="registration-phone-error" class="field-error" role="alert">
              {{ fieldErrors.phoneNumber }}
            </p>
          </fieldset>

          <div>
            <label class="flex cursor-pointer items-start gap-3 text-sm text-[hsl(220,13%,28%)]">
              <input
                id="registration-consent"
                :checked="consent"
                type="checkbox"
                required
                :disabled="sending"
                :aria-invalid="Boolean(fieldErrors.consent)"
                :aria-describedby="fieldErrors.consent ? 'registration-consent-error' : undefined"
                class="mt-0.5 h-5 w-5 rounded border-2 border-[hsl(250,30%,16%)] text-[hsl(250,30%,16%)] focus:ring-[hsl(250,30%,16%)]"
                @change="updateConsent"
              >
              <span>{{ t('auth.registrationConsent') }}</span>
            </label>
            <p v-if="fieldErrors.consent" id="registration-consent-error" class="field-error" role="alert">
              {{ fieldErrors.consent }}
            </p>
          </div>

          <button type="submit" :disabled="sending || cooldownSeconds > 0" class="primary-button">
            <span v-if="sending" class="inline-flex items-center gap-2">
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true"></span>
              {{ t('auth.sending') }}
            </span>
            <span v-else>{{ t('auth.registrationSubmit') }}</span>
          </button>
        </form>
      </div>

      <div v-else class="text-center">
        <h1 id="registration-title" class="text-3xl font-medium text-[hsl(250,30%,16%)]">
          {{ t('auth.checkEmail') }}
        </h1>
        <p class="mt-3 text-base text-[hsl(220,13%,28%)]">{{ t('auth.registrationLinkSentTo') }}</p>
        <p class="mt-1 break-all font-semibold text-[hsl(250,30%,16%)]">{{ email }}</p>
        <p class="mt-5 rounded-lg bg-[hsl(220,14%,95%)] p-4 text-sm text-[hsl(220,13%,28%)]">
          {{ t('auth.registrationOpenEmailHint') }}
        </p>

        <div class="relative my-7" aria-hidden="true">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-[hsl(220,14%,90%)]"></div></div>
          <div class="relative flex justify-center text-sm"><span class="bg-white px-4 text-[hsl(220,13%,28%)]">{{ t('auth.orUseCode') }}</span></div>
        </div>

        <label for="registration-code" class="mb-2 block text-start text-sm font-semibold text-[hsl(250,30%,16%)]">
          {{ t('auth.verificationCodeLabel') }}
        </label>
        <input
          id="registration-code"
          :value="verificationCode"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          pattern="[0-9]{6}"
          maxlength="6"
          :disabled="verifying"
          :aria-invalid="Boolean(error)"
          :aria-describedby="error ? 'registration-error' : undefined"
          class="form-input text-center font-mono text-2xl tracking-[0.3em]"
          @input="updateVerificationCode"
          @keyup.enter="verifyCode"
        >
        <button
          type="button"
          :disabled="verificationCode.length !== 6 || verifying"
          class="primary-button mt-5"
          @click="verifyCode"
        >
          <span v-if="verifying" class="inline-flex items-center gap-2">
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true"></span>
            {{ t('auth.verifying') }}
          </span>
          <span v-else>{{ t('auth.verifyCode') }}</span>
        </button>

        <div class="mt-6 flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-center">
          <button type="button" class="text-link" :disabled="sending || cooldownSeconds > 0" @click="sendRegistration(true)">
            {{ cooldownSeconds > 0 ? t('auth.resendIn', { n: cooldownSeconds }) : t('auth.resend') }}
          </button>
          <span class="hidden text-[hsl(220,14%,70%)] sm:inline" aria-hidden="true">•</span>
          <button type="button" class="text-link" :disabled="sending || verifying" @click="changeDetails">
            {{ t('auth.changeRegistrationDetails') }}
          </button>
        </div>
      </div>

      <div v-if="error" id="registration-error" role="alert" aria-live="assertive" class="mt-5 rounded-md border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] p-4 text-sm text-[hsl(var(--destructive))]">
        <p class="font-semibold">{{ t('auth.registrationError') }}</p>
        <p class="mt-1">{{ error }}</p>
      </div>

      <p class="mt-8 text-center text-sm text-[hsl(220,13%,28%)]">
        {{ t('auth.alreadyHaveAccount') }}
        <NuxtLink to="/auth/login" class="ms-1 font-semibold underline underline-offset-4 text-[hsl(250,30%,16%)]">
          {{ t('auth.signIn') }}
        </NuxtLink>
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import {
  CUSTOMER_PORTAL_LOGIN,
  canUseInternalSession,
  getAccessAwareRedirect,
} from '~/utils/internalAccess'
import { ONBOARDING_PATH, isOnboardingEntrySession } from '~/utils/onboardingFlow'
import {
  buildRegistrationPayload,
  clearRegistrationDraft,
  createRegistrationDraft,
  getRegistrationCooldownSeconds,
  normalizeRegistrationPhone,
  readRegistrationDraft,
  sanitizeRegistrationAttribution,
  writeRegistrationDraft,
  type RegistrationAttribution,
  type RegistrationPhase,
} from '~/utils/registrationFlow'
import {
  buildPublicCtaAnalyticsContext,
  writePublicCtaAttribution,
  writeVerifiedPublicCtaAttribution,
} from '~/utils/publicCta'
import { trackOnboardingEvent } from '~/utils/onboardingAnalytics'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const accessStore = useAccessStore()
const toast = useToast()
const { syncAuthenticatedLocale } = useAppLocale()
const { public: { baseUrl } } = useRuntimeConfig()

const email = ref('')
const phoneCountryCode = ref('57')
const phoneNumber = ref('')
const consent = ref(false)
const attribution = ref<RegistrationAttribution>({})
const phase = ref<RegistrationPhase>('form')
const sentAt = ref<number | null>(null)
const verificationCode = ref('')
const sending = ref(false)
const verifying = ref(false)
const cooldownSeconds = ref(0)
const error = ref('')
const fieldErrors = reactive({ email: '', phoneCountryCode: '', phoneNumber: '', consent: '' })

let cooldownTimer: ReturnType<typeof setInterval> | null = null

const focusInput = (id: string) => {
  if (!import.meta.client) return
  document.getElementById(id)?.focus()
}

const inputValue = (event: Event) => (event.target as HTMLInputElement).value
const updateEmail = (event: Event) => { email.value = inputValue(event) }
const updateCountryCode = (event: Event) => { phoneCountryCode.value = normalizeRegistrationPhone(inputValue(event)).slice(0, 3) }
const updatePhoneNumber = (event: Event) => { phoneNumber.value = normalizeRegistrationPhone(inputValue(event)) }
const updateConsent = (event: Event) => { consent.value = (event.target as HTMLInputElement).checked }
const updateVerificationCode = (event: Event) => { verificationCode.value = normalizeRegistrationPhone(inputValue(event)).slice(0, 6) }

const foodEmojis = ['🍞', '🥐', '🍕', '🍔', '🌮', '🍟', '🥪', '🍳', '🧀', '🥗', '🍝', '🍜', '🍣', '🍰', '🍪', '🥘']
const foodItemStyle = (index: number) => ({
  insetInlineStart: `${8 + ((index * 29) % 88)}%`,
  top: `${6 + ((index * 37) % 88)}%`,
  transform: `translate(-50%, -50%) rotate(${(index % 5) * 9 - 18}deg)`,
})

const currentDraft = () => createRegistrationDraft({
  email: email.value,
  phoneCountryCode: phoneCountryCode.value,
  phoneNumber: phoneNumber.value,
  consent: consent.value,
  attribution: attribution.value,
  phase: phase.value,
  sentAt: sentAt.value,
})

const persistDraft = () => {
  if (!import.meta.client) return currentDraft()
  return writeRegistrationDraft(window.sessionStorage, currentDraft())
}

const updateCooldown = () => {
  cooldownSeconds.value = getRegistrationCooldownSeconds(sentAt.value)
}

const startCooldown = () => {
  updateCooldown()
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(updateCooldown, 1_000)
}

const validateForm = () => {
  fieldErrors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? '' : t('auth.emailInvalid')
  const countryCode = normalizeRegistrationPhone(phoneCountryCode.value)
  fieldErrors.phoneCountryCode = Number(countryCode) >= 1 && Number(countryCode) <= 999 ? '' : t('auth.phoneCountryCodeInvalid')
  const phone = normalizeRegistrationPhone(phoneNumber.value)
  fieldErrors.phoneNumber = phone.length >= 7 && phone.length <= 15 ? '' : t('auth.whatsappInvalid')
  fieldErrors.consent = consent.value ? '' : t('auth.consentRequired')

  const firstInvalid = fieldErrors.email ? 'registration-email'
    : fieldErrors.phoneCountryCode ? 'registration-country-code'
      : fieldErrors.phoneNumber ? 'registration-phone'
        : fieldErrors.consent ? 'registration-consent'
          : null
  if (firstInvalid) nextTick(() => focusInput(firstInvalid))
  return !firstInvalid
}

const sendRegistration = async (isResend: boolean) => {
  if (sending.value || cooldownSeconds.value > 0 || !validateForm()) return
  sending.value = true
  error.value = ''
  try {
    const draft = currentDraft()
    await $fetch('/api/auth/register-magic-link', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Origin': baseUrl || 'http://localhost:8080',
      },
      body: buildRegistrationPayload(draft),
    })
    phase.value = 'code'
    sentAt.value = Date.now()
    persistDraft()
    if (!isResend && import.meta.client) {
      trackOnboardingEvent('registration_started', {
        ...buildPublicCtaAnalyticsContext(attribution.value),
        dedupeId: String(sentAt.value),
      }, undefined, window.sessionStorage)
    }
    startCooldown()
    toast.success(t('auth.codeSentToast'))
    await nextTick()
    focusInput('registration-code')
  } catch {
    error.value = t('auth.registrationSendError')
  } finally {
    sending.value = false
  }
}

const verifyCode = async () => {
  if (verifying.value || verificationCode.value.length !== 6) {
    error.value = t('auth.codeRequired')
    focusInput('registration-code')
    return
  }
  verifying.value = true
  error.value = ''
  const body = { email: email.value.trim().toLocaleLowerCase(), code: verificationCode.value }
  try {
    const verification = await $fetch<{ registration_attribution?: RegistrationAttribution | null }>(
      '/api/auth/registration/verify-code',
      { method: 'POST', credentials: 'include', body },
    )
    const verifiedAttribution = writeVerifiedPublicCtaAttribution(
      window.sessionStorage,
      verification?.registration_attribution,
    )
    if (Object.keys(verifiedAttribution).length > 0) {
      attribution.value = verifiedAttribution
    }

    const session = await authStore.refreshSession()
    const trackEmailVerified = () => {
      if (!import.meta.client) return
      trackOnboardingEvent('email_verified', {
        ...buildPublicCtaAnalyticsContext(attribution.value),
        dedupeId: String(sentAt.value ?? 'registration-code'),
      }, undefined, window.sessionStorage)
    }
    toast.success(t('auth.registrationComplete'))
    if (isOnboardingEntrySession(session)) {
      trackEmailVerified()
      clearRegistrationDraft(window.sessionStorage)
      window.location.assign(ONBOARDING_PATH)
      return
    }
    if (canUseInternalSession(session)) {
      trackEmailVerified()
      await syncAuthenticatedLocale(session)
      await accessStore.load()
      clearRegistrationDraft(window.sessionStorage)
      window.location.assign(getAccessAwareRedirect(undefined, accessStore, router))
      return
    }
    if ((session as { user?: unknown } | null)?.user) {
      trackEmailVerified()
      clearRegistrationDraft(window.sessionStorage)
      window.location.assign(CUSTOMER_PORTAL_LOGIN)
      return
    }
    throw new Error('session_not_created')
  } catch {
    error.value = t('auth.invalidCode')
    nextTick(() => focusInput('registration-code'))
  } finally {
    verifying.value = false
  }
}

const changeDetails = async () => {
  phase.value = 'form'
  verificationCode.value = ''
  error.value = ''
  persistDraft()
  await nextTick()
  focusInput('registration-email')
}

watch(email, () => { fieldErrors.email = ''; if (phase.value === 'form') persistDraft() })
watch(phoneCountryCode, (value) => {
  phoneCountryCode.value = normalizeRegistrationPhone(value).slice(0, 3)
  fieldErrors.phoneCountryCode = ''
  if (phase.value === 'form') persistDraft()
})
watch(phoneNumber, (value) => {
  phoneNumber.value = normalizeRegistrationPhone(value)
  fieldErrors.phoneNumber = ''
  if (phase.value === 'form') persistDraft()
})
watch(consent, () => { fieldErrors.consent = ''; if (phase.value === 'form') persistDraft() })
watch(verificationCode, (value) => { verificationCode.value = normalizeRegistrationPhone(value).slice(0, 6); error.value = '' })

onMounted(async () => {
  const stored = readRegistrationDraft(window.sessionStorage)
  const routeAttribution = sanitizeRegistrationAttribution(route.query as Record<string, unknown>)
  if (stored) {
    email.value = stored.email
    phoneCountryCode.value = stored.phoneCountryCode
    phoneNumber.value = stored.phoneNumber
    consent.value = stored.consent
    phase.value = stored.phase
    sentAt.value = stored.sentAt
    attribution.value = { ...stored.attribution, ...routeAttribution }
  } else {
    attribution.value = routeAttribution
  }
  writePublicCtaAttribution(window.sessionStorage, attribution.value)
  persistDraft()
  startCooldown()
  await nextTick()
  focusInput(phase.value === 'code' ? 'registration-code' : 'registration-email')
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>

<style scoped>
.food-item {
  position: absolute;
  font-size: clamp(2rem, 5vw, 3.25rem);
  opacity: 0.07;
  filter: grayscale(1);
}

.form-input {
  width: 100%;
  border: 2px solid hsl(250 30% 16%);
  border-radius: 0.5rem;
  background: white;
  padding: 0.75rem 1rem;
  color: hsl(250 30% 16%);
  transition: box-shadow 150ms ease, border-color 150ms ease;
}

.form-input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px hsl(250 30% 16% / 0.18);
}

.form-input[aria-invalid="true"] {
  border-color: hsl(var(--destructive));
}

.field-error {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: hsl(var(--destructive));
}

.primary-button {
  width: 100%;
  min-height: 3rem;
  border-radius: 0.5rem;
  background: hsl(250 30% 16%);
  padding: 0.75rem 1.5rem;
  color: white;
  font-weight: 600;
  transition: background-color 150ms ease, opacity 150ms ease;
}

.primary-button:hover:not(:disabled) { background: hsl(243 26% 23%); }
.primary-button:focus-visible, .text-link:focus-visible { outline: 3px solid hsl(250 30% 16% / 0.3); outline-offset: 3px; }
.primary-button:disabled, .text-link:disabled { cursor: not-allowed; opacity: 0.55; }
.text-link { font-weight: 600; color: hsl(250 30% 16%); text-decoration: underline; text-underline-offset: 0.25rem; }

@media (prefers-reduced-motion: reduce) {
  .primary-button, .form-input { transition: none; }
  .animate-spin { animation-duration: 1.5s; }
}
</style>
