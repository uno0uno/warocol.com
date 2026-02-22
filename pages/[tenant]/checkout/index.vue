<template>
  <div class="py-8 px-4">
    <CheckoutWizard
      :steps="steps"
      :current-step="currentStep"
      :can-continue="canContinue && !isNavigating"
      :is-submitting="isOrderSubmitting"
      @next="handleNext"
      @prev="handlePrev"
      @submit="handleSubmit"
    >
      <template #back-action>
        <NuxtLink
          :to="`/${tenantSlug}`"
          class="btn-secondary px-4 sm:px-6 py-3 rounded-lg text-sm sm:text-base inline-flex items-center gap-1
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Carrito
        </NuxtLink>
      </template>

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
import { ref, computed } from 'vue'
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
  { title: 'Tipo de pedido',      short: 'Tipo' },
  { title: 'Correo',              short: 'Correo' },
  { title: 'Entrega',             short: 'Entrega' },
  { title: 'Verificar identidad', short: 'Identidad' },
  { title: 'Revisar y confirmar', short: 'Confirmar' },
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

const isNavigating = ref(false)
const isOrderSubmitting = ref(false)

// ── Step transition handlers ──────────────────────────────────────────────

const handleNext = async () => {
  isNavigating.value = true
  try {
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
  finally {
    isNavigating.value = false
  }
}

const handlePrev = () => {
  currentStep.value--
}

const handleSubmit = async () => {
  isOrderSubmitting.value = true
  try {
    await stepConfirmRef.value?.submitOrder()
  }
  finally {
    isOrderSubmitting.value = false
  }
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
