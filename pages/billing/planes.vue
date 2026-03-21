<template>
  <div class="page-layout">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-sm text-error mb-3">Error al cargar los planes</p>
        <button @click="refresh" class="text-sm text-primary hover:underline">
          Intentar de nuevo
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="space-y-8">
      <!-- Header -->
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-bold text-text-primary">Elige tu plan</h1>
        <p class="text-sm text-text-secondary">
          Sin permanencia. Cancela cuando quieras.
        </p>
      </div>

      <!-- Billing cycle toggle -->
      <div class="flex justify-center">
        <div class="bg-surface-alt border border-border rounded-xl p-1 flex gap-1">
          <button
            @click="isAnnual = false"
            :class="[
              'px-5 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
              !isAnnual
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            ]"
          >
            Mensual
          </button>
          <button
            @click="isAnnual = true"
            :class="[
              'px-5 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
              isAnnual
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            ]"
          >
            Anual
            <span class="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
              Ahorra
            </span>
          </button>
        </div>
      </div>

      <!-- Plans grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div
          v-for="plan in activePlans"
          :key="plan.id"
          class="bg-surface border border-border rounded-2xl p-6 space-y-5 flex flex-col"
        >
          <!-- Plan name & price -->
          <div class="space-y-1">
            <h2 class="text-lg font-bold text-text-primary">{{ plan.name }}</h2>
            <p v-if="plan.description" class="text-sm text-text-secondary leading-relaxed">
              {{ plan.description }}
            </p>
          </div>

          <div class="space-y-1">
            <div class="flex items-end gap-1">
              <span class="text-3xl font-bold text-text-primary">
                {{ formatPrice(isAnnual ? plan.price_annual : plan.price_monthly) }}
              </span>
              <span class="text-sm text-text-secondary mb-1">
                / {{ isAnnual ? 'año' : 'mes' }}
              </span>
            </div>
            <p v-if="isAnnual && savings(plan) > 0" class="text-sm text-green-600 font-medium">
              Ahorras {{ formatPrice(savings(plan)) }} al año
            </p>
          </div>

          <!-- Features -->
          <ul class="space-y-2 flex-1">
            <li class="flex items-center gap-2 text-sm text-text-secondary">
              <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ plan.scan_limit.toLocaleString('es-CO') }} escaneos/mes
            </li>
            <li
              v-for="(value, key) in plan.features"
              :key="String(key)"
              class="flex items-center gap-2 text-sm text-text-secondary"
            >
              <svg class="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ value }}
            </li>
          </ul>

          <!-- CTA -->
          <NuxtLink
            :to="`/billing/checkout?plan_id=${plan.id}&cycle=${isAnnual ? 'annual' : 'monthly'}`"
            class="btn-primary px-4 py-3 rounded-xl text-sm font-semibold text-center block min-h-[44px] flex items-center justify-center"
          >
            Seleccionar plan
          </NuxtLink>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="activePlans.length === 0" class="text-center py-16">
        <p class="text-text-secondary text-sm">No hay planes disponibles en este momento.</p>
      </div>

      <!-- Back link -->
      <div class="text-center">
        <NuxtLink to="/billing" class="text-sm text-text-secondary hover:text-text-primary">
          ← Volver a mi suscripción
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBilling } from '~/composables/useBilling'

definePageMeta({ layout: 'dashboard' })

const { plans, fetchPlans } = useBilling()

const isAnnual = ref(false)

const { pending: isLoading, error: fetchError, refresh } = useAsyncData(
  'billing-plans',
  () => fetchPlans(),
  { server: false }
)

const activePlans = computed(() => plans.value.filter(p => p.is_active))

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function savings(plan: { price_monthly: number; price_annual: number }): number {
  return plan.price_monthly * 12 - plan.price_annual
}
</script>
