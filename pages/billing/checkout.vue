<template>
  <div class="page-layout">
    <!-- Loading plan details -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error loading plan -->
    <div v-else-if="fetchError || !selectedPlan" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center space-y-3">
        <p class="text-sm text-error">No se pudo cargar el plan seleccionado.</p>
        <NuxtLink to="/billing/planes" class="text-sm text-primary hover:underline">
          ← Volver a los planes
        </NuxtLink>
      </div>
    </div>

    <!-- Checkout card -->
    <div v-else class="max-w-md mx-auto space-y-6">
      <div class="text-center space-y-1">
        <h1 class="text-2xl font-bold text-text-primary">Confirmar suscripción</h1>
        <p class="text-sm text-text-secondary">Serás redirigido a MercadoPago para completar el pago</p>
      </div>

      <div class="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <!-- Plan summary -->
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm text-text-secondary">Plan</span>
            <span class="text-sm font-semibold text-text-primary">{{ selectedPlan.name }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-text-secondary">Ciclo</span>
            <span class="text-sm font-semibold text-text-primary">
              {{ cycle === 'annual' ? 'Anual' : 'Mensual' }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-text-secondary">Escaneos</span>
            <span class="text-sm font-semibold text-text-primary">
              {{ selectedPlan.scan_limit.toLocaleString('es-CO') }}/mes
            </span>
          </div>
          <div class="border-t border-border pt-3 flex justify-between items-center">
            <span class="text-sm font-semibold text-text-primary">Total</span>
            <span class="text-xl font-bold text-text-primary">
              {{ formatPrice(cycle === 'annual' ? selectedPlan.price_annual : selectedPlan.price_monthly) }}
              <span class="text-sm font-normal text-text-secondary">/ {{ cycle === 'annual' ? 'año' : 'mes' }}</span>
            </span>
          </div>
        </div>

        <!-- Subscribe button -->
        <button
          @click="handleSubscribe"
          :disabled="subscribing"
          class="w-full btn-primary px-4 py-3 rounded-xl text-sm font-semibold min-h-[44px]
                 flex items-center justify-center gap-2
                 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="subscribing" class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Procesando...
          </span>
          <span v-else>Ir a pagar con MercadoPago →</span>
        </button>

        <!-- Error -->
        <p v-if="subscribeError" class="text-sm text-error text-center">
          {{ subscribeError }}
        </p>

        <!-- Info note -->
        <p class="text-xs text-text-secondary text-center leading-relaxed">
          Al continuar, aceptas los términos del servicio. Tu suscripción se renovará automáticamente.
          Puedes cancelar en cualquier momento desde tu panel de facturación.
        </p>
      </div>

      <div class="text-center">
        <NuxtLink to="/billing/planes" class="text-sm text-text-secondary hover:text-text-primary">
          ← Cambiar plan
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBilling, type BillingPlan } from '~/composables/useBilling'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const toast = useToast()
const { plans, fetchPlans, subscribe } = useBilling()

const planId = computed(() => route.query.plan_id as string)
const cycle = computed<'monthly' | 'annual'>(() =>
  route.query.cycle === 'annual' ? 'annual' : 'monthly'
)

const subscribing = ref(false)
const subscribeError = ref<string | null>(null)

const { pending: isLoading, error: fetchError } = useAsyncData(
  'billing-checkout-plans',
  () => fetchPlans(),
  { server: false }
)

const selectedPlan = computed<BillingPlan | undefined>(() =>
  plans.value.find(p => p.id === planId.value)
)

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

async function handleSubscribe() {
  if (!planId.value) return
  subscribing.value = true
  subscribeError.value = null

  const result = await subscribe(planId.value, cycle.value)

  subscribing.value = false

  if (!result) {
    subscribeError.value = 'No se pudo iniciar la suscripción. Intenta de nuevo.'
    return
  }

  if (!result.checkout_url) {
    subscribeError.value = 'No se recibió la URL de pago. Contacta soporte.'
    return
  }

  toast.add({ title: 'Redirigiendo a MercadoPago...', color: 'green' })
  await navigateTo(result.checkout_url, { external: true })
}
</script>
