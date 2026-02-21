<template>
  <div class="space-y-5">

    <div class="text-center mb-2">
      <h4 class="text-base font-semibold text-foreground">Your email address</h4>
      <p class="text-sm text-muted-foreground mt-0.5">
        We'll send your order confirmation here and look up any saved addresses
      </p>
    </div>

    <div class="space-y-1">
      <label class="block text-sm font-medium text-foreground">Email</label>
      <input
        v-model="email"
        type="email"
        class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        placeholder="you@email.com"
        :disabled="isFetching"
        @keyup.enter="onNext"
      />
      <p v-if="email && !isEmailValid" class="text-xs text-destructive">
        Enter a valid email address
      </p>
    </div>

    <!-- Loading state while fetching address preview -->
    <div v-if="isFetching" class="flex items-center gap-2 p-3 rounded-md bg-muted/40 text-sm text-muted-foreground">
      <Icon name="heroicons:arrow-path" class="w-4 h-4 animate-spin flex-shrink-0" />
      Looking up saved addresses…
    </div>

    <!-- Preview result feedback -->
    <div v-else-if="previewDone && addressStore.hasAddresses" class="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm">
      <Icon name="heroicons:check-circle" class="w-4 h-4 flex-shrink-0" />
      {{ addressStore.addresses.length }} saved {{ addressStore.addresses.length === 1 ? 'address' : 'addresses' }} found
    </div>

    <div v-else-if="previewDone && !addressStore.hasAddresses" class="flex items-center gap-2 p-3 rounded-md bg-muted/40 text-sm text-muted-foreground">
      <Icon name="heroicons:map-pin" class="w-4 h-4 flex-shrink-0" />
      No saved addresses — you'll enter one in the next step
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOtpAuthStore } from '~/stores/otp_auth'
import { useAddressStore } from '~/stores/address'

const otpAuthStore = useOtpAuthStore()
const addressStore = useAddressStore()

const email = ref(otpAuthStore.email ?? '')
const isFetching = ref(false)
const previewDone = ref(false)

const isEmailValid = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value),
)

const isValid = computed(() => isEmailValid.value)

const onNext = async () => {
  if (!isEmailValid.value || isFetching.value) return

  isFetching.value = true
  previewDone.value = false

  // Store email so StepIdentity can use it pre-filled
  otpAuthStore.email = email.value

  await addressStore.previewByEmail(email.value)

  isFetching.value = false
  previewDone.value = true
}

defineExpose({ isValid, onNext })
</script>
