<template>
  <div class="page-layout">
    <div class="max-w-md mx-auto flex items-center justify-center min-h-[400px]">
      <!-- Approved -->
      <div v-if="isApproved" class="text-center space-y-5">
        <div class="flex justify-center">
          <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-text-primary">¡Suscripción activa!</h1>
          <p class="text-sm text-text-secondary leading-relaxed">
            Tu suscripción a WARO fue procesada exitosamente.
            Ya tienes acceso completo a todas las funciones.
          </p>
        </div>
        <NuxtLink to="/billing" class="btn-primary px-6 py-3 rounded-xl text-sm font-semibold inline-block min-h-[44px] flex items-center justify-center">
          Ver mi suscripción
        </NuxtLink>
      </div>

      <!-- Pending -->
      <div v-else-if="isPending" class="text-center space-y-5">
        <div class="flex justify-center">
          <div class="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-text-primary">Pago en proceso</h1>
          <p class="text-sm text-text-secondary leading-relaxed">
            Tu pago está siendo procesado por MercadoPago.
            Te avisaremos por email cuando se confirme. Esto puede tardar unos minutos.
          </p>
        </div>
        <NuxtLink to="/billing" class="border border-border px-6 py-3 rounded-xl text-sm font-semibold inline-block text-text-primary hover:bg-surface-alt transition-colors min-h-[44px] flex items-center justify-center">
          Ver estado de mi suscripción
        </NuxtLink>
      </div>

      <!-- Failure / other -->
      <div v-else class="text-center space-y-5">
        <div class="flex justify-center">
          <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-text-primary">Pago no completado</h1>
          <p class="text-sm text-text-secondary leading-relaxed">
            No pudimos procesar tu pago. Puede deberse a fondos insuficientes,
            datos de tarjeta incorrectos, o un rechazo de tu banco.
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <NuxtLink to="/billing/planes" class="btn-primary px-6 py-3 rounded-xl text-sm font-semibold inline-block min-h-[44px] flex items-center justify-center">
            Intentar de nuevo
          </NuxtLink>
          <NuxtLink to="/billing" class="text-sm text-text-secondary hover:text-text-primary">
            Volver a mi suscripción
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()

// MP returns collection_status=approved | pending | failure | null
const collectionStatus = computed(() => route.query.collection_status as string | undefined)

const isApproved = computed(() => collectionStatus.value === 'approved')
const isPending = computed(() => collectionStatus.value === 'pending')
</script>
