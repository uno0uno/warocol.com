<template>
  <div class="space-y-6">

    <!-- Already verified -->
    <div v-if="subStep === 'verified'" class="flex flex-col items-center gap-3 py-6 text-center">
      <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <Icon name="heroicons:check-circle" class="w-9 h-9 text-green-600" />
      </div>
      <div>
        <p class="font-semibold text-foreground">Identity verified</p>
        <p class="text-sm text-muted-foreground mt-0.5">{{ otpAuthStore.email }}</p>
      </div>
    </div>

    <!-- idle: phone + email form -->
    <div v-else-if="subStep === 'idle'" class="space-y-4">
      <div class="text-center mb-2">
        <h4 class="text-base font-semibold text-foreground">Verify your identity</h4>
        <p class="text-sm text-muted-foreground mt-0.5">
          We'll send a one-time code to your email to confirm your order
        </p>
      </div>

      <div class="space-y-1">
        <label class="block text-sm font-medium text-foreground">Phone number</label>
        <input
          v-model="phone"
          type="tel"
          class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="3001234567"
          @keyup.enter="handleSendOTP"
        />
        <p v-if="phone && !isPhoneValid" class="text-xs text-destructive">
          Enter a valid Colombian mobile number (10 digits starting with 3)
        </p>
      </div>

      <div class="space-y-1">
        <label class="block text-sm font-medium text-foreground">Email address</label>
        <input
          v-model="email"
          type="email"
          class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="you@email.com"
          @keyup.enter="handleSendOTP"
        />
      </div>

      <div v-if="customerValidationError" class="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
        <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5" />
        {{ customerValidationError }}
      </div>

      <div v-if="customerWarnings.length > 0" class="space-y-2">
        <div
          v-for="warning in customerWarnings"
          :key="warning"
          class="flex items-start gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm"
        >
          <Icon name="heroicons:information-circle" class="w-4 h-4 flex-shrink-0 mt-0.5" />
          {{ warning }}
        </div>
      </div>

      <Button
        class="w-full"
        :disabled="!isPhoneValid || !isEmailValid || otpAuthStore.isLoading"
        @click="handleSendOTP"
      >
        <Icon
          v-if="otpAuthStore.isLoading"
          name="heroicons:arrow-path"
          class="w-4 h-4 mr-2 animate-spin"
        />
        {{ otpAuthStore.isLoading ? 'Sending…' : 'Send code' }}
      </Button>
    </div>

    <!-- otp_sent: OTP entry + countdown -->
    <div v-else-if="subStep === 'otp_sent'" class="space-y-5">
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <Icon name="heroicons:envelope" class="w-6 h-6 text-primary" />
        </div>
        <h4 class="text-base font-semibold text-foreground">Enter the code</h4>
        <p class="text-sm text-muted-foreground mt-0.5">
          Code sent to <strong>{{ email }}</strong>
          <button
            type="button"
            class="ml-2 text-xs text-primary font-medium underline underline-offset-2 hover:text-primary/80"
            @click="changeEmail"
          >
            Change
          </button>
        </p>
      </div>

      <div v-if="countdown > 0" class="text-center text-sm font-medium text-amber-600">
        <Icon name="heroicons:clock" class="w-4 h-4 inline mr-1" />
        Resend available in {{ countdown }}s
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
          {{ otpAuthStore.isLoading ? 'Verifying…' : 'Verify' }}
        </Button>

        <Button
          variant="ghost"
          class="w-full text-sm"
          :disabled="countdown > 0 || otpAuthStore.isLoading"
          @click="handleResendOTP"
        >
          Resend code
        </Button>
      </div>
    </div>

    <!-- address_select: returning delivery customer picks address post-OTP -->
    <div v-else-if="subStep === 'address_select'" class="space-y-4">
      <div class="text-center mb-2">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <Icon name="heroicons:map-pin" class="w-6 h-6 text-primary" />
        </div>
        <h4 class="text-base font-semibold text-foreground">Select delivery address</h4>
        <p class="text-sm text-muted-foreground mt-0.5">Choose or add a delivery address</p>
      </div>

      <!-- Add / Edit form -->
      <AddressForm
        v-if="showAddressForm"
        :address="editingAddressId ? (addressStore.addresses.find(a => a.id === editingAddressId) ?? null) : null"
        :loading="addressStore.isLoading"
        @submit="handleAddressFormSubmit"
        @cancel="showAddressForm = false; editingAddressId = null"
      />

      <template v-else>
        <AddressSelector
          :addresses="addressStore.addresses"
          :selected-id="addressStore.selectedAddressId"
          @select="addressStore.selectAddress($event)"
          @edit="editingAddressId = $event; showAddressForm = true"
          @delete="handleDeleteAddress"
          @add-new="editingAddressId = null; showAddressForm = true"
        />

        <div v-if="checkoutError" class="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5" />
          {{ checkoutError }}
        </div>

        <Button
          class="w-full"
          :disabled="!addressStore.selectedAddressId || addressStore.isLoading"
          @click="confirmAddress"
        >
          <Icon
            v-if="addressStore.isLoading"
            name="heroicons:arrow-path"
            class="w-4 h-4 mr-2 animate-spin"
          />
          Confirm address
        </Button>
      </template>
    </div>

  </div>
</template>

<script setup lang="ts">
import { useOnlineCartStore } from '~/stores/online_cart'
import { useOtpAuthStore } from '~/stores/otp_auth'
import { useAddressStore } from '~/stores/address'
import type { AddressCreate } from '~/stores/address'
import OTPInput from '~/components/online/OTPInput.vue'
import AddressSelector from '~/components/online/AddressSelector.vue'
import AddressForm from '~/components/online/AddressForm.vue'
import { Button } from '~/components/ui'

const emit = defineEmits<{
  (e: 'verified'): void
}>()

const cartStore = useOnlineCartStore()
const otpAuthStore = useOtpAuthStore()
const addressStore = useAddressStore()

type IdentitySubStep = 'idle' | 'otp_sent' | 'address_select' | 'verified'
const subStep = ref<IdentitySubStep>(
  otpAuthStore.isAuthenticated ? 'verified' : 'idle',
)

// Phone + email
const phone = ref('')
const email = ref('')
const isPhoneValid = computed(() => /^3\d{9}$/.test(phone.value))
const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))

// Customer validation
const customerValidationError = ref('')
const customerWarnings = ref<string[]>([])

// OTP state
const otpCode = ref('')
const hasOtpError = ref(false)
const otpErrorMessage = ref('Incorrect code')
const otpInputRef = ref<InstanceType<typeof OTPInput> | null>(null)
const checkoutError = ref('')

// Countdown timer
const countdown = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  countdownInterval = setInterval(() => {
    countdown.value = otpAuthStore.otpCooldownRemaining
  }, 1000)
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})

// Address select sub-state
const editingAddressId = ref<string | null>(null)
const showAddressForm = ref(false)

// Delivery fee (mirrors confirm.vue logic)
const deliveryFee = computed(() =>
  cartStore.orderType === 'delivery' && cartStore.subtotal < 50000 ? 5000 : 0,
)

// ── OTP send ──────────────────────────────────────────────────────────────
const handleSendOTP = async () => {
  if (!isPhoneValid.value || !isEmailValid.value) return
  if (!cartStore.cartId) {
    customerValidationError.value = 'Cart not ready. Please try again.'
    return
  }

  customerValidationError.value = ''
  customerWarnings.value = []

  try {
    const safeTotal = Number.isFinite(cartStore.subtotal + deliveryFee.value)
      ? cartStore.subtotal + deliveryFee.value
      : 0

    const validation = await otpAuthStore.validateCustomer(phone.value, safeTotal)

    if (!validation.can_order) {
      customerValidationError.value = validation.reason || 'You cannot place this order.'
      return
    }

    customerWarnings.value = validation.warnings
    await otpAuthStore.sendOTP(email.value, cartStore.cartId)
    subStep.value = 'otp_sent'
  }
  catch (error: any) {
    customerValidationError.value = error.message || 'Error sending code. Please try again.'
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
  if (!otpCode.value || !cartStore.cartId) return

  checkoutError.value = ''

  try {
    await otpAuthStore.verifyOTP(email.value, cartStore.cartId, otpCode.value)

    if (cartStore.orderType === 'delivery') {
      try {
        await addressStore.fetchAddresses(otpAuthStore.customerId!)
      }
      catch {
        // fetch failure is non-fatal — fall through to guest flow
      }

      if (addressStore.hasAddresses) {
        subStep.value = 'address_select'
        return
      }

      // First-time customer: persist pending address and attach to cart
      const addressId = await addressStore.persistPendingAddress(otpAuthStore.customerId!)
      if (addressId) {
        await cartStore.updateDeliveryInfo({
          order_type: 'delivery',
          delivery_address_id: addressId,
        })
      }
    }

    subStep.value = 'verified'
    emit('verified')
  }
  catch (error: any) {
    const message = error.data?.detail || error.message || 'Incorrect code. Please try again.'
    hasOtpError.value = true
    otpErrorMessage.value = message
    checkoutError.value = message
    otpInputRef.value?.clear()
    otpCode.value = ''
  }
}

// ── Resend / change ───────────────────────────────────────────────────────
const handleResendOTP = async () => {
  if (!otpAuthStore.canResendOtp || !cartStore.cartId) return

  try {
    await otpAuthStore.resendOTP(email.value, cartStore.cartId)
    hasOtpError.value = false
    otpInputRef.value?.clear()
    otpCode.value = ''
  }
  catch (error: any) {
    checkoutError.value = error.message || 'Error resending code'
  }
}

const clearOtpError = () => {
  hasOtpError.value = false
  checkoutError.value = ''
}

const changeEmail = () => {
  subStep.value = 'idle'
  otpCode.value = ''
  hasOtpError.value = false
  checkoutError.value = ''
  customerValidationError.value = ''
  customerWarnings.value = []
}

// ── Address select (returning customer) ───────────────────────────────────
const confirmAddress = async () => {
  if (!addressStore.selectedAddressId) return

  await cartStore.updateDeliveryInfo({
    order_type: 'delivery',
    delivery_address_id: addressStore.selectedAddressId,
  })

  subStep.value = 'verified'
  emit('verified')
}

const handleDeleteAddress = (addressId: string) => {
  addressStore.deleteAddress(otpAuthStore.customerId!, addressId)
}

const handleAddressFormSubmit = async (data: AddressCreate) => {
  const customerId = otpAuthStore.customerId!

  if (editingAddressId.value) {
    await addressStore.updateAddress(customerId, editingAddressId.value, data)
  }
  else {
    const newAddress = await addressStore.createAddress(customerId, data)
    addressStore.selectAddress(newAddress.id)
  }

  showAddressForm.value = false
  editingAddressId.value = null
}

// ── Exposed interface for wizard page ─────────────────────────────────────
const isValid = computed(() =>
  otpAuthStore.isAuthenticated && subStep.value !== 'address_select',
)

defineExpose({ isValid })
</script>
