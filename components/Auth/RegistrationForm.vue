<template>
  <AuthSplitShell
    image-src="/brand/auth-register-kitchen.webp"
    image-position="67% center"
    content-width="wide"
  >
    <section aria-labelledby="registration-title">
      <div class="mb-6 flex justify-center">
        <img :src="'/logo_waro_colombia.png'" alt="Waro" class="h-8 w-auto">
      </div>

      <div v-if="phase === 'form'">
        <h1 id="registration-title" class="text-center text-2xl font-semibold text-text-primary">
          {{ t('auth.createAccount') }}
        </h1>
        <p class="mt-2 text-center text-sm text-text-secondary">
          {{ t('auth.registrationIntro') }}
        </p>

        <form class="registration-form" novalidate @submit.prevent="sendRegistration(false)">
          <div>
            <label for="registration-email" class="mb-1.5 block text-sm font-semibold text-text-primary">
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
            <legend class="mb-1.5 block text-sm font-semibold text-text-primary">
              {{ t('auth.phoneNumberLabel') }}
            </legend>
            <div class="grid gap-2 sm:grid-cols-[minmax(13rem,0.85fr)_1.15fr]">
              <div>
                <label for="registration-country-code" class="sr-only">{{ t('auth.phoneCountryCode') }}</label>
                <select
                  id="registration-country-code"
                  v-model="phoneCountryIso"
                  required
                  :disabled="sending || optionsLoading"
                  :aria-invalid="Boolean(fieldErrors.phoneCountryCode)"
                  :aria-describedby="fieldErrors.phoneCountryCode ? 'registration-country-error' : 'registration-phone-hint'"
                  class="form-input"
                  @change="handlePhoneCountryChange"
                >
                  <option
                    v-for="option in phoneCountries"
                    :key="option.country_code"
                    :value="option.country_code"
                  >
                    {{ phoneCountryLabel(option) }}
                  </option>
                </select>
              </div>
              <div>
                <label for="registration-phone" class="sr-only">{{ t('auth.phoneNumberLabel') }}</label>
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
            <p id="registration-phone-hint" class="mt-1 text-xs text-form-control-help">
              {{ t('auth.phoneNumberHint') }}
            </p>
            <p v-if="fieldErrors.phoneCountryCode" id="registration-country-error" class="field-error" role="alert">
              {{ fieldErrors.phoneCountryCode }}
            </p>
            <p v-if="fieldErrors.phoneNumber" id="registration-phone-error" class="field-error" role="alert">
              {{ fieldErrors.phoneNumber }}
            </p>
          </fieldset>

          <div>
            <label for="registration-business-name" class="mb-1.5 block text-sm font-semibold text-text-primary">
              {{ t('onboarding.businessName') }}
            </label>
            <input
              id="registration-business-name"
              v-model="businessName"
              type="text"
              autocomplete="organization"
              minlength="2"
              maxlength="120"
              required
              :disabled="sending"
              :aria-invalid="Boolean(fieldErrors.businessName)"
              :aria-describedby="fieldErrors.businessName ? 'registration-business-name-error' : 'registration-business-name-hint'"
              class="form-input"
            >
            <p id="registration-business-name-hint" class="mt-1 text-xs text-form-control-help">
              {{ t('onboarding.businessNameHint') }}
            </p>
            <p v-if="fieldErrors.businessName" id="registration-business-name-error" class="field-error" role="alert">
              {{ fieldErrors.businessName }}
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label for="registration-business-country" class="mb-1.5 block text-sm font-semibold text-text-primary">
                {{ t('onboarding.country') }}
              </label>
              <select
                id="registration-business-country"
                v-model="businessCountryCode"
                required
                :disabled="sending || optionsLoading"
                :aria-invalid="Boolean(fieldErrors.businessCountryCode)"
                class="form-input"
                @change="handleBusinessCountryChange"
              >
                <option value="" disabled>{{ t('onboarding.selectCountry') }}</option>
                <option v-for="option in registrationCatalog" :key="option.country_code" :value="option.country_code">
                  {{ countryLabel(option.country_code) }}
                </option>
              </select>
              <p v-if="fieldErrors.businessCountryCode" class="field-error" role="alert">
                {{ fieldErrors.businessCountryCode }}
              </p>
            </div>

            <div>
              <label for="registration-base-currency" class="mb-1.5 block text-sm font-semibold text-text-primary">
                {{ t('onboarding.currency') }}
              </label>
              <select
                id="registration-base-currency"
                v-model="baseCurrencyCode"
                required
                :disabled="sending || optionsLoading || !businessCountryCode"
                :aria-invalid="Boolean(fieldErrors.baseCurrencyCode)"
                class="form-input"
              >
                <option value="" disabled>{{ t('onboarding.selectCurrency') }}</option>
                <option v-for="code in compatibleCurrencies" :key="code" :value="code">
                  {{ currencyLabel(code) }}
                </option>
              </select>
              <p v-if="fieldErrors.baseCurrencyCode" class="field-error" role="alert">
                {{ fieldErrors.baseCurrencyCode }}
              </p>
            </div>
          </div>

          <div v-if="needsJurisdiction">
            <label for="registration-tax-jurisdiction" class="mb-1.5 block text-sm font-semibold text-text-primary">
              {{ businessCountryCode === 'CA' ? t('facturacion.tax.provinceLabel') : t('facturacion.tax.stateLabel') }}
            </label>
            <select
              id="registration-tax-jurisdiction"
              v-model="taxJurisdictionCode"
              required
              :disabled="sending || optionsLoading"
              :aria-invalid="Boolean(fieldErrors.taxJurisdictionCode)"
              :aria-describedby="fieldErrors.taxJurisdictionCode ? 'registration-jurisdiction-error' : 'registration-jurisdiction-hint'"
              class="form-input"
            >
              <option value="" disabled>{{ t('facturacion.tax.jurisdictionPlaceholder') }}</option>
              <option
                v-for="option in jurisdictionOptions"
                :key="option.code"
                :value="option.code"
              >
                {{ option.label }} ({{ option.code }})
              </option>
            </select>
            <p id="registration-jurisdiction-hint" class="mt-1 text-xs text-form-control-help">
              {{ t('facturacion.tax.jurisdictionHint') }}
            </p>
            <p v-if="fieldErrors.taxJurisdictionCode" id="registration-jurisdiction-error" class="field-error" role="alert">
              {{ fieldErrors.taxJurisdictionCode }}
            </p>
          </div>

          <div>
            <label class="flex cursor-pointer items-start gap-3 text-sm text-text-secondary">
              <input
                id="registration-consent"
                :checked="consent"
                type="checkbox"
                required
                :disabled="sending"
                :aria-invalid="Boolean(fieldErrors.consent)"
                :aria-describedby="fieldErrors.consent ? 'registration-consent-error' : undefined"
                class="auth-checkbox mt-0.5 h-5 w-5 rounded border-2 border-form-control-border"
                @change="updateConsent"
              >
              <span>{{ t('auth.registrationConsent') }}</span>
            </label>
            <p v-if="fieldErrors.consent" id="registration-consent-error" class="field-error" role="alert">
              {{ fieldErrors.consent }}
            </p>
          </div>

          <button type="submit" :disabled="sending || optionsLoading || !registrationCatalog.length || cooldownSeconds > 0" class="primary-button">
            <span v-if="sending" class="inline-flex items-center gap-2">
              <UiLoadingDots size="8px" color="currentColor" />
              {{ t('auth.sending') }}
            </span>
            <span v-else>{{ t('auth.registrationSubmit') }}</span>
          </button>
        </form>
      </div>

      <div v-else class="text-center">
        <h1 id="registration-title" class="text-3xl font-semibold text-text-primary">
          {{ t('auth.checkEmail') }}
        </h1>
        <p class="mt-3 text-base text-text-secondary">{{ t('auth.registrationLinkSentTo') }}</p>
        <p class="mt-1 break-all font-semibold text-text-primary">{{ email }}</p>
        <p class="mt-5 rounded-lg border border-border bg-surface-secondary p-4 text-sm text-text-secondary">
          {{ t('auth.registrationOpenEmailHint') }}
        </p>

        <div class="relative my-7" aria-hidden="true">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-border"></div></div>
          <div class="relative flex justify-center text-sm"><span class="bg-surface px-4 text-text-secondary">{{ t('auth.orUseCode') }}</span></div>
        </div>

        <label for="registration-code" class="mb-2 block text-start text-sm font-semibold text-text-primary">
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
            <UiLoadingDots size="8px" color="currentColor" />
            {{ t('auth.verifying') }}
          </span>
          <span v-else>{{ t('auth.verifyCode') }}</span>
        </button>

        <div class="mt-6 flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-center">
          <button type="button" class="text-link" :disabled="sending || cooldownSeconds > 0" @click="sendRegistration(true)">
            {{ cooldownSeconds > 0 ? t('auth.resendIn', { n: cooldownSeconds }) : t('auth.resend') }}
          </button>
          <span class="hidden text-text-tertiary sm:inline" aria-hidden="true">•</span>
          <button type="button" class="text-link" :disabled="sending || verifying" @click="changeDetails">
            {{ t('auth.changeRegistrationDetails') }}
          </button>
        </div>
      </div>

      <div v-if="error" id="registration-error" role="alert" aria-live="assertive" class="mt-5 rounded-md border border-form-control-error-border bg-[hsl(var(--state-danger-bg))] p-4 text-sm text-form-control-error">
        <p class="font-semibold">{{ t('auth.registrationError') }}</p>
        <p class="mt-1">{{ error }}</p>
      </div>

      <p class="mt-5 text-center text-sm text-text-secondary">
        {{ t('auth.alreadyHaveAccount') }}
        <NuxtLink to="/auth/login" class="text-link ms-1 font-semibold underline underline-offset-4">
          {{ t('auth.signIn') }}
        </NuxtLink>
      </p>
    </section>
  </AuthSplitShell>
</template>

<script setup lang="ts">
import AuthSplitShell from './SplitShell.vue'
import {
  CUSTOMER_PORTAL_LOGIN,
  canUseInternalSession,
} from '~/utils/internalAccess'
import { isOnboardingEntrySession } from '~/utils/onboardingFlow'
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
import { suggestCountryFromLocale } from '~/utils/countryLocale'
import { trackOnboardingEvent } from '~/utils/onboardingAnalytics'
import {
  countryNeedsJurisdiction,
  normalizeJurisdictionOptions,
  type TaxJurisdictionOption,
} from '~/composables/useTenantTaxProfile'

interface RegistrationCatalogOption {
  country_code: string
  currency_codes: string[]
}

interface PhoneCountryOption {
  country_code: string
  calling_code: number
}

interface RegistrationMagicLinkResult {
  success: boolean
  action: 'verification_sent' | 'login_required'
}

const { t, locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const { syncAuthenticatedLocale, locale: appLocale } = useAppLocale()
const { public: { baseUrl } } = useRuntimeConfig()

const email = ref('')
const phoneCountryIso = ref('CO')
const phoneCountryCode = ref('57')
const phoneNumber = ref('')
const businessName = ref('')
const businessCountryCode = ref('')
const baseCurrencyCode = ref('')
const taxJurisdictionCode = ref('')
const consent = ref(false)
const registrationCatalog = ref<RegistrationCatalogOption[]>([])
const taxJurisdictionsByCountry = ref<Record<string, TaxJurisdictionOption[]>>({})
const phoneCountries = ref<PhoneCountryOption[]>([])
const optionsLoading = ref(true)
const attribution = ref<RegistrationAttribution>({})
const phase = ref<RegistrationPhase>('form')
const sentAt = ref<number | null>(null)
const verificationCode = ref('')
const sending = ref(false)
const verifying = ref(false)
const cooldownSeconds = ref(0)
const error = ref('')
const fieldErrors = reactive({
  email: '',
  phoneCountryCode: '',
  phoneNumber: '',
  businessName: '',
  businessCountryCode: '',
  baseCurrencyCode: '',
  taxJurisdictionCode: '',
  consent: '',
})

let cooldownTimer: ReturnType<typeof setInterval> | null = null

const focusInput = (id: string) => {
  if (!import.meta.client) return
  document.getElementById(id)?.focus()
}

const inputValue = (event: Event) => (event.target as HTMLInputElement).value
const updateEmail = (event: Event) => { email.value = inputValue(event) }
const updatePhoneNumber = (event: Event) => { phoneNumber.value = normalizeRegistrationPhone(inputValue(event)) }
const updateConsent = (event: Event) => { consent.value = (event.target as HTMLInputElement).checked }
const updateVerificationCode = (event: Event) => { verificationCode.value = normalizeRegistrationPhone(inputValue(event)).slice(0, 6) }

const compatibleCurrencies = computed(() =>
  registrationCatalog.value.find(option => option.country_code === businessCountryCode.value)?.currency_codes ?? [],
)

const needsJurisdiction = computed(() => countryNeedsJurisdiction(businessCountryCode.value))

const jurisdictionOptions = computed(() =>
  taxJurisdictionsByCountry.value[businessCountryCode.value.toUpperCase()] ?? [],
)

const countryLabel = (code: string) => {
  try {
    return `${new Intl.DisplayNames([locale.value], { type: 'region' }).of(code) || code} (${code})`
  } catch {
    return code
  }
}

const currencyLabel = (code: string) => {
  try {
    return `${new Intl.DisplayNames([locale.value], { type: 'currency' }).of(code) || code} (${code})`
  } catch {
    return code
  }
}

const countryFlag = (code: string) => String.fromCodePoint(
  ...code.toUpperCase().split('').map(character => 127397 + character.charCodeAt(0)),
)

const phoneCountryLabel = (option: PhoneCountryOption) =>
  `${countryFlag(option.country_code)} ${countryLabel(option.country_code)} (+${option.calling_code})`

const handlePhoneCountryChange = () => {
  const option = phoneCountries.value.find(item => item.country_code === phoneCountryIso.value)
  phoneCountryCode.value = option ? String(option.calling_code) : ''
}

const handleBusinessCountryChange = () => {
  if (!compatibleCurrencies.value.includes(baseCurrencyCode.value)) {
    baseCurrencyCode.value = compatibleCurrencies.value[0] || ''
  }
  if (!needsJurisdiction.value) {
    taxJurisdictionCode.value = ''
  } else if (!jurisdictionOptions.value.some(option => option.code === taxJurisdictionCode.value)) {
    taxJurisdictionCode.value = ''
  }
}

const currentDraft = () => createRegistrationDraft({
  email: email.value,
  phoneCountryIso: phoneCountryIso.value,
  phoneCountryCode: phoneCountryCode.value,
  phoneNumber: phoneNumber.value,
  businessName: businessName.value,
  businessCountryCode: businessCountryCode.value,
  baseCurrencyCode: baseCurrencyCode.value,
  taxJurisdictionCode: taxJurisdictionCode.value,
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
  const selectedPhoneCountry = phoneCountries.value.find(option =>
    option.country_code === phoneCountryIso.value
    && String(option.calling_code) === phoneCountryCode.value,
  )
  fieldErrors.phoneCountryCode = selectedPhoneCountry ? '' : t('auth.phoneCountryCodeInvalid')
  const phone = normalizeRegistrationPhone(phoneNumber.value)
  fieldErrors.phoneNumber = phone.length >= 7 && phone.length <= 15 ? '' : t('auth.phoneNumberInvalid')
  fieldErrors.businessName = businessName.value.trim().length >= 2 ? '' : t('onboarding.businessNameHint')
  fieldErrors.businessCountryCode = registrationCatalog.value.some(option => option.country_code === businessCountryCode.value)
    ? ''
    : t('onboarding.selectCountry')
  fieldErrors.baseCurrencyCode = compatibleCurrencies.value.includes(baseCurrencyCode.value)
    ? ''
    : t('onboarding.selectCurrency')
  fieldErrors.taxJurisdictionCode = !needsJurisdiction.value || jurisdictionOptions.value.some(option => option.code === taxJurisdictionCode.value)
    ? ''
    : t('facturacion.tax.jurisdictionRequired')
  fieldErrors.consent = consent.value ? '' : t('auth.consentRequired')

  const firstInvalid = fieldErrors.email ? 'registration-email'
    : fieldErrors.phoneCountryCode ? 'registration-country-code'
      : fieldErrors.phoneNumber ? 'registration-phone'
        : fieldErrors.businessName ? 'registration-business-name'
          : fieldErrors.businessCountryCode ? 'registration-business-country'
            : fieldErrors.baseCurrencyCode ? 'registration-base-currency'
              : fieldErrors.taxJurisdictionCode ? 'registration-tax-jurisdiction'
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
    const result = await $fetch<RegistrationMagicLinkResult>('/api/auth/register-magic-link', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Origin': baseUrl || 'http://localhost:8080',
      },
      body: buildRegistrationPayload(draft),
    })
    if (result.action === 'login_required') {
      const normalizedEmail = email.value.trim().toLocaleLowerCase()
      if (import.meta.client) clearRegistrationDraft(window.sessionStorage)
      toast.info(`${t('auth.alreadyHaveAccount')} ${t('auth.signIn')}`)
      await navigateTo({
        path: '/auth/login',
        query: { email: normalizedEmail },
      }, { replace: true })
      return
    }
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
    if (isOnboardingEntrySession(session) || canUseInternalSession(session)) {
      trackEmailVerified()
      if (canUseInternalSession(session)) await syncAuthenticatedLocale(session)
      clearRegistrationDraft(window.sessionStorage)
      window.location.assign('/gestion/billing')
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
watch(phoneCountryIso, () => {
  fieldErrors.phoneCountryCode = ''
  if (phase.value === 'form') persistDraft()
})
watch(phoneNumber, (value) => {
  phoneNumber.value = normalizeRegistrationPhone(value)
  fieldErrors.phoneNumber = ''
  if (phase.value === 'form') persistDraft()
})
watch(businessName, () => { fieldErrors.businessName = ''; if (phase.value === 'form') persistDraft() })
watch(businessCountryCode, () => { fieldErrors.businessCountryCode = ''; if (phase.value === 'form') persistDraft() })
watch(baseCurrencyCode, () => { fieldErrors.baseCurrencyCode = ''; if (phase.value === 'form') persistDraft() })
watch(taxJurisdictionCode, () => { fieldErrors.taxJurisdictionCode = ''; if (phase.value === 'form') persistDraft() })
watch(consent, () => { fieldErrors.consent = ''; if (phase.value === 'form') persistDraft() })
watch(verificationCode, (value) => { verificationCode.value = normalizeRegistrationPhone(value).slice(0, 6); error.value = '' })

onMounted(async () => {
  const stored = readRegistrationDraft(window.sessionStorage)
  const routeAttribution = sanitizeRegistrationAttribution(route.query as Record<string, unknown>)
  if (stored) {
    email.value = stored.email
    phoneCountryIso.value = stored.phoneCountryIso
    phoneCountryCode.value = stored.phoneCountryCode
    phoneNumber.value = stored.phoneNumber
    businessName.value = stored.businessName
    businessCountryCode.value = stored.businessCountryCode
    baseCurrencyCode.value = stored.baseCurrencyCode
    taxJurisdictionCode.value = stored.taxJurisdictionCode || ''
    consent.value = stored.consent
    phase.value = stored.phase
    sentAt.value = stored.sentAt
    attribution.value = { ...stored.attribution, ...routeAttribution }
  } else {
    attribution.value = routeAttribution
  }
  writePublicCtaAttribution(window.sessionStorage, attribution.value)
  try {
    const response = await $fetch<{
      catalog: RegistrationCatalogOption[]
      phone_countries: PhoneCountryOption[]
      tax_jurisdictions?: Record<string, unknown>
    }>('/api/auth/registration/options', {
      credentials: 'include',
    })
    registrationCatalog.value = response.catalog
    phoneCountries.value = response.phone_countries
    const mapped: Record<string, TaxJurisdictionOption[]> = {}
    for (const [country, rows] of Object.entries(response.tax_jurisdictions || {})) {
      mapped[country.toUpperCase()] = normalizeJurisdictionOptions(rows)
    }
    taxJurisdictionsByCountry.value = mapped
    const storedPhoneCountry = phoneCountries.value.find(option =>
      option.country_code === phoneCountryIso.value
      && String(option.calling_code) === phoneCountryCode.value,
    )
    if (!storedPhoneCountry) {
      const defaultPhoneCountry = phoneCountries.value.find(option => option.country_code === 'CO')
        ?? phoneCountries.value[0]
      phoneCountryIso.value = defaultPhoneCountry?.country_code ?? ''
      phoneCountryCode.value = defaultPhoneCountry ? String(defaultPhoneCountry.calling_code) : ''
    }
    if (!registrationCatalog.value.some(option => option.country_code === businessCountryCode.value)) {
      businessCountryCode.value = ''
      baseCurrencyCode.value = ''
      taxJurisdictionCode.value = ''
    } else if (!compatibleCurrencies.value.includes(baseCurrencyCode.value)) {
      baseCurrencyCode.value = compatibleCurrencies.value[0] || ''
    }
    if (!businessCountryCode.value) {
      const suggested = suggestCountryFromLocale(appLocale.value)
      if (suggested && registrationCatalog.value.some(option => option.country_code === suggested)) {
        businessCountryCode.value = suggested
        baseCurrencyCode.value = (
          registrationCatalog.value.find(option => option.country_code === suggested)?.currency_codes[0]
          || ''
        )
      }
    }
    if (!needsJurisdiction.value
      || !jurisdictionOptions.value.some(option => option.code === taxJurisdictionCode.value)) {
      taxJurisdictionCode.value = ''
    }
  } catch {
    error.value = t('auth.registrationSendError')
  } finally {
    optionsLoading.value = false
  }
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
.registration-form {
  margin-top: 1.5rem;
}

.registration-form > * + * {
  margin-top: 1rem;
}

.form-input {
  width: 100%;
  min-height: 2.75rem;
  border: 1px solid hsl(var(--form-control-border));
  border-radius: var(--radius);
  background: hsl(var(--form-control-bg));
  padding: 0.5rem 0.875rem;
  color: hsl(var(--form-control-text));
  transition: box-shadow 150ms ease, border-color 150ms ease;
}

.form-input:focus-visible {
  border-color: hsl(var(--auth-action-bg));
  outline: 2px solid hsl(var(--auth-action-focus-ring));
  outline-offset: 2px;
}

.form-input[aria-invalid="true"] {
  border-color: hsl(var(--form-error-border));
}

.field-error {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: hsl(var(--form-error-text));
}

.primary-button {
  width: 100%;
  min-height: 2.75rem;
  border-radius: var(--radius);
  background: hsl(var(--auth-action-bg));
  padding: 0.625rem 1.25rem;
  color: hsl(var(--auth-action-text));
  font-weight: 600;
  transition: background-color 150ms ease, opacity 150ms ease;
}

.primary-button:hover:not(:disabled) { background: hsl(var(--auth-action-hover-bg)); }
.primary-button:focus-visible, .text-link:focus-visible, .auth-checkbox:focus-visible { outline: 2px solid hsl(var(--auth-action-focus-ring)); outline-offset: 3px; }
.primary-button:disabled {
  cursor: not-allowed;
  background: hsl(var(--auth-action-disabled-bg));
  color: hsl(var(--auth-action-disabled-text));
}
.text-link:disabled { cursor: not-allowed; opacity: 0.55; }
.text-link { font-weight: 600; color: hsl(var(--auth-link-text)); text-decoration: underline; text-underline-offset: 0.25rem; }
.text-link:hover { color: hsl(var(--auth-link-hover-text)); }
.auth-checkbox { accent-color: hsl(var(--auth-action-bg)); }

@media (prefers-reduced-motion: reduce) {
  .primary-button, .form-input { transition: none; }
}
</style>
