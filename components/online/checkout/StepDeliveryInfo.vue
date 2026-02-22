<template>
  <div class="space-y-6">
    <!-- Address Section (delivery only) -->
    <div v-if="cartStore.orderType === 'delivery'">
      <h4 class="text-base font-semibold text-foreground mb-4">Dirección de entrega</h4>

      <!-- Returning customer: readonly address list from preview -->
      <div v-if="addressStore.hasAddresses">
        <AddressSelector
          :addresses="addressStore.addresses"
          :selected-id="addressStore.selectedAddressId"
          :readonly="true"
          @select="addressStore.selectAddress($event)"
        />
      </div>

      <!-- New customer: address form -->
      <template v-else>
        <div
          v-if="addressFormValid"
          class="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm font-medium"
        >
          <Icon name="heroicons:check-circle" class="w-4 h-4 flex-shrink-0" />
          Dirección guardada — puedes continuar
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
      <Icon
        v-if="cartStore.orderType === 'pickup'"
        name="heroicons:building-storefront"
        class="w-10 h-10 text-foreground"
      />
      <Icon v-else name="heroicons:table-cells" class="w-10 h-10 text-foreground" />
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

      <div class="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          class="flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left"
          :class="!isScheduled
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground hover:border-primary/50'"
          @click="isScheduled = false"
        >
          <Icon name="heroicons:bolt" class="w-7 h-7 flex-shrink-0" />
          <div>
            <p class="font-semibold text-sm">Lo antes posible</p>
            <p class="text-xs mt-0.5" :class="!isScheduled ? 'text-primary/80' : 'text-muted-foreground'">
              30–45 minutos
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
          <Icon name="heroicons:calendar" class="w-7 h-7 flex-shrink-0" />
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
            class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            :min="minDate"
          />
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-foreground">Hora</label>
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
import type { AddressCreate } from '~/stores/address'
import AddressForm from '~/components/online/AddressForm.vue'
import AddressSelector from '~/components/online/AddressSelector.vue'

const cartStore = useOnlineCartStore()
const addressStore = useAddressStore()

// Address form state (new customer path)
const addressFormValid = ref(false)

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

// ── Exposed interface for wizard page ─────────────────────────────────────

const isValid = computed(() => {
  if (cartStore.orderType === 'delivery') {
    if (addressStore.hasAddresses) return !!addressStore.selectedAddressId
    if (!addressFormValid.value) return false
  }
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
