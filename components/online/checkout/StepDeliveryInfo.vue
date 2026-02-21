<template>
  <div class="space-y-6">
    <!-- Address Section (delivery only) -->
    <div v-if="cartStore.orderType === 'delivery'">
      <h4 class="text-base font-semibold text-foreground mb-4">Delivery address</h4>

      <!-- Email lookup for returning customers -->
      <div v-if="previewAddresses.length === 0" class="mb-4">
        <label class="block text-sm font-medium text-foreground mb-1">
          Already a customer? Look up your saved addresses
        </label>
        <div class="flex gap-2 items-center">
          <input
            v-model="previewEmail"
            type="email"
            class="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="you@email.com"
            :disabled="previewLoading"
            @blur="lookupAddressesByEmail"
            @keyup.enter="lookupAddressesByEmail"
          />
          <div
            v-if="previewLoading"
            class="w-10 h-10 flex items-center justify-center border border-input rounded-md bg-muted"
          >
            <Icon name="heroicons:arrow-path" class="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        </div>
        <p v-if="previewChecked && previewAddresses.length === 0" class="text-xs text-muted-foreground mt-1">
          No saved addresses found for that email.
        </p>
      </div>

      <!-- Returning customer: readonly address list -->
      <div v-if="previewAddresses.length > 0">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium text-foreground">Your saved addresses</p>
          <button
            type="button"
            class="text-xs text-primary font-medium underline underline-offset-2 hover:text-primary/80"
            @click="clearPreview"
          >
            Use a different address
          </button>
        </div>
        <AddressSelector
          :addresses="previewAddresses"
          :selected-id="addressStore.selectedAddressId"
          :readonly="true"
          @select="addressStore.selectAddress($event)"
        />
      </div>

      <!-- Guest: address form -->
      <template v-if="previewAddresses.length === 0">
        <div
          v-if="addressFormValid"
          class="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm font-medium"
        >
          <Icon name="heroicons:check-circle" class="w-4 h-4 flex-shrink-0" />
          Address saved — you can continue
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
      <span class="text-5xl">{{ cartStore.orderType === 'pickup' ? '🏪' : '🍽️' }}</span>
      <p class="font-semibold text-foreground">
        {{ cartStore.orderType === 'pickup' ? 'Pick up at the store' : 'Order from your table' }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ cartStore.orderType === 'pickup'
          ? 'You will receive a PIN when your order is confirmed'
          : 'You can place your order directly from the table' }}
      </p>
    </div>

    <!-- Time preference -->
    <div>
      <h4 class="text-base font-semibold text-foreground mb-3">When do you need it?</h4>

      <div class="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          class="flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left"
          :class="!isScheduled
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground hover:border-primary/50'"
          @click="isScheduled = false"
        >
          <span class="text-3xl">⚡</span>
          <div>
            <p class="font-semibold text-sm">As soon as possible</p>
            <p class="text-xs mt-0.5" :class="!isScheduled ? 'text-primary/80' : 'text-muted-foreground'">
              30–45 minutes
            </p>
          </div>
        </button>

        <button
          type="button"
          class="flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left"
          :class="isScheduled
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground hover:border-primary/50'"
          @click="isScheduled = true"
        >
          <span class="text-3xl">📅</span>
          <div>
            <p class="font-semibold text-sm">Schedule</p>
            <p class="text-xs mt-0.5" :class="isScheduled ? 'text-primary/80' : 'text-muted-foreground'">
              Choose date and time
            </p>
          </div>
        </button>
      </div>

      <!-- Date & time pickers -->
      <div v-if="isScheduled" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1">
          <label class="block text-sm font-medium text-foreground">Date</label>
          <input
            v-model="scheduledDate"
            type="date"
            class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            :min="minDate"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-foreground">Time</label>
          <input
            v-model="scheduledTime"
            type="time"
            class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div>
      <label class="block text-sm font-medium text-foreground mb-1">
        Additional instructions <span class="text-muted-foreground font-normal">(optional)</span>
      </label>
      <textarea
        v-model="deliveryInstructions"
        class="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        placeholder="E.g. No onion, well done, ring the doorbell..."
        rows="3"
        maxlength="300"
      />
      <p class="text-right text-xs text-muted-foreground mt-1">{{ deliveryInstructions.length }}/300</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOnlineCartStore } from '~/stores/online_cart'
import { useAddressStore } from '~/stores/address'
import type { AddressCreate, Address } from '~/stores/address'
import AddressForm from '~/components/online/AddressForm.vue'
import AddressSelector from '~/components/online/AddressSelector.vue'

const cartStore = useOnlineCartStore()
const addressStore = useAddressStore()

// Address form state
const addressFormValid = ref(false)

// Pre-OTP email preview (local — no auth required)
const previewEmail = ref('')
const previewLoading = ref(false)
const previewAddresses = ref<Address[]>([])
const previewChecked = ref(false)

const isPreviewEmailValid = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(previewEmail.value),
)

const lookupAddressesByEmail = async () => {
  if (!isPreviewEmailValid.value || previewLoading.value) return
  previewLoading.value = true
  previewChecked.value = false
  try {
    const result = await $fetch<{ customer_id: string | null; addresses: Address[]; total: number }>(
      '/api/online/addresses/preview',
      { query: { email: previewEmail.value } },
    )
    previewAddresses.value = result.addresses
    previewChecked.value = true
    if (result.addresses.length > 0) {
      addressStore.addresses = result.addresses
      const defaultAddr = result.addresses.find(a => a.is_default) ?? result.addresses[0]
      addressStore.selectAddress(defaultAddr.id)
      addressFormValid.value = true
    }
  }
  catch {
    previewAddresses.value = []
    previewChecked.value = true
  }
  finally {
    previewLoading.value = false
  }
}

const clearPreview = () => {
  previewAddresses.value = []
  previewChecked.value = false
  previewEmail.value = ''
  addressStore.addresses = []
  addressStore.selectedAddressId = null
  addressFormValid.value = false
}

const handleAddressSubmit = (data: AddressCreate) => {
  addressStore.setPendingAddress(data)
  addressFormValid.value = true
}

// Time picker
const isScheduled = ref(false)
const scheduledDate = ref('')
const scheduledTime = ref('')

const minDate = computed(() => new Date().toISOString().split('T')[0])

// Instructions
const deliveryInstructions = ref('')

// ── Exposed interface for wizard page ──────────────────────────────────────
const isValid = computed(() => {
  if (cartStore.orderType === 'delivery' && !addressFormValid.value) return false
  if (isScheduled.value) return !!scheduledDate.value && !!scheduledTime.value
  return true
})

const buildDeliveryInfo = () => ({
  scheduled_time: isScheduled.value && scheduledDate.value && scheduledTime.value
    ? `${scheduledDate.value}T${scheduledTime.value}:00`
    : undefined,
  delivery_instructions: deliveryInstructions.value || undefined,
})

defineExpose({ isValid, buildDeliveryInfo })
</script>
