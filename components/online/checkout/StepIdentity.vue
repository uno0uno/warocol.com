<template>
  <div class="space-y-6">

    <!-- Checking session -->
    <div v-if="subStep === 'loading'" class="flex flex-col items-center gap-3 py-8">
      <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon name="heroicons:arrow-path" class="w-5 h-5 text-primary animate-spin" />
      </div>
      <p class="text-sm text-muted-foreground">Verificando sesión...</p>
    </div>

    <!-- Already verified -->
    <div v-else-if="subStep === 'verified'" class="flex flex-col items-center gap-3 py-6 text-center">
      <div class="w-16 h-16 rounded-full bg-state-success-bg flex items-center justify-center">
        <Icon name="heroicons:check-circle" class="w-9 h-9 text-state-success-icon" />
      </div>
      <div>
        <p class="font-semibold text-foreground">Identidad verificada</p>
        <p class="text-sm text-muted-foreground mt-0.5">{{ otpAuthStore.email }}</p>
      </div>
    </div>

    <!-- idle: phone form (email already known from StepEmail) -->
    <div v-else-if="subStep === 'idle'" class="space-y-4">
      <div class="text-center mb-2">
        <h4 class="text-base font-semibold text-foreground">Verifica tu identidad</h4>
        <p class="text-sm text-muted-foreground mt-0.5">
          Te enviaremos un código único para confirmar tu pedido
        </p>
      </div>

      <!-- Email display (read-only — set at step 2) -->
      <div class="flex items-center gap-2 p-3 rounded-md bg-muted/40 border border-border text-sm">
        <Icon name="heroicons:envelope" class="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span class="text-foreground font-medium">{{ otpAuthStore.email }}</span>
      </div>

      <div class="space-y-1">
        <label class="block text-sm font-medium text-foreground">Número de celular</label>
        <input
          v-model="phone"
          type="tel"
          class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="3001234567"
          @keyup.enter="handleSendOTP"
        />
        <p v-if="phone && !isPhoneValid" class="text-xs text-destructive">
          Ingresa un número de celular colombiano válido (10 dígitos, comienza con 3)
        </p>
      </div>

      <div v-if="customerValidationError" class="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
        <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5" />
        {{ customerValidationError }}
      </div>

      <div v-if="customerWarnings.length > 0" class="space-y-2">
        <div
          v-for="warning in customerWarnings"
          :key="warning"
          class="flex items-start gap-2 p-3 rounded-md bg-state-warning-bg border border-state-warning-border text-state-warning-text text-sm"
        >
          <Icon name="heroicons:information-circle" class="w-4 h-4 flex-shrink-0 mt-0.5" />
          {{ warning }}
        </div>
      </div>

      <Button
        class="w-full"
        :disabled="!isPhoneValid || otpAuthStore.isLoading"
        @click="handleSendOTP"
      >
        <Icon
          v-if="otpAuthStore.isLoading"
          name="heroicons:arrow-path"
          class="w-4 h-4 mr-2 animate-spin"
        />
        {{ otpAuthStore.isLoading ? 'Enviando...' : 'Enviar código' }}
      </Button>
    </div>

    <!-- otp_sent: OTP entry + countdown -->
    <div v-else-if="subStep === 'otp_sent'" class="space-y-5">
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <Icon name="heroicons:envelope" class="w-6 h-6 text-primary" />
        </div>
        <h4 class="text-base font-semibold text-foreground">Ingresa el código</h4>
        <p class="text-sm text-muted-foreground mt-0.5">
          Código enviado a <strong>{{ otpAuthStore.email }}</strong>
        </p>
      </div>

      <div v-if="countdown > 0" class="text-center text-sm font-medium text-state-warning-text">
        <Icon name="heroicons:clock" class="w-4 h-4 inline mr-1" />
        Reenviar disponible en {{ countdown }}s
      </div>

      <OTPInput
        ref="otpInputRef"
        :has-error="hasOtpError"
        :error-message="otpErrorMessage"
        :disabled="otpAuthStore.isLoading"
        @complete="handleVerifyOTP"
        @change="clearOtpError"
      />

      <div v-if="checkoutError" class="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
        <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5" />
        {{ checkoutError }}
      </div>

      <div class="flex flex-col gap-2">
        <Button
          :disabled="!otpCode || otpAuthStore.isLoading"
          class="w-full"
          @click="handleManualVerify"
        >
          <Icon
            v-if="otpAuthStore.isLoading"
            name="heroicons:arrow-path"
            class="w-4 h-4 mr-2 animate-spin"
          />
          {{ otpAuthStore.isLoading ? 'Verificando...' : 'Verificar' }}
        </Button>

        <Button
          variant="ghost"
          class="w-full text-sm"
          :disabled="countdown > 0 || otpAuthStore.isLoading"
          @click="handleResendOTP"
        >
          Reenviar código
        </Button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useOnlineCartStore } from '~/stores/online_cart'
import { useOtpAuthStore } from '~/stores/otp_auth'
import { useAddressStore } from '~/stores/address'
import OTPInput from '~/components/online/OTPInput.vue'
import { Button } from '~/components/ui'

const emit = defineEmits<{
  (e: 'verified'): void
}>()

const cartStore = useOnlineCartStore()
const otpAuthStore = useOtpAuthStore()
const addressStore = useAddressStore()

type IdentitySubStep = 'loading' | 'idle' | 'otp_sent' | 'verified'
const subStep = ref<IdentitySubStep>(cartStore.cartId ? 'loading' : 'idle')

// Phone
const phone = ref('')
const isPhoneValid = computed(() => /^3\d{9}$/.test(phone.value))

// Customer validation
const customerValidationError = ref('')
const customerWarnings = ref<string[]>([])

// OTP state
const otpCode = ref('')
const hasOtpError = ref(false)
const otpErrorMessage = ref('Código incorrecto')
const otpInputRef = ref<InstanceType<typeof OTPInput> | null>(null)
const checkoutError = ref('')

// Countdown timer
const countdown = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

// ── Delivery address application (shared by OTP verify and session paths) ──
const applyDeliveryAddress = async () => {
  if (cartStore.orderType === 'delivery') {
    if (addressStore.selectedAddressId) {
      await cartStore.updateDeliveryInfo({
        order_type: 'delivery',
        delivery_address_id: addressStore.selectedAddressId,
        scheduled_time: cartStore.deliveryInfo?.scheduled_time,
        delivery_instructions: cartStore.deliveryInfo?.delivery_instructions,
      })
    }
    else if (addressStore.pendingAddress) {
      const addressId = await addressStore.persistPendingAddress(otpAuthStore.customerId!)
      if (addressId) {
        await cartStore.updateDeliveryInfo({
          order_type: 'delivery',
          delivery_address_id: addressId,
          scheduled_time: cartStore.deliveryInfo?.scheduled_time,
          delivery_instructions: cartStore.deliveryInfo?.delivery_instructions,
        })
      }
    }
  }
}

onMounted(async () => {
  // Always try session first — if the cookie is valid, skip OTP entirely
  if (cartStore.cartId) {
    try {
      const result = await $fetch<{ success: boolean; customer_id: string; is_verified: boolean; pickup_pin: string | null }>(
        `/api/online/cart/${cartStore.cartId}/verify-with-session`,
        { method: 'POST' },
      )
      otpAuthStore.customerId = result.customer_id
      otpAuthStore.isVerified = result.is_verified
      if (result.pickup_pin) otpAuthStore.pickupPin = result.pickup_pin
      await applyDeliveryAddress()
      emit('verified')
      return
    }
    catch {
      // 401 = no valid cookie (new customer) — fall through to OTP form
      subStep.value = 'idle'
    }
  }
  countdownInterval = setInterval(() => {
    countdown.value = otpAuthStore.otpCooldownRemaining
  }, 1000)
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})

// Delivery fee (mirrors confirm.vue logic)
const deliveryFee = computed(() => 0)

// ── OTP send ──────────────────────────────────────────────────────────────
const handleSendOTP = async () => {
  if (!isPhoneValid.value) return
  if (!cartStore.cartId) {
    customerValidationError.value = 'El carrito no está listo. Inténtalo de nuevo.'
    return
  }

  customerValidationError.value = ''
  customerWarnings.value = []

  try {
    const safeTotal = Number.isFinite(cartStore.subtotal + deliveryFee.value)
      ? cartStore.subtotal + deliveryFee.value
      : 0

    const validation = await otpAuthStore.validateCustomer(phone.value, safeTotal, cartStore.cartId)

    if (!validation.can_order) {
      customerValidationError.value = validation.reason || 'No puedes realizar este pedido.'
      return
    }

    customerWarnings.value = validation.warnings
    await otpAuthStore.sendOTP(otpAuthStore.email!, cartStore.cartId)
    subStep.value = 'otp_sent'
  }
  catch (error: any) {
    customerValidationError.value = error.message || 'Error al enviar el código. Inténtalo de nuevo.'
  }
}

// ── OTP verify ────────────────────────────────────────────────────────────
const handleVerifyOTP = async (code: string) => {
  otpCode.value = code
  await verifyAndDetect()
}

const handleManualVerify = async () => {
  if (!otpCode.value) return
  await verifyAndDetect()
}

const verifyAndDetect = async () => {
  if (!otpCode.value || !cartStore.cartId || !otpAuthStore.email) return

  checkoutError.value = ''

  try {
    await otpAuthStore.verifyOTP(
      otpAuthStore.email,
      cartStore.cartId,
      otpCode.value,
      otpAuthStore.phoneNumber || phone.value,
    )

    await applyDeliveryAddress()

    subStep.value = 'verified'
    await new Promise(resolve => setTimeout(resolve, 1200))
    emit('verified')
  }
  catch (error: any) {
    const message = error.data?.detail || error.message || 'Código incorrecto. Inténtalo de nuevo.'
    hasOtpError.value = true
    otpErrorMessage.value = message
    otpInputRef.value?.clear()
    otpCode.value = ''
  }
}

// ── Resend ────────────────────────────────────────────────────────────────
const handleResendOTP = async () => {
  if (!otpAuthStore.canResendOtp || !cartStore.cartId || !otpAuthStore.email) return

  try {
    await otpAuthStore.resendOTP(otpAuthStore.email, cartStore.cartId)
    hasOtpError.value = false
    otpInputRef.value?.clear()
    otpCode.value = ''
  }
  catch (error: any) {
    checkoutError.value = error.message || 'Error al reenviar el código'
  }
}

const clearOtpError = () => {
  hasOtpError.value = false
  checkoutError.value = ''
}

// ── Exposed interface for wizard page ─────────────────────────────────────
const isValid = computed(() => otpAuthStore.isAuthenticated)

defineExpose({ isValid })
</script>
