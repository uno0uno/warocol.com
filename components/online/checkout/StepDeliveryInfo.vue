<template>
  <div class="space-y-6">
    <!-- Address Section (delivery only) -->
    <div v-if="cartStore.orderType === 'delivery'">
      <h4 class="text-base font-semibold text-foreground mb-4">Dirección de entrega</h4>

      <!-- Returning customer: address list with management -->
      <div v-if="addressStore.hasAddresses">
        <!-- Inline AddressForm (add / edit) -->
        <div v-if="showAddressForm" class="mb-4">
          <p
            v-if="addressFormError"
            class="mb-3 flex items-center gap-2 text-sm text-destructive"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {{ addressFormError }}
          </p>
          <AddressForm
            :address="editingAddress"
            :loading="addressFormLoading"
            @submit="handleSavedAddressFormSubmit"
            @cancel="cancelAddressForm"
          />
        </div>
        <AddressSelector
          v-else
          :addresses="addressStore.addresses"
          :selected-id="addressStore.selectedAddressId"
          :can-add="addressStore.addresses.length < 5"
          @select="addressStore.selectAddress($event)"
          @add-new="openAddForm"
          @edit="openEditForm"
          @delete="handleDeleteAddress"
        />
      </div>

      <!-- New customer: address form -->
      <template v-else>
        <div
          v-if="addressFormValid"
          class="flex items-center justify-between gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm font-medium"
        >
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Dirección guardada — puedes continuar
          </div>
          <button
            type="button"
            class="text-xs font-medium text-green-700 underline hover:text-green-900 flex-shrink-0"
            @click="addressFormValid = false"
          >
            Cambiar
          </button>
        </div>
        <AddressForm
          v-else
          :loading="false"
          @submit="handleAddressSubmit"
          @cancel="() => {}"
        />
      </template>
    </div>

    <!-- Pickup / Dine-in info box -->
    <div
      v-else
      class="flex flex-col items-center gap-2 p-6 rounded-xl border border-border bg-muted/30 text-center"
    >
      <svg v-if="cartStore.orderType === 'pickup'" class="w-10 h-10 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      <svg v-else class="w-10 h-10 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <p class="font-semibold text-foreground">
        {{ cartStore.orderType === 'pickup' ? 'Recoger en tienda' : 'En mesa' }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ cartStore.orderType === 'pickup'
          ? 'Recibirás un PIN cuando confirmes tu pedido'
          : 'Puedes hacer tu pedido directamente desde la mesa' }}
      </p>
    </div>

    <!-- Time preference -->
    <div>
      <h4 class="text-base font-semibold text-foreground mb-3">¿Cuándo lo necesitas?</h4>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4" role="radiogroup" aria-label="Hora del pedido">
        <button
          type="button"
          role="radio"
          :aria-checked="!isScheduled"
          class="flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left"
          :class="!isScheduled
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground hover:border-primary/50'"
          @click="isScheduled = false"
        >
          <svg class="w-7 h-7 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <p class="font-semibold text-sm">Lo antes posible</p>
            <p class="text-xs mt-0.5" :class="!isScheduled ? 'text-primary/80' : 'text-muted-foreground'">
              30–45 minutos
            </p>
          </div>
        </button>

        <button
          type="button"
          role="radio"
          :aria-checked="isScheduled"
          class="flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left"
          :class="isScheduled
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground hover:border-primary/50'"
          @click="isScheduled = true"
        >
          <svg class="w-7 h-7 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p class="font-semibold text-sm">Programar</p>
            <p class="text-xs mt-0.5" :class="isScheduled ? 'text-primary/80' : 'text-muted-foreground'">
              Elige fecha y hora
            </p>
          </div>
        </button>
      </div>

      <!-- Date & time pickers -->
      <div v-if="isScheduled" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1">
          <label class="block text-sm font-medium text-foreground">Fecha</label>
          <input
            v-model="scheduledDate"
            type="date"
            class="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            :min="minDate"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-foreground">Hora</label>
          <input
            v-model="scheduledTime"
            type="time"
            class="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>
      <p v-if="scheduledTimeError" class="text-sm text-destructive mt-2">{{ scheduledTimeError }}</p>
    </div>

    <!-- Instructions -->
    <div>
      <label class="block text-sm font-medium text-foreground mb-1">
        Instrucciones adicionales <span class="text-muted-foreground font-normal">(opcional)</span>
      </label>
      <textarea
        v-model="deliveryInstructions"
        class="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        placeholder="Ej: Sin cebolla, bien cocido, timbrar al portero..."
        rows="3"
        maxlength="300"
      />
      <p class="text-right text-xs text-muted-foreground mt-1">{{ deliveryInstructions.length }}/300</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOnlineCartStore } from '~/stores/online_cart'
import { useAddressStore } from '~/stores/address'
import { useOtpAuthStore } from '~/stores/otp_auth'
import type { AddressCreate, Address } from '~/stores/address'
import AddressForm from '~/components/online/AddressForm.vue'
import AddressSelector from '~/components/online/AddressSelector.vue'

const cartStore = useOnlineCartStore()
const addressStore = useAddressStore()
const otpAuthStore = useOtpAuthStore()

// Address form state (new customer path — pre-OTP pending address)
const addressFormValid = ref(false)

const handleAddressSubmit = (data: AddressCreate) => {
  addressStore.setPendingAddress(data)
  addressFormValid.value = true
}

// Address management (returning customer path — post-verification CRUD)
const showAddressForm = ref(false)
const editingAddress = ref<Address | null>(null)
const addressFormLoading = ref(false)
const addressFormError = ref<string | null>(null)

const openAddForm = () => {
  editingAddress.value = null
  addressFormError.value = null
  showAddressForm.value = true
}

const openEditForm = (addressId: string) => {
  editingAddress.value = addressStore.addresses.find(a => a.id === addressId) ?? null
  addressFormError.value = null
  showAddressForm.value = true
}

const cancelAddressForm = () => {
  showAddressForm.value = false
  editingAddress.value = null
  addressFormError.value = null
}

const handleSavedAddressFormSubmit = async (data: AddressCreate) => {
  if (!otpAuthStore.customerId) return
  addressFormLoading.value = true
  addressFormError.value = null
  try {
    if (editingAddress.value) {
      const updated = await addressStore.updateAddress(otpAuthStore.customerId, editingAddress.value.id, data)
      addressStore.selectAddress(updated.id)
    }
    else {
      const created = await addressStore.createAddress(otpAuthStore.customerId, data)
      addressStore.selectAddress(created.id)
    }
    showAddressForm.value = false
    editingAddress.value = null
  }
  catch (e: any) {
    addressFormError.value = e.message || 'Error al guardar la dirección'
  }
  finally {
    addressFormLoading.value = false
  }
}

const handleDeleteAddress = async (addressId: string) => {
  if (!otpAuthStore.customerId) return
  try {
    await addressStore.deleteAddress(otpAuthStore.customerId, addressId)
  }
  catch {
    // address list reflects actual DB state
  }
}

// Time picker
const isScheduled = ref(false)
const scheduledDate = ref('')
const scheduledTime = ref('')

const minDate = computed(() => new Date().toISOString().split('T')[0])

const scheduledTimeError = computed(() => {
  if (!isScheduled.value || !scheduledDate.value || !scheduledTime.value) return null
  const selected = new Date(`${scheduledDate.value}T${scheduledTime.value}:00`)
  const min = new Date()
  min.setMinutes(min.getMinutes() + 30)
  if (selected < min) return 'El horario debe ser al menos 30 minutos desde ahora'
  return null
})

// Instructions
const deliveryInstructions = ref('')

// ── Exposed interface for wizard page ─────────────────────────────────────

const isValid = computed(() => {
  if (cartStore.orderType === 'delivery') {
    if (addressStore.hasAddresses) {
      if (showAddressForm.value) return false
      return !!addressStore.selectedAddressId
    }
    if (!addressFormValid.value) return false
  }
  if (isScheduled.value) return !!scheduledDate.value && !!scheduledTime.value && !scheduledTimeError.value
  return true
})

const buildDeliveryInfo = () => ({
  scheduled_time: isScheduled.value && scheduledDate.value && scheduledTime.value
    ? new Date(`${scheduledDate.value}T${scheduledTime.value}:00`).toISOString()
    : undefined,
  delivery_instructions: deliveryInstructions.value || undefined,
})

defineExpose({ isValid, buildDeliveryInfo })
</script>
