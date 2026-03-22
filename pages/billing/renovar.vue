<template>
  <div class="min-h-screen bg-background flex flex-col items-center justify-center p-6">
    <div class="max-w-sm w-full text-center space-y-6">
      <!-- Icon -->
      <div class="flex justify-center">
        <div class="w-20 h-20 rounded-full bg-surface-alt flex items-center justify-center">
          <svg
            class="w-10 h-10 text-text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
      </div>

      <!-- Branding -->
      <p class="text-xs font-bold tracking-widest text-text-secondary uppercase">WARO</p>

      <!-- Message -->
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-text-primary">Tu acceso está en pausa</h1>
        <p class="text-sm text-text-secondary leading-relaxed">
          El período de gracia ha terminado. Renueva tu plan para seguir usando WARO
          y acceder a todas tus funciones sin interrupciones.
        </p>
      </div>

      <!-- CTA buttons -->
      <div class="space-y-3">
        <NuxtLink
          to="/billing/planes"
          class="btn-primary w-full px-6 py-3 rounded-xl text-sm font-semibold text-center block min-h-[44px] flex items-center justify-center"
        >
          Ver planes y renovar
        </NuxtLink>
        <NuxtLink
          to="/billing"
          class="w-full px-6 py-3 rounded-xl text-sm font-medium text-center block min-h-[44px] flex items-center justify-center border border-border text-text-secondary hover:bg-surface-alt transition-colors"
        >
          Ver mi suscripción actual
        </NuxtLink>
      </div>

      <!-- Support note -->
      <p class="text-xs text-text-secondary">
        ¿Necesitas ayuda?
        <a
          href="mailto:hola@warolabs.com"
          class="text-primary hover:underline"
        >Contáctanos</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBilling } from '~/composables/useBilling'

definePageMeta({ layout: false })

useHead({ title: 'Renovar suscripción — WARO' })

const { accessStatus, fetchAccessStatus } = useBilling()

// If access is not actually blocked, redirect to dashboard
onMounted(async () => {
  if (!accessStatus.value) await fetchAccessStatus()
  if (accessStatus.value && accessStatus.value.level !== 'blocked') {
    navigateTo('/dashboard')
  }
})
</script>
