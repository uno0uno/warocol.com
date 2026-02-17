<template>
  <div class="delivery-page">
    <div class="delivery-container">
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

        <h1 class="page-title">Información de Entrega</h1>
      </div>

      <!-- Content -->
      <div class="delivery-content">
        <!-- Address Section (only for delivery) -->
        <div v-if="cartStore.orderType === 'delivery'" class="section">
          <div v-if="!showAddressForm">
            <AddressSelector
              :addresses="addressStore.addresses"
              :selected-id="addressStore.selectedAddressId"
              @select="handleSelectAddress"
              @edit="handleEditAddress"
              @delete="handleDeleteAddress"
              @add-new="showAddressForm = true"
            />
          </div>

          <div v-else>
            <AddressForm
              :address="editingAddress"
              :loading="addressStore.isLoading"
              @submit="handleSaveAddress"
              @cancel="cancelAddressForm"
            />
          </div>
        </div>

        <!-- Pickup/Dine-in Info -->
        <div v-else class="section">
          <div class="info-box">
            <div class="info-icon">
              {{ cartStore.orderType === 'pickup' ? '🏪' : '🍽️' }}
            </div>
            <h3>{{ cartStore.orderType === 'pickup' ? 'Recoger en Tienda' : 'Comer en el Restaurante' }}</h3>
            <p>
              {{ cartStore.orderType === 'pickup'
                ? 'Recibirás un PIN cuando confirmes tu pedido'
                : 'Puedes hacer tu pedido desde la mesa' }}
            </p>
          </div>
        </div>

        <!-- Scheduled Time -->
        <div class="section">
          <h3 class="section-title">¿Cuándo lo necesitas?</h3>

          <div class="time-options">
            <button
              class="time-option"
              :class="{ active: !isScheduled }"
              @click="isScheduled = false"
            >
              <div class="option-icon">⚡</div>
              <div class="option-content">
                <div class="option-label">Lo antes posible</div>
                <div class="option-desc">30-45 minutos</div>
              </div>
            </button>

            <button
              class="time-option"
              :class="{ active: isScheduled }"
              @click="isScheduled = true"
            >
              <div class="option-icon">📅</div>
              <div class="option-content">
                <div class="option-label">Programar</div>
                <div class="option-desc">Elige fecha y hora</div>
              </div>
            </button>
          </div>

          <!-- Scheduled Time Picker -->
          <div v-if="isScheduled" class="scheduled-picker">
            <div class="form-group">
              <label for="scheduled_date" class="form-label">Fecha</label>
              <input
                id="scheduled_date"
                v-model="scheduledDate"
                type="date"
                class="form-input"
                :min="minDate"
              />
            </div>

            <div class="form-group">
              <label for="scheduled_time" class="form-label">Hora</label>
              <input
                id="scheduled_time"
                v-model="scheduledTime"
                type="time"
                class="form-input"
              />
            </div>
          </div>
        </div>

        <!-- Delivery Instructions -->
        <div class="section">
          <h3 class="section-title">Instrucciones adicionales (opcional)</h3>
          <textarea
            v-model="deliveryInstructions"
            class="form-textarea"
            placeholder="Ej: Sin cebolla, bien cocido, etc."
            rows="3"
            maxlength="300"
          ></textarea>
          <span class="char-count">{{ deliveryInstructions.length }}/300</span>
        </div>

        <!-- Order Summary -->
        <div class="section">
          <CartSummary
            :subtotal="cartStore.subtotal"
            :item-count="cartStore.itemCount"
            :order-type="cartStore.orderType"
            :delivery-fee="deliveryFee"
            :show-checkout-button="false"
          />
        </div>

        <!-- Continue Button -->
        <button
          class="btn btn-primary btn-large"
          @click="handleContinue"
          :disabled="!canContinue || isLoading"
        >
          <span v-if="!isLoading">Continuar a Confirmación</span>
          <span v-else>Guardando...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOnlineCartStore } from '~/stores/online_cart'
import { useAuthStore } from '~/stores/auth'
import { useAddressStore } from '~/stores/address'
import type { Address, AddressCreate } from '~/stores/address'
import AddressSelector from '~/components/online/AddressSelector.vue'
import AddressForm from '~/components/online/AddressForm.vue'
import CartSummary from '~/components/online/CartSummary.vue'

definePageMeta({
  layout: 'public-restaurant',
})

const route = useRoute()
const router = useRouter()
const cartStore = useOnlineCartStore()
const authStore = useAuthStore()
const addressStore = useAddressStore()

const tenantSlug = computed(() => route.params.tenant as string)

// Redirect if not verified
if (!authStore.isVerified) {
  router.push(`/${tenantSlug.value}/checkout/otp`)
}

// Load addresses
if (authStore.customerId) {
  addressStore.fetchAddresses(authStore.customerId)
}

// Address form state
const showAddressForm = ref(false)
const editingAddress = ref<Address | null>(null)

// Schedule state
const isScheduled = ref(false)
const scheduledDate = ref('')
const scheduledTime = ref('')

// Instructions
const deliveryInstructions = ref('')

// Loading
const isLoading = ref(false)

// Min date (today)
const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

// Mock delivery fee
const deliveryFee = computed(() => {
  if (cartStore.orderType === 'delivery') {
    return cartStore.subtotal >= 50000 ? 0 : 5000
  }
  return 0
})

const canContinue = computed(() => {
  // For delivery, must have selected address
  if (cartStore.orderType === 'delivery') {
    return !!addressStore.selectedAddressId
  }
  return true
})

const handleSelectAddress = (addressId: string) => {
  addressStore.selectAddress(addressId)
}

const handleEditAddress = (addressId: string) => {
  const address = addressStore.addresses.find(a => a.id === addressId)
  if (address) {
    editingAddress.value = address
    showAddressForm.value = true
  }
}

const handleDeleteAddress = async (addressId: string) => {
  if (confirm('¿Estás seguro de eliminar esta dirección?')) {
    try {
      await addressStore.deleteAddress(addressId)
    } catch (error) {
      alert('Error al eliminar dirección')
    }
  }
}

const handleSaveAddress = async (data: AddressCreate) => {
  if (!authStore.customerId) return

  try {
    if (editingAddress.value) {
      // Update existing
      await addressStore.updateAddress(editingAddress.value.id, data)
    } else {
      // Create new
      const newAddress = await addressStore.createAddress(authStore.customerId, data)
      if (newAddress) {
        addressStore.selectAddress(newAddress.id)
      }
    }

    cancelAddressForm()
  } catch (error) {
    alert('Error al guardar dirección')
  }
}

const cancelAddressForm = () => {
  showAddressForm.value = false
  editingAddress.value = null
}

const handleContinue = async () => {
  if (!canContinue.value) return

  isLoading.value = true

  try {
    // Build scheduled time string
    let scheduledTimeStr = null
    if (isScheduled.value && scheduledDate.value && scheduledTime.value) {
      scheduledTimeStr = `${scheduledDate.value}T${scheduledTime.value}:00`
    }

    // Update delivery info
    await cartStore.updateDeliveryInfo({
      order_type: cartStore.orderType,
      delivery_address_id: addressStore.selectedAddressId || undefined,
      scheduled_time: scheduledTimeStr || undefined,
      delivery_instructions: deliveryInstructions.value || undefined,
    })

    // Navigate to confirmation
    router.push(`/${tenantSlug.value}/checkout/confirm`)
  } catch (error) {
    alert('Error al guardar información')
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push(`/${tenantSlug.value}/checkout/otp`)
}
</script>

<style scoped>
.delivery-page {
  min-height: 100vh;
  background: #f9fafb;
  padding: 20px;
}

.delivery-container {
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
  margin: 0;
}

.delivery-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
}

.info-box {
  text-align: center;
  padding: 24px;
}

.info-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.info-box h3 {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
}

.info-box p {
  color: #6b7280;
  margin: 0;
}

.time-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.time-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.time-option:hover {
  border-color: #667eea;
}

.time-option.active {
  border-color: #667eea;
  background: #f0f4ff;
}

.option-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.option-content {
  flex: 1;
}

.option-label {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.option-desc {
  font-size: 13px;
  color: #6b7280;
}

.scheduled-picker {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding-top: 8px;
}

.form-group {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  color: #111827;
  background: white;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.btn {
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 700;
  border-radius: 12px;
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
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.btn-large {
  padding: 18px 32px;
}

/* Mobile styles */
@media (max-width: 640px) {
  .time-options {
    grid-template-columns: 1fr;
  }

  .scheduled-picker {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 24px;
  }
}
</style>
