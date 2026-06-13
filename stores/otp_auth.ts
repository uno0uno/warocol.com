/**
 * Auth Store - OTP Verification
 * Manages authentication via email OTP across the online checkout wizard.
 *
 * Migrated to Pinia Colada useMutation — eliminates manual isLoading + try/catch/finally boilerplate.
 * Shared session state (customerId, email, isVerified, pickupPin) remains as writable refs
 * so callers can assign directly (checkout/index.vue, StepIdentity.vue).
 */
import { defineStore } from 'pinia'

export interface CustomerValidation {
  can_order: boolean
  is_blacklisted: boolean
  customer_tier: 'new' | 'intermediate' | 'trusted'
  max_amount?: number
  reason?: string
  warnings: string[]
}

export const useOtpAuthStore = defineStore('otpAuth', () => {
  // ── Shared session state (writable — callers assign directly) ──────────
  const customerId = ref<string | null>(null)
  const email = ref<string | null>(null)
  const phoneNumber = ref<string | null>(null)
  const isVerified = ref(false)
  const otpSentAt = ref<Date | null>(null)
  const otpExpiresAt = ref<Date | null>(null)
  const pickupPin = ref<string | null>(null)

  // ── Mutations ──────────────────────────────────────────────────────────

  const sendMutation = useMutation({
    mutation: (vars: { email: string; cartId: string | null }) =>
      $fetch<{ success: boolean; expires_in: number; message: string }>(
        '/api/online/otp/send',
        { method: 'POST', body: { email: vars.email, cart_id: vars.cartId } }
      ),
    onSuccess(data) {
      otpSentAt.value = new Date()
      otpExpiresAt.value = new Date(Date.now() + data.expires_in * 1000)
    },
  })

  const verifyMutation = useMutation({
    mutation: (vars: { email: string; cartId: string | null; code: string }) =>
      $fetch<{ success: boolean; customer_id: string; is_verified: boolean; pickup_pin: string | null; message: string }>(
        '/api/online/otp/verify',
        { method: 'POST', body: { email: vars.email, cart_id: vars.cartId, otp_code: vars.code } }
      ),
    onSuccess(data) {
      customerId.value = data.customer_id
      isVerified.value = data.is_verified
      pickupPin.value = data.pickup_pin
    },
  })

  const resendMutation = useMutation({
    mutation: (vars: { email: string; cartId: string }) =>
      $fetch<{ success: boolean; expires_in: number; message: string }>(
        '/api/online/otp/resend',
        { method: 'POST', body: { email: vars.email, cart_id: vars.cartId } }
      ),
    onSuccess(data) {
      otpSentAt.value = new Date()
      otpExpiresAt.value = new Date(Date.now() + data.expires_in * 1000)
    },
  })

  const validateMutation = useMutation({
    mutation: (vars: { phoneNumber: string; cartTotal: number; cartId?: string | null }) =>
      $fetch<CustomerValidation>('/api/online/customer/validate', {
        method: 'POST',
        body: { phone_number: vars.phoneNumber, cart_total: vars.cartTotal, cart_id: vars.cartId ?? null },
      }),
    onSuccess(_, vars) {
      phoneNumber.value = vars.phoneNumber
    },
  })

  // ── Computed loading (single isLoading for 13 template bindings) ───────
  const isLoading = computed(() =>
    sendMutation.isLoading.value ||
    verifyMutation.isLoading.value ||
    resendMutation.isLoading.value ||
    validateMutation.isLoading.value
  )

  // ── Getters (computed) ─────────────────────────────────────────────────
  const isAuthenticated = computed(() => isVerified.value && !!customerId.value)
  const isSessionValid = computed(() => isVerified.value && !!customerId.value)

  const otpCooldownRemaining = computed(() => {
    if (!otpSentAt.value) return 0
    const elapsed = Date.now() - otpSentAt.value.getTime()
    const cooldown = 60000 // 60 seconds
    return Math.ceil(Math.max(0, cooldown - elapsed) / 1000)
  })

  const canResendOtp = computed(() => otpCooldownRemaining.value === 0)

  // ── Action wrappers (preserve existing call signatures) ────────────────

  /**
   * Send OTP code to email (checkout flow — requires cart)
   */
  const sendOTP = (emailVal: string, cartId: string) => {
    const normalized = emailVal.trim().toLowerCase()
    email.value = normalized
    return sendMutation.mutateAsync({ email: normalized, cartId })
      .catch((e: any) => { throw new Error(e.data?.detail || 'Error al enviar el código') })
  }

  /**
   * Verify OTP code (checkout flow)
   */
  const verifyOTP = (emailVal: string, cartId: string, code: string) =>
    verifyMutation.mutateAsync({ email: emailVal.trim().toLowerCase(), cartId, code })
      .catch((e: any) => { throw new Error(e.data?.detail || 'Código incorrecto') })

  /**
   * Resend OTP code — respects 60s cooldown
   */
  const resendOTP = (emailVal: string, cartId: string) => {
    if (!canResendOtp.value) {
      return Promise.reject(
        new Error(`Por favor espera ${otpCooldownRemaining.value} segundos antes de reenviar`)
      )
    }
    return resendMutation.mutateAsync({ email: emailVal.trim().toLowerCase(), cartId })
      .catch((e: any) => { throw new Error(e.data?.detail || 'Error al reenviar el código') })
  }

  /**
   * Validate customer eligibility (blacklist, tier, spending limits)
   */
  const validateCustomer = (phone: string, cartTotal: number, cartId?: string | null): Promise<CustomerValidation> =>
    validateMutation.mutateAsync({ phoneNumber: phone, cartTotal, cartId })
      .catch((e: any) => { throw new Error(e.data?.detail || 'Error al validar cliente') })

  /**
   * Send OTP for customer portal re-auth (no cart required)
   */
  const sendOTPPortal = (emailVal: string) => {
    const normalized = emailVal.trim().toLowerCase()
    email.value = normalized
    return sendMutation.mutateAsync({ email: normalized, cartId: null })
      .catch((e: any) => { throw new Error(e.data?.detail || 'Error al enviar el código') })
  }

  /**
   * Verify OTP for customer portal re-auth (no cart required)
   */
  const verifyOTPPortal = (emailVal: string, code: string) =>
    verifyMutation.mutateAsync({ email: emailVal.trim().toLowerCase(), cartId: null, code })
      .catch((e: any) => { throw new Error(e.data?.detail || 'Código incorrecto') })

  /**
   * Logout and clear all session state
   */
  const logout = () => {
    customerId.value = null
    email.value = null
    phoneNumber.value = null
    isVerified.value = false
    otpSentAt.value = null
    otpExpiresAt.value = null
    pickupPin.value = null
  }

  return {
    // State (writable — callers may assign directly)
    customerId,
    email,
    phoneNumber,
    isVerified,
    otpSentAt,
    otpExpiresAt,
    pickupPin,
    // Computed loading (replaces manual isLoading ref)
    isLoading,
    // Getters
    isAuthenticated,
    isSessionValid,
    otpCooldownRemaining,
    canResendOtp,
    // Actions
    sendOTP,
    verifyOTP,
    resendOTP,
    validateCustomer,
    sendOTPPortal,
    verifyOTPPortal,
    logout,
  }
})
