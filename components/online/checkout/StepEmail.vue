<template>
  <div class="space-y-5">

    <div class="text-center mb-2">
      <h4 class="text-base font-semibold text-foreground">Tu correo electrónico</h4>
      <p class="text-sm text-muted-foreground mt-0.5">
        Te enviaremos la confirmación del pedido
      </p>
    </div>

    <div class="space-y-1">
      <label class="block text-sm font-medium text-foreground">Correo electrónico</label>
      <input
        v-model="email"
        type="email"
        autocomplete="email"
        class="w-full h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground outline-none shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-form-control-focus-ring focus-visible:border-form-control-focus-border"
        placeholder="tu@correo.com"
        @keyup.enter="onNext"
      />
      <p v-if="email && !isEmailValid" class="text-xs text-destructive">
        Ingresa un correo electrónico válido
      </p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOtpAuthStore } from '~/stores/otp_auth'

const otpAuthStore = useOtpAuthStore()

const email = ref(otpAuthStore.email ?? '')

const isEmailValid = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value),
)

const isValid = computed(() => isEmailValid.value)

const onNext = () => {
  if (!isEmailValid.value) return
  otpAuthStore.email = email.value
}

defineExpose({ isValid, onNext })
</script>
