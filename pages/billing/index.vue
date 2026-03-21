<template>
  <div class="page-layout">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center space-y-3">
        <p class="text-sm text-error">Error al cargar tu suscripción</p>
        <button @click="refresh" class="text-sm text-primary hover:underline">
          Intentar de nuevo
        </button>
      </div>
    </div>

    <div v-else class="space-y-6 max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold text-text-primary">Facturación</h1>

      <!-- No subscription -->
      <div v-if="!subscription" class="bg-surface border border-border rounded-2xl p-8 text-center space-y-5">
        <div class="flex justify-center">
          <div class="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center">
            <svg class="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-text-primary">Sin suscripción activa</h2>
          <p class="text-sm text-text-secondary leading-relaxed">
            Activa un plan para desbloquear escaneos de facturas con IA y todas las funciones de WARO.
          </p>
        </div>
        <NuxtLink
          to="/billing/planes"
          class="btn-primary px-6 py-3 rounded-xl text-sm font-semibold inline-block min-h-[44px] flex items-center justify-center"
        >
          Ver planes disponibles
        </NuxtLink>
      </div>

      <!-- Active subscription -->
      <div v-else class="space-y-4">
        <!-- Status card -->
        <div class="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <!-- Status badge -->
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-text-primary">{{ subscription.plan_name }}</h2>
            <span :class="statusBadgeClass">{{ statusLabel }}</span>
          </div>

          <!-- Details -->
          <div class="space-y-3">
            <div class="flex justify-between items-center text-sm">
              <span class="text-text-secondary">Ciclo de pago</span>
              <span class="font-medium text-text-primary">
                {{ subscription.billing_cycle === 'annual' ? 'Anual' : 'Mensual' }}
              </span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-text-secondary">Próxima renovación</span>
              <span class="font-medium text-text-primary">{{ formatDate(subscription.current_period_end) }}</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-text-secondary">Límite de escaneos</span>
              <span class="font-medium text-text-primary">{{ subscription.plan_name }}</span>
            </div>
          </div>

          <!-- Scan usage progress -->
          <div v-if="accessStatus" class="space-y-2">
            <div class="flex justify-between items-center text-sm">
              <span class="text-text-secondary">Uso este período</span>
            </div>
            <!-- Minimal progress bar — actual numbers come from usage endpoint (future) -->
            <div class="h-2 bg-surface-alt rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full" style="width: 0%" />
            </div>
            <p v-if="accessStatus.level === 'full_with_warning'" class="text-sm text-yellow-600">
              ⚠️ {{ accessStatus.message }}
            </p>
            <p v-else-if="accessStatus.level === 'read_only'" class="text-sm text-orange-600">
              ⚠️ {{ accessStatus.message }}
            </p>
            <p v-else-if="accessStatus.level === 'blocked'" class="text-sm text-error">
              🚫 {{ accessStatus.message }}
            </p>
          </div>

          <!-- Pending checkout link -->
          <div v-if="subscription.status === 'pending' && subscription.checkout_url" class="pt-2">
            <a
              :href="subscription.checkout_url"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full btn-primary px-4 py-3 rounded-xl text-sm font-semibold text-center block min-h-[44px] flex items-center justify-center"
            >
              Completar pago en MercadoPago →
            </a>
          </div>

          <!-- Cancel button -->
          <div v-if="subscription.status === 'active' || subscription.status === 'pending'" class="pt-2 border-t border-border">
            <button
              @click="confirmCancel"
              :disabled="cancelling"
              class="w-full text-sm text-text-secondary hover:text-error py-2 transition-colors min-h-[44px]
                     disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="cancelling">Cancelando...</span>
              <span v-else>Cancelar suscripción</span>
            </button>
          </div>
        </div>

        <!-- Change plan link -->
        <div class="text-center">
          <NuxtLink to="/billing/planes" class="text-sm text-primary hover:underline">
            Ver otros planes
          </NuxtLink>
        </div>
      </div>

      <!-- Cancel confirm modal -->
      <div
        v-if="showCancelModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="showCancelModal = false"
      >
        <div class="bg-surface rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-xl">
          <h3 class="text-lg font-semibold text-text-primary">¿Cancelar suscripción?</h3>
          <p class="text-sm text-text-secondary leading-relaxed">
            Tu suscripción se cancelará al final del período actual.
            Perderás acceso a las funciones IA al vencimiento.
          </p>
          <div class="flex gap-3">
            <button
              @click="showCancelModal = false"
              class="flex-1 border border-border py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-surface-alt transition-colors min-h-[44px]"
            >
              Mantener
            </button>
            <button
              @click="handleCancel"
              :disabled="cancelling"
              class="flex-1 bg-error text-white py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px] disabled:opacity-50"
            >
              <span v-if="cancelling">Cancelando...</span>
              <span v-else>Sí, cancelar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBilling } from '~/composables/useBilling'

definePageMeta({ layout: 'dashboard' })

const toast = useToast()
const { subscription, accessStatus, fetchSubscription, fetchAccessStatus, cancelSubscription } = useBilling()

const showCancelModal = ref(false)
const cancelling = ref(false)

const { pending: isLoading, error: fetchError, refresh } = useAsyncData(
  'billing-index',
  async () => {
    await fetchSubscription()
    await fetchAccessStatus()
  },
  { server: false }
)

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    active: 'Activa',
    pending: 'Pendiente de pago',
    past_due: 'Pago vencido',
    cancelled: 'Cancelada',
    expired: 'Expirada',
  }
  return map[subscription.value?.status ?? ''] ?? subscription.value?.status ?? ''
})

const statusBadgeClass = computed(() => {
  const base = 'text-xs font-semibold px-2.5 py-1 rounded-full'
  const map: Record<string, string> = {
    active: `${base} bg-green-100 text-green-700`,
    pending: `${base} bg-yellow-100 text-yellow-700`,
    past_due: `${base} bg-orange-100 text-orange-700`,
    cancelled: `${base} bg-surface-alt text-text-secondary`,
    expired: `${base} bg-surface-alt text-text-secondary`,
  }
  return map[subscription.value?.status ?? ''] ?? `${base} bg-surface-alt text-text-secondary`
})

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

function confirmCancel() {
  showCancelModal.value = true
}

async function handleCancel() {
  cancelling.value = true
  const ok = await cancelSubscription()
  cancelling.value = false
  showCancelModal.value = false

  if (ok) {
    toast.add({ title: 'Suscripción cancelada', color: 'orange' })
    await refresh()
  } else {
    toast.add({ title: 'No se pudo cancelar. Intenta de nuevo.', color: 'red' })
  }
}
</script>
