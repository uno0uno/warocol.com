<script setup lang="ts">
import CheckoutWizard from '~/components/online/CheckoutWizard.vue'
import CartSummary from '~/components/online/CartSummary.vue'
import { useTableQrCheckout } from '~/composables/useTableQrCheckout'

definePageMeta({
  layout: 'public-restaurant',
  ssr: false,
})

const {
  tenantSlug,
  token,
  cartStore,
  paymentGroups,
  paymentSelection,
  isInitialLoading,
} = useTableQrCheckout()

const steps = [
  { title: 'Tu pedido', short: 'Pedido' },
  { title: 'Pago y notas', short: 'Confirmar' },
]

const currentStep = ref(0)
const isSubmitting = ref(false)
const checkoutError = ref('')
const customerNotes = ref('')
const submitted = ref(false)
const successMessage = ref('')
const successTableName = ref('')
const paymentError = ref('')

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price)

const canContinue = computed(() => {
  if (currentStep.value === 0) return !cartStore.isEmpty
  return !!paymentSelection.value.slug
})

const handleNext = () => {
  if (currentStep.value < steps.length - 1) currentStep.value++
}

const handlePrev = () => {
  if (currentStep.value > 0) currentStep.value--
}

const handleSubmit = async () => {
  paymentError.value = ''
  if (!paymentSelection.value.slug) {
    paymentError.value = 'Selecciona un método de pago.'
    return
  }
  const chosenGroup = paymentGroups.value.find(g => g.slug === paymentSelection.value.slug)
  if (chosenGroup?.methods?.length && !paymentSelection.value.id) {
    paymentError.value = `Elegí un método de ${chosenGroup.name}.`
    return
  }

  isSubmitting.value = true
  checkoutError.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: { message: string; table_name: string } }>(
      `/api/public/table-qr/${token.value}/requests`,
      {
        method: 'POST',
        body: {
          items: cartStore.buildSubmitItems(),
          payment_method: paymentSelection.value.slug,
          payment_method_id: paymentSelection.value.id,
          customer_notes: customerNotes.value.trim() || undefined,
        },
      },
    )
    successMessage.value = res.data?.message ?? 'Pedido recibido — el restaurante lo confirmará.'
    successTableName.value = res.data?.table_name ?? ''
    cartStore.clearCart()
    submitted.value = true
  } catch (err: any) {
    const detail = err?.data?.detail
    checkoutError.value = typeof detail === 'string'
      ? detail
      : detail?.message ?? err?.message ?? 'No se pudo enviar el pedido. Intenta de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="py-8 px-4 max-w-2xl mx-auto">
    <div v-if="isInitialLoading" class="min-h-[50vh] flex items-center justify-center">
      <CommonsTheCustomLoader size="large" />
    </div>

    <div v-else-if="submitted" class="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
      <div class="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-foreground mb-2">Pedido recibido</h1>
      <p class="text-muted-foreground mb-1">{{ successMessage }}</p>
      <p v-if="successTableName" class="text-sm text-muted-foreground mb-6">Mesa {{ successTableName }}</p>
      <NuxtLink
        :to="`/${tenantSlug}/mesa/${token}`"
        class="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold"
      >
        Volver al menú
      </NuxtLink>
    </div>

    <CheckoutWizard
      v-else
      :steps="steps"
      :current-step="currentStep"
      :can-continue="canContinue"
      :is-submitting="isSubmitting"
      @next="handleNext"
      @prev="handlePrev"
      @submit="handleSubmit"
    >
      <template #back-action>
        <NuxtLink
          :to="`/${tenantSlug}/mesa/${token}`"
          class="btn-secondary px-4 py-3 rounded-lg text-sm inline-flex items-center gap-1"
        >
          ← Menú
        </NuxtLink>
      </template>

      <template #step-0>
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-foreground">Revisa tu pedido</h2>
          <div class="rounded-xl border border-border divide-y divide-border overflow-hidden">
            <div
              v-for="item in cartStore.items"
              :key="item.id"
              class="flex items-start gap-3 px-4 py-3"
            >
              <span class="text-sm font-bold text-primary min-w-[2rem]">{{ item.quantity }}×</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">{{ item.product_name }}</p>
                <p v-if="item.modifiers.length" class="text-xs text-muted-foreground mt-1">
                  <span v-for="mod in item.modifiers" :key="mod.id">+ {{ mod.name }} </span>
                </p>
                <p v-if="item.notes" class="text-xs italic text-muted-foreground mt-1">{{ item.notes }}</p>
              </div>
              <p class="text-sm font-semibold">{{ formatPrice(item.total) }}</p>
            </div>
          </div>
          <CartSummary
            :subtotal="cartStore.subtotal"
            :item-count="cartStore.itemCount"
            order-type="dine-in"
            :show-checkout-button="false"
          />
        </div>
      </template>

      <template #step-1>
        <div class="space-y-5">
          <h2 class="text-lg font-semibold text-foreground">Confirmar pedido</h2>
          <p class="text-sm text-muted-foreground">
            El restaurante revisará tu pedido antes de prepararlo.
          </p>

          <div class="rounded-xl border border-border bg-card p-4">
            <p class="text-sm font-semibold mb-3">¿Cómo vas a pagar?</p>
            <PaymentsPaymentMethodSelector
              v-if="paymentGroups.length"
              v-model="paymentSelection"
              :groups="paymentGroups"
              exclude-cartera
              :disabled="isSubmitting"
            />
            <p v-else class="text-sm text-muted-foreground">No hay métodos de pago disponibles.</p>
            <p v-if="paymentError" class="mt-2 text-xs text-destructive">{{ paymentError }}</p>
          </div>

          <div>
            <label for="customer-notes" class="text-sm font-medium text-foreground block mb-1">
              Notas para el restaurante (opcional)
            </label>
            <textarea
              id="customer-notes"
              v-model="customerNotes"
              rows="3"
              class="w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Ej: sin cebolla, traer servilletas…"
            />
          </div>

          <div v-if="checkoutError" class="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {{ checkoutError }}
          </div>
        </div>
      </template>
    </CheckoutWizard>
  </div>
</template>
