<template>
  <div class="px-6 py-6">

    <!-- Success state -->
    <div v-if="isSuccess" class="flex flex-col items-center gap-4 py-4 text-center">
      <div class="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
        <Icon name="heroicons:check-circle" class="w-8 h-8 text-success" aria-hidden="true" />
      </div>
      <div>
        <p class="text-base font-semibold leading-tight text-ebony-900">¡Solicitud enviada!</p>
        <p class="text-base leading-relaxed text-ebony-500 mt-1">Nos pondremos en contacto contigo pronto.</p>
      </div>
      <button
        class="mt-2 text-sm text-crocus-600 hover:text-crocus-700 underline underline-offset-2"
        @click="emit('close')"
      >
        Cerrar
      </button>
    </div>

    <!-- Form state -->
    <form v-else class="flex flex-col gap-5" @submit.prevent="handleSubmit">

      <p class="text-base leading-relaxed text-ebony-500">
        Déjanos tu correo y teléfono. Nos pondremos en contacto contigo.
      </p>

      <!-- Email -->
      <div class="flex flex-col gap-1">
        <label for="access-request-email" class="text-sm font-medium text-ebony-700">
          Correo electrónico <span class="text-destructive" aria-hidden="true">*</span>
        </label>
        <input
          id="access-request-email"
          v-model="form.email"
          type="email"
          required
          autocomplete="email"
          placeholder="tu@correo.com"
          class="w-full px-3 py-2.5 text-base border border-titan-300 rounded-lg bg-white text-ebony-900
                 placeholder:text-titan-400 focus:outline-none focus:ring-2 focus:ring-crocus-500
                 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isSubmitting"
        />
        <p v-if="errors.email" class="flex items-center gap-1 text-sm leading-normal text-destructive" role="alert">
          <Icon name="heroicons:exclamation-circle" class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {{ errors.email }}
        </p>
      </div>

      <!-- Phone -->
      <div class="flex flex-col gap-1">
        <label for="access-request-phone" class="text-sm font-medium text-ebony-700">
          Teléfono <span class="text-destructive" aria-hidden="true">*</span>
        </label>
        <div class="flex">
          <span
            class="inline-flex items-center px-3 border border-r-0 border-titan-300 rounded-l-lg bg-titan-50
                   text-ebony-500 text-sm select-none"
            aria-label="Código de país Colombia"
          >
            🇨🇴 +57
          </span>
          <input
            id="access-request-phone"
            v-model="form.phone"
            type="tel"
            required
            autocomplete="tel-national"
            placeholder="300 123 4567"
            inputmode="numeric"
            class="flex-1 px-3 py-2.5 text-base border border-titan-300 rounded-r-lg bg-white text-ebony-900
                   placeholder:text-titan-400 focus:outline-none focus:ring-2 focus:ring-crocus-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSubmitting"
          />
        </div>
        <p v-if="errors.phone" class="flex items-center gap-1 text-sm leading-normal text-destructive" role="alert">
          <Icon name="heroicons:exclamation-circle" class="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {{ errors.phone }}
        </p>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full min-h-[44px] py-2.5 px-4 rounded-lg font-semibold text-base text-white
               bg-crocus-600 hover:bg-crocus-700 active:scale-[0.98]
               focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:ring-offset-2
               disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <span v-if="isSubmitting" class="flex items-center justify-center gap-2">
          <Icon name="heroicons:arrow-path" class="w-4 h-4 animate-spin" aria-hidden="true" />
          Enviando...
        </span>
        <span v-else>Solicitar acceso</span>
      </button>

    </form>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  prefilledEmail?: string
}>()

const emit = defineEmits<{ close: [] }>()

const { error: toastError } = useToast()

const form = ref({ email: props.prefilledEmail || '', phone: '' })
const errors = ref({ email: '', phone: '' })
const isSubmitting = ref(false)
const isSuccess = ref(false)

// Keep form in sync if prefilledEmail changes while modal is open
watch(() => props.prefilledEmail, (val) => {
  if (val && !form.value.email) {
    form.value.email = val
  }
})

function validate(): boolean {
  errors.value = { email: '', phone: '' }
  let valid = true

  if (!form.value.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Ingresa un correo electrónico válido'
    valid = false
  }

  const digits = form.value.phone.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 10) {
    errors.value.phone = 'Ingresa un número de teléfono válido (7-10 dígitos)'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return

  isSubmitting.value = true
  try {
    await $fetch('/api/leads/access-request', {
      method: 'POST',
      body: {
        email: form.value.email,
        phone: form.value.phone.replace(/\D/g, ''),
        button_source: 'access_request',
      },
    })
    isSuccess.value = true
  } catch {
    toastError('Ocurrió un error. Por favor intenta de nuevo.')
  } finally {
    isSubmitting.value = false
  }
}
</script>
