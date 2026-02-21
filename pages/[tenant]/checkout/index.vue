<template>
  <div class="py-8 px-4">
    <CheckoutWizard
      :steps="steps"
      :current-step="currentStep"
      :can-continue="canContinue"
      :is-submitting="isSubmitting"
      @next="handleNext"
      @prev="handlePrev"
      @submit="handleSubmit"
    >
      <template #step-0>
        <StepOrderType />
      </template>

      <template #step-1>
        <StepEmail ref="stepEmailRef" />
      </template>

      <template #step-2>
        <StepDeliveryInfo ref="stepDeliveryRef" />
      </template>

      <template #step-3>
        <StepIdentity ref="stepIdentityRef" @verified="handleVerified" />
      </template>

      <template #step-4>
        <StepConfirm ref="stepConfirmRef" @success="handleSuccess" />
      </template>
    </CheckoutWizard>
  </div>
</template>

<script setup lang="ts">
import CheckoutWizard from '~/components/online/CheckoutWizard.vue'
import StepOrderType from '~/components/online/checkout/StepOrderType.vue'
import StepEmail from '~/components/online/checkout/StepEmail.vue'
import StepDeliveryInfo from '~/components/online/checkout/StepDeliveryInfo.vue'
import StepIdentity from '~/components/online/checkout/StepIdentity.vue'
import StepConfirm from '~/components/online/checkout/StepConfirm.vue'
import { useOnlineCartStore } from '~/stores/online_cart'
import { useOtpAuthStore } from '~/stores/otp_auth'
import { useAddressStore } from '~/stores/address'

definePageMeta({
  layout: 'public-restaurant',
})

const route = useRoute()
const router = useRouter()
const cartStore = useOnlineCartStore()
const otpAuthStore = useOtpAuthStore()
const addressStore = useAddressStore()

const tenantSlug = computed(() => route.params.tenant as string)

// Guard: redirect home if cart is empty
onMounted(() => {
  if (cartStore.isEmpty) {
    router.push(`/${tenantSlug.value}`)
  }
})

// ── Wizard steps definition ───────────────────────────────────────────────

const steps = [
  { title: 'Order type',      description: 'How would you like it?' },
  { title: 'Email',           description: 'Confirmation & address lookup' },
  { title: 'Delivery info',   description: 'Address & schedule' },
  { title: 'Verify identity', description: 'Confirm with OTP' },
  { title: 'Review & confirm', description: 'Place your order' },
]

const currentStep = ref(0)

// ── Step template refs ────────────────────────────────────────────────────

const stepEmailRef    = ref<{ isValid: boolean; onNext: () => Promise<void> } | null>(null)
const stepDeliveryRef = ref<{ isValid: boolean; buildDeliveryInfo: () => Record<string, unknown> } | null>(null)
const stepIdentityRef = ref<{ isValid: boolean } | null>(null)
const stepConfirmRef  = ref<{ isValid: boolean; isSubmitting: { value: boolean }; submitOrder: () => Promise<void> } | null>(null)

// ── canContinue ───────────────────────────────────────────────────────────

const canContinue = computed(() => {
  if (currentStep.value === 0) return true
  if (currentStep.value === 1) return stepEmailRef.value?.isValid ?? false
  if (currentStep.value === 2) return stepDeliveryRef.value?.isValid ?? false
  if (currentStep.value === 3) return stepIdentityRef.value?.isValid ?? false
  if (currentStep.value === 4) return stepConfirmRef.value?.isValid ?? false
  return false
})

const isSubmitting = computed(() => stepConfirmRef.value?.isSubmitting.value ?? false)

// ── Step transition handlers ──────────────────────────────────────────────

const handleNext = async () => {
  // Step 1 (Email): fetch address preview before advancing
  if (currentStep.value === 1 && stepEmailRef.value) {
    await stepEmailRef.value.onNext()
  }

  // Step 2 (Delivery): save time + instructions to cart
  if (currentStep.value === 2 && stepDeliveryRef.value) {
    const info = stepDeliveryRef.value.buildDeliveryInfo() as {
      scheduled_time?: string
      delivery_instructions?: string
    }
    await cartStore.updateDeliveryInfo({
      order_type: cartStore.orderType,
      ...info,
    })
  }

  currentStep.value++
}

const handlePrev = () => {
  currentStep.value--
}

const handleSubmit = async () => {
  await stepConfirmRef.value?.submitOrder()
}

const handleVerified = () => {
  // Auto-advance from identity step to confirm step
  currentStep.value++
}

const handleSuccess = () => {
  cartStore.reset()
  otpAuthStore.logout()
  addressStore.reset()
  router.push(`/${tenantSlug.value}`)
}
</script>
