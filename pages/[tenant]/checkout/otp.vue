<template>
  <div class="otp-page">
    <div class="otp-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" @click="goBack">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Volver
        </button>
      </div>

      <!-- Content -->
      <div class="otp-content">
        <!-- Icon -->
        <div class="icon-circle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>

        <!-- Title -->
        <h1 class="page-title">Verificación de Email</h1>
        <p class="page-subtitle">
          Para continuar con tu pedido, necesitamos verificar tu correo electrónico
        </p>

        <!-- Step 1: Enter Email (if not sent) -->
        <div v-if="!otpSent" class="email-section">
          <div class="form-group">
            <label for="email" class="form-label">Correo electrónico</label>
            <input
              id="email"
              v-model="email"
              type="email"
              class="form-input"
              placeholder="tu@email.com"
              required
              @keyup.enter="handleSendOTP"
            />
          </div>

          <button
            class="btn btn-primary btn-large"
            @click="handleSendOTP"
            :disabled="!isEmailValid || authStore.isLoading"
          >
            <span v-if="!authStore.isLoading">Enviar Código</span>
            <span v-else>Enviando...</span>
          </button>

          <!-- Mock Code Display (for testing) -->
          <div v-if="authStore.mockOtpCode" class="mock-code-hint">
            🔧 <strong>Modo Demo:</strong> Código de prueba: <code>{{ authStore.mockOtpCode }}</code>
          </div>
        </div>

        <!-- Step 2: Verify OTP -->
        <div v-else class="verification-section">
          <!-- Email Display -->
          <div class="email-display">
            📧 Código enviado a: <strong>{{ email }}</strong>
            <button class="change-email-btn" @click="changeEmail">Cambiar</button>
          </div>

          <!-- Timer -->
          <div v-if="authStore.otpCooldownRemaining > 0" class="timer-display">
            ⏱️ Podrás reenviar en {{ authStore.otpCooldownRemaining }} segundos
          </div>

          <!-- OTP Input -->
          <OTPInput
            ref="otpInputRef"
            :has-error="hasOtpError"
            :error-message="otpErrorMessage"
            :disabled="authStore.isLoading"
            @complete="handleVerifyOTP"
            @change="clearOtpError"
          />

          <!-- Actions -->
          <div class="otp-actions">
            <button
              class="btn btn-primary btn-large"
              @click="handleManualVerify"
              :disabled="!otpCode || authStore.isLoading"
            >
              <span v-if="!authStore.isLoading">Verificar Código</span>
              <span v-else>Verificando...</span>
            </button>

            <button
              class="btn btn-link"
              @click="handleResendOTP"
              :disabled="!authStore.canResendOtp || authStore.isLoading"
            >
              Reenviar código
            </button>
          </div>

          <!-- Mock Code Display (for testing) -->
          <div v-if="authStore.mockOtpCode" class="mock-code-hint">
            🔧 <strong>Modo Demo:</strong> Código de prueba: <code>{{ authStore.mockOtpCode }}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOnlineCartStore } from '~/stores/online_cart'
import { useOtpAuthStore } from '~/stores/otp_auth'
import OTPInput from '~/components/online/OTPInput.vue'

definePageMeta({
  layout: 'public-restaurant',
})

const route = useRoute()
const router = useRouter()
const cartStore = useOnlineCartStore()
const authStore = useOtpAuthStore()

const tenantSlug = computed(() => route.params.tenant as string)

// Redirect if cart is empty
if (cartStore.isEmpty) {
  router.push(`/${tenantSlug.value}`)
}

// Email state
const email = ref('')
const otpSent = ref(false)
const otpCode = ref('')

// OTP error state
const hasOtpError = ref(false)
const otpErrorMessage = ref('Código incorrecto')

// Refs
const otpInputRef = ref<InstanceType<typeof OTPInput> | null>(null)

const isEmailValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

const handleSendOTP = async () => {
  if (!isEmailValid.value || !cartStore.cartId) return

  try {
    await authStore.sendOTP(email.value, cartStore.cartId)
    otpSent.value = true
  } catch (error: any) {
    alert(error.message || 'Error al enviar código')
  }
}

const handleVerifyOTP = async (code: string) => {
  otpCode.value = code
  await verifyCode(code)
}

const handleManualVerify = async () => {
  if (!otpCode.value) return
  await verifyCode(otpCode.value)
}

const verifyCode = async (code: string) => {
  if (!cartStore.cartId) return

  try {
    hasOtpError.value = false
    await authStore.verifyOTP(email.value, cartStore.cartId, code)

    // Success! Go to delivery info page
    router.push(`/${tenantSlug.value}/checkout/delivery`)
  } catch (error: any) {
    hasOtpError.value = true
    otpErrorMessage.value = error.message || 'Código incorrecto'
    otpInputRef.value?.clear()
  }
}

const handleResendOTP = async () => {
  if (!authStore.canResendOtp || !cartStore.cartId) return

  try {
    await authStore.resendOTP(email.value, cartStore.cartId)
    hasOtpError.value = false
    otpInputRef.value?.clear()
  } catch (error: any) {
    alert(error.message || 'Error al reenviar código')
  }
}

const clearOtpError = () => {
  hasOtpError.value = false
}

const changeEmail = () => {
  otpSent.value = false
  otpCode.value = ''
  hasOtpError.value = false
}

const goBack = () => {
  router.push(`/${tenantSlug.value}`)
}
</script>

<style scoped>
.otp-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.otp-container {
  width: 100%;
  max-width: 480px;
}

.page-header {
  margin-bottom: 24px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.otp-content {
  background: white;
  border-radius: 20px;
  padding: 48px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.icon-circle {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: white;
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  color: #111827;
  margin: 0 0 12px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px 0;
  line-height: 1.5;
}

.email-section,
.verification-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  text-align: left;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  font-size: 16px;
  color: #111827;
  background: white;
  border: 2px solid #d1d5db;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.email-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f0f4ff;
  border-radius: 10px;
  font-size: 14px;
  color: #374151;
  flex-wrap: wrap;
}

.change-email-btn {
  font-size: 13px;
  color: #667eea;
  background: none;
  border: none;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.timer-display {
  font-size: 14px;
  color: #f59e0b;
  font-weight: 600;
}

.otp-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.btn-large {
  padding: 16px 32px;
  font-size: 16px;
}

.btn-link {
  background: transparent;
  color: #667eea;
  padding: 12px;
}

.btn-link:hover:not(:disabled) {
  background: #f0f4ff;
}

.mock-code-hint {
  padding: 12px 16px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
  text-align: center;
}

.mock-code-hint code {
  font-size: 16px;
  font-weight: 700;
  color: #7c2d12;
  background: rgba(255, 255, 255, 0.5);
  padding: 4px 8px;
  border-radius: 4px;
}

/* Mobile styles */
@media (max-width: 640px) {
  .otp-page {
    padding: 16px;
    align-items: flex-start;
    padding-top: 40px;
  }

  .otp-content {
    padding: 32px 24px;
  }

  .page-title {
    font-size: 24px;
  }

  .icon-circle {
    width: 64px;
    height: 64px;
  }

  .icon-circle svg {
    width: 24px;
    height: 24px;
  }
}
</style>
