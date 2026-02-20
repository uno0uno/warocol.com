<template>
  <div class="confirm-page">
    <div class="confirm-container">
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

        <h1 class="page-title">Confirmar Pedido</h1>
        <p class="page-subtitle">Revisa tu pedido antes de confirmar</p>
      </div>

      <!-- Content -->
      <div class="confirm-content">
        <!-- Order Type -->
        <div class="section">
          <h3 class="section-title">Tipo de Pedido</h3>
          <div class="order-type-display">
            <div class="type-icon">
              {{ getOrderTypeIcon(cartStore.orderType) }}
            </div>
            <div>
              <div class="type-label">{{ getOrderTypeLabel(cartStore.orderType) }}</div>
              <div v-if="cartStore.orderType === 'pickup'" class="type-desc">
                Recibirás un PIN para recoger tu pedido
              </div>
            </div>
          </div>
        </div>

        <!-- Delivery Address (if delivery) -->
        <div v-if="cartStore.orderType === 'delivery' && selectedAddress" class="section">
          <h3 class="section-title">Dirección de Entrega</h3>
          <div class="address-display">
            <div class="address-icon">📍</div>
            <div class="address-info">
              <div class="address-line">{{ selectedAddress.address_line1 }}</div>
              <div v-if="selectedAddress.address_line2" class="address-line2">
                {{ selectedAddress.address_line2 }}
              </div>
              <div class="address-city">
                {{ selectedAddress.city }}, {{ selectedAddress.state }}
              </div>
              <div v-if="selectedAddress.delivery_notes" class="address-notes">
                📝 {{ selectedAddress.delivery_notes }}
              </div>
            </div>
          </div>
        </div>

        <!-- Scheduled Time -->
        <div v-if="cartStore.deliveryInfo?.scheduled_time" class="section">
          <h3 class="section-title">Fecha y Hora</h3>
          <div class="time-display">
            📅 {{ formatScheduledTime(cartStore.deliveryInfo.scheduled_time) }}
          </div>
        </div>

        <!-- Additional Instructions -->
        <div v-if="cartStore.deliveryInfo?.delivery_instructions" class="section">
          <h3 class="section-title">Instrucciones Adicionales</h3>
          <div class="instructions-display">
            📝 {{ cartStore.deliveryInfo.delivery_instructions }}
          </div>
        </div>

        <!-- Order Items -->
        <div class="section">
          <h3 class="section-title">Tu Pedido ({{ cartStore.itemCount }} productos)</h3>
          <div class="items-list">
            <div v-for="item in cartStore.items" :key="item.id" class="order-item">
              <div class="item-quantity">{{ item.quantity }}x</div>
              <div class="item-details">
                <div class="item-name">{{ item.product_name }}</div>
                <div v-if="item.modifiers.length > 0" class="item-modifiers">
                  <span v-for="mod in item.modifiers" :key="mod.id" class="modifier">
                    + {{ mod.name }}
                  </span>
                </div>
                <div v-if="item.notes" class="item-notes">📝 {{ item.notes }}</div>
              </div>
              <div class="item-price">{{ formatPrice(item.total) }}</div>
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="section">
          <h3 class="section-title">Resumen</h3>
          <div class="summary-lines">
            <div class="summary-line">
              <span>Subtotal</span>
              <span>{{ formatPrice(cartStore.subtotal) }}</span>
            </div>
            <div v-if="deliveryFee > 0" class="summary-line">
              <span>Domicilio</span>
              <span>{{ formatPrice(deliveryFee) }}</span>
            </div>
            <div v-else-if="cartStore.orderType === 'delivery'" class="summary-line">
              <span>Domicilio <span class="free-badge">GRATIS</span></span>
              <span>{{ formatPrice(0) }}</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-line total-line">
              <span>Total</span>
              <span>{{ formatPrice(total) }}</span>
            </div>
          </div>
        </div>

        <!-- Payment Info (Mock) -->
        <div class="section">
          <div class="payment-info">
            💵 <strong>Pago:</strong> Efectivo al recibir
          </div>
        </div>

        <!-- Step: review — initial confirm button -->
        <div v-if="step === 'review'" class="action-section">
          <button class="btn btn-primary btn-large" @click="step = 'email_input'">
            Confirmar Pedido
          </button>
          <p class="terms-text">
            Al confirmar, aceptas nuestros términos y condiciones de servicio
          </p>
        </div>

        <!-- Step: email_input — enter email to receive OTP -->
        <div v-else-if="step === 'email_input'" class="action-section otp-card">
          <div class="otp-card-header">
            <div class="otp-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <h3 class="otp-card-title">Verificación de Email</h3>
              <p class="otp-card-subtitle">Te enviaremos un código para confirmar tu pedido</p>
            </div>
          </div>

          <div class="form-group">
            <label for="phone" class="form-label">Número de celular</label>
            <input
              id="phone"
              v-model="phone"
              type="tel"
              class="form-input"
              placeholder="Ej: 3001234567"
              required
              @keyup.enter="handleSendOTP"
            />
          </div>

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

          <div v-if="customerValidationError" class="error-alert">
            ⚠️ {{ customerValidationError }}
          </div>

          <div v-if="customerWarnings.length > 0" class="warnings-list">
            <div v-for="warning in customerWarnings" :key="warning" class="warning-item">
              ℹ️ {{ warning }}
            </div>
          </div>

          <button
            class="btn btn-primary btn-large"
            @click="handleSendOTP"
            :disabled="!isPhoneValid || !isEmailValid || otpAuthStore.isLoading"
          >
            <span v-if="!otpAuthStore.isLoading">Enviar Código</span>
            <span v-else>Enviando...</span>
          </button>

          <button class="btn btn-link" @click="step = 'review'">Cancelar</button>
        </div>

        <!-- Step: otp_sent — verify OTP code -->
        <div v-else-if="step === 'otp_sent'" class="action-section otp-card">
          <div class="otp-card-header">
            <div class="otp-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div>
              <h3 class="otp-card-title">Ingresa el Código</h3>
              <p class="otp-card-subtitle">
                Código enviado a <strong>{{ email }}</strong>
                <button class="change-email-btn" @click="changeEmail">Cambiar</button>
              </p>
            </div>
          </div>

          <div v-if="countdown > 0" class="timer-display">
            ⏱️ Podrás reenviar en {{ countdown }} segundos
          </div>

          <OTPInput
            ref="otpInputRef"
            :has-error="hasOtpError"
            :error-message="otpErrorMessage"
            :disabled="otpAuthStore.isLoading"
            @complete="handleVerifyOTP"
            @change="clearOtpError"
          />

          <div v-if="checkoutError" class="error-alert">
            ⚠️ {{ checkoutError }}
          </div>

          <div class="otp-actions">
            <button
              class="btn btn-primary btn-large"
              @click="handleManualVerify"
              :disabled="!otpCode || otpAuthStore.isLoading"
            >
              <span v-if="!otpAuthStore.isLoading">Verificar y Confirmar</span>
              <span v-else>Verificando...</span>
            </button>

            <button
              class="btn btn-link"
              @click="handleResendOTP"
              :disabled="!otpAuthStore.canResendOtp || otpAuthStore.isLoading"
            >
              Reenviar código
            </button>
          </div>
        </div>

        <!-- Step: placing_order — spinner while POSTing -->
        <div v-else-if="step === 'placing_order'" class="action-section placing-section">
          <div class="placing-spinner"></div>
          <p class="placing-text">Confirmando tu pedido...</p>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="step === 'success'" class="modal-backdrop">
          <div class="success-modal">
            <div class="success-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>

            <h2 class="modal-title">¡Pedido Confirmado!</h2>

            <div class="order-number">
              Número de pedido: <strong>#{{ confirmedOrder?.order_number }}</strong>
            </div>

            <div v-if="confirmedOrder?.pickup_pin || otpAuthStore.pickupPin" class="pickup-pin-display">
              <div class="pin-label">Tu PIN de Recogida:</div>
              <div class="pin-code">{{ confirmedOrder?.pickup_pin || otpAuthStore.pickupPin }}</div>
              <p class="pin-desc">Muestra este PIN al recoger tu pedido</p>
            </div>

            <div class="success-message">
              <p v-if="cartStore.orderType === 'delivery'">
                Tu pedido llegará en aproximadamente <strong>30-45 minutos</strong>
              </p>
              <p v-else-if="cartStore.orderType === 'pickup'">
                Tu pedido estará listo para recoger en <strong>20-30 minutos</strong>
              </p>
              <p v-else>
                Tu pedido está siendo preparado
              </p>
            </div>

            <button class="btn btn-primary" @click="goToHome">
              Volver al Inicio
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useOnlineCartStore } from '~/stores/online_cart'
import { useOtpAuthStore } from '~/stores/otp_auth'
import { useAddressStore } from '~/stores/address'
import OTPInput from '~/components/online/OTPInput.vue'

definePageMeta({
  layout: 'public-restaurant',
})

interface ConfirmedOrder {
  order_id: string
  order_number: number
  total_amount: number
  order_type: string
  pickup_pin: string | null
  estimated_preparation_time: number | null
}

const route = useRoute()
const router = useRouter()
const cartStore = useOnlineCartStore()
const otpAuthStore = useOtpAuthStore()
const addressStore = useAddressStore()

const tenantSlug = computed(() => route.params.tenant as string)

// Step state machine
type CheckoutStep = 'review' | 'email_input' | 'otp_sent' | 'placing_order' | 'success'
const step = ref<CheckoutStep>('review')

// OTP state
const phone = ref('')
const email = ref('')
const otpCode = ref('')
const hasOtpError = ref(false)
const otpErrorMessage = ref('Código incorrecto')
const otpInputRef = ref<InstanceType<typeof OTPInput> | null>(null)

// Customer validation state
const customerValidationError = ref('')
const customerWarnings = ref<string[]>([])

// Order state
const checkoutError = ref('')
const confirmedOrder = ref<ConfirmedOrder | null>(null)

// Countdown timer (reactive wrapper around store getter)
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

const selectedAddress = computed(() => addressStore.pendingAddress)

const deliveryFee = computed(() => {
  if (cartStore.orderType === 'delivery') {
    return cartStore.subtotal >= 50000 ? 0 : 5000
  }
  return 0
})

const total = computed(() => {
  return cartStore.subtotal + deliveryFee.value
})

const isPhoneValid = computed(() => /^3\d{9}$/.test(phone.value))

const isEmailValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)
}

const getOrderTypeIcon = (type: string) => {
  const icons = {
    delivery: '🚗',
    pickup: '🏪',
    'dine-in': '🍽️',
  }
  return icons[type as keyof typeof icons] || '📦'
}

const getOrderTypeLabel = (type: string) => {
  const labels = {
    delivery: 'Domicilio',
    pickup: 'Recoger en Tienda',
    'dine-in': 'Comer en el Restaurante',
  }
  return labels[type as keyof typeof labels] || type
}

const formatScheduledTime = (isoString: string) => {
  const date = new Date(isoString)
  return date.toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// OTP handlers
const handleSendOTP = async () => {
  if (!isPhoneValid.value || !isEmailValid.value || !cartStore.cartId) return

  customerValidationError.value = ''
  customerWarnings.value = []

  try {
    const validation = await otpAuthStore.validateCustomer(phone.value, total.value)

    if (!validation.can_order) {
      customerValidationError.value = validation.reason || 'No puedes realizar este pedido.'
      return
    }

    customerWarnings.value = validation.warnings

    await otpAuthStore.sendOTP(email.value, cartStore.cartId)
    step.value = 'otp_sent'
  } catch (error: any) {
    customerValidationError.value = error.message || 'Error al validar. Intenta de nuevo.'
  }
}

const handleVerifyOTP = async (code: string) => {
  otpCode.value = code
  await placeOrder()
}

const handleManualVerify = async () => {
  if (!otpCode.value) return
  await placeOrder()
}

const handleResendOTP = async () => {
  if (!otpAuthStore.canResendOtp || !cartStore.cartId) return

  try {
    await otpAuthStore.resendOTP(email.value, cartStore.cartId)
    hasOtpError.value = false
    otpInputRef.value?.clear()
  } catch (error: any) {
    alert(error.message || 'Error al reenviar código')
  }
}

const clearOtpError = () => {
  hasOtpError.value = false
  checkoutError.value = ''
}

const changeEmail = () => {
  step.value = 'email_input'
  otpCode.value = ''
  hasOtpError.value = false
  checkoutError.value = ''
  customerValidationError.value = ''
  customerWarnings.value = []
}

// Place order: verify OTP → persist address → update delivery → POST /checkout
const placeOrder = async () => {
  if (!otpCode.value || !cartStore.cartId) return

  step.value = 'placing_order'
  checkoutError.value = ''

  try {
    // 1. Verify OTP
    await otpAuthStore.verifyOTP(email.value, cartStore.cartId, otpCode.value)

    // 2. Persist address and update delivery info (delivery orders only)
    if (cartStore.orderType === 'delivery') {
      const addressId = await addressStore.persistPendingAddress(otpAuthStore.customerId!)
      if (addressId) {
        await cartStore.updateDeliveryInfo({
          order_type: 'delivery',
          delivery_address_id: addressId,
        })
      }
    }

    // 3. POST /checkout
    const response = await $fetch<{ success: boolean; data: ConfirmedOrder }>(
      `/api/online/cart/${cartStore.cartId}/checkout`,
      { method: 'POST' }
    )

    confirmedOrder.value = response.data
    step.value = 'success'
  } catch (error: any) {
    if (error.status === 409) {
      // Already checked out (double-submit) — treat as success
      step.value = 'success'
      return
    }

    // OTP error vs checkout error
    const message = error.data?.detail || error.message || 'Error al confirmar pedido'
    hasOtpError.value = true
    otpErrorMessage.value = message
    checkoutError.value = message
    otpInputRef.value?.clear()
    otpCode.value = ''
    step.value = 'otp_sent'
  }
}

const goToHome = () => {
  cartStore.reset()
  otpAuthStore.logout()
  addressStore.reset()
  router.push(`/${tenantSlug.value}`)
}

const goBack = () => {
  router.push(`/${tenantSlug.value}/checkout/delivery`)
}
</script>

<style scoped>
.confirm-page {
  min-height: 100vh;
  background: #f9fafb;
  padding: 20px;
}

.confirm-container {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 16px;
}

.back-btn:hover {
  background: #f3f4f6;
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  color: #111827;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.confirm-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
}

.order-type-display,
.address-display {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.type-icon,
.address-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.type-label {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.type-desc {
  font-size: 14px;
  color: #6b7280;
}

.address-info {
  flex: 1;
}

.address-line {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.address-line2,
.address-city {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 2px;
}

.address-notes {
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
}

.time-display,
.instructions-display {
  font-size: 15px;
  color: #374151;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.item-quantity {
  font-size: 15px;
  font-weight: 700;
  color: #667eea;
  min-width: 32px;
}

.item-details {
  flex: 1;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.item-modifiers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.modifier {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 3px 8px;
  border-radius: 10px;
}

.item-notes {
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  margin-top: 4px;
}

.item-price {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.summary-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
}

.summary-line span:first-child {
  color: #6b7280;
}

.summary-line span:last-child {
  color: #111827;
  font-weight: 500;
}

.free-badge {
  background: #10b981;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
}

.summary-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.total-line {
  font-size: 18px;
  font-weight: 700;
}

.total-line span {
  color: #111827 !important;
}

.total-line span:last-child {
  color: #667eea !important;
  font-size: 20px;
}

.payment-info {
  text-align: center;
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
  color: #92400e;
  font-size: 15px;
}

/* Action section (steps) */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.otp-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.otp-card-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.otp-icon-circle {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.otp-card-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
}

.otp-card-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
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
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.change-email-btn {
  font-size: 13px;
  color: #667eea;
  background: none;
  border: none;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.timer-display {
  font-size: 14px;
  color: #f59e0b;
  font-weight: 600;
  text-align: center;
}

.otp-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-alert {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 14px;
  text-align: center;
}

.warnings-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.warning-item {
  padding: 10px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  color: #92400e;
  font-size: 13px;
}

.placing-section {
  background: white;
  border-radius: 12px;
  padding: 48px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  align-items: center;
  justify-content: center;
}

.placing-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.placing-text {
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
  margin: 0;
  text-align: center;
}

.btn {
  padding: 18px 32px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
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
  padding: 10px;
  font-size: 14px;
  box-shadow: none;
}

.btn-link:hover:not(:disabled) {
  background: #f0f4ff;
}

.terms-text {
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}

/* Success Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.success-modal {
  background: white;
  border-radius: 20px;
  padding: 48px 32px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  animation: scaleIn 0.5s ease-out;
}

.modal-title {
  font-size: 28px;
  font-weight: 800;
  color: #111827;
  margin: 0 0 16px 0;
}

.order-number {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 24px;
}

.order-number strong {
  color: #111827;
  font-size: 18px;
}

.pickup-pin-display {
  background: #fef3c7;
  border: 2px solid #fbbf24;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.pin-label {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 12px;
}

.pin-code {
  font-size: 36px;
  font-weight: 800;
  color: #7c2d12;
  letter-spacing: 4px;
  margin-bottom: 8px;
}

.pin-desc {
  font-size: 13px;
  color: #92400e;
  margin: 0;
}

.success-message {
  margin-bottom: 24px;
}

.success-message p {
  font-size: 16px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Mobile styles */
@media (max-width: 640px) {
  .page-title {
    font-size: 24px;
  }

  .success-modal {
    padding: 32px 24px;
  }

  .modal-title {
    font-size: 24px;
  }

  .pin-code {
    font-size: 28px;
  }

  .otp-card-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>
